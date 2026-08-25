# Plan: Judging-ready live demo prep

## Goal
Prepare tomorrow’s live presentation around the judging sheet so the demo explicitly earns points in all three categories:

1. **Sell more** — new business, existing-client expansion, proof.
2. **Automate & innovate** — time saved, running cost, ease of use.
3. **Scale** — reach, rollout effort, adoption plan.

## Deliverables

### 1. Three-minute demo script
Create a concise talk track that maps each live step to the rubric:

```text
0:00–0:25  Open: what Element is and why it sells more
0:25–1:15  Presentation Agent: brief-to-deck proof
1:15–1:55  Edit/export: automation, QA, PPTX/PDF fidelity
1:55–2:30  Multi-channel scale: print, social, event reuse
2:30–3:00  Close: rollout plan and judge-score recap
```

The script will include exact phrases for business value, proof, time saved, cost control, ease of use, and scale. Any unsupported metrics will be written as clear placeholders rather than invented numbers.

### 2. Judging-ready demo deck
Create a short internal demo deck structure that mirrors the score sheet:

- Cover: TransPerfect Element, “built to own the room.”
- Sell more: new clients, existing clients, proof moments.
- Automate & innovate: manual work removed, cost leverage, ease of use.
- Scale: reusable modules, governed templates, role-based adoption.
- Live-demo run of show: what to click and what each click proves.
- Closing scorecard: how the demo answers the judges’ weighted categories.

Use the approved TransPerfect Enterprise brand system by default, with a deliberate mix of light and dark slides. Keep copy realistic and avoid fake figures.

### 3. In-app live-demo checklist
Add a lightweight judge-score checklist surface inside the app so you can follow it during the live demo without exposing admin/backend clutter.

It will show:

- The three judging categories with weights.
- Each scoring sub-point from the sheet.
- A recommended demo action for each sub-point.
- A simple “done” state for live tracking.
- A final score reminder using the sheet’s 180-point weighting.

## Implementation approach

- Add a new public-facing demo-prep/checklist route and link it from the presentation/demo area so it is easy to open tomorrow.
- Keep the UI in the approved Element/Enterprise visual system: Primary Blue, Blue 800, Geist Sans, clean light/dark contrast.
- Reuse existing navigation and demo-deck patterns already present in the app rather than introducing a separate presentation system.
- Store the script/checklist content as structured local data so it can drive both the in-app checklist and the demo-deck copy consistently.
- If generating downloadable files, write them to Documents with versioned filenames and visually QA every generated page/slide before delivery.

## Acceptance criteria

- The demo flow visibly addresses every line of the judging sheet.
- The first screen gives you the checklist/run-of-show quickly, without requiring admin context.
- The demo deck uses only approved Enterprise branding by default and mixes light/dark slides.
- The script fits a three-minute live delivery and clearly signals “sell more,” “automate,” and “scale.”
- No unsupported numbers, client claims, or proof points are invented.
