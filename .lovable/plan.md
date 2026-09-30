# Faster set-up for the next venue: reuse the look, only create what's new

## Goal
The backgrounds, look and logos are already in the app. For a new venue, the only new work is: which signs it needs, what size they are, and what they say. This plan turns that into a short guided flow, so a full sign set can be made in one sitting.

## What you'll get

### 1. "Save as template" on any finished sign
- A button in the sign editor saves the current design to the template library, with its size, layers and editable text.
- You give it a name and a type (door, column, wall, room sign, directional, kiosk and so on).
- It stays a draft until an admin or brand lead approves it on the Approvals page.

### 2. Venue sign list (filled in once per venue)
- A new "Signs" tab on each venue page lists every sign spot: name, where it is (floor and room), width × height, one-sided or two-sided, and a photo.
- It can be filled in on a phone during the site survey.
- Nothing is guessed: a spot with no measured size stays marked "Needs measuring" and can't be exported for print.
- Any later event at that venue reuses the list.

### 3. "Build the sign set" in one click
- On the event page, choose a template for each type of sign spot once. For example, all room signs use "Room sign – portrait".
- The app makes a draft of every sign on the list at its measured size, filling in text from what's already published:
  - event name, dates and venue from the event record
  - room names from the published room list
  - sessions from the published agenda (room-door schedules)
  - map QR code and web address from the event
- Anything that isn't published stays blank and flagged, not invented.
- Each draft opens in the usual editor for tweaks.

### 4. Start from a past event
- "Copy from London 2026" (or any past event) brings across its template choices, sign types and wording.
- Venue-specific facts (rooms, sizes, dates) are not copied. They come from the new venue.

### 5. Review sheet and one export
- A single review page shows every sign in the set as a thumbnail, with a status: Ready, Needs text, Needs measuring or QA failed.
- "Download all ready signs" builds one zip. Every file still goes through the print checks, and files are named from the revision in force.

### 6. Set-up checklist
The event page shows what's left before the set can be built: venue floors, room list, agenda, sign list, template choices. Each item links straight to where you fix it.

## Not included
- The app won't choose sign sizes or wall positions. Those come from the site survey.
- No automatic layout "taste" learning. Designs carry forward only through saved templates.

## Technical section
- **Tables** (each migration: create, then GRANT, then enable RLS, then policies):
  - `sign_templates`: name, kind, source layout id, layers jsonb, w/h in inches, status draft/approved, created_by. Approval is enforced by a trigger that uses `has_role(admin|brand_lead)`, and templates are added to the `/approvals` Modules-style tab.
  - `venue_sign_spots`: venue_id, floor_key, room, label, kind, w_in, h_in, sides, photo_path in the private bucket, measured boolean.
  - `event_sign_sets` and `event_signs`: event_id, spot_id, template_id, filled fields jsonb, overrides, status.
- **Filling:** a pure `fillSignFromEvent(template, spot, facts)` function in `src/lib/sign-set.ts` takes facts from `NEXT_EVENT`/event records, the published `event_rooms` and the published `event_agendas`. Missing facts return flagged blanks. It is unit-tested.
- **Editor:** reuses the kiosk/Legal NEXT layer editor through `layout.sign`, with the size taken from the spot. Exports go through `gateOnQa` and the existing downloadSign path. Names use `r<NNN>-`, or `rdraft-` when unpublished.
- **Routes:** a Signs tab on `/events/venues/$slug`, and `/events/next/signs/$eventId` for building and reviewing the set, each with its own head().
- **Order of work:** tables, then save-as-template, then the venue sign list, then the fill function and its tests, then build-set and review, then copy-from-event, then the checklist. Finish with `bunx tsgo --noEmit`, `bunx vitest run` and a browser check.
