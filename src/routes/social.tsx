// /social — Social campaigns command center.
//
// Division-scoped playbook grid mirroring /events, plus the original
// favorites-to-kit entry point and kit-profile presets. Every playbook
// opens /social/demo/$id for a fully-rendered live preview.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Share2,
  Sparkles,
  Star,
  ArrowRight,
  Megaphone,
  Rocket,
  Trophy,
  Newspaper,
  BookOpen,
  Users,
  Handshake,
  Flame,
  Layers,
} from "lucide-react";
import { KIT_PROFILES } from "@/lib/social-formats";
import { useFavorites } from "@/lib/favorites";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
import { SOCIAL_PLAYBOOKS, SOCIAL_ANGLES, type SocialAngle, type SocialPlaybook } from "@/lib/social-playbooks";

export const Route = createFileRoute("/social")({
  head: () => ({
    meta: [
      { title: "Social · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Division-scoped social campaign playbooks — brand anthems, product teases, milestones, thought leadership — with live demo kits for every TransPerfect division.",
      },
      { property: "og:title", content: "Social · TransPerfect Modular" },
      {
        property: "og:description",
        content:
          "Division-scoped social campaign playbooks with live demo kits for every TransPerfect division.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://presentationpower.lovable.app/social" }],
  }),
  component: () => (<AppShell><SocialView /></AppShell>),
});

const ANGLE_ICON: Record<SocialAngle, React.ComponentType<{ size?: number; className?: string }>> = {
  "brand-anthem": Flame,
  "product-tease": Rocket,
  milestone: Trophy,
  "case-spotlight": Newspaper,
  "thought-leadership": BookOpen,
  recruitment: Users,
  hiring: Users,
  announcement: Megaphone,
  partnership: Handshake,
};

function SocialView() {
  const { favorites } = useFavorites();
  const favoritedVariants = useMemo(
    () => MODULE_VARIANTS.filter((v) => favorites.has(v.id)),
    [favorites],
  );

  const [angleFilter, setAngleFilter] = useState<SocialAngle | "all">("all");
  const visiblePlaybooks = useMemo<SocialPlaybook[]>(
    () =>
      angleFilter === "all"
        ? SOCIAL_PLAYBOOKS
        : SOCIAL_PLAYBOOKS.filter((p) => p.angle === angleFilter),
    [angleFilter],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-br from-[#003FC70a] via-white/60 to-[#EC388a15] p-8 sm:p-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
            <Share2 size={12} /> Social command center
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#03002C] sm:text-5xl">
            Every division. Every angle. One social system.
          </h1>
          <p className="max-w-2xl text-base text-black/65">
            Pre-built social playbooks for every TransPerfect division — brand anthems,
            product teases, milestones, thought leadership, and case spotlights — each
            seeded from a real module so previews render live in your palette.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="#playbooks"
              className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2 text-sm font-medium text-white hover:bg-[#003FC7]"
            >
              <Sparkles size={14} /> Explore playbooks ↓
            </a>
            <Link
              to="/social/new"
              className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-5 py-2 text-sm font-medium text-[#03002C] hover:border-[#003FC7]/50"
            >
              Start from a blank kit <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Playbooks" value={String(SOCIAL_PLAYBOOKS.length)} />
          <Stat label="Divisions" value={String(new Set(SOCIAL_PLAYBOOKS.map((p) => p.subBrand)).size)} />
          <Stat label="Angles" value={String(SOCIAL_ANGLES.length)} />
          <Stat label="Kit profiles" value={String(KIT_PROFILES.length)} />
        </dl>
      </header>

      {/* Angle filter */}
      <section id="playbooks" className="space-y-5">
        <SectionHead
          eyebrow="Playbooks"
          title="Division-scoped social kits"
          desc="Each card opens a rendered demo — real copy, real brand tokens, real cadence. Configure to make it yours."
        />
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={angleFilter === "all"} onClick={() => setAngleFilter("all")}>
            All angles
          </FilterChip>
          {SOCIAL_ANGLES.map((a) => {
            const has = SOCIAL_PLAYBOOKS.some((p) => p.angle === a.id);
            if (!has) return null;
            return (
              <FilterChip
                key={a.id}
                active={angleFilter === a.id}
                onClick={() => setAngleFilter(a.id)}
              >
                {a.label}
              </FilterChip>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visiblePlaybooks.map((p) => {
            const Icon = ANGLE_ICON[p.angle] ?? Share2;
            return (
              <Link
                key={p.id}
                to="/social/demo/$playbookId"
                params={{ playbookId: p.id }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/85 p-5 transition hover:border-[#003FC7]/50 hover:shadow-[0_10px_30px_-14px_rgba(3,0,44,0.25)]"
                style={{
                  background: `linear-gradient(160deg, ${p.accent}12 0%, rgba(255,255,255,0.9) 60%)`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${p.accent}22`, color: p.accent }}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-black/45">
                    {p.chip}
                  </span>
                </div>
                <div className="mt-4 text-lg font-semibold text-[#03002C]">{p.name}</div>
                <p className="mt-1 flex-1 text-sm text-black/60">{p.tagline}</p>
                <div className="mt-4 flex items-center justify-between text-[11px] text-black/55">
                  <span>{p.phases.length} beats · {p.deliverables.length} assets</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#003FC7] group-hover:text-[#03002C]">
                    Preview <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Kit profiles */}
      <section>
        <SectionHead
          eyebrow="Kit profiles"
          title="Bundle presets"
          desc="Skip the checkbox marathon — profiles pack the right formats for the moment."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {KIT_PROFILES.map((k) => (
            <Link
              key={k.id}
              to="/admin/campaigns/kit"
              search={{ profile: k.id }}
              className="group flex flex-col rounded-2xl border border-black/10 bg-white/80 p-4 transition hover:border-[#003FC7]/50"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
                  {k.formatIds.length} formats
                </div>
                <Layers size={14} className="text-black/40 group-hover:text-[#003FC7]" />
              </div>
              <div className="mt-2 text-base font-semibold text-[#03002C]">{k.label}</div>
              <p className="mt-1 flex-1 text-xs text-black/60">{k.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-[#003FC7]">
                Build kit <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* From favorites */}
      <section className="rounded-3xl border border-black/10 bg-white/70 p-6 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
              From favorites
            </div>
            <h2 className="mt-1 text-xl font-semibold text-[#03002C]">
              {favoritedVariants.length === 0
                ? "Bring your own module"
                : `${favoritedVariants.length} favorited module${favoritedVariants.length === 1 ? "" : "s"} ready`}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-black/60">
              Prefer to campaign a specific slide? Star modules in the{" "}
              <Link to="/library" className="text-[#003FC7] underline underline-offset-2">
                Presentation library
              </Link>{" "}
              and turn any KPI, quote, or cover into a full social run.
            </p>
          </div>
          <Link
            to={favoritedVariants.length === 0 ? "/library" : "/admin/campaigns/kit"}
            className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-xs font-medium text-white hover:bg-[#003FC7]"
          >
            <Sparkles size={12} />
            {favoritedVariants.length === 0 ? "Browse the library →" : "Choose from favorites →"}
          </Link>
        </div>

        {favoritedVariants.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {favoritedVariants.slice(0, 9).map((v) => (
              <Link
                key={v.id}
                to="/admin/campaigns/kit"
                search={{ source: v.id, profile: "social-essentials" }}
                className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-3 text-sm transition hover:border-[#003FC7]/40"
              >
                <Star size={14} className="mt-0.5 shrink-0 fill-amber-400 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-black/85">{v.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-black/45">
                    {v.familyId} · {v.id}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
        {eyebrow}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-[#03002C]">{title}</h2>
      {desc ? <p className="max-w-2xl text-sm text-black/60">{desc}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-black/45">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight text-[#03002C]">{value}</dd>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-[#03002C] bg-[#03002C] text-white"
          : "border-black/10 bg-white/70 text-black/70 hover:border-[#003FC7]/40 hover:text-[#03002C]"
      }`}
    >
      {children}
    </button>
  );
}
