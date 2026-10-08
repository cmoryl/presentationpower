# Master NEXT event brand kit

One home for the NEXT look, which every future city starts from. You can open it in the app, share it with agencies and printers, download it as a single pack, and mirror it in Canva.

## What gets built

1. **Brand kit page** at `/events/next/brand-kit`, linked from the NEXT events hub. It replaces nothing. It brings together what already exists:
   - **Logos & lockups**: the NEXT master plus every division NEXT lockup (stacked, side-by-side, color/white/reverse), on light and dark grounds, with clear-space and don'ts.
   - **Colour & type**: the NEXT division colours (HEX, RGB, CMYK, Pantone from the supplied palette), the event gradients and grounds, Geist type sizes for signage and digital, and print notes (RGB house space, supplied CMYK kept as is, ⅛ in bleed).
   - **Sign templates**: one card per family, read from the existing template list: pillars, desks, kiosks, demo booths, lift wraps, stairs, screen surrounds, pedestals. Each card opens its editor and its master.
   - **Digital & slides**: social formats, agenda boards and the general slide masters.
   - **Starting a new city**: a short checklist of what to copy, what to fill in from the site survey, and what never to invent. It draws on the event lessons and decisions logs.
2. **Partner share link**: admins can create a sign-in-free link that expires, for agencies and printers. The shared view is read-only. It shows logos, colours, type, template previews and downloads only, with no editors, author names or private event data.
3. **Download pack**: one ZIP containing the logos (SVG/PNG), the palette (CSV/JSON/TXT), the Geist fonts with their licence, the supplied template masters, a brand-rules PDF and a README. It's built from the same data as the page, so the two always match. The ZIP has a version number, and its downloads go through the existing print checks.
4. **Canva brand kit**: using the connected Canva account, list the existing brand kits and templates. Then upload the NEXT logos and import the brand-rules PDF as a Canva design. Canva's connection can't create brand kits or set kit colours and fonts, so you'll need to add those yourself in Canva. The page gives you the exact values to copy in.

## Division colours

Like the signage, NEXT events are an exception to the enterprise-only rule. Division colours appear only in the NEXT kit and are labelled as event-only. I'll save this as a memory rule.

## Not changing

Existing templates, layouts, masters, the room and venue lists, 3D/BoothHub links and demo booth work stay as they are. Nothing is recoloured or converted.

## Technical details

- New `src/lib/next-brand-kit.ts`: assembles sections from `next-brand-guide.ts`, `next-event-logos.ts`, the palette files, `loadNextRegistry()`/`suppliedTemplateRows()` and `social-formats`. There's no duplicated data.
- New routes: `events.next_.brand-kit.tsx` (signed in) and `share.next-brand-kit.$token.tsx` (public), each with its own head().
- Migration: a `next_brand_kit_shares` table (token ≥16 characters, expires_at, created_by) → GRANT → RLS (admin/brand_lead manage) → a SECURITY DEFINER `get_next_brand_kit_share(token)` that returns only a valid/expired flag. Public assets are served through the existing signed-URL proxy.
- `src/lib/next-brand-kit-zip.ts` is built on the same pattern as `next-london-kit-zip.ts`. Brand-rules PDF via the existing guide PDF builder.
- Add a link in the events hub. Record the AGENTS.md rule: "NEXT brand kit content is assembled from existing registries only." Save a memory note for the division-colour exception.
- Verify: `bunx tsgo --noEmit`, `bunx vitest run`, a browser check of the page, the share link signed out, and the ZIP contents.
