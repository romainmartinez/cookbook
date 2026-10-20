---
name: pele-diagrams
description: Create diagrams as Mermaid with Pele.
---

1. Write Mermaid (v12.1 syntax) to `/tmp/<slug>.mmd`.
2. Run `node ~/.pi/agent/skills/pele-diagrams/render.mjs <file>.mmd <output>.[png|svg]`. Default the output to downloads unless specified otherwise.
3. Check the PNG for layout and readability before replying; for SVG output, also render a PNG to check.
4. Reply with the path.

Prefer specialized types when they fit: `agentflow-beta` (agents/handoffs), `treeView-beta` (file trees), `swimlane-beta` (roles), `architecture-beta` (infra), `eventmodeling`, `ishikawa`, `kanban`, `venn-beta`, `wardley-beta`, `railroad-beta`, `packet`. Syntax: https://pele.run/examples

## Readable flowcharts

- Use markdown labels (backticks inside the quotes) with real newlines: bold title, plain details, italics for the key condition. Keep each line short.
- Color zones with `classDef` and `:::class`, one class per zone, e.g. `A:::core` with `classDef core fill:#e7f0ff,stroke:#3b6fc4`.
- Keep edge labels to a few words; put details in the surrounding text.
- Pick `LR` for pipelines and wide slides, `TB` for narrow pages.

## Gotchas

- Pele ignores Mermaid themes and HTML labels. Use `classDef`/`style` for colors.
- `**bold**` only works in markdown labels; in plain `"..."` labels it shows literally. Plain labels take `<br>` for line breaks; markdown labels take real newlines.
- In markdown labels, `_` and `__` are formatting: `us__*` breaks. Rephrase, or use a plain label.
