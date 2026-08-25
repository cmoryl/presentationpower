# Fix: Presentation hero sits lower than other modes

## Problem

On the dashboard hero, when the **Presentation** mode is active, the "Built to own the room." headline block sits noticeably lower than the other modes (Print, Event, Social).

Root cause (confirmed in `src/routes/index.tsx`):

- The mode-content grid (line ~352) uses `lg:items-end` — both columns are **bottom-aligned**.
- Presentation's right column is the "Presentation toolkit" panel (4 subnav links + "Try" list), which is **taller** than the other modes' right column (just a "Try" card).
- Bottom alignment + a taller right column = the left headline column gets pushed down to match the taller bottom edge. Other modes' columns are shorter, so their headlines ride higher.

## Fix

Change the mode-content grid alignment from `lg:items-end` to `lg:items-start` so the eyebrow/headline/copy column is **top-aligned** consistently across all four modes. The headline position becomes identical no matter which mode is active.

To keep the taller Presentation panel visually grounded, add a small top offset balance only if visual check shows the panel floating oddly — default is plain top alignment.

## Verification

1. Load the dashboard, screenshot each of the 4 modes (Presentation, Print, Event, Social).
2. Confirm the eyebrow ("Element · Presentation" etc.) and headline start at the same vertical position in every mode.
3. Check mobile stacking (columns collapse) still reads well.
4. Typecheck + build.

## Judging sheet

Awaiting re-upload — once it's in the chat I'll map its scoring criteria to the demo flow and propose a prep checklist in a follow-up plan.
