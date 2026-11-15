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

Two-client realtime, concurrent updates and unauthorized write rejection are implemented but not end-to-end certified. The five adapter tests are not the 66-suite behavioral release gate. Reference passes do not certify this Cloud integration.

## Deliberately deferred / unmapped
Exports, the agent, sampling and download capabilities are not connected; skill publishing is explicitly rejected. The source may still display their existing UI. Presence is a separate **feature gap**: `99z2-presence.js` requires the `room` capability and `ROOM.presence()`, not the database adapter. It remains dark intentionally; no presence-over-database implementation was added. Upload/delete media, Firestore transactions, `where`, `add`, leases/`acquire` and `docChanges` are not supplied. No observed core Store round-trip requires these extended Firestore methods. Realtime refetches bounded snapshots rather than delivering Firestore document-change deltas; heavy concurrent-edit equivalence remains uncertified until two-client editing is exercised.

## Scope and migrations
No Bowl, NEXT, event, brand-kit or social-calendar area was changed. No existing material content was migrated. New schema SQL is preserved verbatim in `drizzle/migrations/0029_isolated_element_v221_store.sql` and `0030_element_v221_people_lookup.sql`.

Stop here as requested: the reviewer sign-off round trip passed, but exports, agent, sampling, downloads and skill publishing remain deferred pending a separate request.
