# Isolated ELEMENT v221 store — verification report

## Stopped converter
The converter plan was abandoned. Its preceding turn already wrote 36 additive conversion/recovery records. All original material content and editor routing remain unchanged. No additional conversion or content migration ran in this request. The existing React port remains in place.

## Actual first-party application
`/element` mounts the supplied `pkg3/module-builder.html` unchanged (SHA256 `3b6e7bf55a518cf330e191a47458696c7fcc3d2a1ddfd484ca1a97f9b6ce8a06`) in a sandboxed opaque-origin iframe. The host supplies `window.claude.use` capabilities before the issued source executes. Browser drafts use per-account namespaced parent storage; the iframe cannot access existing app storage or routes. CSS and source logic stay within the iframe.

## Adapter coverage
- Collection direct-child reads, `orderBy` on a JSON field, limits, `get`, `onSnapshot`, and unsubscribe.
- Document `get` with `exists/data()`, replacing `set`, recursive merging `update`, and `delete`.
- Dedicated `element_v221_documents` table; updates serialized with transaction-scoped per-path locks. Arrays replace; sibling object keys merge.
- Existing authenticated staff identities/display names; existing authoring roles grant write capability. Project owner and reviewer decisions are enforced in SQL. Sign-offs require caller-owned paths and project approval rights. Viewers cannot mutate materials; source-compatible own comments remain permitted.
- Hosted original image hashes supplied by the assets capability, preserving `elib` identifiers.
- Actual source also uses `learn` and `diag`, and collection `get`, omitted from the initial eight-family summary; these are mapped.

## Verified against the running application
Using the real injected shared-team session, created project `0yppetn3e5gl` and material `cd2yjs1qskjc`, edited its name and hero words, waited for Saved, reopened it, and confirmed Cloud readback. Saved a version through the issued Versions panel; the panel showed one saved version and database readback confirmed its nested version path. Ten focused adapter/engine tests passed. Preview diagnostics report build OK.

## Reviewer sign-off verified — 15 November 2026
The user confirmed the mounted SHA256 matches the live v221 build byte for byte. The verification-only material was missing the required Footer; adding it through the issued UI cleared preflight (nothing to fix, nine passed). Through the existing adapter, set only `status: "review"` and `contentBy: "u_someone_else"` on that test material, following the source multiuser fixture. This simulates another last editor; it is not evidence of two-account editing.

The real signed-in account was a named reviewer, not the project owner. Clicking **Approve** and its confirmation in the unchanged application ran the genuine approval/sign-off path. Adapter readback confirmed material status `approved`, plus `signoffs/b8585e77-844e-410c-96e5-621ee32ac776/items/cd2yjs1qskjc` with `status: "approved"` and hash `1u1nrfc1koo2dy-p6`. The UI displayed **Locked while approved** and an **Approved** milestone. Version collection readback returned two versions (the earlier saved version plus the approval milestone). A fresh session independently read the persisted approved record; the additional fresh-session UI navigation check timed out and is not claimed as verified.

No source approval rule, canonical hash function, adapter permission or production material was changed. Ten focused adapter/engine regression tests passed again. The approval screenshot was inspected.

## Remaining verification limits

## Exports verified — 15 November 2026
Resumed the real issued UI paths against the Cloud-saved `export-verification-20261115/export-proof` verification material (Hero + Footer, hosted original photo) in the separate mounted workspace. No synthetic Blob, renderer replacement, source modification or approval-rule change was used. The issued Required sizes menu currently derives eight sizes for this material; the earlier attempt to call `exportZip` from the global scope was invalid because the build encapsulates its functions. The successful run used the UI and its existing **Export anyway** photo-composition warning confirmation.

| Issued export | File | Bytes | Open check |
| --- | --- | ---: | --- |
| Single-size image PDF, `60-export.js` | `export-verification-material-letter.pdf` | 689,028 | Poppler opened/rendered its one US Letter page; inspected text, photo and footer. This is the issued flat proof, not a press master. |
| Required-size ZIP, `60-export.js` | `export-verification-material-8-sizes.zip` | 36,158,655 | ZIP opened/extracted with all CRC checks passing; 14 entries, including folders/content, eleven PNGs and a carousel PDF. Every PNG decoded; carousel PDF rendered and inspected. |
| Project editable-files ZIP, `87-bulk-export.js` | `mounted-export-verification-editable-files.zip` | 27,165,891 | ZIP opened/extracted with CRC checks passing. Manifest contains one project material drawn as PPTX, DOCX and SVG; no `errors.txt`, no could-not-draw report. |

All three real files reached disk via Playwright's browser download event and were opened. A separate run exercised the native-writer branch using a test-only browser picker implementation that writes the **real generated Blobs** to disk; the unchanged source then reported eight of eight sizes exported, no **Too heavy** note, and **1 material** in the project ZIP. This verifies writer/acknowledgment flow, not an actual operating-system picker interaction; native OS dialogs remain manual-browser verification.

PPTX opened in LibreOffice Impress and DOCX in Writer, both exported to PDF and their first pages were visually inspected. SVG parsed successfully with the large-document XML option (13,872,983 bytes; embedded images exceed the parser's default buffer). Microsoft PowerPoint/Word and Adobe Illustrator are unavailable here, so their native openability and exact export parity remain **uncertified**. Observed differences include the PPTX photo fade and Writer's reading-order/font layout; opening is not fidelity certification. The issued html-to-image exporter emitted 45 cross-origin stylesheet-read diagnostics during the three-export run, but generated files opened; multilingual font fidelity remains unverified.

The anchor fallback now requests the browser download but rejects with `download_unconfirmed`, explicitly stating saving could not be confirmed and directing the user to check Downloads. A real PDF still reached disk in that fallback run, while the source correctly showed the unconfirmed message rather than claiming Saved. Native cancellation remains `download_cancelled`; failures remain `download_failed`. Sixteen focused save/adapter/engine tests passed, and preview build is OK.

Two-client realtime, concurrent updates and unauthorized write rejection are implemented but not end-to-end certified. The five adapter tests are not the 66-suite behavioral release gate. Reference passes do not certify this Cloud integration.

## Deliberately deferred / unmapped
Downloads are connected and the three requested exports are verified above. The agent and sampling remain disconnected; skill publishing is explicitly rejected. Presence is a separate **feature gap**: `99z2-presence.js` requires the `room` capability and `ROOM.presence()`, not the database adapter. It remains dark intentionally; no presence-over-database implementation was added. Upload/delete media, Firestore transactions, `where`, `add`, leases/`acquire` and `docChanges` are not supplied. No observed core Store round-trip requires these extended Firestore methods. Realtime refetches bounded snapshots rather than delivering Firestore document-change deltas; heavy concurrent-edit equivalence remains uncertified until two-client editing is exercised.

## Scope and migrations
No Bowl, NEXT, event, brand-kit or social-calendar area was changed. No existing material content was migrated. New schema SQL is preserved verbatim in `drizzle/migrations/0029_isolated_element_v221_store.sql` and `0030_element_v221_people_lookup.sql`.

Export verification is complete. The private Cloud-backed 66-suite gate is the next milestone, not covered by these export checks; presence follows it. Agent/sampling wait on Chris's explicit provider and budget decision. No release-gate route or presence was added in this export request.
