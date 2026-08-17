# Export a PowerPoint over MCP

Goal: let a connected assistant (Claude, ChatGPT, Cursor) ask for a deck as a `.pptx` and get back a download link — without the app being open in a browser.

## The one real constraint

The shipping export is a browser-side pipeline. Confirmed in `src/lib/pptx-export.ts`: the default `editable` fidelity mounts every slide in a hidden React root, rasterizes the decor ground (`slide-exact-raster.tsx` → `html-to-image`), measures text runs from real DOM ranges (`export-text-lines.ts` uses `document.createRange()`), and decomposes live CSS (`export-dom-decompose.ts` uses `getComputedStyle`). None of that exists in the server runtime, and a headless browser can't run there either.

The good news: those passes are already gated on `typeof document !== "undefined"`, so the exporter degrades instead of crashing. 121 of the 191 module variants have a native OOXML emitter (`hasNativeVariantEmitter` in `export-native-variants.ts`) and need no DOM at all.

So the MCP export is a **native-only export**, honest about its limits:

- Slides on the 121 native variants export exactly as they do today.
- Slides on the remaining variants normally rely on a captured plate; server-side they fall through to the family-generic renderer. The tool reports those slides by name so the assistant can tell the user which ones to re-export from the app for pixel-exact artwork.

## What gets built

1. **Server-safe shims** so the native path runs clean with no DOM:
   - Fonts: `pptx-font-embed.ts` fetches `/fonts/Geist-*.ttf` relative, which has no base URL on the server. Resolve against the request origin.
   - Logo ratios: `export-image-aspect.ts` measures with `new Image()`. Add a dependency-free byte-header reader (PNG/JPEG/GIF/WebP) so exact logo aspect — a hard requirement — still holds server-side.
   - Any other relative asset URL the exporter embeds gets origin-resolved the same way.
2. **A headless export entry** (`src/lib/mcp/export-deck.server.ts`): loads deck, slides, brand, style pack and background overrides through the caller's client (RLS applies), calls `exportDeckPptx` with `output: "blob"`, `fidelity: "editable"`, no debug manifest, and a slide cap so the call stays inside the MCP client timeout.
3. **Delivery**: upload the bytes to a new private `deck-exports` bucket under `<user id>/<deck id>/<timestamp>.pptx`, return a 1-hour signed URL. Same pattern the imagery and client-logo functions already use.
4. **The MCP tool** `export_deck` (`src/lib/mcp/tools/export-deck.ts`), registered in `src/lib/mcp/index.ts`: inputs `deck_id`, optional `mode` (light/dark), `embed_fonts`, `background_in_master`. Returns the signed URL, slide count, and the per-slide fidelity report. Then re-run the MCP manifest extract so the Agent integrations panel picks it up.
5. **Tests**: a vitest run that exports a small deck with `document` undefined and asserts the zip contains the expected parts, no relative-URL fetch is attempted, and native-variant slides carry native shapes.

## Notes

- Nothing about the in-app export changes; this adds a second, DOM-free entry into the same exporter.
- Export stays synchronous and bounded (no rasterization, no plate passes), which is what keeps it viable as an MCP tool call.
- If a deck is mostly non-native variants, the tool says so in its result rather than quietly shipping degraded slides.
