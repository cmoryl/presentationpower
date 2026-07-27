import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  NEXT_APPLICATION_RULES,
  NEXT_CORE_COLORS,
  NEXT_DIVISIONS,
  NEXT_DROPBOX_URL,
  NEXT_GUIDE_UPDATED,
  NEXT_GUIDE_VERSION,
  NEXT_LOGO_RULES,
  NEXT_MARKS,
  NEXT_TYPOGRAPHY,
  type NextDivisionBrand,
  type NextLockup,
} from "@/lib/next-brand-guide";

export const Route = createFileRoute("/knowledge/brand-guides/next-2026")({
  head: () => ({
    meta: [
      { title: "TransPerfect NEXT 2026 · Master Brand Guide" },
      {
        name: "description",
        content:
          "The master brand guide for TransPerfect NEXT 2026 — every division lockup, the City Series, the official accent palette, clear space, misuse rules and application standards.",
      },
      { property: "og:title", content: "TransPerfect NEXT 2026 · Master Brand Guide" },
      {
        property: "og:description",
        content:
          "Every NEXT 2026 lockup, accent color, Pantone build and usage rule in one canonical guide.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NextBrandGuide,
});

const NAVY = "#1B3E6F";

/* ── small pieces ─────────────────────────────────────────────── */

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-black/10 pt-12 dark:border-white/10">
      <div className="text-[11px] uppercase tracking-[0.3em] text-black/45 dark:text-white/45">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function LockupTile({ item, accent }: { item: NextLockup; accent: string }) {
  const dark = item.variant !== "color";
  return (
    <figure className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.04]">
      <div
        className="flex h-36 items-center justify-center px-8"
        style={{ background: dark ? NAVY : "#FFFFFF" }}
      >
        <img
          src={item.src}
          alt={`${item.lockupLabel} ${item.variantLabel} lockup`}
          className="max-h-20 w-full object-contain"
          style={{ maxWidth: item.aspect > 4 ? "100%" : "62%" }}
          loading="lazy"
        />
      </div>
      <figcaption className="flex items-center justify-between gap-3 border-t border-black/10 px-4 py-3 text-xs dark:border-white/10">
        <span className="font-medium">
          {item.lockupLabel} · {item.variantLabel}
        </span>
        <a
          href={item.src}
          download
          className="rounded-full border px-3 py-1 text-[11px] transition hover:opacity-80"
          style={{ borderColor: accent, color: accent }}
        >
          SVG
        </a>
      </figcaption>
    </figure>
  );
}

function DivisionPanel({ division }: { division: NextDivisionBrand }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div
            className="text-[11px] uppercase tracking-[0.3em]"
            style={{ color: division.accent }}
          >
            Division lockup
          </div>
          <h3 className="mt-2 text-2xl font-semibold">{division.name}</h3>
          <p className="mt-2 max-w-2xl text-sm text-black/60 dark:text-white/60">
            {division.note}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-4">
          {[
            ["HEX", division.accent],
            ["RGB", division.rgb],
            ["CMYK", division.cmyk],
            ["Pantone", division.pantone],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="uppercase tracking-[0.2em] text-black/40 dark:text-white/40">{k}</dt>
              <dd className="mt-1 font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {division.accentArtwork.toLowerCase() !== division.accent.toLowerCase() && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-black/70 dark:text-white/70">
          Palette spec is <strong>{division.accent}</strong>, but the supplied vector artwork is
          drawn in <strong>{division.accentArtwork}</strong>. Use the artwork as-is for lockups; use
          the spec value for surrounding design and digital tokens.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {division.lockups.map((l) => (
          <LockupTile key={l.src} item={l} accent={division.accent} />
        ))}
      </div>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────── */

function NextBrandGuide() {
  const [activeDivision, setActiveDivision] = useState(NEXT_DIVISIONS[0].id);
  const division = useMemo(
    () => NEXT_DIVISIONS.find((d) => d.id === activeDivision) ?? NEXT_DIVISIONS[0],
    [activeDivision],
  );

  const lockupCount = NEXT_DIVISIONS.reduce((n, d) => n + d.lockups.length, 0);

  return (
    <AppShell>
      {/* Hero */}
      <header
        className="relative overflow-hidden rounded-3xl px-8 py-14 text-white sm:px-12"
        style={{ background: NAVY }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-30 blur-3xl"
          style={{ background: "#13B1F3" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ background: "#C2A3FF" }}
        />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.35em] text-white/60">
            Master brand guide · v{NEXT_GUIDE_VERSION} · {NEXT_GUIDE_UPDATED}
          </div>
          <img
            src="/next-2026/logos/transperfect-side-by-side-white.svg"
            alt="TransPerfect NEXT 2026"
            className="mt-6 w-full max-w-xl"
          />
          <p className="mt-6 max-w-2xl text-white/70">
            The canonical identity system for TransPerfect NEXT 2026 and the NEXT City Series.
            Twelve track lockups, one master lockup, one palette, one set of rules — built directly
            from the released vector masters.
          </p>
          <div className="mt-8 flex flex-wrap gap-8 text-sm">
            {[
              [String(NEXT_DIVISIONS.length), "Lockup families"],
              [String(lockupCount), "Approved lockups"],
              [String(NEXT_DIVISIONS.length - 2), "Track accents"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="text-3xl font-semibold tabular-nums">{n}</div>
                <div className="text-white/55">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href={NEXT_DROPBOX_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-[#1B3E6F] transition hover:bg-white/90"
            >
              Download master files (EPS · AI · PNG)
            </a>
            <Link
              to={"/events/next" as never}
              className="rounded-full border border-white/30 px-5 py-2 text-sm text-white/85 transition hover:border-white"
            >
              NEXT 2026 hub →
            </Link>
            <Link
              to="/knowledge/brand-guides"
              className="rounded-full border border-white/30 px-5 py-2 text-sm text-white/85 transition hover:border-white"
            >
              All brand guides
            </Link>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-1.5">
          {NEXT_DIVISIONS.map((d) => (
            <span key={d.id} className="flex-1" style={{ background: d.accent }} />
          ))}
        </div>
      </header>

      {/* Contents */}
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Guide sections">
        {[
          ["logo-system", "Logo system"],
          ["lockups", "Lockups by track"],
          ["marks", "Marks & motifs"],
          ["color", "Color"],
          ["type", "Typography"],
          ["clear-space", "Clear space & sizing"],
          ["misuse", "Rules & misuse"],
          ["applications", "Applications"],
          ["files", "File formats"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full border border-black/15 px-4 py-1.5 text-xs text-black/70 transition hover:border-black/40 dark:border-white/15 dark:text-white/70 dark:hover:border-white/40"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-12 space-y-14 pb-24">
        {/* Logo system */}
        <Section id="logo-system" eyebrow="01 · Foundation" title="The NEXT logo system">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4 text-black/70 dark:text-white/70">
              <p>
                Every NEXT lockup is built from the same two parts: a{" "}
                <strong>track name</strong> set in Gotham Bold and the <strong>NEXT 26 mark</strong>
                , where the chevron lines carry the track accent color. The relationship between
                those two parts is fixed — it is the one thing that makes the family read as a
                single event.
              </p>
              <p>
                Two orientations ship for every track. <strong>Side by side</strong> is the default
                for horizontal fields: headers, banners, slide corners, signage bands.{" "}
                <strong>Stacked</strong> is for square and vertical fields: social tiles, badges,
                pull-up banners, avatars.
              </p>
              <p>
                Three color variants ship for every orientation. <strong>Color</strong> (navy
                wordmark + accent NEXT) for light backgrounds, <strong>all white</strong> for dark
                and photographic backgrounds, and <strong>reverse</strong> (white wordmark + accent
                NEXT) for navy and near-black.
              </p>
              <p>
                The <strong>City Series</strong> is a distinct lockup, not a division. It carries
                the deeper City Series navy and adds the CITY SERIES line beneath the mark. City
                names are never typeset inside the lockup.
              </p>
            </div>
            <div className="space-y-4">
              {["color", "white", "reverse"].map((v) => {
                const item = NEXT_DIVISIONS[0].lockups.find(
                  (l) => l.lockup === "side-by-side" && l.variant === v,
                );
                if (!item) return null;
                return <LockupTile key={v} item={item} accent="#13B1F3" />;
              })}
            </div>
          </div>
        </Section>

        {/* Lockups */}
        <Section id="lockups" eyebrow="02 · Artwork" title="Lockups by track">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="NEXT tracks">
            {NEXT_DIVISIONS.map((d) => {
              const active = d.id === activeDivision;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveDivision(d.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-transparent bg-[#05041A] text-white dark:bg-white dark:text-[#03002C]"
                      : "border-black/15 text-black/70 hover:border-black/40 dark:border-white/15 dark:text-white/70 dark:hover:border-white/40"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: d.accent }}
                    aria-hidden
                  />
                  {d.name.replace(" NEXT", "")}
                </button>
              );
            })}
          </div>
          <div className="mt-8">
            <DivisionPanel division={division} />
          </div>
        </Section>

        {/* Marks */}
        <Section id="marks" eyebrow="03 · Elements" title="Marks & graphic motifs">
          <div className="grid gap-6 md:grid-cols-2">
            {NEXT_MARKS.map((m) => (
              <div
                key={m.id}
                className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"
              >
                <div
                  className="flex h-52 items-center justify-center p-10"
                  style={{ background: NAVY }}
                >
                  <img
                    src={m.src}
                    alt={m.name}
                    className="max-h-32 object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="bg-white p-5 dark:bg-white/[0.04]">
                  <div className="font-medium">{m.name}</div>
                  <p className="mt-2 text-sm text-black/60 dark:text-white/60">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Color */}
        <Section id="color" eyebrow="04 · Color" title="The NEXT palette">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
            Structural colors
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {NEXT_CORE_COLORS.map((c) => (
              <div
                key={c.hex}
                className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"
              >
                <div className="h-24" style={{ background: c.hex }} />
                <div className="bg-white p-4 dark:bg-white/[0.04]">
                  <div className="font-medium">{c.name}</div>
                  <div className="mt-1 text-xs tabular-nums text-black/50 dark:text-white/50">
                    {c.hex} · RGB {c.rgb}
                  </div>
                  <p className="mt-2 text-xs text-black/60 dark:text-white/60">{c.role}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
            Track accents
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-black/60 dark:text-white/60">
            One accent per track, taken from the official NEXT 26 logo palette. Accents are for the
            NEXT mark and for supporting graphics inside that track only — they are never
            interchangeable and never appear as body text on white.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-[0.2em] text-black/45 dark:border-white/10 dark:text-white/45">
                  <th className="py-3 pr-4 font-medium">Track</th>
                  <th className="py-3 pr-4 font-medium">Swatch</th>
                  <th className="py-3 pr-4 font-medium">HEX</th>
                  <th className="py-3 pr-4 font-medium">RGB</th>
                  <th className="py-3 pr-4 font-medium">CMYK</th>
                  <th className="py-3 pr-4 font-medium">HSL</th>
                  <th className="py-3 font-medium">Pantone</th>

                </tr>
              </thead>
              <tbody>
                {NEXT_DIVISIONS.map((d) => (
                  <tr key={d.id} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-3 pr-4 font-medium">{d.name}</td>
                    <td className="py-3 pr-4">
                      <span
                        className="inline-block h-6 w-14 rounded border border-black/10 dark:border-white/20"
                        style={{ background: d.accent }}
                      />
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{d.accent}</td>
                    <td className="py-3 pr-4 tabular-nums">{d.rgb}</td>
                    <td className="py-3 pr-4 tabular-nums">{d.cmyk}</td>
                    <td className="py-3">{d.pantone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Typography */}
        <Section id="type" eyebrow="05 · Typography" title="Typefaces">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
              <div className="text-[11px] uppercase tracking-[0.25em] text-black/45 dark:text-white/45">
                Logo typeface
              </div>
              <div className="mt-3 text-2xl font-semibold">{NEXT_TYPOGRAPHY.logoFont}</div>
              <p className="mt-3 text-sm text-black/60 dark:text-white/60">
                {NEXT_TYPOGRAPHY.logoFontNote}
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
              <div className="text-[11px] uppercase tracking-[0.25em] text-black/45 dark:text-white/45">
                Communications typeface
              </div>
              <div className="mt-3 text-2xl font-semibold">{NEXT_TYPOGRAPHY.headlineFont}</div>
              <p className="mt-3 text-sm text-black/60 dark:text-white/60">
                {NEXT_TYPOGRAPHY.headlineNote}
              </p>
            </div>
          </div>
          <div className="mt-6 divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {NEXT_TYPOGRAPHY.scale.map((s) => (
              <div
                key={s.label}
                className="flex flex-wrap items-baseline justify-between gap-4 px-6 py-5"
              >
                <div
                  className="min-w-0 truncate"
                  style={{
                    fontSize: Math.min(s.sizePx, 48),
                    fontWeight: s.weight,
                    letterSpacing: s.tracking,
                  }}
                >
                  {s.sample}
                </div>
                <div className="shrink-0 text-xs tabular-nums text-black/45 dark:text-white/45">
                  {s.label} · {s.sizePx}px · {s.weight} · tracking {s.tracking}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Clear space */}
        <Section id="clear-space" eyebrow="06 · Construction" title="Clear space & minimum size">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-white/[0.04]">
              <div
                className="relative flex items-center justify-center rounded-xl border-2 border-dashed p-10"
                style={{ borderColor: "#13B1F3" }}
              >
                <img
                  src="/next-2026/logos/transperfect-side-by-side-color.svg"
                  alt="Clear space diagram: one X of clear space on all sides of the lockup"
                  className="w-full"
                />
                <span className="absolute -top-3 left-4 bg-white px-2 text-[11px] font-medium text-[#13B1F3] dark:bg-[#0b1220]">
                  X = cap height of NEXT
                </span>
              </div>
              <p className="mt-5 text-sm text-black/60 dark:text-white/60">
                Clear space on all four sides equals <strong>X</strong>, the cap height of the word
                NEXT in the lockup being used. Scale it with the logo — it is a ratio, not a fixed
                measurement.
              </p>
            </div>
            <div className="space-y-4">
              {[
                ["Side by side — digital", "180 px minimum width"],
                ["Side by side — print", "45 mm minimum width"],
                ["Stacked — digital", "96 px minimum width"],
                ["Stacked — print", "25 mm minimum width"],
                ["On screen (AV)", "Stacked lockup ≥ 4% of frame height"],
                ["Below minimum", "Use the NEXT 26 wordmark alone"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-4 rounded-xl border border-black/10 px-5 py-4 text-sm dark:border-white/10"
                >
                  <span className="text-black/70 dark:text-white/70">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Misuse */}
        <Section id="misuse" eyebrow="07 · Governance" title="Rules & misuse">
          <div className="grid gap-4 md:grid-cols-2">
            {NEXT_LOGO_RULES.map((r) => (
              <div
                key={r.title}
                className={`rounded-2xl border p-5 ${
                  r.do
                    ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                    : "border-red-500/30 bg-red-500/[0.06]"
                }`}
              >
                <div
                  className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${
                    r.do ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {r.do ? "Do" : "Don't"}
                </div>
                <div className="mt-2 font-medium">{r.title}</div>
                <p className="mt-2 text-sm text-black/65 dark:text-white/65">{r.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Applications */}
        <Section id="applications" eyebrow="08 · Applications" title="Applying NEXT in the wild">
          <div className="grid gap-5 md:grid-cols-2">
            {NEXT_APPLICATION_RULES.map((a) => (
              <div
                key={a.surface}
                className="rounded-2xl border border-black/10 p-6 dark:border-white/10"
              >
                <div className="text-lg font-semibold">{a.surface}</div>
                <ul className="mt-3 space-y-2 text-sm text-black/65 dark:text-white/65">
                  {a.rules.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span aria-hidden style={{ color: "#13B1F3" }}>
                        —
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Files */}
        <Section id="files" eyebrow="09 · Assets" title="File formats & where to get them">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["EPS", "Print, signage, fabrication. Send to vendors with the Pantone build."],
              ["AI", "Editable master. Design team only — do not distribute externally."],
              ["SVG", "Web, apps, presentations. Mirrored in this guide for direct download."],
              ["PNG", "Transparent raster fallback. Only when vector is impossible."],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-2xl border border-black/10 p-5 dark:border-white/10"
              >
                <div className="text-xl font-semibold">{k}</div>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">{v}</p>
              </div>
            ))}
          </div>
          <a
            href={NEXT_DROPBOX_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-full px-5 py-2 text-sm font-medium text-white"
            style={{ background: NAVY }}
          >
            Open the NEXT 2026 logo library →
          </a>
        </Section>
      </div>
    </AppShell>
  );
}
