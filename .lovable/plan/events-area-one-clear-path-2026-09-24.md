# Events area: one clear path

## The problem
The events area has grown into too many pages that do similar things. A user today can meet:
- Two separate event homes (`/events` and `/events/next`) that barely link to each other, plus a third generic event home (`/events/<event>`) that duplicates the London and San Francisco pages.
- Six "plan the event" pages whose names blur together: Venue directory, Floor plan standards, Provisional venue intake, Start a new city, Signage playbook, Event knowledge. Three of them all answer "what do I build for a new location?"
- Page headings that don't match the menu labels (e.g. menu "Start a new city", heading "Start the next city from the London families").
- San Francisco missing from the NEXT menu, so the "Plan the event" tabs show the wrong set there.
- London and San Francisco pages built in different orders, so moving between cities feels like two different apps.
- "Start a new city" and "Provisional venue intake" written as if every city is London.

## The flow we're aiming for

```text
Events  ->  NEXT (series)  ->  City edition  ->  Division  ->  Asset
                 |                  |
                 |                  +- Overview (venue, dates, status)
                 |                  +- Rooms & maps
                 |                  +- Schedule & agendas
                 |                  +- Signage & panels
                 |                  +- Downloads
                 |
                 +- Plan a new city (one guided page)
                 +- Master templates (search)
                 +- Knowledge & retro
```

Rule: one picker per level, one place to start each job, and the same section order in every city.

## Changes

1. **Link the two homes.** `/events` gets a clear "NEXT event series" entry at the top. `/events/next` gets an "All events" breadcrumb back.
2. **Pick one home per city.** London and San Francisco open on their NEXT city pages. The generic `/events/<event>` home stays for events started outside NEXT, and redirects to the NEXT page when one exists.
3. **Same city layout everywhere.** London and San Francisco both follow Overview → Divisions → Rooms & maps → Schedule & agendas → Signage & panels → Downloads → Reference. Sections waiting on the venue intake show a "Pending venue intake" label, not a missing section.
4. **Fold six planning pages into three menu items:**
   - **Plan a new city**: one guided page, steps 1–4: venue record → floor plans (provisional until confirmed) → sign schedule from the proven families → city templates. It replaces Start a new city and Provisional venue intake as starting points. Both old addresses keep working and open the matching step.
   - **Venues & floor-plan standards**: the directory and the standards together, as two tabs.
   - **Playbook & knowledge**: signage families plus lessons/retro.
5. **Headings match menu labels** on every events page, word for word.
6. **Add San Francisco (and future cities) to the NEXT menu** so the right tabs and current-page underline show.
7. **Stop assuming London on generic pages.** Wording says "from the proven families (first built for London)". The source city becomes a choice, with London as the default.
8. **Breadcrumbs on every events page** (Events / NEXT / London / Games), so no page is a dead end.

## Check before calling it done
- Walk the task paths signed in: new city, London room colour change, San Francisco kiosk download, find a template by search, open a Games agenda for London. Each should take 3 clicks or 1 search.
- Phone, tablet and desktop: no page wider than the screen, visible focus outline.
- Full test suite and code checks pass; every old address still opens something sensible.

## Technical notes
- `src/lib/next-workspace.ts`: regroup the entries, add `san-francisco` as a city edition, and use the label as the single source for page headings.
- New `EventBreadcrumbs` component; the city section order moves into a shared `CityEditionLayout` used by both city routes.
- `/events/next/city` gains a stepper; `/events/next/venue` becomes a redirect to `/events/next/city?step=floors`. The venues/locations merge uses tabs on one route, and the other route redirects to it.
- `/events/$eventId` gets a `beforeLoad` redirect for built-in NEXT editions.
- No database changes.
