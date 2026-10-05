import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { SlideSkinProvider } from "@/components/slide/SlideSkinContext";
import { DeckPackScope, deckPack, deckPackResolver, packBrand } from "@/components/slide/DeckPackScope";
import { useCloudDeckGate } from "@/hooks/use-cloud-deck-gate";
import { useDeckStore } from "@/lib/deck-store";
import { cloudLocalDeckId } from "@/lib/cloud-deck-import";
import { MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { resolveBrandMode } from "@/lib/brand-profiles";
import darkCobaltRise from "@/assets/looks/dark-cobalt-rise.jpg";
import darkLavenderBloom from "@/assets/looks/dark-lavender-bloom.jpg";
import darkMidnightDawn from "@/assets/looks/dark-midnight-dawn.jpg";
import darkHoloFlow from "@/assets/looks/dark-holo-flow.jpg";
import darkFlutedGlass from "@/assets/looks/dark-fluted-glass.jpg";
import lightPearlHolo from "@/assets/looks/light-pearl-holo.jpg";
import lightFlutedFrost from "@/assets/looks/light-fluted-frost.jpg";
import darkTriAurora from "@/assets/looks/dark-tri-aurora.jpg";
import darkDuskPrism from "@/assets/looks/dark-dusk-prism.jpg";
import darkNorthernGlow from "@/assets/looks/dark-northern-glow.jpg";
import lightTriPastel from "@/assets/looks/light-tri-pastel.jpg";
import lightSunriseVeil from "@/assets/looks/light-sunrise-veil.jpg";
import lightSpringMist from "@/assets/looks/light-spring-mist.jpg";
import darkTwinGlow from "@/assets/looks/dark-twin-glow.jpg";
import lightSkyHaze from "@/assets/looks/light-sky-haze.jpg";
import lightLavenderMist from "@/assets/looks/light-lavender-mist.jpg";
import lightAquaFloor from "@/assets/looks/light-aqua-floor.jpg";
import lightPrismFrost from "@/assets/looks/light-prism-frost.jpg";

// Bloom + straight-line families: six compositions per look, each keeping the
// content zone (left-centre) calm; generated procedurally as flat grounds.
const LINE_FILES = import.meta.glob("@/assets/looks/lines-*.jpg", { eager: true, import: "default" }) as Record<string, string>;
function lineSet(id: string): string[] {
  return [1, 2, 3, 4, 5, 6].map((n) => Object.entries(LINE_FILES).find(([k]) => k.endsWith(`lines-${id}-${n}.jpg`))?.[1]).filter(Boolean) as string[];
}

const DARK_ID = "7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001";
const LIGHT_ID = "7a6e1c52-0000-4e5a-9b1d-6e0a51ce0002";

type Look = {
  id: string;
  name: string;
  mode: "dark" | "light";
  note: string;
  /** Flat AI background; null keeps the master's current approved ground. */
  url: string | null;
  isNew?: boolean;
  /** Per-slide compositions; when set, slides cycle these instead of one image. */
  urls?: string[];
};

const LOOKS: Look[] = [
  { id: "current-dark", name: "Current dark", mode: "dark", note: "The approved dark master as it is today.", url: null },
  { id: "current-light", name: "Current light", mode: "light", note: "The approved light master as it is today.", url: null },
  { id: "cobalt-rise", name: "Cobalt Rise", mode: "dark", note: "Cobalt light blooms rising from the lower right.", url: darkCobaltRise, isNew: true },
  { id: "lavender-bloom", name: "Lavender Bloom", mode: "dark", note: "Lavender light blooms from the top right.", url: darkLavenderBloom, isNew: true },
  { id: "neon-bokeh", name: "Neon Bokeh", mode: "dark", note: "Soft-focus light blooms in cobalt, violet and magenta.", url: darkMidnightDawn, isNew: true },
  { id: "twin-glow", name: "Twin Glow", mode: "dark", note: "Blue and lavender light blooms on the right.", url: darkTwinGlow, isNew: true },
  { id: "tri-aurora", name: "Tri Aurora", mode: "dark", note: "Blue, lavender and aqua light blooms.", url: darkTriAurora, isNew: true },
  { id: "dusk-prism", name: "Dusk Prism", mode: "dark", note: "Blue, lavender and pink light blooms.", url: darkDuskPrism, isNew: true },
  { id: "northern-glow", name: "Northern Glow", mode: "dark", note: "Blue, aqua and green light blooms.", url: darkNorthernGlow, isNew: true },
  { id: "holo-flow", name: "Pearl Orbs", mode: "dark", note: "Pearly aqua, blue and lavender light blooms.", url: darkHoloFlow, isNew: true },
  { id: "fluted-glass", name: "Neon Drift", mode: "dark", note: "Blue, lime and violet light blooms.", url: darkFlutedGlass, isNew: true },
  { id: "sky-haze", name: "Sky Haze", mode: "light", note: "Aqua and sky blue light blooms, top right.", url: lightSkyHaze, isNew: true },
  { id: "lavender-mist", name: "Lavender Mist", mode: "light", note: "Lavender and blush light blooms, bottom right.", url: lightLavenderMist, isNew: true },
  { id: "aqua-floor", name: "Aqua Floor", mode: "light", note: "Aqua and blue light blooms along the bottom.", url: lightAquaFloor, isNew: true },
  { id: "prism-frost", name: "Prism Frost", mode: "light", note: "Blue, lavender and aqua light blooms on the right.", url: lightPrismFrost, isNew: true },
  { id: "tri-pastel", name: "Tri Pastel", mode: "light", note: "Sky blue, lavender and aqua light blooms.", url: lightTriPastel, isNew: true },
  { id: "sunrise-veil", name: "Sunrise Veil", mode: "light", note: "Peach, lavender and blue light blooms along the bottom.", url: lightSunriseVeil, isNew: true },
  { id: "spring-mist", name: "Spring Mist", mode: "light", note: "Aqua, green and blue light blooms in two corners.", url: lightSpringMist, isNew: true },
  { id: "pearl-holo", name: "Pearl Holo", mode: "light", note: "Pearly soft-focus lavender, aqua and coral.", url: lightPearlHolo, isNew: true },
  { id: "fluted-frost", name: "Golden Hour", mode: "light", note: "Blue, lavender and yellow light blooms.", url: lightFlutedFrost, isNew: true },
  { id: "prism-lines", name: "Prism Lines", mode: "dark", note: "Blue, lavender and aqua blooms behind fine light lines.", url: "", urls: lineSet("prism-lines"), isNew: true },
  { id: "cobalt-rail", name: "Cobalt Rail", mode: "dark", note: "Cobalt and aqua blooms with straight light rails.", url: "", urls: lineSet("cobalt-rail"), isNew: true },
  { id: "violet-beam", name: "Violet Beam", mode: "dark", note: "Violet, lavender and pink blooms through angled lines.", url: "", urls: lineSet("violet-beam"), isNew: true },
  { id: "aqua-shift", name: "Aqua Shift", mode: "dark", note: "Teal, aqua and blue blooms with soft line bands.", url: "", urls: lineSet("aqua-shift"), isNew: true },
  { id: "glass-sky", name: "Glass Sky", mode: "light", note: "Sky blue, aqua and lavender blooms behind frosted lines.", url: "", urls: lineSet("glass-sky"), isNew: true },
  { id: "lilac-rail", name: "Lilac Rail", mode: "light", note: "Lilac, blue and blush blooms with fine rails.", url: "", urls: lineSet("lilac-rail"), isNew: true },
  { id: "mint-beam", name: "Mint Beam", mode: "light", note: "Aqua, mint and blue blooms through light lines.", url: "", urls: lineSet("mint-beam"), isNew: true },
  { id: "dawn-lines", name: "Dawn Lines", mode: "light", note: "Peach, lavender and blue blooms with soft line bands.", url: "", urls: lineSet("dawn-lines"), isNew: true },
];

export const Route = createFileRoute("/masters/general-slides_/looks")({
  head: () => ({
    meta: [
      { title: "General Slides look explorer · TransPerfect Element" },
      { name: "description", content: "Preview the TransPerfect General Slides master in current and new dark-glow and light soft-focus looks." },
      { property: "og:title", content: "General Slides look explorer · TransPerfect Element" },
      { property: "og:description", content: "Switch the General Slides master between current and new background looks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LooksPage,
});

function LooksPage() {
  const [lookId, setLookId] = useState(LOOKS[0]!.id);
  const look = LOOKS.find((l) => l.id === lookId)!;
  const masterId = look.mode === "dark" ? DARK_ID : LIGHT_ID;
  return (
    <AppShell>
      <main className="mx-auto max-w-[1400px] px-6 py-10">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">General Slides master</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight">Look explorer</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Pick a look to see all 28 master slides in it. "Current" looks are the approved masters; the others are new
          AI-made flat backgrounds for review only. Nothing here changes the masters.
        </p>

        <div role="radiogroup" aria-label="Deck look" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {LOOKS.map((l) => {
            const on = l.id === lookId;
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setLookId(l.id)}
                className={`overflow-hidden rounded-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${on ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"}`}
              >
                <div
                  className="aspect-video w-full bg-cover bg-center"
                  style={{
                    backgroundImage: l.url ? `url(${l.url})` : undefined,
                    background: l.url ? undefined : l.mode === "dark" ? "#03002C" : "#EEF1F7",
                  }}
                />
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{l.name}</span>
                    {l.isNew && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">New</span>}
                  </div>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{l.mode === "dark" ? "Dark" : "Light"} · {l.note}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/decks/$deckId" params={{ deckId: masterId }}>Open the {look.mode} master</Link>
          </Button>
        </div>

        <LookDeck key={masterId} masterId={masterId} look={look} />
      </main>
    </AppShell>
  );
}

// Each slide frames the look differently (mirror + zoom into a different
// area) so the example deck reads as a family of grounds, not one repeated image.
const VARIATIONS = [
  { flip: "none", zoom: 1, offsetX: 0, offsetY: 0 },
  { flip: "x", zoom: 1.35, offsetX: -60, offsetY: -40 },
  { flip: "y", zoom: 1.6, offsetX: 70, offsetY: 50 },
  { flip: "xy", zoom: 1.25, offsetX: 40, offsetY: -70 },
  { flip: "x", zoom: 1.8, offsetX: 80, offsetY: 80 },
  { flip: "none", zoom: 1.5, offsetX: -80, offsetY: 60 },
  { flip: "y", zoom: 2.1, offsetX: -40, offsetY: -80 },
  { flip: "xy", zoom: 1.7, offsetX: 0, offsetY: 90 },
] as const;

function LookDeck({ masterId, look }: { masterId: string; look: Look }) {
  const routeId = `cloud-${masterId}`;
  const gate = useCloudDeckGate(routeId, "Loading the master deck…");
  const deck = useDeckStore((s) => s.decks[routeId] ?? s.decks[cloudLocalDeckId(masterId)]);
  const brand = useMemo(
    () => (deck ? packBrand(resolveBrandMode(deck.brandModeId, deck.subCompany), deckPack(deck)) : null),
    [deck],
  );
  if (!gate.ready && gate.fallback) return <div className="mt-10">{gate.fallback}</div>;
  if (!deck || !brand) return <p className="mt-10 text-sm text-muted-foreground">The master deck could not be loaded. Sign in and try again.</p>;
  const packFor = deckPackResolver(deck);
  const bg = look.url || look.urls?.length
    ? look.mode === "dark"
      ? { kind: "ai", url: look.url, scrim: "full", scrimStrength: 0.15, imageDim: 0, darkChrome: true }
      : { kind: "ai", url: look.url, scrim: "full", scrimStrength: 0.2, imageDim: 0, tint: "#FFFFFF", darkChrome: false, softFocus: true }
    : null;

  return (
    <section aria-label={`${look.name} slides`} className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
      {deck.slides.filter((s) => !s.hidden).map((slide, i) => {
        const variant = byId(MODULE_VARIANTS, slide.variantId);
        if (!variant) return null;
        const s = bg ? { ...slide, content: { ...(slide.content as object), background: look.urls?.length ? { ...bg, url: look.urls[i % look.urls.length] } : { ...bg, ...VARIATIONS[i % VARIATIONS.length] } } } : slide;
        return (
          <figure key={slide.id} className="overflow-hidden rounded-lg border border-border">
            <SlideSkinProvider skin={null}>
              <ScaledSlide>
                <DeckPackScope pack={packFor(slide)}>
                  <VariantRenderer
                    slide={s as never}
                    variant={variant}
                    brand={brand}
                    pageNumber={i + 1}
                    subCompany={deck.subCompany}
                    logoOrientation={deck.context?.logoOrientation ?? "horizontal"}
                    mode={look.mode}
                  />
                </DeckPackScope>
              </ScaledSlide>
            </SlideSkinProvider>
            <figcaption className="px-3 py-2 text-xs text-muted-foreground">Slide {i + 1}</figcaption>
          </figure>
        );
      })}
    </section>
  );
}
