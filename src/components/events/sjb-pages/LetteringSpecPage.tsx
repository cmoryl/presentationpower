// /events/san-juan-bowl/brand-kit/lettering — the construction spec behind the exact
// SAN JUAN BOWL lettering master (public/downloads/sjb-lettering/sjb-lettering-exact.svg).
// Every number comes from src/lib/sjb-lettering-spec.json, generated from the same exact
// construction that produced the master, so the page and the artwork cannot drift.
// Drawings are supplied SVGs in public/downloads/sjb-lettering/spec/ — never redrawn here.

import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { SjbLink, SjbShell } from "@/components/events/SjbShare";
import { Button } from "@/design-system/element";
import { SJB_EVENT } from "@/lib/san-juan-bowl";
import spec from "@/lib/sjb-lettering-spec.json";

const BASE = "/downloads/sjb-lettering";
const DRAW = `${BASE}/spec`;

type Unit = "mm" | "in" | "px";
const UNITS: Unit[] = ["mm", "in", "px"];

/** Smallest feature each process holds (typical starting points; the vendor's proof decides). */
const PROCESSES: { label: string; holds: number; unit: Unit }[] = [
  { label: "Offset / digital print", holds: 0.1, unit: "mm" },
  { label: "Screen print / vinyl cut", holds: 0.3, unit: "mm" },
  { label: "Embroidery satin", holds: 1.0, unit: "mm" },
  { label: "Screen (smallest gap ≥ 1 px)", holds: 1, unit: "px" },
];
const MM_PER: Record<Unit, number> = { mm: 1, in: 25.4, px: NaN };

const fmt = (n: number, unit: Unit) => `${n.toFixed(unit === "px" ? 1 : unit === "in" ? 3 : 2)} ${unit}`;

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="space-y-4" aria-labelledby={id}>
      <div>
        <h2 id={id} className="text-[20px] font-bold">{title}</h2>
        {intro && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function Table({ head, rows, mono = [] }: { head: string[]; rows: (string | number)[][]; mono?: number[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-[13px] tabular-nums">
        <thead>
          <tr className="bg-muted/50 text-left">
            {head.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border align-top">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${mono.includes(j) ? "font-mono text-[12.5px]" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Drawing({ file, alt, caption }: { file: string; alt: string; caption: ReactNode }) {
  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-md border border-border bg-[#F3F3F6]">
        <img src={`${DRAW}/${file}`} alt={alt} className="block h-auto w-full" />
      </div>
      <figcaption className="text-[12.5px] text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

function SizeCalculator() {
  const [cap, setCap] = useState("100");
  const [unit, setUnit] = useState<Unit>("mm");
  const c = spec.calculator;
  const capN = Math.max(0, Number(cap) || 0);
  const u = capN / c.capUnits;
  const rows: [string, number][] = [
    ["1 u", u],
    ["Width with shadow", c.widthWithShadow * u],
    ["Height with shadow", c.heightWithShadow * u],
    ["Stroke (33 u)", c.stroke * u],
    ["Serif (10.7266 u)", c.serif * u],
    ["Shadow offset (6.5625 u each way)", c.shadowOffset * u],
    ["Smallest feature (2.16 u)", c.smallestFeature * u],
  ];
  const checks = useMemo(
    () =>
      PROCESSES.map((p) => {
        const minCap = (p.holds / c.smallestFeature) * c.capUnits; // in the process's own unit
        const sameUnit = p.unit === unit || (p.unit !== "px" && unit !== "px");
        if (!sameUnit) return { ...p, minCap, ok: null as boolean | null };
        const capInProcUnit = p.unit === "px" ? capN : (capN * MM_PER[unit]) / MM_PER[p.unit];
        return { ...p, minCap, ok: capInProcUnit >= minCap };
      }),
    [capN, unit, c.smallestFeature, c.capUnits],
  );
  return (
    <div className="grid gap-4 rounded-md border border-border p-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-[12px] font-semibold" htmlFor="sjb-cap">
            Cap height
            <input
              id="sjb-cap"
              inputMode="decimal"
              value={cap}
              onChange={(e) => setCap(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-32 rounded-md border border-border bg-background px-3 py-2 font-mono text-[14px]"
            />
          </label>
          <div role="radiogroup" aria-label="Unit" className="flex gap-1">
            {UNITS.map((x) => (
              <button
                key={x}
                type="button"
                role="radio"
                aria-checked={unit === x}
                onClick={() => setUnit(x)}
                className={`rounded-md border px-3 py-2 text-[13px] font-semibold ${unit === x ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
        <dl className="grid gap-1 text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-border py-1">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-mono font-semibold">{fmt(v, unit)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="space-y-2">
        <h3 className="text-[14px] font-bold">Minimum size by process</h3>
        <p className="text-[12.5px] text-muted-foreground">
          The smallest feature in the lettering is 2.16 u. These limits are typical starting points; confirm with the vendor.
        </p>
        <ul className="grid gap-2">
          {checks.map((p) => (
            <li key={p.label} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-[13px]">
              <span>
                <b>{p.label}</b>
                <span className="block text-[12px] text-muted-foreground">holds {p.holds} {p.unit} · min cap {p.minCap.toFixed(1)} {p.unit}</span>
              </span>
              {p.ok === null ? (
                <span className="text-[12px] text-muted-foreground">switch to {p.unit === "px" ? "px" : "mm or in"}</span>
              ) : (
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${p.ok ? "bg-[#E6F6EC] text-[#0B6B2E]" : "bg-[#FDECEC] text-[#A11818]"}`}>
                  {p.ok ? "OK at this size" : "Too small"}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function LetteringSpecPage() {
  return (
    <SjbShell>
      <div className="mx-auto max-w-6xl space-y-12 px-6 py-8 text-foreground">
        <SjbLink page="kit" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Brand kit
        </SjbLink>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Brand kit · Lettering specification</p>
            <h1 className="mt-1 text-[32px] font-bold leading-tight">{SJB_EVENT.name}: lettering specification</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The construction rules behind the exact SAN JUAN BOWL lettering. Every letter is built from the same small set of
              numbers, every coordinate is an exact decimal, and nothing is rounded. Values are in units of{" "}
              <b className="text-foreground">u = cap height ÷ 120</b>; pink lines on the drawings are dimensions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><a href={`${BASE}/sjb-lettering-spec.pdf`} download="sjb-lettering-spec.pdf"><Download />Spec (PDF)</a></Button>
            <Button asChild variant="outline"><a href={`${BASE}/sjb-lettering-exact.svg`} download="sjb-lettering-exact.svg"><Download />Master (SVG)</a></Button>
            <Button asChild variant="outline"><a href={`${BASE}/sjb-lettering-spec.html`} target="_blank" rel="noreferrer"><ExternalLink />Full spec page</a></Button>
          </div>
        </header>

        <Section id="horizons" title="1 · The wordmark and its horizon lines" intro="Eight shared horizontal lines. Every flat edge in every letter sits on one of them. Gaps under the wordmark are face to face: 12 between letters, 29 between words.">
          <div className="overflow-x-auto rounded-md border border-border">
            <img src={`${DRAW}/${spec.files.wordmark}`} alt="SAN JUAN BOWL wordmark with its eight horizon lines and letter gaps" className="block h-auto w-full min-w-[760px]" />
          </div>
          <Table head={["y (u)", "Line", "Used by"]} rows={spec.horizonLines.map((h) => [h.y, h.name, h.usedBy])} mono={[0]} />
        </Section>

        <Section id="proportions" title="2 · Units and proportions" intro="Scale the lettering by its cap height; every other measurement follows. The exact column is the value as a fraction, so it can be rebuilt at any size without drift.">
          <Table head={["Parameter", "Value (u)", "% of cap", "Exact", "Rule"]} rows={spec.proportions.map((p) => [p.parameter, p.value, p.pctOfCap, p.exact, p.rule])} mono={[1, 2, 3]} />
        </Section>

        <Section id="strokes" title="3 · Strokes and angles" intro="Only five edge directions exist in the whole wordmark.">
          <div className="grid gap-6 lg:grid-cols-2">
            <Drawing file={spec.files.lean} alt="7:24 lean construction with the 7-24-25 triangle" caption={<><b className="text-foreground">The 7:24 lean.</b> A and W strokes lean 7 across for every 24 down. Because 25/24 is exact, a 33 stroke is exactly 34.375 wide measured horizontally.</>} />
            <div className="space-y-3">
              <Table head={["Direction", "Slope", "Where", "Count"]} rows={spec.edgeDirections.map((d) => [d.direction, d.slope, d.where, d.count])} mono={[1, 3]} />
              <pre className="overflow-x-auto rounded-md bg-[#F3F3F6] p-3 font-mono text-[12.5px] leading-relaxed text-[#0D0E21]">{spec.formulas.slice(0, 4).join("\n")}</pre>
            </div>
          </div>
        </Section>

        <Section id="shadow" title="4 · Serifs, corners and the shadow" intro="The shadow runs at exactly 45°, the same angle as every corner cut, so a lower-left cut casts no shadow instead of a hairline. The serif size is set by the shadow so no shadow ever touches or nearly touches another shadow or a serif tip.">
          <div className="grid gap-6 lg:grid-cols-2">
            <Drawing file={spec.files.shadow} alt="Shadow construction: the L swept along the 45° shadow vector" caption={<><b className="text-foreground">One extrusion for all eleven letters.</b> The face swept along v = (6.5625, 6.5625): the face, the face moved by v (dashed), and every parallelogram an edge traces on the way.</>} />
            <div className="space-y-3">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-[#F3F3F6] p-3 font-mono text-[12.5px] leading-relaxed text-[#0D0E21]">{spec.formulas.slice(4).join("\n")}</pre>
              <Table head={["Edge", "Direction d", "Strip width", "u"]} rows={spec.shadowStrips.map((s) => [s.edge, s.direction, s.formula, s.width])} mono={[1, 2, 3]} />
            </div>
          </div>
        </Section>

        <Section id="letters" title="5 · Letter by letter" intro="Each letter with its key dimensions, drawn from the exact outlines. Grey lines are the horizon lines; s marks a serif overhang (10.7265625). A2 and N2 in JUAN are exact copies of A and N.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {spec.letters.map((l) => (
              <Drawing key={l.letter} file={l.svg} alt={`Letter ${l.letter} with dimensions`} caption={<><b className="text-foreground">{l.letter}</b>{l.note ? ` (${l.note})` : ""} · advance {l.advance} · {l.anchors} anchors</>} />
            ))}
          </div>
          <div className="space-y-2">
            <h3 className="text-[15px] font-bold">Anchor coordinates</h3>
            <p className="text-[12.5px] text-muted-foreground">Every anchor in the letter's own coordinates (left edge of the face at x 0, cap at y 0). Add the letter's x position from section 6 to place it.</p>
            {spec.letters.map((l) => (
              <details key={l.letter} className="rounded-md border border-border px-3 py-2">
                <summary className="cursor-pointer text-[13px] font-semibold">{l.letter} — {l.anchors} anchors, advance {l.advance}</summary>
                <div className="mt-2">
                  <Table
                    head={["Contour", "#", "x", "y", "Next edge", "Length"]}
                    rows={l.contours.flatMap((c, ci) => c.anchors.map((a, i) => [c.kind === "outline" ? "outline" : `counter ${ci}`, i + 1, a.x, a.y, a.edge, a.length.toFixed(4)]))}
                    mono={[1, 2, 3, 4, 5]}
                  />
                </div>
              </details>
            ))}
          </div>
        </Section>

        <Section id="spacing" title="6 · Spacing and positions" intro="Letters are spaced face to face: 12 inside a word, 29 between words. Positions are exact.">
          <Table head={["Word", "Letter", "x left", "x right", "Advance"]} rows={spec.positions.map((p) => [p.word, p.letter, p.xLeft, p.xRight, p.advance])} mono={[2, 3, 4]} />
        </Section>

        <Section id="sizes" title="7 · Clearances, sizes and minimum size" intro="The tightest spots in the lettering, and a calculator for any cap height.">
          <div className="grid gap-6 lg:grid-cols-2">
            <Drawing file={spec.files.clearA} alt="Close-up of the A inner foot on a 1 u grid" caption={<><b className="text-foreground">Tightest spot, A inner foot</b> (1 square = 1 u). Separate shadow pieces 2.16 apart, shortest shadow edge 2.25, background channel 2.609.</>} />
            <Drawing file={spec.files.clearU} alt="Close-up of the U opening between its inner serifs" caption={<><b className="text-foreground">U opening</b> between the inner serifs: exactly 12, the same as the letter gap.</>} />
          </div>
          <SizeCalculator />
        </Section>

        <Section id="colour" title="8 · Colour" intro="White letters with a cyan shadow, always placed on navy. The lettering has no background of its own, so on a light ground only the shadow would show.">
          <div className="grid gap-3 sm:grid-cols-3">
            {spec.colour.map((c) => (
              <div key={c.role} className="overflow-hidden rounded-md border border-border">
                <div className="h-16 border-b border-border" style={{ background: c.hex }} />
                <div className="px-3 py-2 text-[13px]">
                  <b>{c.role} · {c.name}</b>
                  <span className="block font-mono text-[12px] text-muted-foreground">{c.hex} · {c.cmyk}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="rules" title="9 · File and editing rules">
          <ul className="max-w-4xl list-disc space-y-1.5 pl-5 text-[13.5px]">
            {spec.editingRules.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </Section>

        <Section id="verification" title="10 · Verification" intro="Checked on the saved file with exact rational arithmetic and zero tolerance, then by four independent blind reviews. The last review found no defects.">
          <Table head={["Check", "Result"]} rows={spec.verification.map((v) => [v.check, v.result])} />
        </Section>
      </div>
    </SjbShell>
  );
}
