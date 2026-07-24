# DnD Craft Pass — Staged Execution

You asked me to be honest about what I can and can't reach in one pass. This ticket is roughly 3 dev-days of careful craft work compressed into a chat. Delivering all seven streams in one turn would force me to compress the two things you explicitly said not to compress: the WAI-ARIA keyboard path and the FLIP + insertion indicator craft. Splitting into three turns is the only way to hit the quality bar you set.

## Turn 1 — Triage, prereqs, foundation (executing now on approval)

**A. Triage 14 Playwright failures**
- Read each failing spec + `error-context.md`, identify the failing assertion, correlate to recent commits in `asset.$assetId.tsx` and `ContentInspector.tsx`.
- Confirm/refute the two prime suspects from #1891: the global `sed 's|mode="light"|mode={editorMode}|g'` and the `patchByPath` wiring.
- Fix root causes at the source, not by loosening assertions.
- Report per failure: root cause, introducing pass, fix.

**B. Prereq screenshots from #1894**
- ContentInspector for all 4 kinds (Case-Study, Spotlight, eBrochure, One-Pager) with an expanded array and a Canvas badge visible.
- Mode toggle in both states with the canvas actually re-rendering.
- Bleed + trim guides overlay.

**C. Foundation for the rewrite**
- `bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/accessibility` inside a lazy-loaded chunk co-located with the print editor route only.
- Move the shared-modules panel out of the right inspector column into a horizontal tray directly under the document canvas. This is the placement work from #1898 that this ticket depends on but does not itself deliver — has to land before the DnD engine goes on top.
- Wire `delete` and `replace` (variant + family swap with lossy-swap confirmation) on tray entries — still using the existing HTML5 DnD for now, so behavior is complete before mechanics change.

**Turn 1 gate:** `tsgo`, full `vitest`, full Playwright (must be back to green), production build. Actual counts reported.

## Turn 2 — dnd-kit engine + the 12 quality-bar items

- Replace HTML5 DnD with `@dnd-kit/core` + `sortable`. `PointerSensor` with 5px activation constraint. `KeyboardSensor` with the coordinate getter.
- `DragOverlay` with `translate3d`-only movement, ~1.02 scale, elevated shadow, source-slot opacity dim.
- Geometry cache on drag start (`onDragStart` snapshot of sibling rects), rAF-throttled `onDragMove`.
- **FLIP layer** — first/last/invert/play on the sortable siblings when the insertion target changes. 200ms ease-out. Gated on `prefers-reduced-motion`.
- **Insertion indicator** — 2px accent line between slots at the projected drop position. No live-reorder under the cursor; commit on drop.
- **Drop settle** — animate the lifted item into its resolved slot; invalid drop animates back to origin.
- **Auto-scroll** — proximity-proportional velocity when the pointer enters the top/bottom 60px of the scroll container.
- **Touch** — `touch-action: none` on drag handles only (never the tray itself). Pointer capture via `PointerSensor` defaults.
- **Keyboard + SR** — Space/Enter lift, Arrow move, Space/Enter drop, Escape cancel. `aria-live="polite"` region with position announcements ("Grabbed, position 2 of 4", "Moved to position 3", "Dropped", "Cancelled, returned to position 2").

## Turn 3 — Picker cross-container drop, tests, performance verification

- Extend the same `DndContext` to include the picker drawer as a draggable source. Cross-container drops land in the tray with the same insertion indicator drawing across tray/canvas boundary.
- Playwright specs: pointer reorder, picker-to-canvas insert, keyboard reorder (arrow + Space + Escape), delete via keyboard, capacity meter update mid-drag.
- Performance trace via `page.tracing.start({ screenshots: true, categories: [...] })` around a real drag; parse the trace, report actual frame durations and any long tasks >16ms. Attach the trace file.
- Record a frame sequence of a full drag (start → move → drop) as GIF or numbered PNGs.
- Full gate again with real counts.

## Why not one turn

- Foundation (Turn 1) has to be right or the DnD rewrite lands on a broken base. The `sed` regression is exactly the kind of thing that will re-surface as "why does keyboard drop end up in the wrong slot" three days later if the root cause isn't understood first.
- FLIP + insertion indicator is where the "craft" lives — it's ~400 lines of geometry math and animation code that has to be written slowly with the reduced-motion branch tested. Rushed FLIP looks worse than no FLIP.
- Keyboard path needs its own attention: sensor + coordinate getter + announcement copy + focus management on delete/replace. If I fold it in with everything else it will silently become "arrows kind of work" instead of the real WAI-ARIA pattern.

## What you get if you say "just do it all in one turn anyway"

I will still do it, but the honest expected outcome is: engine swap works, mouse feels roughly right, keyboard is partial (probably lift + move but no announcement region or Escape polish), FLIP is a plain CSS transition rather than true FLIP, and performance is asserted not measured. That's the compression this ticket exists to prevent.

## Confirm

Reply "go" to start Turn 1 immediately. Reply "one turn anyway" to accept the compression trade-off above. Reply with edits to reshape the split.