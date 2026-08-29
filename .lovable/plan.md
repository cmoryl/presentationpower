# Fix: print agent PDF export fails to save

## What's happening

Reproduced the failure. The export engine itself is healthy — exporting the same case study from the asset editor produced a correct 1.6 MB press PDF (single 8.5×11 page, selectable vector text, ICC tagged).

The print agent is different: its export card renders a second, off-screen copy of the page and rasterizes that. When I ran exactly that staged render, the case study layout threw mid-render:

```text
TypeError: Cannot read properties of undefined (reading 'length')
  at CaseStudyLayout  (engagement.bullets.length)
```

The layout reads `content.stats`, `content.challenge/solution/result.heading` and `content.engagement.bullets` as if they are always present. Agent-authored case studies frequently arrive partial (an engagement block with no bullets, no stats array yet), so the off-screen page crashes, the staged node never paints, and nothing saves. The same crash also takes the surrounding route down, which is why it reads as "the button did nothing".

## The fix

1. **Harden the case study layout** so partial content renders instead of throwing: default the stats array, the three narrative blocks, and the engagement title/bullets. Audit the sibling print layouts (spotlight, e-brochure, adaptor brief, MSA, solution proposal, multi-proposal) for the same unguarded array/object reads and give them the same treatment.
2. **Contain render failures in the export card**: wrap the off-screen staged page in an error boundary so a layout crash surfaces as a clear "this page can't be rendered yet" export error toast instead of a silent no-op plus a broken route.
3. **Fail loudly on an empty stage**: before capture, assert the staged node has non-zero size and painted content; if not, throw a named error the export toast can show, instead of writing a blank or dying inside the rasterizer.
4. **Give the stage enough time**: raise the fixed 120 ms pre-capture wait to a font/image-ready wait (the same readiness gate the editor path uses) so heavy case studies with hero imagery capture fully.

## Verification

- Re-run the staged-render probe against real print assets (case study plus one of each other kind) and confirm every one saves a PDF at trim aspect with selectable text.
- Drive a live print agent thread end to end: generate a case study, export PDF, PNG, and SVG from the chat card, and confirm all three land with no console errors.
- Deliberately export a stripped/partial case study to confirm it now renders and exports instead of crashing.

## Technical notes

Files in scope: `src/components/print/CaseStudyLayout.tsx` (and sibling layouts under `src/components/print/`), `src/components/print-agent/PrintExportCard.tsx`, `src/lib/print-agent/page-export.ts`. No schema or export-engine changes — `src/lib/print-asset-export.ts` is verified working and stays as is.
