# New event map pipeline — learn, intake, research, start

Goal: the next event's maps start from what London taught us, with a clear list of what the venue must send, online research to help fill gaps, and one step that sets up the event.

## 1. Write London's map lessons into the learning logs
Add to the event lessons and decisions logs (picked up by the events assistant automatically):
- Ask for vector floor plans; picture scans never come out clean.
- Room colour only fills rooms closed by walls; close gaps by carrying the existing wall on along its own line, never by drawing new walls; open areas get a colour only after the reviewer names where they end.
- Remove catering lifts, voids and pillar dots from the plan, but keep the pillar positions so they still help close walls.
- Division colour per room, enterprise blue for house spaces, white/black logos with automatic colour fallback on pale rooms.
- "Find your way" page leads every map set; every export carries colours, key, logos and edits.
- Every coloured room is covered by a spill check.

## 2. "What we need from the venue" intake checklist
A checklist on each new event page, so we know what's in and what's missing:
- Floor plans per level (vector preferred; flags picture scans as "lower quality")
- Room list with names, capacities and floor
- Issued programme (sessions to rooms)
- Venue logo, address, dates, map web address for QR codes
- Partner/sponsor lockups, signage specs from the print vendor
Each item shows Received / Missing / Found online (needs confirming). The map set stays in draft until the required items are received.

## 3. Online research to help build maps
A "Research this venue" button (and an events assistant tool) that searches the web for the venue's published floor plans, room names, capacities, address and logo, then lists what it found with the source link for each.
- Results are suggestions, labelled "Found online — confirm with venue". Nothing found online is ever printed as issued fact until someone confirms it.
- A found floor-plan PDF can be attached as a reference for tracing, not used as the print master.
- Results are saved with the event so the search isn't repeated.

## 4. Make the map system work for any venue
Reuse the London map engine (looks, room colours, gradients, logos, key, Find your way page, all exports) for any venue record, instead of being wired to the QEII Centre. The existing venues page becomes the place where a new venue's floors and rooms live. London keeps working exactly as it does today.

## 5. "Start this event" step
From one sentence (city, venue, dates), set up: the event page and card, default agendas, a starting sign list, the intake checklist, and an empty map set waiting on the venue's floor plans — then run the online research automatically.

## Technical notes
- Lessons: append to `docs/EVENT-LESSONS.md` / `docs/EVENT-DECISIONS.md`; existing harvest syncs them into the event knowledge store.
- Research: server function using the built-in web search, results stored in a new table (event id, item, value, source URL, status suggested/confirmed/rejected) with RLS for signed-in admins; the AI gateway summarises pages into structured suggestions.
- Intake: new table for checklist items per event with status and uploaded file reference (private bucket).
- Generalisation: extract a venue-neutral floor data shape from the QEII modules; London becomes one data source feeding it. Done behind a flag so London output is compared file-for-file before switching.
- Start-event: new events assistant tool plus a button on the events page; creates records only, never invents rooms or facts.
- Order: 1 → 2 → 3 → 5 → 4 (4 is the largest and is done last so nothing blocks on it).
