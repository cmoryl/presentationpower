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
const s = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const arr = (v: unknown): Item[] => (Array.isArray(v) ? (v as Item[]) : []);

export function VariantRenderer(props: Props) {
  const { slide, variant, brand, pageNumber } = props;
  const c = slide.content as Record<string, unknown>;

  switch (variant.id) {
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

    case "MV-CTX-CARDS-3":
    case "MV-SOL-PILLARS-3":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-3 gap-10">
            {arr(c.items).map((it, i) => (
              <Card key={i} brand={brand} title={s(it.title)} body={s(it.body)} index={i + 1} />
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-CTX-CARDS-2":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-2 gap-14">
            {arr(c.items).map((it, i) => (
              <Card key={i} brand={brand} title={s(it.title)} body={s(it.body)} index={i + 1} />
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-CTX-COST":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-20 pt-10">
            <div className="flex flex-col justify-center">
              <div className="text-[240px] font-semibold leading-none" style={{ color: brand.tokens.accent }}>
                {s(c.stat)}
                <span className="text-[120px] align-top">{s(c.unit)}</span>
              </div>
              <div className="mt-6 text-3xl opacity-80">{s(c.label)}</div>
            </div>
            <div className="flex items-center">
              <div className="text-4xl leading-snug">{s(c.narrative)}</div>
            </div>
          </div>
        </SlideFrame>
      );

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

    case "MV-SOL-PILLARS-4":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-14 grid grid-cols-2 gap-10">
            {arr(c.items).map((it, i) => (
              <Card key={i} brand={brand} title={s(it.title)} body={s(it.body)} index={i + 1} />
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-PROC-TIMELINE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-24 relative">
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

    case "MV-PROOF-STATS-3":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Proof")} />
          <div className="mt-16 grid grid-cols-3 gap-14">
            {arr(c.items).map((it, i) => (
              <div key={i}>
                <div className="text-[160px] font-semibold leading-none" style={{ color: brand.tokens.primary }}>
                  {s(it.value)}
                  <span className="text-6xl" style={{ color: brand.tokens.accent }}>
                    {s(it.unit)}
                  </span>
                </div>
                <div className="mt-6 text-2xl">{s(it.label)}</div>
                <div className="mt-4 text-lg opacity-60">Source: {s(it.source)}</div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );

    case "MV-DEC-MATRIX":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="mt-10 grid h-[720px] grid-cols-[80px_1fr] grid-rows-[1fr_60px]">
            <div className="flex items-center justify-center [writing-mode:vertical-rl] rotate-180 text-2xl opacity-70">
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

    case "MV-CASE-SPREAD":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>
            Case study
          </div>
          <div className="mt-6 text-6xl font-semibold">{s(c.client)}</div>
          <div className="mt-14 grid grid-cols-3 gap-12">
            <LabelBlock brand={brand} label="Challenge" body={s(c.challenge)} />
            <LabelBlock brand={brand} label="Solution" body={s(c.solution)} />
            <LabelBlock brand={brand} label="Result" body={s(c.result)} />
          </div>
          <div className="mt-14 text-5xl font-semibold" style={{ color: brand.tokens.accent }}>
            {s(c.metric)}
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
            <div className="text-2xl uppercase tracking-[0.3em]" style={{ color: brand.tokens.accent }}>
              Next
            </div>
            <div className="mt-6 text-[110px] font-semibold leading-[1.05]">{s(c.message)}</div>
            <div className="mt-10 max-w-5xl text-3xl opacity-90">{s(c.nextSteps)}</div>
            <div className="mt-12 flex gap-16 text-2xl opacity-70">
              <div>{s(c.owner)}</div>
              <div>{s(c.followUp)}</div>
            </div>
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
