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

## Not yet verified — full round trip is incomplete
Reviewer approval and its persisted sign-off hash have **not** passed. The unchanged source rejects approval by the last editor when another approver exists; a second authenticated approver is required to finish that check. No sign-off code was weakened. The attempted extended browser run did not finish; the persisted material remains Draft.

Two-client realtime, concurrent updates and unauthorized write rejection are implemented but not end-to-end certified. The five adapter tests are not the 66-suite behavioral release gate. Reference passes do not certify this Cloud integration.

## Deliberately deferred / unmapped
Exports, the agent, sampling and download capabilities are not connected; skill publishing is explicitly rejected. The source may still display their existing UI. Presence, upload/delete media, Firestore transactions, `where`, `add`, leases/`acquire` and `docChanges` are not supplied. No observed core Store round-trip requires these extended Firestore methods. Realtime refetches bounded snapshots rather than delivering Firestore document-change deltas.

## Scope and migrations
No Bowl, NEXT, event, brand-kit or social-calendar area was changed. No existing material content was migrated. New schema SQL is preserved verbatim in `drizzle/migrations/0029_isolated_element_v221_store.sql` and `0030_element_v221_people_lookup.sql`.

Stop here: do not connect exports, agent or skill downloads until the reviewer sign-off round trip passes.
