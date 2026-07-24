// /admin/campaigns — campaign hub.
//
// Two surfaces live here:
//   1. Format registry — the typed geometries every renderer agrees on.
//   2. Demo grid — one renderer × N formats × N divisions, proving the
//      pipeline shape.
// The actual builder flow lives at /admin/campaigns/kit (favorites → kit).

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, Star } from "lucide-react";
import { SOCIAL_FORMATS, aspectClass, KIT_PROFILES } from "@/lib/social-formats";
import type { SocialFormat } from "@/lib/social-formats";
import {
  buildCampaignAssets,
  type CampaignSource,
  type EventFacts,
} from "@/lib/campaigns";
import { SocialRenderer } from "@/components/campaigns/SocialRenderer";
import { BRAND_MODES } from "@/lib/taxonomy";
import { useFavorites } from "@/lib/favorites";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/campaigns")({
  head: () => ({
    meta: [{ title: "Campaigns · Admin · TransPerfect Modular" }],
  }),
  component: CampaignsView,
});

// Demo divisions — pull from taxonomy so we never fork palette.
const DEMO_DIVISIONS = ["bm-tp-lifesci", "bm-tp-media"] as const;

const DEMO_EVENT: EventFacts = {
  name: "TransPerfect NEXT",
  subBrand: "bm-tp-lifesci",
  city: "New York",
  venue: "Pier 60",
  startDate: "2026-10-14",
  endDate: "2026-10-16",
  registrationUrl: "https://transperfect.com/next",
  hashtag: "#TPNext",
  speakers: [
    { name: "Ana Reyes", role: "Chief Localization Officer" },
    { name: "Priya Shah", role: "VP, Clinical Programs" },
  ],
  sponsors: [{ name: "TransPerfect", tier: "title" }],
  tone: "confident",
};

const DEMO_SOURCE: CampaignSource = {
  kind: "slide",
  variantId: "MV-KPI-DASHBOARD",
  title: "How language velocity moved 62 trials into readiness",
  summary:
    "A single deterministic queue reduced regulatory turnaround from 21 days to 6, and shipped in 34 languages without a hand-off.",
  stat: { value: "62", label: "trials in readiness" },
};

// Selected grid formats — a spread across every aspect class so the stress
// cases (story, wide landscape) show up next to the well-behaved ones.
const GRID_FORMAT_IDS = [
  "square-1080",
  "portrait-1080x1350",
  "story-1080x1920",
  "linkedin-link-1200x627",
  "callout-1200x628",
  "x-1600x900",
  "youtube-1280x720",
  "email-header-1200x400",
];

function CampaignsView() {
  const [mode, setMode] = useState<"light" | "dark" | "both">("dark");
  const { favorites } = useFavorites();
  const assets = useMemo(
    () =>
      DEMO_DIVISIONS.flatMap((brandId) =>
        buildCampaignAssets(
          DEMO_SOURCE,
          { ...DEMO_EVENT, subBrand: brandId },
          { formatIds: GRID_FORMAT_IDS, mode, brandId },
        ),
      ),
    [mode],
  );

  return (
    <div className="space-y-10">
      <AdminPageHeader
        eyebrow="Campaigns"
        title="Social & event asset scaffold"
        description="Typed geometry registry + one geometry-agnostic renderer + a stubbed source→copy→asset pipeline. AI copy adaptation lands next pass; today the flow is deterministic end-to-end."
        actions={
          <>
            <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] text-black/60">
              {favorites.size} favorited
            </span>
            <Link
              to="/admin/campaigns/kit"
              className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#03002C]"
            >
              <Sparkles size={12} /> Build a kit →
            </Link>
          </>
        }
      />

      {/* Kit profiles overview */}
      <AdminSection eyebrow="Kit profiles" title="Named bundles">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {KIT_PROFILES.map((p) => (
            <Link
              key={p.id}
              to="/admin/campaigns/kit"
              search={{ profile: p.id }}
              className="block rounded-2xl border border-black/10 bg-white/70 p-4 text-sm transition hover:border-[#003FC7]/40"
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
                {p.formatIds.length} formats
              </div>
              <div className="mt-1 font-medium text-black/85">{p.label}</div>
              <div className="mt-1 text-xs text-black/55">{p.description}</div>
            </Link>
          ))}
        </div>
      </AdminSection>

      {/* Favorites → kit entry point */}
      <AdminSection eyebrow="From favorites" title="Start from a favorited module">
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-black/15 bg-white/50 p-4 text-sm text-black/70">
          <Star size={16} className="fill-amber-400 text-amber-500" />
          <div className="flex-1">
            <span className="font-medium">
              {favorites.size === 0
                ? "No favorited modules yet."
                : `${favorites.size} favorited module${favorites.size === 1 ? "" : "s"} available.`}
            </span>{" "}
            <span className="text-black/55">
              Star modules in the library, then convert them into full kits.
            </span>
          </div>
          <Link
            to={favorites.size === 0 ? "/library" : "/admin/campaigns/kit"}
            className="rounded-full bg-[#03002C] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]"
          >
            {favorites.size === 0 ? "Browse library →" : "Choose from favorites →"}
          </Link>
        </div>
      </AdminSection>

      {/* Format registry table */}
      <AdminSection eyebrow="Registry" title={`Formats · ${SOCIAL_FORMATS.length}`}>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {SOCIAL_FORMATS.map((f) => (
              <FormatRow key={f.id} format={f} />
            ))}
          </div>
        </div>
      </AdminSection>

      {/* Mode toggle */}
      <AdminSection
        eyebrow="Demo grid"
        title={`${DEMO_DIVISIONS.length} divisions × ${GRID_FORMAT_IDS.length} formats × ${mode === "both" ? 2 : 1} mode(s) = ${assets.length} assets`}
        actions={
          <div className="inline-flex rounded-full border border-black/10 bg-black/[0.03] p-1 text-[11px] uppercase tracking-widest">
            {(["dark", "light", "both"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 transition ${
                  mode === m ? "bg-[#03002C] text-white" : "text-black/60 hover:text-black"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => {
            const brand = BRAND_MODES.find((b) => b.id === asset.brandId);
            return (
              <div key={asset.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-black/50">
                      {asset.format.label} · {asset.format.width}×{asset.format.height}
                    </div>
                    <div className="text-xs text-black/40">
                      {brand?.name} · {asset.mode} · {aspectClass(asset.format)}
                    </div>
                  </div>
                </div>
                <SocialRenderer
                  format={asset.format}
                  brandId={asset.brandId}
                  mode={asset.mode}
                  copy={asset.copy}
                  facts={{ hashtag: DEMO_EVENT.hashtag, registrationUrl: DEMO_EVENT.registrationUrl }}
                  displayShortEdge={280}
                />
              </div>
            );
          })}
        </div>
      </AdminSection>


      {/* Pipeline stub CTA */}
      <section className="rounded-3xl border border-dashed border-black/15 bg-black/[0.02] p-5">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-black/60">
          Campaign from content · Stub
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-black/60">
          Any deck slide, print asset, or module can seed a campaign. The pipeline
          extracts base copy today; the AI adapter slot is marked with{" "}
          <code className="rounded bg-black/10 px-1.5 py-0.5 text-[11px]">TODO(ai)</code> in{" "}
          <code className="rounded bg-black/10 px-1.5 py-0.5 text-[11px]">src/lib/campaigns.ts</code>.
        </p>
        <button
          type="button"
          onClick={() =>
            // Dry-run demo — logs the resulting CampaignAsset[] so we can
            // eyeball provenance + TODO markers without hitting a network.
             
            console.log("buildCampaignAssets sample →", assets.slice(0, 4))
          }
          className="mt-4 rounded-full bg-[#003FC7] px-4 py-2 text-[11px] uppercase tracking-widest text-white hover:bg-[#03002C]"
        >
          Create campaign from KPI-DASHBOARD slide (log)
        </button>
      </section>

      {/* Honest known limits */}
      <section className="rounded-3xl border border-amber-300/50 bg-amber-50/60 p-5 text-sm text-amber-950">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-amber-900/80">
          Aspect stress-test notes
        </h2>
        <ul className="mt-2 list-disc pl-5 leading-relaxed">
          <li>
            <b>Story / Reel 1080×1920</b> — pure scaling from the square preset leaves too much
            dead space around the title. Wants a bespoke portrait-tall preset with a
            centered lockup, larger CTA, and safe-area anchored middle-block.
          </li>
          <li>
            <b>X 1600×900 / Callout 1200×628 / Email 1200×400</b> — long summary is force-dropped
            because it never fits. Real solution is a shorter AI-adapted title (single
            clause) rather than the current summary strip.
          </li>
          <li>
            <b>Portrait 1000×1500 / 1080×1350</b> — hero-metric position is fine but a
            three-part stack (eyebrow / title / stat) needs a rhythm rule the shared
            preset doesn't yet encode.
          </li>
          <li>
            Kit-numbered assets (speakers grid, sponsor grid, advocacy variants) are
            <b> not</b> in scope here — they need bespoke layouts, not aspect-driven
            scaling. Renderer covers the geometry-agnostic 60%; the rest is future work.
          </li>
        </ul>
      </section>
    </div>
  );
}

function FormatRow({ format }: { format: SocialFormat }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-xs">
      <div className="min-w-0">
        <div className="truncate font-medium text-black/80">{format.label}</div>
        <div className="text-[10px] uppercase tracking-widest text-black/45">
          {format.platform} · {format.category}
          {format.kitId ? ` · kit ${format.kitId}` : ""}
        </div>
      </div>
      <div className="text-right text-[11px] text-black/60">
        <div>
          {format.width}×{format.height}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-black/40">
          {aspectClass(format)}
        </div>
      </div>
    </div>
  );
}
