# Event assets: add agendas, floor plans and room lists in the app

## Problem
The San Francisco "Production status" rows (Locked / Pending venue intake) have fixed text. Nothing on them leads to a page where you can add the missing items. Agendas are built into the app's code, so only a Lovable change can update them.

## What you'll get

### 1. "Event assets" page for each event
This is the existing intake page, rebuilt at `/events/next/intake/<event>` and linked from the event page. It has three sections:

- **Agenda**
  - **Paste a web link** or **upload a file** (PDF, Word, Excel/CSV). AI reads out the day, time, title, speakers, room and division for each session.
  - The results show in an editable table. You can fix a row, add or delete rows, or mark a room as "to be confirmed". Nothing is guessed: empty fields stay empty and are flagged.
  - **Save draft** is open to any signed-in staff. **Publish** is for admins and brand leads only.
  - Each publish keeps a numbered version, so an earlier one can be restored.
- **Floor plans**
  - Upload PDF or image floor plans per level.
  - They go straight into the venue maps editor, and the floor plan intake item is marked received.
- **Room list**
  - Paste a link or upload a file. Rooms are read out into an editable table: name, level and capacity if given.
  - Admins and brand leads publish it.
  - Published rooms become the room choices in the agenda table and in room signage.

### 2. Live production status
- On the San Francisco page (and on any event page that uses the same component), each status is worked out from what has actually been published.
  - Example: Division agendas become "Ready" once an agenda is published and every session has a room.
- Every "Pending" row gets an **Add it** button that opens the right section of the Event assets page.
- Rows show "Locked" only for issued facts (venue and dates), with a short line saying why.

### 3. Agenda boards use the published agenda
- The agenda board builder loads the newest published agenda for the event.
- If none is published, it falls back to today's built-in San Francisco and London programmes, so nothing changes until someone publishes.
- A board shows which version it was built from.

## Who can do what
- Signed-in staff: view, import and save drafts.
- Admins and brand leads: publish agendas and room lists, and restore versions.
- The database rules enforce this, not just the buttons.

## Technical section
- **New tables** (create, then GRANT, then enable RLS, then policies):
  - `event_agendas` (event_id, version, status draft/published, sessions jsonb, source_url, source_file, created_by, published_by/at; UNIQUE event_id+version).
  - `event_rooms` (event_id, version, status, rooms jsonb, same audit fields).
  - Anyone signed in can read. Anyone signed in can insert or update their own drafts. A trigger blocks status='published' unless the user has `has_role(admin)` or `has_role(brand_lead)`. Published rows cannot be changed or deleted.
- **Private storage bucket `event-intake`** for uploaded files, read through signed URLs. Floor plans reuse the existing `event_map_floors` flow.
- **Server functions** in `src/lib/event-assets.functions.ts`, using `requireSupabaseAuth`:
  - `importFromUrl`: fetches the page, strips it to text and sends it to the Lovable AI gateway to extract sessions as JSON.
  - `importFromFile`: PDF/DOCX text is extracted in the browser; CSV/XLSX is parsed in the browser.
  - Plus `saveDraft`, `publish`, `listVersions` and `getPublishedAgenda`.
  - The extraction prompt forbids filling in missing fields, and results are checked against the source text: a title that isn't found in the source is flagged.
- `next-agenda.ts` gets a resolver that prefers a published `event_agendas` row over the built-in programme, mapped to `AgendaSession`.
- The status rows are built from the published agenda and room rows plus `event_intake_items`, and replace the fixed `GATES` array on `events.next_.san-francisco.tsx`.
- Tests: extraction flag logic, the publish-permission trigger (SQL check), the resolver fallback, and the status rules. Then typecheck, full tests, and a browser check of import, edit and publish.

## Not included
- Google/Outlook calendar sync and automatic re-reading of the web link. Re-import is manual.
- Scanned floor plans are stored as images and not turned into room shapes. Rooms come from the room list.
