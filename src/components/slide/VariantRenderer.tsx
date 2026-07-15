import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import { SlideFrame } from "./SlideChrome";
import type { DeckSlide } from "@/lib/deck-store";

type Props = {
  slide: DeckSlide;
  variant: ModuleVariant;
  brand: BrandMode;
  pageNumber: number;
};

type Item = Record<string, unknown>;
const s = (v: unknown, fb = ""): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : fb);
const arr = (v: unknown): Item[] => (Array.isArray(v) ? (v as Item[]) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const strs = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).map((x) => s(x)) : []);

export function VariantRenderer(props: Props) {
  const { slide, variant, brand, pageNumber } = props;
  const c = slide.content as Record<string, unknown>;

  switch (variant.id) {
    // ── Opening ────────────────────────────────────────────────────────
    case "MV-OP-COVER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-end">
            <div className="text-3xl uppercase tracking-[0.3em] opacity-70">Prepared for</div>
            <div className="mt-6 text-[110px] font-semibold leading-none">{s(c.title, "Client")}</div>
            <div className="mt-10 max-w-4xl text-4xl opacity-90">{s(c.subtitle)}</div>
            <div className="mt-16 flex gap-16 text-2xl opacity-80">
              <div>{s(c.presenter)}</div>
              <div>{s(c.date)}</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-MEDIA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${brand.tokens.primary} 0%, ${brand.tokens.ink} 100%)`,
              opacity: 0.85,
            }}
          />
          <div className="relative flex h-full flex-col justify-end text-white">
            <div className="text-2xl uppercase tracking-[0.3em] opacity-80">Prepared for {s(c.clientName)}</div>
            <div className="mt-4 text-[128px] font-semibold leading-[0.95]">{s(c.title)}</div>
            <div className="mt-8 max-w-4xl text-3xl opacity-90">{s(c.subtitle)}</div>
            <div className="mt-14 text-xl opacity-70">{s(c.date)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-COVER-MINIMAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-center">
            <div className="h-[4px] w-32" style={{ backgroundColor: brand.tokens.accent }} />
            <div className="mt-12 text-[96px] font-semibold leading-tight">{s(c.title)}</div>
            <div className="mt-6 max-w-3xl text-3xl opacity-70">{s(c.subtitle)}</div>
            <div className="mt-16 text-xl uppercase tracking-[0.3em] opacity-60">{s(c.date)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-DIVIDER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="divider">
          <div className="flex h-full flex-col justify-center">
            <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>
              {s(c.kicker, "Section")}
            </div>
            <div className="mt-6 text-[130px] font-semibold leading-[1.05]">{s(c.title)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-DIVIDER-NUMBERED":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="divider">
          <div className="flex h-full items-center gap-16">
            <div className="text-[320px] font-semibold leading-none" style={{ color: brand.tokens.accent }}>
              {s(c.chapterNumber, "01")}
            </div>
            <div>
              <div className="text-2xl uppercase tracking-[0.3em] opacity-70">{s(c.kicker, "Chapter")}</div>
              <div className="mt-6 text-[96px] font-semibold leading-[1.05]">{s(c.title)}</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-OP-AGENDA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Agenda")} />
          <div className="mt-16 grid grid-cols-2 gap-x-24 gap-y-10">
            {arr(c.items).map((it, i) => (
              <div key={i} className="flex items-baseline gap-8">
                <div className="text-6xl font-semibold" style={{ color: brand.tokens.accent }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="text-4xl">{s(it.label)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-OP-AGENDA-VERTICAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Agenda")} />
          <div className="mt-14 space-y-8">
            {arr(c.items).map((it, i) => (
              <div key={i} className="flex items-baseline gap-10 border-b border-black/10 pb-6">
                <div className="w-24 text-5xl font-semibold" style={{ color: brand.tokens.accent }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1">
                  <div className="text-3xl font-semibold">{s(it.label)}</div>
                  {s(it.body) && <div className="mt-2 text-2xl opacity-70">{s(it.body)}</div>}
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-OP-INTRO-TEAM":
    case "MV-TEAM-BIOS-3":
    case "MV-TEAM-BIOS-4":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Team")} />
          <div className={`mt-14 grid gap-10 ${arr(c.items).length === 4 ? "grid-cols-4" : arr(c.items).length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {arr(c.items).map((p, i) => (
              <div key={i} className="rounded-2xl border p-8" style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}>
                <div
                  className="mb-6 h-32 w-32 rounded-full"
                  style={{ background: `linear-gradient(135deg, ${brand.tokens.primary}, ${brand.tokens.accent})` }}
                />
                <div className="text-3xl font-semibold" style={{ color: brand.tokens.primary }}>
                  {s(p.name)}
                </div>
                <div className="mt-2 text-xl uppercase tracking-[0.2em] opacity-70">{s(p.role)}</div>
                <div className="mt-4 text-xl leading-snug opacity-80">{s(p.bio ?? p.note)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    // ── Context & Challenge ───────────────────────────────────────────
    case "MV-CTX-CARDS-3":
    case "MV-SOL-PILLARS-3":
      return <CardGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={3} />;

    case "MV-CTX-CARDS-2":
    case "MV-SOL-PILLARS-2":
      return <CardGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={2} />;

    case "MV-CTX-CARDS-4":
    case "MV-SOL-PILLARS-4":
      return <CardGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={2} rows={2} />;

    case "MV-CTX-COST":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-20 pt-10">
            <div className="flex flex-col justify-center">
              <div className="text-[240px] font-semibold leading-none" style={{ color: brand.tokens.accent }}>
                {s(c.stat)}
                <span className="align-top text-[120px]">{s(c.unit)}</span>
              </div>
              <div className="mt-6 text-3xl opacity-80">{s(c.label)}</div>
            </div>
            <div className="flex items-center">
              <div className="text-4xl leading-snug">{s(c.narrative)}</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CTX-STAT-GRID":
    case "MV-PROOF-STATS-4":
      return <StatGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={2} rows={2} />;

    case "MV-PROOF-STATS-2":
      return <StatGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={2} />;

    case "MV-PROOF-STATS-3":
    case "MV-INS-OPPORTUNITY-SIZE":
      return <StatGrid brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} cols={3} />;

    case "MV-CTX-TREND":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <div className="flex items-center gap-8">
              <div
                className="text-[96px] font-semibold"
                style={{ color: brand.tokens.accent }}
              >
                {s(c.direction) === "down" ? "↓" : "↑"}
              </div>
              <div className="text-2xl uppercase tracking-[0.3em] opacity-70">Trend</div>
            </div>
            <div className="mt-8 text-[76px] font-semibold leading-[1.1]">{s(c.headline)}</div>
            <div className="mt-10 max-w-5xl text-3xl opacity-80">{s(c.narrative)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-CTX-CHALLENGE-STACK":
      return <NumberedList brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items)} />;

    // ── Insight ────────────────────────────────────────────────────────
    case "MV-INS-CALLOUT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>
              Insight
            </div>
            <div className="mt-6 text-[76px] font-semibold leading-[1.1]">{s(c.insight)}</div>
            <div className="mt-10 max-w-5xl text-3xl opacity-80">{s(c.narrative)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-INS-BIG-IDEA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>
              {s(c.kicker, "The big idea")}
            </div>
            <div className="mt-8 text-[120px] font-semibold leading-[1.02]">{s(c.idea)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-INS-SO-WHAT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-3 gap-10 pt-14">
            {[
              { label: "Insight", body: s(c.insight) },
              { label: "So what", body: s(c.soWhat) },
              { label: "Now what", body: s(c.nowWhat) },
            ].map((b, i) => (
              <div key={i} className="rounded-2xl p-10" style={{ backgroundColor: brand.tokens.surface }}>
                <div className="text-xl uppercase tracking-[0.25em]" style={{ color: brand.tokens.accent }}>
                  {b.label}
                </div>
                <div className="mt-6 text-3xl leading-snug">{b.body}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-INS-QUOTE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <div className="text-[220px] leading-none opacity-15" style={{ color: brand.tokens.accent }}>“</div>
            <div className="-mt-16 text-6xl font-medium leading-[1.15]">{s(c.quote)}</div>
            <div className="mt-10 text-2xl opacity-70">
              {s(c.attribution)} <span className="mx-2">·</span> {s(c.role)}
            </div>
          </div>
        </SlideFrame>
      );

    // ── Solution & Process ─────────────────────────────────────────────
    case "MV-SOL-PILLARS-5": {
      const hero = obj(c.hero);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-12 grid grid-cols-2 gap-8" style={{ gridTemplateRows: "1fr 1fr" }}>
            <div
              className="row-span-2 rounded-2xl p-10 text-white"
              style={{ background: `linear-gradient(135deg, ${brand.tokens.primary}, ${brand.tokens.accent})` }}
            >
              <div className="text-xl uppercase tracking-[0.25em] opacity-80">Hero</div>
              <div className="mt-6 text-5xl font-semibold">{s(hero.title)}</div>
              <div className="mt-6 text-2xl leading-snug opacity-90">{s(hero.body)}</div>
            </div>
            {arr(c.items).slice(0, 4).map((it, i) => (
              <Card key={i} brand={brand} title={s(it.title)} body={s(it.body)} index={i + 1} />
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-SOL-ARCHITECTURE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 space-y-4">
            {arr(c.items).map((it, i) => (
              <div
                key={i}
                className="flex items-center gap-10 rounded-xl border p-8"
                style={{
                  borderColor: "rgba(10,15,28,0.1)",
                  backgroundColor: i === 0 ? brand.tokens.primary : brand.tokens.surface,
                  color: i === 0 ? "#fff" : brand.tokens.ink,
                }}
              >
                <div className="w-64 text-3xl font-semibold" style={{ color: i === 0 ? "#fff" : brand.tokens.primary }}>
                  {s(it.label)}
                </div>
                <div className="flex-1 text-2xl opacity-90">{s(it.body)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-SOL-FEATURE-LIST":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-12 grid grid-cols-2 gap-x-16 gap-y-8">
            {arr(c.items).map((it, i) => (
              <div key={i} className="flex items-start gap-6">
                <div
                  className="mt-3 h-4 w-4 rotate-45"
                  style={{ backgroundColor: brand.tokens.accent }}
                />
                <div className="flex-1">
                  <div className="text-3xl font-semibold" style={{ color: brand.tokens.primary }}>
                    {s(it.label)}
                  </div>
                  <div className="mt-2 text-2xl opacity-80">{s(it.body)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-PROC-TIMELINE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="relative mt-24">
            <div className="absolute left-0 right-0 top-10 h-[3px]" style={{ backgroundColor: brand.tokens.accent }} />
            <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(arr(c.items).length, 1)}, minmax(0, 1fr))` }}>
              {arr(c.items).map((it, i) => (
                <div key={i} className="pr-10">
                  <div
                    className="mb-8 h-6 w-6 rounded-full"
                    style={{ backgroundColor: brand.tokens.accent, transform: "translateY(4px)" }}
                  />
                  <div className="text-3xl font-semibold" style={{ color: brand.tokens.primary }}>
                    {s(it.label)}
                  </div>
                  <div className="mt-4 text-2xl opacity-80">{s(it.body)}</div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-PROC-PHASES":
      return <NumberedList brand={brand} pageNumber={pageNumber} title={s(c.title)} items={arr(c.items).map((it) => ({ title: s(it.label), body: s(it.body) }))} />;

    case "MV-PROC-BEFORE-AFTER": {
      const before = obj(c.before);
      const after = obj(c.after);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-2 gap-10">
            <div className="rounded-2xl border p-10" style={{ borderColor: "rgba(10,15,28,0.15)", backgroundColor: brand.tokens.surface }}>
              <div className="text-xl uppercase tracking-[0.25em] opacity-60">Before</div>
              <div className="mt-4 text-4xl font-semibold">{s(before.title)}</div>
              <div className="mt-6 text-2xl leading-snug opacity-80">{s(before.body)}</div>
            </div>
            <div className="rounded-2xl p-10 text-white" style={{ backgroundColor: brand.tokens.primary }}>
              <div className="text-xl uppercase tracking-[0.25em]" style={{ color: brand.tokens.accent }}>After</div>
              <div className="mt-4 text-4xl font-semibold">{s(after.title)}</div>
              <div className="mt-6 text-2xl leading-snug opacity-90">{s(after.body)}</div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    // ── Proof & Data ──────────────────────────────────────────────────
    case "MV-PROOF-LOGOS":
    case "MV-CASE-LOGO-GRID":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-4 gap-6">
            {arr(c.items).map((it, i) => (
              <div
                key={i}
                className="flex aspect-[3/2] items-center justify-center rounded-xl border p-6 text-center text-2xl font-semibold"
                style={{ borderColor: "rgba(10,15,28,0.12)", backgroundColor: "#fff", color: brand.tokens.primary }}
              >
                <div>
                  <div>{s(it.name ?? it.client)}</div>
                  {s(it.result) && <div className="mt-2 text-sm font-normal opacity-70">{s(it.result)}</div>}
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-PROOF-TESTIMONIAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[1fr_320px] items-center gap-16">
            <div>
              <div className="text-[180px] leading-none opacity-15" style={{ color: brand.tokens.accent }}>“</div>
              <div className="-mt-14 text-5xl font-medium leading-[1.2]">{s(c.quote)}</div>
              <div className="mt-8 text-2xl opacity-70">
                {s(c.attribution)} <span className="mx-2">·</span> {s(c.role)}
              </div>
            </div>
            <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: brand.tokens.primary, color: "#fff" }}>
              <div className="text-6xl font-semibold" style={{ color: brand.tokens.accent }}>{s(c.metric)}</div>
              <div className="mt-4 text-xl opacity-80">measurable outcome</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-DEC-MATRIX":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-10 grid h-[720px] grid-cols-[80px_1fr] grid-rows-[1fr_60px]">
            <div className="flex rotate-180 items-center justify-center text-2xl opacity-70 [writing-mode:vertical-rl]">
              {s(c.axisY)}
            </div>
            <div className="grid grid-cols-2 grid-rows-2 gap-4">
              <Quadrant brand={brand} label={s(c.q2)} />
              <Quadrant brand={brand} label={s(c.q1)} highlight />
              <Quadrant brand={brand} label={s(c.q3)} />
              <Quadrant brand={brand} label={s(c.q4)} />
            </div>
            <div />
            <div className="flex items-center justify-center text-2xl opacity-70">{s(c.axisX)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-DEC-COMPARE-TABLE": {
      const columns = arr(c.columns);
      const rows = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-12 overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(10,15,28,0.1)" }}>
            <div className="grid" style={{ gridTemplateColumns: `2fr ${columns.map(() => "1fr").join(" ")}` }}>
              <div className="p-6 text-xl uppercase tracking-[0.2em] opacity-60">Criteria</div>
              {columns.map((col, i) => (
                <div key={i} className="p-6 text-2xl font-semibold" style={{ color: brand.tokens.primary }}>
                  {s(col.label)}
                </div>
              ))}
              {rows.map((r, ri) => (
                <div key={ri} className="contents">
                  <div className="border-t p-6 text-2xl" style={{ borderColor: "rgba(10,15,28,0.08)" }}>{s(r.criterion)}</div>
                  {strs(r.values).map((v, ci) => (
                    <div key={ci} className="border-t p-6 text-2xl" style={{ borderColor: "rgba(10,15,28,0.08)" }}>{v}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-DEC-CHECKLIST":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-12 grid grid-cols-2 gap-x-14 gap-y-6">
            {arr(c.items).map((it, i) => (
              <div key={i} className="flex items-start gap-5">
                <div
                  className="mt-2 flex h-9 w-9 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: brand.tokens.accent }}
                >
                  ✓
                </div>
                <div>
                  <div className="text-2xl font-semibold">{s(it.label)}</div>
                  {s(it.note) && <div className="mt-1 text-xl opacity-70">{s(it.note)}</div>}
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-COMM-PRICING":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Investment options")} />
          <div className="mt-12 grid grid-cols-3 gap-6">
            {arr(c.items).map((tier, i) => {
              const featured = i === 1;
              return (
                <div
                  key={i}
                  className="rounded-2xl p-10"
                  style={{
                    backgroundColor: featured ? brand.tokens.primary : brand.tokens.surface,
                    color: featured ? "#fff" : brand.tokens.ink,
                    border: `1px solid ${featured ? brand.tokens.primary : "rgba(10,15,28,0.1)"}`,
                  }}
                >
                  <div className="text-2xl uppercase tracking-[0.2em]" style={{ color: brand.tokens.accent }}>
                    {s(tier.name)}
                  </div>
                  <div className="mt-4 text-6xl font-semibold">
                    {s(tier.price)}<span className="text-2xl opacity-70"> {s(tier.unit)}</span>
                  </div>
                  <div className="mt-6 space-y-3 text-xl">
                    {strs(tier.features).map((f, k) => (
                      <div key={k} className="flex gap-3">
                        <span style={{ color: brand.tokens.accent }}>✓</span>
                        <span className="opacity-90">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );

    case "MV-COMM-INVESTMENT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-16 pt-10">
            <div className="flex flex-col justify-center">
              <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>{s(c.title, "Investment")}</div>
              <div className="mt-8 text-[180px] font-semibold leading-none" style={{ color: brand.tokens.primary }}>
                {s(c.amount)}
              </div>
              <div className="mt-4 text-3xl opacity-70">{s(c.unit)}</div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-xl uppercase tracking-[0.2em] opacity-60">Included</div>
              <div className="mt-6 space-y-4">
                {arr(c.items).map((it, i) => (
                  <div key={i} className="flex items-start gap-4 text-2xl">
                    <span className="mt-2 h-2 w-2 rounded-full" style={{ backgroundColor: brand.tokens.accent }} />
                    <span className="opacity-90">{s(it.label)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-RISK-MITIGATION":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Risk & mitigation")} />
          <div className="mt-12 space-y-6">
            {arr(c.items).map((it, i) => (
              <div key={i} className="grid grid-cols-2 gap-8 rounded-xl border p-8" style={{ borderColor: "rgba(10,15,28,0.1)" }}>
                <div>
                  <div className="text-xl uppercase tracking-[0.2em]" style={{ color: brand.tokens.accent }}>Risk</div>
                  <div className="mt-3 text-3xl font-semibold">{s(it.risk)}</div>
                </div>
                <div>
                  <div className="text-xl uppercase tracking-[0.2em] opacity-60">Mitigation</div>
                  <div className="mt-3 text-2xl opacity-90">{s(it.mitigation)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    // ── Case Study ─────────────────────────────────────────────────────
    case "MV-CASE-SPREAD":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>Case study</div>
          <div className="mt-6 text-6xl font-semibold">{s(c.client)}</div>
          <div className="mt-14 grid grid-cols-3 gap-12">
            <LabelBlock brand={brand} label="Challenge" body={s(c.challenge)} />
            <LabelBlock brand={brand} label="Solution" body={s(c.solution)} />
            <LabelBlock brand={brand} label="Result" body={s(c.result)} />
          </div>
          <div className="mt-14 text-5xl font-semibold" style={{ color: brand.tokens.accent }}>{s(c.metric)}</div>
        </SlideFrame>
      );

    case "MV-CASE-METRICS":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>Case study</div>
          <div className="mt-6 text-6xl font-semibold">{s(c.client)}</div>
          <div className="mt-8 max-w-5xl text-3xl opacity-80">{s(c.summary)}</div>
          <div className="mt-14 grid grid-cols-3 gap-14">
            {arr(c.items).map((it, i) => (
              <div key={i}>
                <div className="text-[140px] font-semibold leading-none" style={{ color: brand.tokens.primary }}>
                  {s(it.value)}<span className="text-5xl" style={{ color: brand.tokens.accent }}>{s(it.unit)}</span>
                </div>
                <div className="mt-4 text-2xl">{s(it.label)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-CASE-STORY":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-16">
            <div className="flex flex-col justify-center">
              <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>Case study</div>
              <div className="mt-6 text-5xl font-semibold">{s(c.client)}</div>
              <div className="mt-8 text-4xl font-semibold leading-tight">{s(c.headline)}</div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-2xl leading-snug opacity-85">{s(c.story)}</div>
              <div className="mt-10 rounded-xl p-6" style={{ backgroundColor: brand.tokens.surface }}>
                <div className="text-xl uppercase tracking-[0.2em]" style={{ color: brand.tokens.accent }}>Result</div>
                <div className="mt-3 text-3xl font-semibold">{s(c.result)}</div>
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    // ── Governance & Close ─────────────────────────────────────────────
    case "MV-GOV-RACI":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Governance model")} />
          <div className="mt-12 space-y-4">
            {arr(c.items).map((it, i) => (
              <div key={i} className="grid grid-cols-[1.3fr_1fr_2fr] gap-8 rounded-xl border p-6" style={{ borderColor: "rgba(10,15,28,0.1)" }}>
                <div className="text-2xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.forum)}</div>
                <div className="text-xl uppercase tracking-[0.2em]" style={{ color: brand.tokens.accent }}>{s(it.cadence)}</div>
                <div className="text-xl opacity-80">{s(it.purpose)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-REC-NEXT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title="Our recommendation" />
          <div className="mt-14 max-w-6xl text-5xl font-medium leading-tight">{s(c.recommendation)}</div>
          <div className="mt-10 max-w-5xl text-3xl opacity-75">{s(c.rationale)}</div>
        </SlideFrame>
      );

    case "MV-CLOSE-CTA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="flex h-full flex-col justify-center">
            <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>Next</div>
            <div className="mt-6 text-[110px] font-semibold leading-[1.05]">{s(c.message)}</div>
            <div className="mt-10 max-w-5xl text-3xl opacity-90">{s(c.nextSteps)}</div>
            <div className="mt-12 flex gap-16 text-2xl opacity-70">
              <div>{s(c.owner)}</div>
              <div>{s(c.followUp)}</div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-THANKS":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="flex h-full flex-col items-start justify-center">
            <div className="text-[180px] font-semibold leading-[0.95]" style={{ color: brand.tokens.primary }}>
              {s(c.message, "Thank you.")}
            </div>
            <div className="mt-10 text-3xl opacity-70">{s(c.signoff)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-QNA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="text-[220px] font-semibold leading-none" style={{ color: brand.tokens.accent }}>?</div>
            <div className="mt-8 text-6xl font-semibold">{s(c.title, "Questions")}</div>
            <div className="mt-6 max-w-4xl text-2xl opacity-70">{s(c.prompt)}</div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-CONTACT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <SlideTitle brand={brand} title={s(c.title, "Stay in touch")} />
          <div className={`mt-14 grid gap-10 ${arr(c.items).length >= 3 ? "grid-cols-3" : arr(c.items).length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {arr(c.items).map((p, i) => (
              <div key={i} className="rounded-2xl border p-8" style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}>
                <div className="text-3xl font-semibold" style={{ color: brand.tokens.primary }}>{s(p.name)}</div>
                <div className="mt-2 text-xl uppercase tracking-[0.2em] opacity-70">{s(p.role)}</div>
                <div className="mt-6 space-y-2 text-2xl">
                  <div>{s(p.email)}</div>
                  <div className="opacity-70">{s(p.phone)}</div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    default:
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-8 text-3xl opacity-70">{variant.description}</div>
        </SlideFrame>
      );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Shared building blocks
// ────────────────────────────────────────────────────────────────────────────

function CardGrid({
  brand,
  pageNumber,
  title,
  items,
  cols,
  rows,
}: {
  brand: BrandMode;
  pageNumber: number;
  title: string;
  items: Item[];
  cols: number;
  rows?: number;
}) {
  const gridClass = cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4";
  return (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      <SlideTitle brand={brand} title={title} />
      <div className={`mt-14 grid gap-10 ${gridClass}`} style={rows ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } : undefined}>
        {items.map((it, i) => (
          <Card key={i} brand={brand} title={s(it.title)} body={s(it.body)} index={i + 1} />
        ))}
      </div>
    </SlideFrame>
  );
}

function StatGrid({
  brand,
  pageNumber,
  title,
  items,
  cols,
  rows,
}: {
  brand: BrandMode;
  pageNumber: number;
  title: string;
  items: Item[];
  cols: number;
  rows?: number;
}) {
  const gridClass = cols === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      <SlideTitle brand={brand} title={title || "Proof"} />
      <div className={`mt-16 grid gap-14 ${gridClass}`} style={rows ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } : undefined}>
        {items.map((it, i) => (
          <div key={i}>
            <div className="text-[140px] font-semibold leading-none" style={{ color: brand.tokens.primary }}>
              {s(it.value)}
              <span className="text-5xl" style={{ color: brand.tokens.accent }}>{s(it.unit)}</span>
            </div>
            <div className="mt-6 text-2xl">{s(it.label)}</div>
            {s(it.source) && <div className="mt-4 text-lg opacity-60">Source: {s(it.source)}</div>}
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function NumberedList({ brand, pageNumber, title, items }: { brand: BrandMode; pageNumber: number; title: string; items: Item[] }) {
  return (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      <SlideTitle brand={brand} title={title} />
      <div className="mt-12 space-y-6">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-10 rounded-xl border p-8" style={{ borderColor: "rgba(10,15,28,0.08)", backgroundColor: brand.tokens.surface }}>
            <div className="w-20 text-5xl font-semibold" style={{ color: brand.tokens.accent }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="flex-1">
              <div className="text-3xl font-semibold" style={{ color: brand.tokens.primary }}>{s(it.title ?? it.label)}</div>
              <div className="mt-3 text-2xl opacity-80">{s(it.body)}</div>
            </div>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function SlideTitle({ brand, title }: { brand: BrandMode; title: string }) {
  return (
    <div>
      <div className="h-[3px] w-24" style={{ backgroundColor: brand.tokens.accent }} />
      <h2 className="mt-6 text-6xl font-semibold leading-tight" style={{ color: brand.tokens.primary }}>
        {title}
      </h2>
    </div>
  );
}

function Card({ brand, title, body, index }: { brand: BrandMode; title: string; body: string; index: number }) {
  return (
    <div className="rounded-2xl border p-10" style={{ borderColor: "rgba(10,15,28,0.1)", backgroundColor: brand.tokens.surface }}>
      <div className="text-2xl font-semibold" style={{ color: brand.tokens.accent }}>
        {String(index).padStart(2, "0")}
      </div>
      <div className="mt-6 text-4xl font-semibold" style={{ color: brand.tokens.primary }}>
        {title}
      </div>
      <div className="mt-6 text-2xl leading-snug opacity-80">{body}</div>
    </div>
  );
}

function Quadrant({ brand, label, highlight }: { brand: BrandMode; label: string; highlight?: boolean }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border p-6 text-3xl font-medium"
      style={{
        borderColor: "rgba(10,15,28,0.15)",
        backgroundColor: highlight ? brand.tokens.primary : brand.tokens.surface,
        color: highlight ? "#fff" : brand.tokens.ink,
      }}
    >
      {label}
    </div>
  );
}

function LabelBlock({ brand, label, body }: { brand: BrandMode; label: string; body: string }) {
  return (
    <div>
      <div className="text-xl uppercase tracking-[0.25em]" style={{ color: brand.tokens.accent }}>
        {label}
      </div>
      <div className="mt-4 text-2xl leading-snug">{body}</div>
    </div>
  );
}
