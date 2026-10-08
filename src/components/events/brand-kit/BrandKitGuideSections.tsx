// Expanded Master NEXT brand kit sections (gradients → NEXTbrew).
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/design-system/element";
import {
  BREW_RULES,
  GRADIENT_RULES,
  LONDON_PACK_GROUND_NOTE,
  RESIZE_RULES,
  REUSE_RULES,
  gradientCss,
  kitBrew,
  kitDigitalByShape,
  kitEventSections,
  kitGradients,
  kitMart,
  kitReuse,
  kitSignSizes,
} from "@/lib/next-brand-kit-guide";

export const GUIDE_SECTIONS = [
  ["gradients", "Gradients"],
  ["sizes", "Sizes & aspect ratios"],
  ["resizing", "Resizing"],
  ["reuse", "Using what we have"],
  ["sections", "Event sections"],
  ["mart", "NEXT Mart"],
  ["brew", "NEXTbrew"],
] as const;

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="text-xl font-semibold">{children}</h2>;
const Rules = ({ items }: { items: { do: boolean; text: string }[] }) => (
  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
    {items.map((r) => (
      <li key={r.text} className="text-sm leading-relaxed">
        <span className={`font-semibold ${r.do ? "" : "text-destructive"}`}>{r.do ? "Do" : "Don't"}:</span> {r.text}
      </li>
    ))}
  </ul>
);

export function BrandKitGuideSections({ shared }: { shared: boolean }) {
  const gradients = useMemo(kitGradients, []);
  const families = [...new Set(gradients.map((g) => g.family))];
  const sizes = useMemo(kitSignSizes, []);
  const digital = useMemo(kitDigitalByShape, []);
  const reuse = useMemo(kitReuse, []);
  const sections = useMemo(kitEventSections, []);
  const mart = useMemo(kitMart, []);
  const brew = useMemo(kitBrew, []);
  const copy = (hex: string) => navigator.clipboard.writeText(hex).then(() => toast.success(`${hex} copied`));

  return (
    <>
      <section id="gradients" className="mt-12 scroll-mt-16">
        <H2>Gradients</H2>
        <p className="mt-1 text-sm text-muted-foreground">{LONDON_PACK_GROUND_NOTE}</p>
        {families.map((fam) => (
          <div key={fam} className="mt-6">
            <h3 className="text-sm font-semibold">{fam}</h3>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gradients.filter((g) => g.family === fam).map((g) => (
                <li key={g.id} className="rounded-lg border border-border">
                  <div className="h-20 rounded-t-lg" style={{ background: gradientCss(g) }} aria-hidden />
                  <div className="p-3">
                    <p className="text-sm font-semibold">{g.label}{g.measured ? <span className="ml-2 text-xs font-normal text-muted-foreground">measured from print files</span> : null}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {g.stops.map((s, i) => (
                        <button key={i} type="button" onClick={() => copy(s.hex)} title={s.cmyk ? `CMYK ${s.cmyk}` : s.hex}
                          className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[11px] focus-visible:outline-2 focus-visible:outline-ring">
                          <span className="size-3 rounded-sm" style={{ background: s.hex }} aria-hidden />{s.hex}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{g.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <Rules items={GRADIENT_RULES} />
      </section>

      <section id="sizes" className="mt-12 scroll-mt-16">
        <H2>Sizes & aspect ratios</H2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="py-2 pr-4">Sign</th><th className="py-2 pr-4">Supplied size</th><th className="py-2">Ready-made sizes</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sizes.map((s) => (
                <tr key={s.title}>
                  <td className="py-2 pr-4 font-medium">{s.title}</td>
                  <td className="py-2 pr-4">{s.supplied}</td>
                  <td className="py-2 text-muted-foreground">{s.presets.length ? s.presets.join(" · ") : "Any size can be typed in"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mt-8 text-sm font-semibold">Digital formats by shape</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {digital.map((g) => (
            <div key={g.shape}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.shape}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {g.formats.map((f) => <li key={f.id}>{f.label} <span className="text-xs text-muted-foreground">{f.width}×{f.height}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="resizing" className="mt-12 scroll-mt-16">
        <H2>Resizing</H2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {RESIZE_RULES.map((r) => <li key={r}>{r}</li>)}
        </ol>
      </section>

      <section id="reuse" className="mt-12 scroll-mt-16">
        <H2>Using what we already have</H2>
        <p className="mt-1 text-sm text-muted-foreground">
          {Math.round(reuse.reuse * 100)}% of the London set can start a new venue from an existing family.
        </p>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="font-semibold">Copy</dt><dd className="text-muted-foreground">{REUSE_RULES.copy}</dd></div>
          <div><dt className="font-semibold">Change</dt><dd className="text-muted-foreground">{REUSE_RULES.change}</dd></div>
          <div><dt className="font-semibold text-destructive">Never change</dt><dd className="text-muted-foreground">{REUSE_RULES.never}</dd></div>
        </dl>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reuse.families.map((f) => (
            <li key={f.id} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold">{f.name} <span className="font-normal text-muted-foreground">· {reuse.coverage.find((c) => c.id === f.id)?.count ?? 0} signs</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{f.substrate}</p>
              <p className="mt-2 text-xs"><span className="font-medium">Face:</span> {f.orientation} · <span className="font-medium">Ground:</span> {f.ground.replace(/-/g, " ")}</p>
              <p className="mt-2 text-xs leading-relaxed">{f.printNote}</p>
            </li>
          ))}
        </ul>
        {reuse.unmatched.length ? (
          <p className="mt-4 text-xs text-muted-foreground">No family yet ({reuse.unmatched.length}): {reuse.unmatched.slice(0, 20).join(", ")}{reuse.unmatched.length > 20 ? "…" : ""}</p>
        ) : null}
      </section>

      <section id="sections" className="mt-12 scroll-mt-16">
        <H2>Event sections</H2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.formatGroups.map((g) => (
            <li key={g.id} className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.badge}</p>
              <p className="text-sm font-semibold">{g.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.detail}</p>
            </li>
          ))}
        </ul>
        {!shared ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sections.workspace.map((g) => (
              <div key={g.id}>
                <h3 className="text-sm font-semibold">{g.label}</h3>
                <p className="text-xs text-muted-foreground">{g.blurb}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {g.pages.map((p) => <li key={p.to}><Link to={p.to} className="text-primary hover:underline">{p.label}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section id="mart" className="mt-12 scroll-mt-16">
        <H2>NEXT Mart</H2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each city's Mart is a "stop" cloned from the London reference build: same signs and price list, with that city's currency, price bands, shop link and hashtag.
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold">Pillar signs per stop</h3>
            <ul className="mt-2 space-y-1 text-sm">{mart.pillars.map((p) => <li key={p.id}>{p.name} <span className="text-xs text-muted-foreground">× {p.quantity} · {p.role}</span></li>)}</ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Flat signs per stop</h3>
            <ul className="mt-2 space-y-1 text-sm">{mart.flats.map((f) => <li key={f.id}>{f.name} <span className="text-xs text-muted-foreground">{f.trimW}×{f.trimH} mm · ×{f.quantity}</span></li>)}</ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Price list</h3>
            <p className="mt-2 text-sm">Reference price bands: {mart.reference.priceBands.map((b) => `${mart.reference.currency}${b}`).join(" · ")}</p>
            <p className="mt-1 text-sm">Categories: {mart.categories.map((c) => c.title.toLowerCase()).join(", ")}</p>
            <p className="mt-1 text-sm">Currencies: {mart.currencies.map((c) => c.code).join(", ")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {mart.barColours.map((c) => (
                <span key={c.hex} className="flex items-center gap-1 text-xs"><span className="size-3 rounded-sm" style={{ background: c.hex }} aria-hidden />{c.label}</span>
              ))}
            </div>
          </div>
        </div>
        {!shared ? (
          <div className="mt-4 flex gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/events/next/mart">Open NEXT Mart</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/events/next/mart/price-list">Price list</Link></Button>
          </div>
        ) : null}
      </section>

      <section id="brew" className="mt-12 scroll-mt-16">
        <H2>NEXTbrew</H2>
        {brew.style ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="relative h-40 overflow-hidden rounded-lg" style={{ background: `linear-gradient(135deg, ${brew.style.stops.join(", ")})` }}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 14px)" }} aria-hidden />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Preview of the ground and lattice only; the masters carry the full pattern.</p>
              <p className="mt-2 text-sm leading-relaxed">{brew.style.note}</p>
              <p className="mt-2 text-xs text-muted-foreground">{brew.panels.length} London café signs use this look.</p>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">{BREW_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Not set yet.</p>
        )}
      </section>
    </>
  );
}
