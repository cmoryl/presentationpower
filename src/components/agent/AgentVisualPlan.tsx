/**
 * Renders the agent's visual design plan: the chosen look (palette, boxes,
 * layout families) plus the section treatment assigned to every slide.
 */

interface PlanSlide {
  title: string;
  scene: string;
  backdrop: string;
  role: string;
  visual_note?: string;
}

interface PlanOutput {
  skin?: {
    name?: string;
    mode?: string;
    description?: string;
    palette_roles?: Record<string, string>;
    typography?: string;
    motif?: string;
    geometry?: { card_note?: string; cover?: string; stats?: string; grid?: string };
  };
  recipe?: string | null;
  rationale?: string;
  slides?: PlanSlide[];
  warnings?: string[];
  error?: string;
}

export function planFromToolOutput(output: unknown): PlanOutput | null {
  if (!output || typeof output !== "object") return null;
  const o = output as PlanOutput;
  if (o.error) return o;
  if (!o.skin || !Array.isArray(o.slides)) return null;
  return o;
}

const BACKDROP_TONE: Record<string, string> = {
  loud: "bg-[#EC388A]/15 text-[#a01f5f]",
  "medium-loud": "bg-[#C2A3FF]/25 text-[#4b2f8f]",
  medium: "bg-[#A1FBF9]/35 text-[#0c6470]",
  quiet: "bg-foreground/[0.06] text-foreground/60",
};

export function AgentVisualPlan({ plan }: { plan: PlanOutput }) {
  if (plan.error) {
    return (
      <div className="rounded-xl border border-[#E53D2E]/30 bg-[#E53D2E]/[0.06] px-3 py-2 text-xs text-foreground/70">
        {plan.error}
      </div>
    );
  }
  const skin = plan.skin ?? {};
  const roles = Object.entries(skin.palette_roles ?? {});
  const geo = skin.geometry ?? {};

  return (
    <section className="w-full space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-xl">
      <header className="space-y-1.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/45">Visual direction</p>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold tracking-tight text-foreground">{skin.name}</h3>
          {skin.mode ? (
            <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-widest text-foreground/55">
              {skin.mode}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            {roles.map(([key, hex]) => (
              <span
                key={key}
                title={`${key}: ${hex}`}
                className="h-4 w-4 rounded-full ring-1 ring-black/10"
                style={{ background: hex }}
              />
            ))}
          </span>
        </div>
        {plan.rationale ? <p className="text-xs leading-relaxed text-foreground/70">{plan.rationale}</p> : null}
      </header>

      <dl className="grid grid-cols-2 gap-2 text-[11px] leading-snug text-foreground/65 sm:grid-cols-4">
        {[
          ["Type", skin.typography],
          ["Boxes", geo.card_note],
          ["Cover", geo.cover],
          ["Backdrops", skin.motif],
        ].map(([label, value]) =>
          value ? (
            <div key={label as string} className="rounded-lg bg-foreground/[0.04] px-2.5 py-2">
              <dt className="font-mono text-[9px] uppercase tracking-widest text-foreground/40">{label}</dt>
              <dd className="mt-0.5">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>

      <ol className="space-y-1.5">
        {(plan.slides ?? []).map((s, i) => (
          <li
            key={`${s.title}-${i}`}
            className="flex items-start gap-2.5 rounded-lg border border-border/40 bg-background/50 px-2.5 py-2"
          >
            <span className="mt-0.5 font-mono text-[10px] text-foreground/40">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground/85">{s.title}</p>
              <p className="text-[11px] leading-snug text-foreground/55">{s.visual_note ?? s.role}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                BACKDROP_TONE[s.backdrop] ?? BACKDROP_TONE.quiet
              }`}
            >
              {s.backdrop}
            </span>
          </li>
        ))}
      </ol>

      {plan.warnings?.length ? (
        <ul className="space-y-1 text-[11px] text-foreground/55">
          {plan.warnings.map((w, i) => (
            <li key={i}>· {w}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
