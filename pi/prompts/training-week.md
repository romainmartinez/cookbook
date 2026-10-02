---
description: Review this week's completed workouts and brief the remaining ones with difficulty, water, and carbs
argument-hint: "[context, e.g. 'hot week' or 'no gym']"
---

# Training week briefing

Review completed workouts and brief the remaining ones for the current training week (Monday to Sunday). Write only the week file and, when warranted, the athlete profile (section 5); do not modify Intervals.icu.

Athlete context:

```markdown
$ARGUMENTS
```

## 1. Week file

State lives in `~/Documents/brain/fitness/training-week.md`, a single file replaced each week:

```markdown
---
week: YYYY-MM-DD        # Monday of the week
updated: YYYY-MM-DDTHH:MM
---
```

- **Missing, or `week` is not the current Monday:** start fresh and overwrite it.
- **Same week:** reuse it. Keep existing reviews as-is. Keep a briefing unless its event changed (date, name, or structure), the plan moved, or a new review changes the advice. Match day headings and session lines against the calendar to find what is new: review only completed sessions not yet marked `(done)`, brief only remaining sessions not yet in the file.

## 2. Gather context

Run these in parallel:

- Local date, weekday, and timezone.
- The week file, if it exists.
- `~/Documents/brain/fitness/athlete-profile.md` for fitness markers and data caveats.
- `icu_get_calendar_events` from Monday of last week to Sunday of this week.
- `icu_get_fitness_summary` for CTL, ATL, and ramp rate.

Then, in parallel, only as needed:

- For each completed activity this week not yet reviewed: `icu_get_activity_details`, `icu_get_activity_intervals`, and `icu_get_activity_messages`.
- If a strength session remains: `~/Documents/brain/fitness/strength-routine.md`.

If today is Sunday and nothing remains, start next week instead (fetch through next Sunday).

## 3. Read the calendar

- **Planned sessions:** Runna imports them at `T00:00:00`, sometimes as `NOTE` instead of `WORKOUT`. A `NOTE` with a workout structure is a planned session.
- **Completed activities:** real start time and a `📊 Summary`. Match to planned sessions by date and distance; flag skipped, moved, or replaced sessions.
- **Today:** a planned session counts as remaining unless a matching activity exists today.
- **Data:** follow the athlete-profile caveats. Ignore Intervals.icu pace zones and threshold pace.

## 4. Write the file

No title and no headings other than one `## Ddd DD Mon` per day, Monday to Sunday (e.g. `## Tue 15 Sep`). Bullets and short lines only; no raw descriptions, no long paragraphs.

### Top of file

Right after the frontmatter, no heading, 5-6 bullets under 110 words, refreshed on every run:

- **Phase:** build, recovery, taper, or race, and the next goal race (or "none on calendar").
- **Effort:** X/10 for the whole week (done and planned) relative to this athlete's usual weeks, with a few words of why. Scale: 1-2 rest, 3-4 light or recovery, 5-6 normal build, 7-8 hard build or peak, 9-10 race week or beyond current capacity.
- **Remaining:** volume and key sessions.
- **Last week:** done vs planned, e.g. `5/5 runs (76 km), 2 strength`.
- **This week:** done vs planned so far, same format.
- **Form:** plain-language verdict first (fresh, balanced, tired, overreaching), then why in a few words, with rounded numbers in parentheses, e.g. `balanced: fatigue matches fitness, load rising slowly (fitness 45, fatigue 46, +1.5/week)`. Add context from compliance or recent reviews only when relevant.

### Each day

Each session starts with a bold line, `**name** (done)` or `**name**`, followed by its bullets. A rest day is one line: `Rest.` When a session is completed, replace its briefing with the review.

Completed run:

- **Plan vs actual:** distance, duration, average pace, average HR, elevation gain.
- **Intervals:** for structured sessions, work reps vs target pace, one compact line per block (e.g. `6x800: 3:28-3:33 vs 3:30, HR 168-176`). Note fade, HR drift, or pacing errors.
- **Feel:** RPE, feel, and activity notes, if present in Intervals.icu.
- **Effort:** X/10 as executed, using the session scale and RPE, HR, and pace data; note when it differs from the planned effort.
- **Verdict:** nailed, ok, or off, plus one takeaway.
- **Impact:** only if it changes advice for the remaining sessions.

Completed strength: session done, effort X/10, notes if any, impact on the next run only if relevant.

Skipped or replaced session: one line.

Remaining run:

- **What:** purpose and structure in one line, with target paces and estimated duration. Estimate easy running at about 5:00/km unless recent easy runs suggest otherwise.
- **Effort:** X/10 with a few words relative to the athlete's fitness markers and this week's reviews. Flag paces faster than anything proven in the profile.
- **Fuel:** one line, e.g. `before 250 ml / 30 g sugar; during 2x500 ml / 45 g mix each, sip every 15 min from 20 min`.
- **Watch out:** only when relevant (adjacent hard session, aggressive pace, heat).

Session effort scale (planned and executed): 1-2 recovery, 3-4 easy, 5 steady long run, 6-7 tempo or progression, 8 threshold or VO2max, 9 race pace at or beyond proven fitness, 10 race.

Remaining strength (ignore Runna's prescription; the athlete follows `strength-routine.md`):

- **Session:** barbell, barbell with RDL swap, home, or travel, based on legs, gym access, and context.
- **Effort:** X/10.
- **Placement:** flag it if it lands the day before a key run; suggest moving, swapping to RDL, or skipping.

## 5. Update the athlete profile

When a new review shows a breakthrough or a durable insight, edit `~/Documents/brain/fitness/athlete-profile.md`:

- **Breakthrough:** a session beating or extending a Fitness Markers row, a race result, a new strength e1RM, or a goal achieved. Update the matching table row or goal checkbox; replace superseded markers rather than appending.
- **Insight:** a pattern backed by more than one session, such as a shift in easy pace/HR, a pace now proven or still unproven, or a new data caveat. Add or edit one line in the relevant section.
- Skip one-off noise and anything already in the profile. Match its existing style and keep edits minimal.
- Mention each profile change in the reply.

## 6. Reply

Do not repeat the file content. At most 5 short lines: the file path, what was added or changed, any profile edits, and one suggestion only if something stands out (e.g. a session worth moving).

## Fueling rules

**Gear:** flasks of 4x500 ml, 2x360 ml, 3x250 ml. Carry at most 1000 ml during the run; the pre-run flask is drunk at home and does not count. If more fluid is needed, concentrate a flask and plan a refill or a loop past home.

**Carb sources:**

- **Sugar water:** table sugar (1 g carbs per g) plus about 0.5 g salt per 500 ml. Up to 60 g carbs/h.
- **Homemade mix (v2.0):** about 0.97 g carbs per g, sodium included. Use above 60 g/h, at race pace, and for race rehearsal.

**Concentration:** 10-15% in drinking flasks; up to 25% only if washed down with water.

**Targets** (adjust for intensity and heat):

| Session | Before | During |
| --- | --- | --- |
| Easy < 60 min | Nothing | Nothing, or water if hot |
| Easy 60-90 min | Nothing | 250-500 ml water; 0-30 g carbs optional |
| Easy or long > 90 min | Optional 250 ml, up to 30 g | 400-600 ml/h, 45-60 g/h |
| Intervals, tempo, progression | 250 ml, up to 30 g, 10-15 min before | 250-500 ml, 30-60 g if > 60 min total |
| Race-pace long run or rehearsal | 250 ml, up to 30 g | 60-90 g/h with homemade mix |

Round grams to 5 g. Keep logistics simple.
