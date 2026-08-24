// PERSONA HERO — the interactive stage at the top of each workspace dashboard.
//
// Every persona gets its own plate color, accent pair and five-brick Element
// motif (see src/lib/persona-theme.ts). The bricks are real controls: hover or
// focus one and the hero swaps to that workflow step with its own CTA, so the
// hero doubles as a step picker instead of static decoration. A pointer-tracked
// glow follows the cursor via CSS custom properties (compositor-only, no state
// churn) and is disabled under prefers-reduced-motion.

import { useCallback, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

import type { Persona, WorkKind } from "@/lib/workspace-persona";
import { personaTheme } from "@/lib/persona-theme";

export type HeroCounter = {
  kind: WorkKind;
  label: string;
  count: number | null;
  to: string;
};

export function PersonaHero({
  persona,
  counters,
  signedIn,
}: {
  persona: Persona;
  counters: readonly HeroCounter[];
  signedIn: boolean;
}) {
  const theme = personaTheme(persona.id);
  const plateRef = useRef<HTMLDivElement>(null);
  const steps = persona.steps.slice(0, 5);
  const [active, setActive] = useState<number | null>(null);
  const step = active === null ? null : (steps[active] ?? null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = plateRef.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  const onLeave = useCallback(() => {
    const el = plateRef.current;
    if (!el) return;
    el.style.setProperty("--mx", "70%");
    el.style.setProperty("--my", "20%");
  }, []);

  const Primary = persona.primary;
  const Secondary = persona.secondary;

  return (
    <section
      ref={plateRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={
        {
          "--mx": "70%",
          "--my": "20%",
          background: theme.base,
          color: theme.onHero,
        } as React.CSSProperties
      }
      className="full-bleed relative isolate mt-6 overflow-hidden border-y border-white/10 py-9 sm:py-12"
    >
      {/* Pointer glow + authored orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(38rem 26rem at var(--mx) var(--my), ${theme.accent}38, transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 -z-10 size-[26rem] rounded-full blur-3xl"
        style={{ background: `${theme.accent2}55` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 -z-10 size-[22rem] rounded-full blur-3xl"
        style={{ background: `${theme.accent}33` }}
      />

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ background: `${theme.accent}22`, color: theme.accent }}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {theme.kicker}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-[2.75rem] sm:leading-[1.05]">
            {step ? step.title : `${persona.label} workspace`}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed opacity-80">
            {step ? step.body : theme.blurb}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {step ? (
              <Link
                to={step.to}
                search={step.search}
                className="group inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
                style={{ background: theme.accent, color: theme.base }}
              >
                {step.cta}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            ) : (
              <Link
                to={Primary.to}
                search={Primary.search}
                className="group inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
                style={{ background: theme.accent, color: theme.base }}
              >
                {Primary.label}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            )}
            <Link
              to={Secondary.to}
              search={Secondary.search}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 text-sm font-medium"
              style={{ borderColor: `${theme.onHero}33`, color: theme.onHero }}
            >
              {Secondary.label}
              <ArrowRight className="size-4 opacity-70" aria-hidden />
            </Link>
          </div>

          {/* Live counters inline on the plate */}
          {signedIn && counters.length > 0 ? (
            <div className="mt-7 flex flex-wrap gap-2">
              {counters.map((c) => (
                <Link
                  key={c.kind}
                  to={c.to}
                  className="group inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm transition-colors"
                  style={{ background: `${theme.onHero}12`, color: theme.onHero }}
                >
                  <span className="text-lg font-semibold tabular-nums">
                    {c.count === null ? (
                      <span
                        className="inline-block h-4 w-6 animate-pulse rounded align-middle"
                        style={{ background: `${theme.onHero}33` }}
                      />
                    ) : (
                      c.count
                    )}
                  </span>
                  <span className="opacity-70">{c.label}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {/* Interactive Element brick stack — each brick is a workflow step */}
        <div className="lg:w-[19rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-55">
            Your workflow
          </p>
          <ul className="mt-3 space-y-2">
            {steps.map((s, i) => {
              const isActive = active === i;
              const color = theme.bricks[i % theme.bricks.length];
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(isActive ? null : i)}
                    aria-pressed={isActive}
                    className="flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-[background,transform] duration-200 hover:translate-x-0.5"
                    style={{
                      background: isActive ? `${theme.onHero}18` : `${theme.onHero}0A`,
                      color: theme.onHero,
                    }}
                  >
                    <span
                      aria-hidden
                      className="h-7 w-2.5 shrink-0 rounded-[3px] transition-[height,opacity] duration-200"
                      style={{ background: color, opacity: isActive ? 1 : 0.65 }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.title}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums opacity-50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
