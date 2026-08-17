# Server-side deck export as an MCP service — feasibility assessment

## Verdict

Feasible, but not worth building the browser-render service yet. A no-DOM `export_deck` MCP tool already ships in this project (`src/lib/mcp/tools/export-deck.ts` + `src/lib/mcp/export-deck.server.ts`): it loads the saved deck from the database as the calling user, drives the native-shape exporter, uploads to a private `deck-exports` area, and returns a 1-hour signed link. It is synchronous, PPTX-only, `editable`-only, capped at 40 slides, and reports back the slides whose artwork needs the in-app renderer.

So the real question is narrower than "how do we host Chromium": it is **whether the slides that come back today are correct enough to hand a client blind**. They are not, for a subset of variants — and that subset is exactly what the bento parity work is fixing. Recommendation: ship the cheap deep-link fallback now, keep the existing headless tool as the "good enough, honestly labelled" path, and sequence the browser-render service behind parity.

## 1. Where the render runs in production

| Option | Fit | Cost |
| --- | --- | --- |
| **No render host (current headless path)** | Already working. Native OOXML only; no plates, no DOM rasterization. | Zero. Fidelity gap is the price. |
| **Cloudflare Browser Rendering** | Best fit if we want real plates. Same account/edge as the Worker, no infra to own. Needs a binding, and the render step must fetch an authenticated app URL, so it needs a short-lived render token. | Medium. Session limits and per-render cost; a 20-slide deck with fonts and media is minutes of browser time, not seconds. |
| **External container (Fly/Render/Cloud Run + Playwright)** | Works, most control, matches the sandbox harness exactly. | Highest: a second deployable, its own secrets, its own auth boundary to the app. Outside what Lovable Cloud manages. |
| **Long-lived queue worker** | Not a render host by itself — still needs one of the two above. Useful only as the job runner. | N/A |

If we do this: Cloudflare Browser Rendering. Do not stand up a container for it.

## 2. Deck rendering vs variant rendering

There is no route today that mounts a whole saved deck purely for export. What exists:

- `src/lib/slide-exact-raster.tsx` — offscreen React root that rasterizes decor/ground/object/exact plates for a slide. This is the real workhorse and it is deck-agnostic.
- `src/routes/decks.$deckId.export.tsx` — the in-app export screen; it already loads deck + slides + context + style pack and calls the exporter with plate capture, i.e. the full-fidelity path.
- `/dev/export-verify` — fixture-driven, single variant. Not reusable for a real deck.

So a render host would point at a new headless-only route (`/dev/deck-export` style) that takes a deck id + a one-time render token, reuses the same loaders as the export screen, and returns base64. That is a thin route, not new export logic — the plate machinery is already deck-shaped.

## 3. Which fidelity is the default

`editable` — same as the app default and same as the current MCP tool.

Reasoning: `editable` produces native shapes and text an end user can actually edit in PowerPoint, which is the whole point of handing a file to a client. `layered` (DOM decomposition) looks closer on some variants but ships flattened plates for anything it can't decompose, and fixes to one path have repeatedly not reached the other.

Blunt part: **the divergence is real and unresolved.** Card seams, photo scrims, gauges and stat typography were just consolidated into shared primitives, and that consolidation has only reached the renderers it was applied to. A blind server export today will ship a correct file for native-emitter variants and a visibly weaker file for plate-dependent variants. The current tool is honest about this (`slides_needing_in_app_export`), and that honesty is the only reason it's shippable. Automating a higher-volume, fire-and-forget path before parity lands would multiply known-wrong slides. Sequence behind parity.

## 4. Auth and delivery

Already correct in the current tool and should not change:

- Deck ownership is enforced by reading `decks`/`deck_slides` through the caller's own token (RLS as the user). No service-role bypass on the ownership check.
- Bucket: private `deck-exports`, path prefixed with the caller's user id, RLS scoped to that prefix.
- TTL: 1 hour on the signed URL. Keep it. Long enough for a chat handoff, short enough that a leaked link dies.
- Durability: add a scheduled cleanup that deletes objects older than 24h, so an export of a private deck is not a permanent artifact sitting in storage. This is the one gap today.

## 5. Timing / async shape

Correct call — a plate-rendering export will not fit in one MCP call. Shape:

- `export_deck(...)` → creates a row in a new `deck_export_jobs` table (`queued`), enqueues the render, returns `{ job_id, status: "queued" }` immediately.
- `get_export_status({ job_id })` → `queued | rendering | ready | failed`, plus `download_url` + `expires_in` when ready, plus the degraded-slide list.
- The render host writes progress and the final object; the status tool signs on read so the TTL starts when the user actually asks.

The current synchronous tool can stay as-is for small decks (it already caps at 40 slides) and simply fall back to the job path above that threshold.

## 6. Font embedding

Both orderings are enforced in shared code that any path — browser or headless — goes through:

- `src/lib/pptx-presentation-order.ts` fixes child order inside `<p:presentation>`, with `p:embeddedFontLst` last and `p:notesMasterIdLst` after `p:sldIdLst`.
- `src/lib/pptx-font-embed.ts` injects the font list and explicitly does not hoist `notesMasterIdLst`.

A service path inherits both, because it calls the same exporter. The only new risk is font *fetching*: the headless path resolves `/fonts/` via `resolveAssetUrl`, so the render host must be given a reachable origin or embedding silently degrades. Guard it with an assertion that fails the job rather than shipping an unembedded file.

## Cheap fallback (ship this first)

An authenticated deep link: `/decks/:id/export?auto=pptx&fidelity=editable`. The MCP tool returns that URL instead of a file; the deck export screen opens already signed in, fires the existing full-fidelity export on load, and the browser download lands. Three user actions become one, the render happens on the user's own machine with the real DOM, and fidelity is exactly what the app produces today — no divergence, no render host, no job table.

Cost: one route search param plus an effect that triggers the existing export. Roughly a day.

## Recommended sequencing

1. **Deep-link auto-export** + storage cleanup for the existing `deck-exports` bucket. (~1 day)
2. **Bento/primitive parity work** — unchanged priority, separate track. The server export is gated on this.
3. **Async job shape**: `deck_export_jobs` table, `get_export_status` tool, synchronous tool falls back to it. (~2–3 days)
4. **Cloudflare Browser Rendering host** + headless deck-render route + one-time render token. (~1 week, plus tuning)
5. **PDF format** — there is no deck-level PDF exporter today (only print/PNG paths), so `format: "pdf"` is new work that depends on the render host. Do not promise it in the tool schema before step 4.

## Honest risks

- Browser Rendering session limits and cost on 20-slide decks with media; may need per-slide chunking.
- The render host needs an authenticated app URL — a render-token path is new auth surface and must be single-use and short-lived.
- Font embedding degrades silently if the origin is unreachable; needs a hard assertion.
- Adding `format: "pdf"` to the schema before the exporter exists means an external client will call it and fail.
- Biggest risk remains the parity divergence: a fast, automated export of wrong slides is worse than a slower correct one.
