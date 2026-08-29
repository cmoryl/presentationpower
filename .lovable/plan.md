# BoothHUB in the Element events area: federate first, absorb later

## Recommendation

Yes — keeping BoothHUB self-contained and linking to it from the events area is the better first move. A full port is a multi-month project; federation gets booths visible inside Element in days, and it keeps the option to absorb later.

## Why federation wins here

What I found in the BoothHUB project:

- 34 screens, 96 booth/event/expo components, 45 files using 3D rendering.
- ~130 database tables in its own backend, and ~100 backend functions.
- It is built on the older stack (React Router + `src/pages`), not Element's file-based routes.

Porting all of that means rebuilding routing, re-homing 100 backend functions, importing 130 tables, and reconciling the concepts both apps already have (events, brands, organizations, profiles, roles, knowledge, oracle). Federation avoids all of it up front, and BoothHUB keeps shipping independently while it happens.

## The federated design

**1. Booths become a first-class card in the events hub.**
Add a Booths entry alongside signage, badges, screens and agendas at `/events/booths`. It looks native to Element — Element chrome, tokens, typography — but the content comes from BoothHUB.

**2. A read-only catalog view inside Element.**
BoothHUB exposes a small public read API (booth systems, variants, cover images, division tag, deep link). Element fetches it server-side, caches it, and renders the results as Element cards. Users browse booths without leaving Element.

**3. Deep links hand off for the real work.**
Building, editing, the floor planner and the 3D hall viewer stay in BoothHUB. Clicking a booth opens it there, in a new tab, on the exact record. No 3D, no Leaflet, no expo tooling enters the Element bundle.

**4. Single sign-on so the handoff feels like one product.**
Both apps run on the same Lovable account system. Sign-in is shared so the jump does not prompt for a second login. Roles map across: Element admins are BoothHUB admins, sales/viewer stay read-only.

**5. Shared brand truth, one direction.**
Element stays the source of brand rules — palette, logos, approved lockups, division taxonomy. BoothHUB reads them rather than keeping its own copy, so booth output cannot drift from the approved TransPerfect system.

**6. Finished booth assets flow back.**
When a booth kit is approved in BoothHUB, its renders and specs land in Element's events library so they appear next to the rest of the event kit and go through Element's existing approvals and export paths.

## Trade-offs, stated plainly

- Two apps to maintain and publish, and a visible tab switch at the handoff.
- Deep-linked booth pages carry BoothHUB's look unless it is restyled to Element tokens (worth doing on the screens users land on).
- Search and reporting stay split until a later absorb phase.
- If BoothHUB's API is down, the Element booths tab shows a cached or empty state rather than failing the page.

## Build order

1. Booths card and `/events/booths` shell in Element, with placeholder data.
2. Read API on the BoothHUB side (catalog list + single booth).
3. Element fetches, caches and renders real booth cards; deep links out.
4. Shared sign-in and role mapping so the handoff is seamless.
5. Element brand tokens consumed by BoothHUB; restyle the landing screens.
6. Approved booth assets published back into the Element events library.

Steps 1–3 are the useful milestone: booths visible and browsable inside Element. Steps 4–6 make it feel like one product.

## Later, if you still want to absorb it

Federation does not close that door. The natural absorb order is booth catalog and variants first (contained, no 3D), then event↔booth links, and only then the expo floor planner and 3D viewer — the expensive parts. Nothing built here gets thrown away.

## What I need from you

- Confirm federate-first rather than full port.
- Confirm BoothHUB stays independently published at its own URL.
- Confirm the handoff style: new tab (recommended) or embedded inside the Element page frame.
