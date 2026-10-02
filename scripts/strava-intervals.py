#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx>=0.27", "rich>=13"]
# ///
"""Copy Strava activities that Intervals.icu cannot expose (e.g. Runna treadmill runs) into Intervals.icu."""

import argparse
import fcntl
import json
import logging
import os
import shutil
import subprocess
import sys
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from getpass import getpass
from itertools import pairwise
from pathlib import Path
from xml.etree import ElementTree as ET

import httpx
from rich.logging import RichHandler

CONFIG = Path.home() / ".config/strava-intervals.json"
UNITS = Path.home() / ".config/systemd/user"
STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
CREDENTIALS = ("strava_client_id", "strava_client_secret", "intervals_api_key", "intervals_athlete_id")
SECRETS = {"strava_client_secret", "intervals_api_key"}
LOOKBACK = timedelta(days=14)
MAX_ATTEMPTS = 3
FIRST_SYNC = "2000-01-01"
TCX = "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
TPX = "http://www.garmin.com/xmlschemas/ActivityExtension/v2"
TCX_SPORT = {"Run": "Running", "TrailRun": "Running", "VirtualRun": "Running", "Ride": "Biking", "VirtualRide": "Biking"}

ET.register_namespace("", TCX)
ET.register_namespace("tpx", TPX)
log = logging.getLogger("strava-intervals")


class RateLimited(Exception):
    pass


def load() -> dict:
    return json.loads(CONFIG.read_text()) if CONFIG.exists() else {}


def save(config: dict) -> None:
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    tmp = CONFIG.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    with os.fdopen(os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as file:
        json.dump(config, file, indent=2)
    tmp.replace(CONFIG)


def local_time(value: str) -> datetime:
    return datetime.fromisoformat(value).replace(tzinfo=None)


def get(client: httpx.Client, path: str, **params):
    return client.get(path, params=params).raise_for_status().json()


def token_request(config: dict, **grant) -> httpx.Request:
    data = {"client_id": config["strava_client_id"], "client_secret": config["strava_client_secret"], **grant}
    return httpx.Request("POST", STRAVA_TOKEN_URL, data=data)


def store_token(config: dict, response: httpx.Response) -> None:
    token = response.raise_for_status().json()
    config.update({key: token[key] for key in ("access_token", "refresh_token", "expires_at")})
    save(config)


class StravaAuth(httpx.Auth):
    requires_response_body = True

    def __init__(self, config: dict) -> None:
        self.config = config

    def auth_flow(self, request):
        if self.config["expires_at"] < time.time() + 300:
            refresh = token_request(self.config, grant_type="refresh_token", refresh_token=self.config["refresh_token"])
            store_token(self.config, (yield refresh))
        request.headers["Authorization"] = f"Bearer {self.config['access_token']}"
        yield request


def raise_on_rate_limit(response: httpx.Response) -> None:
    if response.status_code != 429:
        return
    now = datetime.now().astimezone()
    for prefix in ("X-ReadRateLimit", "X-RateLimit"):
        limits, usage = response.headers.get(f"{prefix}-Limit"), response.headers.get(f"{prefix}-Usage")
        if not (limits and usage):
            continue
        (short, daily), (used_short, used_daily) = (map(int, value.split(",")) for value in (limits, usage))
        if used_daily >= daily:
            reset = (now.astimezone(UTC) + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            raise RateLimited(f"daily limit ({used_daily}/{daily}), resets {reset.astimezone():%Y-%m-%d %H:%M}")
        if used_short >= short:
            reset = now.replace(minute=now.minute // 15 * 15, second=0, microsecond=0) + timedelta(minutes=15)
            raise RateLimited(f"15-min limit ({used_short}/{short}), resets {reset:%H:%M}")
    raise RateLimited("limit reached")


def strava_client(config: dict) -> httpx.Client:
    return httpx.Client(
        base_url="https://www.strava.com/api/v3",
        auth=StravaAuth(config),
        event_hooks={"response": [raise_on_rate_limit]},
        timeout=60,
    )


def intervals_client(config: dict) -> httpx.Client:
    return httpx.Client(
        base_url="https://intervals.icu/api/v1",
        auth=("API_KEY", config["intervals_api_key"]),
        timeout=120,
    )


def coverage(existing: list[dict]) -> Callable[[dict], bool]:
    ids, spans = set(), []
    for other in existing:
        if other.get("source") == "STRAVA":
            continue
        ids |= {str(v) for v in (other.get("strava_id"), (other.get("external_id") or "").removeprefix("strava:")) if v}
        start = local_time(other["start_date_local"])
        spans.append((start, start + timedelta(seconds=other.get("elapsed_time") or 0)))

    def is_covered(activity: dict) -> bool:
        if str(activity["id"]) in ids:
            return True
        start = local_time(activity["start_date_local"])
        end = start + timedelta(seconds=activity["elapsed_time"])
        return any(start < other_end and other_start < end for other_start, other_end in spans)

    return is_covered


def build_tcx(activity: dict, streams: dict) -> bytes:
    def add(parent, tag, text=None, namespace=TCX):
        element = ET.SubElement(parent, f"{{{namespace}}}{tag}")
        if text is not None:
            element.text = str(text)
        return element

    start = datetime.fromisoformat(activity["start_date"])

    def stamp(seconds: float) -> str:
        return (start + timedelta(seconds=seconds)).strftime("%Y-%m-%dT%H:%M:%SZ")

    data = {key: stream["data"] for key, stream in streams.items()}
    times, latlng, altitude, distance, heartrate = (data.get(k) for k in ("time", "latlng", "altitude", "distance", "heartrate"))
    running = TCX_SPORT.get(activity["sport_type"]) == "Running"
    cadence = None if running else data.get("cadence")
    extensions = {
        tag: values
        for tag, values in (("RunCadence", data.get("cadence") if running else None), ("Watts", data.get("watts")))
        if values is not None
    }
    laps = activity.get("laps") or [
        {"start_index": 0, "elapsed_time": activity["elapsed_time"], "distance": activity.get("distance") or 0}
    ]
    bounds = [lap["start_index"] for lap in laps] + [len(times)]

    root = ET.Element(f"{{{TCX}}}TrainingCenterDatabase")
    xml_activity = add(add(root, "Activities"), "Activity")
    xml_activity.set("Sport", TCX_SPORT.get(activity["sport_type"], "Other"))
    add(xml_activity, "Id", stamp(0))
    for lap, (first, end) in zip(laps, pairwise(bounds), strict=True):
        xml_lap = add(xml_activity, "Lap")
        xml_lap.set("StartTime", stamp(times[first]))
        add(xml_lap, "TotalTimeSeconds", lap["elapsed_time"])
        add(xml_lap, "DistanceMeters", lap.get("distance") or 0)
        add(xml_lap, "Intensity", "Active")
        add(xml_lap, "TriggerMethod", "Manual")
        track = add(xml_lap, "Track")
        for i in range(first, end):
            point = add(track, "Trackpoint")
            add(point, "Time", stamp(times[i]))
            if latlng:
                position = add(point, "Position")
                add(position, "LatitudeDegrees", latlng[i][0])
                add(position, "LongitudeDegrees", latlng[i][1])
            if altitude:
                add(point, "AltitudeMeters", altitude[i])
            if distance:
                add(point, "DistanceMeters", distance[i])
            if heartrate:
                add(add(point, "HeartRateBpm"), "Value", heartrate[i])
            if cadence:
                add(point, "Cadence", cadence[i])
            if extensions:
                tpx = add(add(point, "Extensions"), "TPX", namespace=TPX)
                for tag, values in extensions.items():
                    add(tpx, tag, values[i], namespace=TPX)
    return ET.tostring(root, xml_declaration=True, encoding="UTF-8")


def copy(config: dict, strava: httpx.Client, api: httpx.Client, summary: dict, dry_run: bool) -> None:
    activity = get(strava, f"/activities/{summary['id']}")
    label = f"{activity['start_date_local'][:16]} {activity['sport_type']} '{activity['name']}' ({activity['id']})"
    streams = get(
        strava,
        f"/activities/{activity['id']}/streams",
        keys="time,distance,heartrate,cadence,altitude,latlng,watts",
        key_by_type="true",
    )
    if "time" not in streams:
        log.info("Skipping %s without a time stream", label)
        return
    if dry_run:
        log.info("Would copy %s with %d laps", label, len(activity.get("laps") or []))
        return
    response = api.post(
        f"/athlete/{config['intervals_athlete_id']}/activities",
        params={
            "name": activity["name"],
            "description": activity.get("description") or "",
            "external_id": f"strava:{activity['id']}",
        },
        files={"file": (f"strava-{activity['id']}.tcx", build_tcx(activity, streams))},
    )
    new_id = response.raise_for_status().json()["id"]
    api.put(
        f"/activity/{new_id}", json={"type": activity["sport_type"], "trainer": bool(activity.get("trainer"))}
    ).raise_for_status()
    log.info("Copied %s as %s", label, new_id)


def sync(config: dict, args) -> None:
    if args.since or not config.get("cursor"):
        window = datetime.fromisoformat(args.since or FIRST_SYNC).replace(tzinfo=UTC)
    else:
        window = datetime.fromisoformat(config["cursor"]) - LOOKBACK
    remaining = []

    with strava_client(config) as strava, intervals_client(config) as api:
        try:
            activities, page = [], 1
            while batch := get(strava, "/athlete/activities", after=int(window.timestamp()), per_page=200, page=page):
                activities += batch
                page += 1
        except RateLimited as error:
            log.warning("Strava %s; resuming on the next run", error)
            return
        listed = {str(a["id"]) for a in activities}
        failures = config["failures"] = {k: v for k, v in config.get("failures", {}).items() if k in listed}
        existing = get(
            api,
            f"/athlete/{config['intervals_athlete_id']}/activities",
            oldest=(window - timedelta(days=1)).date().isoformat(),
            newest=(datetime.now(UTC) + timedelta(days=2)).date().isoformat(),
        )
        is_covered = coverage(existing)
        pending = sorted(
            (
                a
                for a in activities
                if not a.get("manual") and failures.get(str(a["id"]), 0) < MAX_ATTEMPTS and not is_covered(a)
            ),
            key=lambda a: a["start_date"],
        )
        log.info("%d Strava activities since %s, %d to copy", len(activities), window.date(), len(pending))

        for index, summary in enumerate(pending):
            key = str(summary["id"])
            try:
                copy(config, strava, api, summary, args.dry_run)
                failures.pop(key, None)
            except RateLimited as error:
                log.warning("Strava %s; resuming on the next run", error)
                remaining += pending[index:]
                break
            except Exception:
                failures[key] = failures.get(key, 0) + 1
                log.exception("Failed to copy Strava activity %s (attempt %d/%d)", key, failures[key], MAX_ATTEMPTS)
                if failures[key] < MAX_ATTEMPTS:
                    remaining.append(summary)

    if not args.dry_run:
        config["cursor"] = remaining[0]["start_date"] if remaining else datetime.now(UTC).isoformat()
        save(config)


def ensure_credentials(config: dict) -> None:
    missing = [key for key in CREDENTIALS if not config.get(key)]
    authorized = config.get("refresh_token") and config.get("expires_at")
    if not missing and authorized:
        return
    if not sys.stdin.isatty():
        sys.exit(f"Missing credentials in {CONFIG}; run {Path(__file__).resolve()} interactively once")
    for key in missing:
        config[key] = (getpass if key in SECRETS else input)(f"{key}: ").strip()
    save(config)
    if authorized and not {"strava_client_id", "strava_client_secret"} & set(missing):
        return
    url = httpx.URL(
        "https://www.strava.com/oauth/authorize",
        params={
            "client_id": config["strava_client_id"],
            "redirect_uri": "http://localhost/exchange_token",
            "response_type": "code",
            "approval_prompt": "force",
            "scope": "activity:read_all",
        },
    )
    print(f"\nOpen this URL, approve, then copy `code` from the localhost URL you land on:\n{url}\n")
    code = input("code: ").strip()
    with httpx.Client() as client:
        store_token(config, client.send(token_request(config, grant_type="authorization_code", code=code)))


def install_timer() -> None:
    systemctl, uv = shutil.which("systemctl"), shutil.which("uv")
    if not (systemctl and uv):
        sys.exit("Installing the timer requires systemctl and uv on PATH")
    UNITS.mkdir(parents=True, exist_ok=True)
    (UNITS / "strava-intervals.service").write_text(
        "[Unit]\nDescription=Copy Strava-only activities to Intervals.icu\n\n"
        f"[Service]\nType=oneshot\nExecStart={uv} run --script {Path(__file__).resolve()}\n"
    )
    (UNITS / "strava-intervals.timer").write_text(
        "[Unit]\nDescription=Run strava-intervals every 15 minutes\n\n"
        "[Timer]\nOnCalendar=*:0/15\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n"
    )
    subprocess.run([systemctl, "--user", "daemon-reload"], check=True)
    subprocess.run([systemctl, "--user", "enable", "--now", "strava-intervals.timer"], check=True)
    log.info("Timer enabled; follow with: journalctl --user -u strava-intervals -f")


def main() -> None:
    interactive = sys.stderr.isatty()
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s" if interactive else "%(levelname)s %(message)s",
        handlers=[RichHandler(show_path=False, rich_tracebacks=True, markup=False)] if interactive else None,
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since", help=f"oldest date to copy (default: last run minus {LOOKBACK.days} days, or {FIRST_SYNC})")
    parser.add_argument("--dry-run", action="store_true", help="list what would be copied without uploading")
    parser.add_argument("--install-timer", action="store_true", help="after syncing, install a systemd timer every 15 min")
    args = parser.parse_args()
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG.with_suffix(".lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            sys.exit("Another sync is already running")
        config = load()
        ensure_credentials(config)
        sync(config, args)
    if args.install_timer:
        install_timer()


if __name__ == "__main__":
    main()
