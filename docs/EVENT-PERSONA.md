# Events area — UX persona

Reference persona for every screen under `/events` (NEXT hub, city editions, division views, maps, schedules, signage, badges, kiosks, mart, registry). Check new work against the success criteria below before shipping.

## Primary persona: Maya, Event Marketing Lead

- **Role:** Marketing admin (brand_lead / brand_reviewer). Owns one or more NEXT city editions from brief to show day.
- **Works with:** Division marketers, sales enablement, venue contacts, print vendors, the design admin.
- **Context:** Juggles 2–3 editions at once (one live, one in production, one waiting for venue info). Often on a laptop between meetings, sometimes on-site on a tablet with poor Wi-Fi.
- **Skill:** Fluent in brand and print, not in the system's internals. Does not know or care what a module variant, revision table or brand mode is.

### Goals
1. Get from "which event?" to the right asset in two clicks: master event, then city edition, then division.
2. Launch a new city edition by reusing London's structure, look and templates without starting over.
3. Keep every printed piece correct: the right revision, dates, rooms, logos, colours and prices.
4. Hand vendors and divisions files they can open, edit and print without follow-up questions.
5. See at a glance what is ready, what is missing and who it is waiting on.

### Frustrations
- Competing selectors and pill navigation that make it unclear whether she is filtering a city or a brand.
- Zeros and blanks that don't say why ("0 booths": not issued yet, or broken?).
- Guessed data: invented rooms, boundaries, counts or facts that she then has to catch.
- Exports that look right on screen but lose colour, logos, keys or editability in PPTX/Word/AI.
- Colour bleeding past walls, cluttered floor plans, and logos that can't be selected.
- Warnings about unsaved work when nothing changed, and losing edits when the connection drops.
- Long inline grids where she has to scroll through 600+ templates to find one.
- Being sent into admin screens from a normal task.

### Behaviors
- Starts with a job ("guide attendees on-site", "print large-format"), not a department.
- Searches first, then filters by division or format.
- Previews before downloading, and downloads the full pack (ZIP/PDF) right before a vendor deadline.
- Edits live (room colours, prices, agendas), expects it to save automatically, and comes back days later expecting everything where she left it.
- Compares floors and editions side by side to check consistency.
- Pastes Canva links, venue PDFs and markup pages, and expects the system to follow them exactly.

### Content she needs
| Layer | Must show |
|---|---|
| Master event (NEXT) | Editions (live / upcoming / past / dates TBC), task cards, one search entry into master templates |
| City edition | Venue overview, readiness checklist, division tiles with real asset counts or a stated reason |
| Division view | That division's booths, room signs, track agendas and collateral only |
| Maps | Find your way page first, every room named and recolourable, approved logos (colour/white/black), key, all-floor export |
| Schedule / agendas | Room-linked sessions, divisions collapsed by default, times from the issued programme only |
| Production | Revision in force, draft vs published labelling, proof vs master labelling, QA result |
| Missing info | What is missing, who supplies it, and what is blocked until it arrives |

### Success criteria (the "100%" bar)
1. **Findability:** any asset reachable in 3 clicks or 1 search from `/events/next`.
2. **One selector per level:** city picks the edition, division picks within it; no competing controls, no pills, and the current selection is always visible.
3. **Honest states:** every zero, blank or disabled control explains itself; nothing is invented.
4. **Export parity:** SVG, AI, PDF, PPTX, DOCX and ZIP match the preview for colours, logos, keys and page order, and stay editable. Where a format can't match, say so on the download.
5. **Print safety:** every print download passes QA, carries the revision name (`r<NNN>` or `rdraft`), and labels proofs as proofs.
6. **Resilience:** autosave, offline/retry, conflict warnings and a dirty-exit warning only after real edits. Returning users resume where they stopped.
7. **Reuse:** a new city edition gets the full structure (tabs, checklist, templates, looks) on day one, with blanks only where venue facts haven't been issued.
8. **Accessibility:** text contrast of at least 4.5:1 (including over gradients), keyboard reachable, visible focus, and correct control semantics.
9. **No admin detours:** marketing tasks never require an `/admin` route.

## Secondary personas (in brief)
- **Division marketer:** wants only their division's kit for an edition. Success: they pick their division tile, see their assets and download them.
- **Sales enablement:** wants a finished event deck or one-pager. Success: one request, one link, one export, with no taxonomy terms.
- **Print vendor:** opens a shared link. Success: they always get the revision in force, with correct sizes, bleed and editable vector files.
- **Design admin:** maintains templates, venues and revisions. Success: changes flow to every edition, with lessons and decisions logged.

## Journey persona: Priya, New City Launch Owner ("Plan a new city")

- **Role:** Marketing admin handed a new NEXT city (for example Singapore) with a venue name, rough dates and a vendor deadline, but no floor sheets or programme yet.
- **Context:** Does the setup in short sessions over several weeks, starting with almost nothing. Venue facts arrive a piece at a time.

### Goals
1. Enter the city, venue and dates once and see them carried through every step.
2. Always know which step she's on (Venue record, then Floor plans, then Sign schedule, then City templates) and what comes next.
3. Start drafting signs and templates from the proven London sign families before the venue intake is locked.
4. See what's blocking each step, who supplies it, and what she can still do in the meantime.

### Frustrations (seen in the walkthrough)
- A step that drops her out of the flow into a different menu or page title (Venue record used to land in "Venues & floor-plan standards").
- No Back or Next buttons, so she has to know where to go on her own.
- Placeholder text and repeated boxes asking her to type the city again.
- Two steps sharing one highlight, so she can't tell where she is.
- Rounded or overlapping labels that look unfinished, and draft work lost when the browser session ends.

### Behaviours
- Works through the steps in order the first time, then jumps straight to one step on return visits.
- Moves on before a step is complete and expects a clear "Pending venue intake" label rather than a locked dead end.
- Checks her new city against London to confirm it matches.

### Success criteria
1. **One journey:** the four-step bar shows on every step, the current step is highlighted alone, and the heading matches the step name.
2. **Always a way forward:** every step has Back and Next buttons, and nothing takes her to an `/admin` page.
3. **Type once:** city, venue and dates carry into every step and are still there when she comes back another day.
4. **Honest gates:** each locked item names what's missing and who supplies it. Nothing is invented and no count is shown without explanation.
5. **Draft early:** the sign schedule and city templates can be drafted from shared defaults while the intake is pending, and are kept separate from London's saved files.
6. **Finished feel:** square corners, no overlapping labels, visible focus outline, and fits the screen on phone, tablet and desktop.

## Open gaps against this persona
- Plan a new city: the city and venue carry forward only within one browser session, and the "Add a space" buttons are still rounded.
- Editions jump/focus and measured contrast are not yet verified.
- The London panel count shows 168, not 54 scenic panels; this needs a decision.
- PPTX/Word flatten room gradients.
- Exports for venues other than QEII, the QEII logo, the Find your way QR restyle and room logo-over-name labels are not built yet.
- San Francisco is waiting for issued venue sheets and its programme.
