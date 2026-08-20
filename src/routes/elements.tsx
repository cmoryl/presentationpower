import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Presentation,
  Printer,
  CalendarDays,
  Share2,
  ArrowRight,
  Sparkles,
  Shapes,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ElementBrickRow, ElementBrickRail } from "@/components/brand/ElementBrickMotif";

export const Route = createFileRoute("/elements")({
  head: () => ({
    meta: [
      { title: "Elements · TransPerfect Element" },
      {
        name: "description",
        content:
          "Every Element surface in one place — presentation, print, event, and social modules, governed by the TransPerfect brand system.",
      },
      { property: "og:title", content: "Elements · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Browse the Element surfaces: presentation decks, print collateral, event kits, and social campaigns — all from one modular library.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ElementsLanding,
});

type Surface = {
  id: string;
  label: string;
  eyebrow: string;
  copy: string;
  accent: string;
  glow: string;
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: ReadonlyArray<{ label: string; to: string; search?: Record<string, string> }>;
};

const SURFACES: Surface[] = [
  {
    id: "presentation",
    label: "Presentation",
    eyebrow: "Modular decks · governed",
    copy: "Approved slide modules, style packs, and the deck agent — assembled into on-brand presentations and exported as editable PowerPoint.",
    accent: "#003FC7",
    glow: "#A1FBF9",
    to: "/library",
    icon: Presentation,
    items: [
      { label: "Slide modules", to: "/library" },
      { label: "My decks", to: "/library/my" },
      { label: "All decks", to: "/decks" },
      { label: "Imported decks", to: "/library/imported" },
      { label: "Deck agent", to: "/agent" },
      { label: "Canvas creator", to: "/admin/canvas" },
    ],
  },
  {
    id: "print",
    label: "Print",
    eyebrow: "Modular print · PDF/X-4",
    copy: "Case studies, spotlights, and e-brochures built from print section modules — page-accurate, editable, and press-ready at 300 DPI.",
    accent: "#EC388A",
    glow: "#FFEB66",
    to: "/library/print",
    icon: Printer,
    items: [
      { label: "Print templates", to: "/library/print" },
      { label: "Case studies", to: "/library/print", search: { type: "case-study" } },
      { label: "Client spotlights", to: "/library/print", search: { type: "spotlight" } },
      { label: "E-brochures", to: "/library/print", search: { type: "ebrochure" } },
      { label: "Section modules", to: "/library/print/modules" },
      { label: "Hero openers", to: "/library/print/heroes" },
    ],
  },
  {
    id: "event",
    label: "Events",
    eyebrow: "Modular playbooks · phased",
    copy: "Launches, flagship conferences, webinars, and executive briefings — each phase mapped to deliverables and rendered live in your palette.",
    accent: "#A6FA87",
    glow: "#C2A3FF",
    to: "/events",
    icon: CalendarDays,
    items: [
      { label: "Event assets", to: "/events" },
      { label: "New event asset", to: "/events/new" },
      { label: "Presets", to: "/events/presets" },
      { label: "Next-gen builder", to: "/events/next" },
    ],
  },
  {
    id: "social",
    label: "Social",
    eyebrow: "Modular campaigns · division-scoped",
    copy: "Turn a single module into a full social kit — anthems, product teases, milestones, and case spotlights sized for every channel.",
    accent: "#FF9B70",
    glow: "#EC388A",
    to: "/social",
    icon: Share2,
    items: [
      { label: "Social assets", to: "/social" },
      { label: "New social asset", to: "/social/new" },
      { label: "Presets", to: "/social/presets" },
      { label: "Banners", to: "/social/banners" },
    ],
  },
];

function ElementsLanding() {
  return (
    <AppShell>
      {/* ================= HERO ================= */}
      <section className="full-bleed relative -mt-6 overflow-hidden border-b border-white/10 bg-[#03002C] py-10 text-white sm:-mt-10 sm:py-16 lg:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full blur-[110px]"
            style={{ background: "#003FC7", opacity: 0.55 }}
          />
          <div
            className="absolute right-[-8%] top-[-10%] h-[360px] w-[360px] rounded-full blur-[120px]"
            style={{ background: "#A1FBF9", opacity: 0.22 }}
          />
          <div
            className="absolute bottom-[-30%] left-[38%] h-[380px] w-[380px] rounded-full blur-[130px]"
            style={{ background: "#C2A3FF", opacity: 0.2 }}
          />
        </div>

        <div className="relative flex gap-6">
          <ElementBrickRail
            thickness="10px"
            unit="9px"
            gap="6px"
            tone="spectrum"
            style={{ marginTop: 6 }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75 backdrop-blur">
                <Sparkles size={12} className="text-[#A1FBF9]" /> Element · Surfaces
              </span>
              <span className="hidden text-[11px] text-white/50 sm:inline">
                One modular design system · four output channels
              </span>
            </div>

            <h1 className="mt-6 max-w-3xl text-[42px] font-semibold leading-[1.04] tracking-tight sm:text-[56px]">
              Choose your element.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">
              Every TransPerfect Element surface starts from the same governed library — approved
              modules, style packs, and brand rules. Pick the channel and the system does the
              layout, typography, and export for you.
            </p>

            <ElementBrickRow thickness="6px" unit="7px" gap="5px" style={{ marginTop: 26 }} />

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                to="/brief/new"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#03002C] transition hover:bg-[#E0E8F5]"
              >
                Start from a brief <ArrowRight size={14} />
              </Link>
              <Link
                to="/library"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white/85 backdrop-blur transition hover:bg-white/[0.12] hover:text-white"
              >
                <Shapes size={14} /> Browse the library
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SURFACES ================= */}
      <section className="mt-10">
        <div className="grid gap-5 lg:grid-cols-2">
          {SURFACES.map((s) => {
            const Icon = s.icon;
            return (
              <article
                key={s.id}
                className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_18px_50px_-30px_rgba(3,0,44,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-28px_rgba(3,0,44,0.4)]"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-[80px] opacity-25 transition group-hover:opacity-40"
                  style={{ background: s.glow }}
                />
                <div className="relative flex items-start gap-5">
                  <ElementBrickRail
                    thickness="7px"
                    unit="6px"
                    gap="4px"
                    tone="mono"
                    accent={s.accent}
                    style={{ marginTop: 4 }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ background: `${s.accent}16`, color: s.accent }}
                      >
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0">
                        <div
                          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                          style={{ color: s.accent }}
                        >
                          {s.eyebrow}
                        </div>
                        <h2 className="text-xl font-semibold tracking-tight text-[#03002C]">
                          {s.label}
                        </h2>
                      </div>
                    </div>

                    <p className="mt-3 text-[13.5px] leading-relaxed text-black/65">{s.copy}</p>

                    <ul className="mt-4 grid grid-cols-2 gap-1.5">
                      {s.items.map((it) => (
                        <li key={`${it.to}:${it.label}`}>
                          <Link
                            to={it.to}
                            search={it.search ?? {}}
                            className="group/i flex items-center gap-2 rounded-xl border border-black/5 bg-[#F2F2F2]/70 px-3 py-2 text-[13px] font-medium text-black/75 transition hover:border-black/10 hover:bg-white hover:text-[#03002C]"
                          >
                            <span
                              aria-hidden
                              className="h-3.5 w-[3px] rounded-full"
                              style={{ background: s.accent }}
                            />
                            <span className="truncate">{it.label}</span>
                            <ArrowRight
                              size={12}
                              className="ml-auto shrink-0 opacity-0 transition group-hover/i:opacity-70"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={s.to}
                      className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
                      style={{ background: s.accent }}
                    >
                      Open {s.label} <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
