// Preview-only showcase for the Element design-system library.
//
// Mounts every component exported by `src/design-system/element` plus the token
// and type scale, in light and dark, so the library can be verified visually.
// Lives under src/routes/** so it never travels to consumers.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Moon, Search, Sun } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  cn,
} from "@/design-system/element";

export const Route = createFileRoute("/dev/library-showcase")({
  head: () => ({
    meta: [
      { title: "Element Library Showcase · TransPerfect Element" },
      {
        name: "description",
        content:
          "Preview-only showcase for the Element design-system library: colour tokens, type scale and every exported component in light and dark.",
      },
      { property: "og:title", content: "Element Library Showcase · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Every Element library component and token rendered live, in light and dark, for visual verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryShowcase,
});

const SEMANTIC_TOKENS: Array<{ token: string; role: string; bg: string; fg: string }> = [
  { token: "bg-background / text-foreground", role: "Page ground and body ink", bg: "bg-background", fg: "text-foreground" },
  { token: "bg-card / text-card-foreground", role: "Raised surface", bg: "bg-card", fg: "text-card-foreground" },
  { token: "bg-primary / text-primary-foreground", role: "Primary action", bg: "bg-primary", fg: "text-primary-foreground" },
  { token: "bg-secondary / text-secondary-foreground", role: "Quiet action, chips", bg: "bg-secondary", fg: "text-secondary-foreground" },
  { token: "bg-muted / text-muted-foreground", role: "Muted surface and captions", bg: "bg-muted", fg: "text-muted-foreground" },
  { token: "bg-accent / text-accent-foreground", role: "Accent — 10% of a layout", bg: "bg-accent", fg: "text-accent-foreground" },
  { token: "bg-destructive / text-destructive-foreground", role: "Destructive action", bg: "bg-destructive", fg: "text-destructive-foreground" },
  { token: "bg-sidebar / text-sidebar-foreground", role: "Navigation ground", bg: "bg-sidebar", fg: "text-sidebar-foreground" },
];

const CHART_TOKENS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

const TYPE_SCALE: Array<{ label: string; cls: string; sample: string }> = [
  { label: "text-5xl font-semibold tracking-[-0.03em]", cls: "text-5xl font-semibold tracking-[-0.03em]", sample: "Global content, engineered" },
  { label: "text-3xl font-semibold tracking-[-0.02em]", cls: "text-3xl font-semibold tracking-[-0.02em]", sample: "Localization at enterprise scale" },
  { label: "text-xl font-semibold", cls: "text-xl font-semibold", sample: "GlobalLink connects your stack" },
  { label: "text-base", cls: "text-base leading-[1.4]", sample: "Body copy sits at 140% leading so long passages stay readable on a slide or a page." },
  { label: "text-sm text-muted-foreground", cls: "text-sm text-muted-foreground leading-[1.4]", sample: "Supporting caption for a metric, a table row, or a form hint." },
  { label: "text-xs uppercase tracking-[0.2em]", cls: "text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground", sample: "Eyebrow label" },
  { label: "font-mono text-sm", cls: "font-mono text-sm", sample: "npm i @transperfect/element — Geist Mono Variable" },
];

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "button", label: "Button" },
  { id: "badge", label: "Badge" },
  { id: "card", label: "Card" },
  { id: "input", label: "Input" },
  { id: "textarea", label: "Textarea" },
  { id: "composition", label: "In context" },
];

function Snippet({ code }: { code: string }) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Usage
      </summary>
      <pre className="mt-2 overflow-x-auto rounded-md border bg-muted p-3 font-mono text-xs leading-relaxed text-foreground">
        {code}
      </pre>
    </details>
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-6 border-t border-border pt-10 first:border-0 first:pt-0">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{note}</p>
      </header>
      {children}
    </section>
  );
}

function LibraryShowcase() {
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("ana.ruiz@transperfect.com");
  const [brief, setBrief] = useState("Launch the GlobalLink Q3 review in six languages.");

  const nav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => s.label.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className={cn(dark && "dark")} style={dark ? ELEMENT_DARK : ELEMENT_LIGHT}>
      <div className="min-h-screen bg-background font-sans text-foreground">

        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Design system · Preview only
              </div>
              <div className="text-lg font-semibold tracking-[-0.02em]">Element library showcase</div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Badge variant="secondary">6 exports</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDark((d) => !d)}
                aria-pressed={dark}
              >
                {dark ? <Moon /> : <Sun />}
                {dark ? "Dark" : "Light"}
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1400px] gap-10 px-6 py-10">
          <aside className="sticky top-24 hidden h-fit w-56 shrink-0 lg:block">
            <label className="relative block">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter sections…"
                aria-label="Filter showcase sections"
                className="pl-9"
              />
            </label>
            <nav aria-label="Showcase sections" className="mt-4 space-y-1">
              {nav.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s.label}
                </a>
              ))}
              {nav.length === 0 && (
                <p className="px-3 py-1.5 text-sm text-muted-foreground">No section matches.</p>
              )}
            </nav>
          </aside>

          <main className="min-w-0 flex-1 space-y-12">
            <Section
              id="overview"
              title="Element"
              note="The TransPerfect Element library: Geist type, brand blue primary, aqua accent, and five components exported from src/design-system/element. Everything on this page is drawn with those tokens and components."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Tokens first</CardTitle>
                    <CardDescription>Colour, radius and type are variables — never literals.</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Variant APIs</CardTitle>
                    <CardDescription>Visual change happens through variant and size props.</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Both themes</CardTitle>
                    <CardDescription>Every specimen is verified on light and dark ground.</CardDescription>
                  </CardHeader>
                </Card>
              </div>
              <Snippet code={`import { Button, Card, Input } from "@/design-system/element";`} />
            </Section>

            <Section
              id="colors"
              title="Colors"
              note="Semantic pairs rendered foreground-on-background so contrast is visible. Reach for the token, never the value."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {SEMANTIC_TOKENS.map((t) => (
                  <div key={t.token} className="overflow-hidden rounded-lg border border-border">
                    <div className={cn("flex h-24 items-end p-3", t.bg)}>
                      <span className={cn("text-sm font-semibold", t.fg)}>Aa</span>
                    </div>
                    <div className="space-y-1 bg-card p-3">
                      <div className="font-mono text-[11px] text-foreground">{t.token}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Spec label="Chart ramp">
                {CHART_TOKENS.map((c) => (
                  <div key={c} className="space-y-1">
                    <div className={cn("size-14 rounded-md border border-border", c)} />
                    <div className="font-mono text-[11px] text-muted-foreground">{c}</div>
                  </div>
                ))}
              </Spec>
            </Section>

            <Section
              id="typography"
              title="Typography"
              note="Geist Variable for text, Geist Mono Variable for code. Headings run tight; body sits at 140% leading."
            >
              <div className="space-y-6">
                {TYPE_SCALE.map((t) => (
                  <div key={t.label} className="space-y-1">
                    <div className={t.cls}>{t.sample}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{t.label}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="button" title="Button" note="Six variants, four sizes, plus the states that matter.">
              <Spec label="variant">
                <Button>Build deck</Button>
                <Button variant="secondary">Duplicate</Button>
                <Button variant="outline">Preview</Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="destructive">Delete deck</Button>
                <Button variant="link">View brand guide</Button>
              </Spec>
              <Spec label="size">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="Mark approved">
                  <Check />
                </Button>
              </Spec>
              <Spec label="state">
                <Button className="bg-primary/90">Hover</Button>
                <Button autoFocus={false} className="ring-2 ring-ring ring-offset-2">
                  Focus-visible
                </Button>
                <Button disabled>Disabled</Button>
                <Button variant="outline" disabled>
                  Disabled outline
                </Button>
              </Spec>
              <Snippet code={`<Button variant="secondary" size="lg">Duplicate</Button>`} />
            </Section>

            <Section id="badge" title="Badge" note="Status marks for deck state, roles and approvals.">
              <Spec label="variant">
                <Badge>Approved</Badge>
                <Badge variant="secondary">In review</Badge>
                <Badge variant="outline">Draft</Badge>
                <Badge variant="destructive">Off-brand</Badge>
              </Spec>
              <Snippet code={`<Badge variant="outline">Draft</Badge>`} />
            </Section>

            <Section id="card" title="Card" note="Header, content and footer slots on the card surface token.">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>GlobalLink Q3 review</CardTitle>
                    <CardDescription>Six slides · Enterprise look · updated 2 hours ago</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Translation throughput rose 18% quarter over quarter across 42 locales.
                  </CardContent>
                  <CardFooter className="gap-3">
                    <Button size="sm">Open</Button>
                    <Button size="sm" variant="outline">
                      Export
                    </Button>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>DataForce annotation pilot</CardTitle>
                    <CardDescription>Awaiting brand review</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Badge variant="secondary">AI · Data</Badge>
                    <Badge variant="outline">R03</Badge>
                  </CardContent>
                </Card>
              </div>
              <Snippet
                code={`<Card>
  <CardHeader>
    <CardTitle>GlobalLink Q3 review</CardTitle>
    <CardDescription>Six slides</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter><Button size="sm">Open</Button></CardFooter>
</Card>`}
              />
            </Section>

            <Section id="input" title="Input" note="Single-line field with the shared focus ring and disabled treatment.">
              <div className="grid max-w-xl gap-4">
                <Spec label="default">
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-label="Work email"
                    className="max-w-sm"
                  />
                </Spec>
                <Spec label="placeholder">
                  <Input placeholder="Deck name — e.g. Legal Tech EMEA" className="max-w-sm" />
                </Spec>
                <Spec label="focus-visible">
                  <Input defaultValue="Focused field" className="max-w-sm ring-2 ring-ring ring-offset-2" />
                </Spec>
                <Spec label="error">
                  <Input
                    defaultValue="not-an-email"
                    aria-invalid
                    className="max-w-sm border-destructive focus-visible:ring-destructive"
                  />
                </Spec>
                <Spec label="disabled">
                  <Input disabled defaultValue="Locked by admin" className="max-w-sm" />
                </Spec>
              </div>
              <Snippet code={`<Input placeholder="Deck name" aria-label="Deck name" />`} />
            </Section>

            <Section id="textarea" title="Textarea" note="Multi-line brief field, same border and focus contract as Input.">
              <div className="grid max-w-xl gap-4">
                <Spec label="default">
                  <Textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    aria-label="Deck brief"
                    className="min-h-24 w-full"
                  />
                </Spec>
                <Spec label="disabled">
                  <Textarea disabled defaultValue="Brief locked after approval." className="min-h-24 w-full" />
                </Spec>
              </div>
              <Snippet code={`<Textarea aria-label="Deck brief" className="min-h-24" />`} />
            </Section>

            <Section
              id="composition"
              title="In context"
              note="Composition surfaces the alignment and spacing bugs isolated specimens hide."
            >
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle>Request a deck review</CardTitle>
                  <CardDescription>Brand team responds within one business day.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="sc-email" className="text-sm font-medium">
                      Work email
                    </label>
                    <Input id="sc-email" defaultValue="ana.ruiz@transperfect.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="sc-notes" className="text-sm font-medium">
                      What should we look at?
                    </label>
                    <Textarea id="sc-notes" className="min-h-24" defaultValue="Cover slide and the stats page." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">GlobalLink</Badge>
                    <Badge variant="outline">Enterprise look</Badge>
                  </div>
                </CardContent>
                <CardFooter className="gap-3">
                  <Button>Send request</Button>
                  <Button variant="ghost">Save draft</Button>
                </CardFooter>
              </Card>
            </Section>
          </main>
        </div>
      </div>
    </div>
  );
}
