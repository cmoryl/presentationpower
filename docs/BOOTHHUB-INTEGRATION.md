# BoothHub ← Element: live kiosk artwork

Element publishes each partner kiosk's latest saved artwork as PNG proofs (front, left strip, right strip).
BoothHub should read them and paint them on the 3D booth faces.

## Endpoint (public, CORS open, cached 60 s)
- All booths: `GET https://transperfectelement.lovable.app/api/public/booths/next-sf`
- One booth:  `GET .../api/public/booths/next-sf?slug=<boothhub-slug>`

```json
{ "slug": "media", "name": "Media Subtitling, Dubbing & Distribution", "hasTv": true,
  "published3d": false, "revision": "2026-10-05T23:10:00Z", "kind": "proof",
  "art": { "front": "<signed url, 1h>", "left": "...", "right": "..." } }
```

## BoothHub changes
1. On loading a kiosk, fetch the booth by slug; if `art.front` exists use it as the front face texture, `left`/`right` for the return strips; otherwise keep BoothHub's built-in art.
2. Re-fetch when `revision` changes (poll every 60 s or on focus). Signed URLs expire after 1 hour — re-fetch, never store them.
3. Front proof includes 1/8 in bleed on every edge: crop 9 pt of 3258 × 6930 pt (≈0.28 % per side) before mapping.
4. The booth list (names, slugs, TV flag) is also in the response; use it instead of a hand-kept list.
5. Artwork is a proof for 3D only, never a print file.

## Embedded view (for the Element booth workspace)
6. When the URL has `chromeless=1&single=1`, hide BoothHub's own overlay controls (the "Orbit" button and the booth info card) and show only the 3D model on a plain background. Element draws its own Reset view / Fullscreen / Share controls around it.

## Signs (demo booth, screen surrounds, pillars)
7. Signs are in the same list with `"type": "sign"` and slugs matching BoothHub's sign ids (`sign:demo-booth`, `sign:surround-all`, `sign:surround-three`, `sign:welcome`, `sign:finance`). Fetch `...?slug=sign:demo-booth` and paint `art.front` (and `left`/`right` for the demo booth) on the model; keep built-in art only when `art` is empty. Element is the source of truth for artwork; BoothHub-side edits are only for users working in BoothHub itself.
