#!/usr/bin/osascript -l JavaScript

const USAGE = [
  "usage: mail-triage.js <command> [args] [--account NAME] [--mailbox NAME]",
  "  accounts",
  "  mailboxes",
  "  list [--limit 30] [--unread] [--since 2026-11-09]",
  "  read <id> [--max 4000]",
  "  flag|unflag|mark-read|mark-unread <id>...",
  "  move <mailbox> <id>...",
].join("\n");

const UPDATES = {
  flag: ["flaggedStatus", true],
  unflag: ["flaggedStatus", false],
  "mark-read": ["readStatus", true],
  "mark-unread": ["readStatus", false],
};

function parseArgs(rest) {
  const opts = {};
  const args = [];
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith("--")) {
      args.push(rest[i]);
      continue;
    }
    const next = rest[i + 1];
    opts[rest[i].slice(2)] = next === undefined || next.startsWith("--") ? true : rest[++i];
  }
  return { opts, args };
}

function positiveInt(value, fallback, name) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`--${name} must be a positive integer`);
  return n;
}

function run(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd) return USAGE;

  const Mail = Application("Mail");
  const { opts, args } = parseArgs(rest);
  const mailboxName = opts.mailbox ?? "Inbox";
  const account = () => (opts.account ? Mail.accounts.byName(opts.account) : Mail.accounts[0]);
  const mailbox = () => account().mailboxes.byName(mailboxName);
  const findMessage = (id) => {
    const m = mailbox().messages.byId(Number(id));
    if (!m.exists()) throw new Error(`message ${id} not found in ${mailboxName}`);
    return m;
  };
  const summary = (m) => ({
    id: m.id(),
    date: m.dateReceived().toISOString(),
    from: m.sender(),
    subject: m.subject(),
    read: m.readStatus(),
    flagged: m.flaggedStatus(),
  });
  const out = (value) => JSON.stringify(value);

  if (cmd in UPDATES) {
    const [prop, value] = UPDATES[cmd];
    const msgs = args.map(findMessage);
    for (const m of msgs) m[prop] = value;
    return out(msgs.map(summary));
  }

  switch (cmd) {
    case "accounts":
      return out(Mail.accounts().map((a) => ({ name: a.name(), emails: a.emailAddresses() })));
    case "mailboxes":
      return out(account().mailboxes().map((b) => ({ name: b.name(), unread: b.unreadCount() })));
    case "list": {
      const limit = positiveInt(opts.limit, 30, "limit");
      const since = opts.since && new Date(`${opts.since}T00:00`);
      if (since && Number.isNaN(since.getTime())) throw new Error("--since must be YYYY-MM-DD");
      // Bulk property reads cost one Apple Event each; per-message reads and date `whose` filters are orders of magnitude slower.
      const msgs = mailbox().messages;
      const [ids, dates, senders, subjects, read, flagged] = [
        msgs.id(), msgs.dateReceived(), msgs.sender(), msgs.subject(), msgs.readStatus(), msgs.flaggedStatus(),
      ];
      return out(
        ids
          .map((id, i) => ({ id, date: dates[i], from: senders[i], subject: subjects[i], read: read[i], flagged: flagged[i] }))
          .filter((m) => !(opts.unread && m.read) && !(since && m.date < since))
          .sort((a, b) => b.date - a.date)
          .slice(0, limit)
          .map((m) => ({ ...m, date: m.date.toISOString() })),
      );
    }
    case "read": {
      const max = positiveInt(opts.max, 4000, "max");
      const m = findMessage(args[0]);
      const body = m.content() ?? "";
      return out({
        ...summary(m),
        to: m.toRecipients().map((r) => r.address()),
        cc: m.ccRecipients().map((r) => r.address()),
        body: body.length > max ? `${body.slice(0, max)}\n[truncated]` : body,
      });
    }
    case "move": {
      const [target, ...ids] = args;
      const dest = account().mailboxes.byName(target);
      if (!dest.exists()) throw new Error(`mailbox ${target} not found`);
      const msgs = ids.map(findMessage);
      const moved = msgs.map(summary);
      for (const m of msgs) Mail.move(m, { to: dest });
      return out({ movedTo: target, messages: moved });
    }
    default:
      throw new Error(`unknown command: ${cmd}\n${USAGE}`);
  }
}
