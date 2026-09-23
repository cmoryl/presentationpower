# One home per event

Goal: every event — London, San Francisco and each new one — has a single home page that gathers everything for that city in one place, instead of pieces spread across ~30 separate pages.

## What you'll see

**1. An Events list that shows every event together**
The Events page gets one "Your events" row: London, San Francisco and every event started from "Start a new event", each as a card with city, venue, dates and a progress bar (for example "5 of 9 ready"). "Start a new event" sits at the end of the row.

**2. One home page per event** (`/events/<event>`)
A header with the event name, venue, city and dates, then tabs:

```text
Overview | Checklist | Maps | Schedule | Agendas | Signage | Badges & pillars | Kiosks | Mart & price list | Knowledge
```

- **Overview** — what's ready, what's waiting and what's blocking, each with a "next step" button. Waiting items say what they wait on, in plain words (e.g. "the hotel's floor sheets").
- Each other tab opens that event's existing tool, already set to this event — no picking the city again. Tabs with nothing yet show what's needed to start instead of an empty page.
- Tabs that don't apply to an event can be hidden from its home page.

**3. London moves into the same structure**
London's home page is the same layout, with its current tools in the tabs (maps, schedule, revisions, booklet, signage template, agendas, mart). Every existing London link keeps working — old addresses open the matching tab.

**4. San Francisco and new events**
San Francisco's readiness list becomes its Overview. New events pick up the checklist, research, venue maps and default agendas automatically.

## What doesn't change
- No tool is rebuilt; the files, exports and print rules stay exactly as they are.
- No event facts are invented; empty tabs say what's missing.

## Technical notes
- One event registry (`src/lib/event-registry.ts`): static entries for London (`next` / QEII) and San Francisco (from `NEXT_EVENT`, `SF_VENUE`), merged with started events from `venue_plans` via `listStartedEvents`. Each entry lists its tabs and the route + search each tab opens.
- New layout route `src/routes/events.$eventId.tsx` (header + tab bar + `<Outlet />`) with `events.$eventId.index.tsx` (Overview) and one leaf per tab that embeds or links to the existing page component scoped by event id. Check for clashes with static `/events/*` routes (static routes win in TanStack Router).
- Progress = `summarizeIntake` for started events; `SF_READINESS` for San Francisco; a fixed ready list for London.
- Old London / SF URLs stay as-is and gain a "Back to event home" link; no redirects removed.
- Each new route gets its own `head()`.
- Order: registry → hub layout + Overview → tabs → Events list row → London/SF back-links → tests.
