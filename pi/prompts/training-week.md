---
description: Brief the remaining workouts of this training week with difficulty, water, and carbs
argument-hint: "[context, e.g. 'hot week' or 'no gym']"
---

# Training week briefing

Brief the athlete on the remaining workouts of the current training week (Monday to Sunday). Read-only: do not write files or modify Intervals.icu.

Athlete context:

```markdown
$ARGUMENTS
```

## 1. Gather context

Run these in parallel:

- Local date, weekday, and timezone.
- `/Users/martrom/Documents/brain/fitness/athlete-profile.md` for fitness markers and data caveats.
- `icu_get_calendar_events` from Monday of last week to Sunday of this week.
- `icu_get_fitness_summary` for CTL, ATL, and ramp rate.
- List `/Users/martrom/Documents/brain/fitness/illness/`; read only episodes from the last 21 days.

Then, only if a strength session remains, read `/Users/martrom/Documents/brain/fitness/strength-routine.md`.

If today is Sunday and nothing remains, brief next week instead (fetch through next Sunday).

## 2. Read the calendar

- **Planned sessions:** Runna imports them at `T00:00:00`, sometimes as `NOTE` instead of `WORKOUT`. A `NOTE` with a workout structure is a planned session.
- **Completed activities:** real start time and a `📊 Summary`. Match to planned sessions by date and distance; flag skipped, moved, or replaced sessions.
- **Today:** a planned session counts as remaining unless a matching activity exists today.
- **Data:** follow the athlete-profile caveats. Ignore Intervals.icu pace zones and threshold pace.

## 3. Output

Use Markdown headings, bullets, and short lines. No raw descriptions, no long paragraphs.

### The week

3-4 bullets, under 90 words total:

- **Phase:** build, recovery, taper, or race, and the next goal race (or "none on calendar").
- **Remaining:** volume and key sessions.
- **Compliance:** last week and this week so far, one line.
- **Fatigue:** only if CTL/ATL, compliance, or recent illness gives a real reason.

### Runs

One `#### Day DD Mon: name` section per remaining run, in order:

- **What:** purpose and structure in one line, with target paces and estimated duration. Estimate easy running at about 5:00/km unless recent easy runs suggest otherwise.
- **Effort:** X/10 with a few words relative to the athlete's fitness markers. Flag paces faster than anything proven in the profile.
- **Fuel:** one line, e.g. `before 250 ml / 30 g sugar; during 2x500 ml / 45 g mix each, sip every 15 min from 20 min`.
- **Watch out:** only when relevant (adjacent hard session, aggressive pace, heat).

Effort scale: 1-2 recovery, 3-4 easy, 5 steady long run, 6-7 tempo or progression, 8 threshold or VO2max, 9 race pace at or beyond proven fitness, 10 race.

### Strength

Ignore Runna's strength prescription; the athlete follows `strength-routine.md`. For each remaining strength day, one short section:

- **Session:** barbell, barbell with RDL swap, home, or travel, based on legs, gym access, and context.
- **Effort:** X/10.
- **Placement:** flag it if it lands the day before a key run; suggest moving, swapping to RDL, or skipping.

### Rest days

One line each, only if they fall between remaining sessions.

Optionally one final line of suggestions, only if something stands out.

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
