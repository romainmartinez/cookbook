---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

# Grill Me

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that depend on it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask now without guessing at answers you have not heard yet. Ask the frontier with the question tool, putting your recommended answer first in each question. The tool accepts at most four questions per call, so if the frontier is larger, ask it in batches of four without introducing questions whose prerequisites remain unsettled.

Each round reshapes the tree. Settled decisions push the frontier outward and unblock dependent questions. Recompute the frontier before the next round. A question whose answer depends on another open question belongs to a later round.

When a frontier question depends on a missing fact, ask the user for that fact rather than researching it independently. Treat the fact as an unsettled prerequisite and postpone its dependent decisions. Decisions also belong to the user: put each one to them and wait.

The session is done when the frontier is empty: every branch of the design tree has been visited and nothing remains silently assumed. Do not enact the plan until the user confirms you have reached a shared understanding.
