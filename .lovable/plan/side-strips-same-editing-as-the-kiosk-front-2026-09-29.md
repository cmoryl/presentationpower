# Side strips: same editing as the kiosk front

## What you get
- A **Front / Left strip / Right strip** switch above the canvas in the kiosk editor. You can also click a strip on the canvas to switch to it.
- On a strip, the editor works exactly like the front:
  - **Layers list** (Background, Imagery, Content, Text).
  - Select several with Shift, Ctrl or ⌘.
  - Move, resize, lock, hide and group.
  - Change the background.
  - Undo and redo.
  - Reset to your file.
  - Checks for safe margin and trim.
- **Every piece on each strip becomes its own layer:** each wave, shape, photo and logo, read from your supplied CMYK files the same way the front was.
- **Text on the strips becomes live text,** with CMYK colour fields, where your file has real words. Outlined words stay as shapes.
- **Saving:** strip edits save with the kiosk under the same role rules. Brand leads and reviewers can save, sales can't.
- **Downloads:** the Side strips .ai and All files (.zip) downloads include your strip edits, in CMYK with bleed and trim, still marked `rdraft-`.

## Scope
- All 13 kiosks from your CMYK files.
- Strips with no artwork, only a background, get a background layer and nothing else.
- Kiosks with no TV stay no-TV. Strips never had a TV area.

## Honest limits
- Artwork your file draws as a single compound shape stays one piece.
- I still can't open the files in Illustrator, so please check one strip there before print.

## Technical details
- Re-run the piece extraction (pikepdf + pdfplumber) on pages 2 and 3 of each stored CMYK master:
  - One native PDF page and one preview-SVG symbol per object.
  - Texts are pulled out as live runs.
  - Pieces and texts land in `native.stripLayouts.left|right`, with the same shape as the front (`parts`, `texts`, `blocks`, `bgPage`), at trim 288 × 6912 pt with 9 pt bleed.
- **Editor:** `KioskLayerEditor` gets a `face` state. It builds a face-scoped layout view, so the existing canvas, layer panel, inspector, checks and multi-select are reused unchanged.
- **Saving:** edits are keyed by face (`front` / `left` / `right`) in the existing kiosk edits record, so saved front edits are untouched.
- **Export:** `liveReturnPdf` switches to the same per-part native path as `liveFrontPdf` and applies the strip edits. The press/QA path is unchanged.
- **Tests:** every strip has a layout, nothing crosses the strip trim, CMYK values round-trip, and strip edits appear in the exported strips.
