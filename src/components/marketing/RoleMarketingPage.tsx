/**
 * RoleMarketingPage — the advertising surface in front of each role workspace.
 *
 * One high-end landing page per persona (admin / marketing / sales): full-bleed
 * motion hero on the persona's plate, proof numbers, a feature bento, a
 * numbered workflow film-strip, a pull quote, an accordion FAQ and a close.
 * Copy comes from src/lib/role-marketing.ts; colour comes from the persona
 * theme, so all three pages read as distinct rooms in the same building.
 *
 * Everything decorative is compositor-only (opacity/transform) and skipped
 * under prefers-reduced-motion.
 */

import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Minus, Plus, Play, Quote } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { BackToTop } from "@/components/BackToTop";
import { HomeHeroVideo } from "@/components/home/HomeHeroVideo";
import adminDemo from "@/assets/role-demo-admin.mp4.asset.json";
import marketingDemo from "@/assets/role-demo-marketing.mp4.asset.json";
import salesDemo from "@/assets/role-demo-sales.mp4.asset.json";
import { personaTheme } from "@/lib/persona-theme";
import { roleMarketing } from "@/lib/role-marketing";
import { PERSONAS, PERSONA_STORAGE_KEY } from "@/lib/workspace-persona";
import type { PersonaId } from "@/lib/workspace-persona";

const ROLE_PATH: Record<PersonaId, string> = {
  admin: "/for/admin",
  marketing: "/for/marketing",
  sales: "/for/sales",
};

/** The 30-second process film for each role. */
const ROLE_FILM: Record<PersonaId, string> = {
  admin: adminDemo.url,
  marketing: marketingDemo.url,
  sales: salesDemo.url,
};

function Eyebrow({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <p
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
      style={{ background: `${color}1F`, color }}
    >
      {children}
    </p>
  );
}

function SectionHead({
  kicker,
  title,
  sub,
  ink,
  accent,
}: {
  kicker: string;
  title: string;
  sub?: string;
  ink: string;
  accent: string;
}) {
  return (
    <div className="max-w-3xl">
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: ink }}
      >
        {kicker}
      </span>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      <span
        aria-hidden
        className="mt-4 block h-1 w-24 rounded-full"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      {sub ? (
        <p className="mt-4 text-base leading-[1.55] text-black/60 dark:text-white/60">{sub}</p>
      ) : null}
    </div>
  );
}

export function RoleMarketingPage({ role }: { role: PersonaId }) {
  const copy = roleMarketing(role);
  const theme = personaTheme(role);
  const persona = PERSONAS.find((p) => p.id === role);
  const [open, setOpen] = useState<number | null>(0);
  const navigate = useNavigate();
  const filmRef = useRef<HTMLVideoElement | null>(null);

  /** Jump the film to a chapter and play from there. */
  function seek(at: number) {
    const v = filmRef.current;
    if (!v) return;
    v.currentTime = at;
    void v.play().catch(() => {
      /* autoplay blocked — the frame still moves to the chapter */
    });
  }

  // The dashboard reads its persona from local storage, so entering the
  // workspace from a role page should pre-select that room.
  function openWorkspace() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PERSONA_STORAGE_KEY, role);
      } catch {
        /* storage disabled — dashboard falls back to the role default */
      }
    }
    void navigate({ to: "/dashboard" });
  }

  return (
    <AppShell>
      {/* ---------------- HERO ---------------- */}
      <section className="relative isolate -mx-4 overflow-hidden lg:-mx-8">
        <div className="absolute inset-0" style={{ background: theme.base }} aria-hidden />
        <HomeHeroVideo mode={copy.plate} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(115deg, ${theme.base}F2 0%, ${theme.base}D9 46%, ${theme.base}A6 100%)`,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-52 size-[46rem] rounded-full blur-[120px]"
          style={{ background: `${theme.accent}47` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-56 -left-32 size-[38rem] rounded-full blur-[120px]"
          style={{ background: `${theme.accent2}3D` }}
        />

        <div className="relative mx-auto max-w-[1180px] px-4 pb-14 pt-16 sm:pt-24 lg:px-8">
          {/* Way back out — these pages are reached from the dashboard, so the
              return path has to be visible without relying on the browser. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={openWorkspace}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-sm text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Back to the {persona?.label ?? role} dashboard
            </button>
            <Link
              to="/"
              className="text-sm text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Home
            </Link>
          </div>

          {/* role switch — reads as an advertising ribbon, not app chrome */}
          <nav aria-label="Element by role" className="mt-5 flex flex-wrap items-center gap-2">
            {PERSONAS.map((p) => {
              const active = p.id === role;
              return (
                <Link
                  key={p.id}
                  to={ROLE_PATH[p.id]}
                  className={
                    "min-h-9 rounded-full px-3.5 py-1.5 text-sm transition-colors " +
                    (active ? "font-semibold" : "text-white/65 hover:text-white")
                  }
                  style={
                    active
                      ? { background: theme.accent, color: theme.base }
                      : { background: "rgba(255,255,255,0.08)" }
                  }
                >
                  {p.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
            <div className="min-w-0" style={{ color: theme.onHero }}>
              <Eyebrow color={theme.accent}>{copy.eyebrow}</Eyebrow>
              <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.03] tracking-[-0.03em] sm:text-6xl lg:text-[4.25rem]">
                {copy.headline[0]}
                <br />
                <span
                  style={{
                    background: `linear-gradient(96deg, ${theme.accent}, ${theme.accent2})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {copy.headline[1]}
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-[1.6] text-white/72 sm:text-lg">
                {copy.sub}
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to={copy.primary.to}
                  className="group inline-flex min-h-12 items-center gap-2 rounded-2xl px-6 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                  style={{ background: theme.accent, color: theme.base }}
                >
                  {copy.primary.label}
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                <Link
                  to={copy.secondary.to}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white/60"
                >
                  {copy.secondary.label}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={openWorkspace}
                  className="inline-flex min-h-12 items-center text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
                >
                  See the {persona?.label ?? role} workspace
                </button>
              </div>
            </div>

            {/* Element brick motif — captions the five things this role owns */}
            <ul className="grid gap-2">
              {copy.bricks.map((b, i) => (
                <li
                  key={b}
                  className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 [backdrop-filter:blur(14px)]"
                >
                  <span
                    aria-hidden
                    className="size-3.5 shrink-0 rounded-[4px]"
                    style={{ background: theme.bricks[i % theme.bricks.length] }}
                  />
                  <span className="min-w-0 truncate text-sm font-medium text-white">{b}</span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-white/45">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* No stat band here by design — the 30-second film below carries the
              proof, so the hero stays a single clear message. */}
        </div>
      </section>


      {/* ---------------- 30-SECOND FILM ---------------- */}
      <section className="mx-auto max-w-[1180px] py-16 sm:py-20">
        <SectionHead
          kicker={copy.demo.eyebrow}
          title={copy.demo.title}
          sub={copy.demo.sub}
          ink={theme.ink}
          accent={theme.accent}
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:items-start">
          <figure
            className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/12"
            style={{ background: theme.base }}
          >
            <video
              ref={filmRef}
              src={ROLE_FILM[role]}
              className="block aspect-video w-full"
              controls
              playsInline
              muted
              loop
              preload="auto"
              aria-label={`${persona?.label ?? role} process film — ${copy.demo.title}`}
            />
            <figcaption
              className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ background: `${theme.base}CC`, color: theme.accent }}
            >
              <Play className="size-3" aria-hidden />
              {copy.demo.runtime}
            </figcaption>
          </figure>

          <ol className="grid gap-3">
            {copy.demo.chapters.map((c, i) => (
              <li key={c.title}>
                <button
                  type="button"
                  onClick={() => seek(c.at)}
                  className="group w-full rounded-3xl border border-black/10 bg-white p-5 pl-6 text-left transition-[transform,border-color] hover:-translate-y-0.5 hover:border-black/25 dark:border-white/12 dark:bg-white/[0.04] dark:hover:border-white/30"
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-[4px]"
                      style={{ background: theme.bricks[i % theme.bricks.length] }}
                    />
                    <span className="font-mono text-[11px] text-black/45 dark:text-white/45">
                      {`0:${String(c.at).padStart(2, "0")}`}
                    </span>
                    <span className="min-w-0 flex-1 text-base font-semibold tracking-tight">
                      {c.title}
                    </span>
                  </span>
                  <span className="mt-2 block text-sm leading-[1.55] text-black/62 dark:text-white/62">
                    {c.body}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="mx-auto max-w-[1180px] px-0 py-16 sm:py-20">
        <SectionHead
          kicker={copy.featureKicker}
          title={copy.featureTitle}
          ink={theme.ink}
          accent={theme.accent}
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {copy.features.map((f, i) => (
            <li
              key={f.title}
              className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white p-6 pl-7 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-black/25 dark:border-white/12 dark:bg-white/[0.04] dark:hover:border-white/30"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ background: theme.bricks[i % theme.bricks.length] }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: `${theme.accent}2E` }}
              />
              <span
                className="relative inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ background: `${theme.ink}14`, color: theme.ink }}
              >
                {f.tag}
              </span>
              <h3 className="relative mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="relative mt-2 text-sm leading-[1.55] text-black/62 dark:text-white/62">
                {f.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- WORKFLOW ---------------- */}
      <section
        className="relative -mx-4 overflow-hidden px-4 py-16 sm:py-20 lg:-mx-8 lg:px-8"
        style={{ background: theme.base }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-1/2 size-[34rem] -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: `${theme.accent2}33` }}
        />
        <div className="relative mx-auto max-w-[1180px]">
          <div className="max-w-3xl" style={{ color: theme.onHero }}>
            <Eyebrow color={theme.accent}>End to end</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {copy.workflowTitle}
            </h2>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {copy.steps.map((s, i) => (
              <li
                key={s.title}
                className="relative rounded-3xl border border-white/12 bg-white/[0.05] p-6 [backdrop-filter:blur(14px)]"
              >
                <span
                  className="font-mono text-sm"
                  style={{ color: theme.bricks[i % theme.bricks.length] }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-[1.55] text-white/62">{s.body}</p>
                <span
                  aria-hidden
                  className="mt-5 block h-px w-full"
                  style={{
                    background: `linear-gradient(90deg, ${theme.bricks[i % theme.bricks.length]}, transparent)`,
                  }}
                />
              </li>
            ))}
          </ol>

          <figure className="relative mt-12 max-w-3xl rounded-3xl border border-white/12 bg-white/[0.05] p-7 [backdrop-filter:blur(14px)] sm:p-9">
            <Quote className="size-6" style={{ color: theme.accent }} aria-hidden />
            <blockquote className="mt-4 text-xl font-medium leading-[1.4] tracking-[-0.01em] text-white sm:text-2xl">
              “{copy.quote.text}”
            </blockquote>
            <figcaption className="mt-4 text-sm text-white/55">— {copy.quote.who}</figcaption>
          </figure>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="mx-auto max-w-[1180px] py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <SectionHead
            kicker="Answers"
            title={copy.faqTitle}
            sub="The things every team asks before they trust a system with the brand."
            ink={theme.ink}
            accent={theme.accent}
          />
          <ul className="divide-y divide-black/10 overflow-hidden rounded-3xl border border-black/10 bg-white dark:divide-white/10 dark:border-white/12 dark:bg-white/[0.04]">
            {copy.faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <li key={f.q}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex min-h-14 w-full items-center gap-4 px-5 py-4 text-left sm:px-6"
                  >
                    <span className="min-w-0 flex-1 text-base font-medium tracking-tight">
                      {f.q}
                    </span>
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-full"
                      style={{ background: `${theme.ink}14`, color: theme.ink }}
                    >
                      {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                    </span>
                  </button>
                  {isOpen ? (
                    <p className="px-5 pb-5 text-sm leading-[1.6] text-black/65 sm:px-6 dark:text-white/65">
                      {f.a}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------------- CLOSE ---------------- */}
      <section className="pb-20">
        <div
          className="relative overflow-hidden rounded-[32px] px-6 py-14 text-center sm:px-12"
          style={{
            background: `linear-gradient(120deg, ${theme.base} 0%, ${theme.base} 52%, ${theme.accent2}59 100%)`,
          }}
        >
          {/* Keeps reversed copy legible where the accent wash goes pale. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: `${theme.base}A6` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 size-[30rem] -translate-x-1/2 rounded-full blur-[110px]"
            style={{ background: `${theme.accent}3D` }}
          />
          <div className="relative mx-auto max-w-2xl" style={{ color: theme.onHero }}>
            <div aria-hidden className="mx-auto flex w-fit gap-1.5">
              {theme.bricks.map((b) => (
                <span key={b} className="size-3 rounded-[4px]" style={{ background: b }} />
              ))}
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              {copy.closeTitle}
            </h2>
            <p className="mt-4 text-base leading-[1.6] text-white/70">{copy.closeBody}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={copy.primary.to}
                className="group inline-flex min-h-12 items-center gap-2 rounded-2xl px-6 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                style={{ background: theme.accent, color: theme.base }}
              >
                {copy.primary.label}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <button
                type="button"
                onClick={openWorkspace}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white transition-colors hover:border-white/70"
              >
                Open the workspace
              </button>
            </div>
          </div>
        </div>
      </section>

      <BackToTop />
    </AppShell>
  );
}
