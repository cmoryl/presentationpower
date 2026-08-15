// Lookbook: a full popup gallery that shows how one design skin dresses every
// section of a deck — cover, agenda, statement, stat wall, split media, bento,
// chart, quote and closing — plus the language's own spec notes. Every frame is
// rendered from the skin's translated StylePack tokens, so what the user sees
// here is exactly what the renderer and PPTX export produce.
import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { stylePackFromSkin } from "@/lib/design-skin-pack";
import type { StylePack } from "@/lib/style-packs";
import type { DesignSkin } from "@/lib/design-skins";
import { skinBackgroundSummary } from "@/lib/skin-backgrounds";
import { packGeometry, shapeCss, SHAPE_LABEL } from "@/lib/pack-geometry";

type Frame = { key: string; label: string; render: (p: StylePack) => React.ReactNode };

function Sheet({
  pack,
  seed,
  children,
}: {
  pack: StylePack;
  seed: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden"
      style={{
        background: pack.ground(seed).join(", "),
        borderRadius: Math.max(pack.card.radius, 8),
      }}
    >
      {pack.topBar && (
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: pack.tokens.accent }}
        />
      )}
      <div className="absolute inset-0 p-[6%]">{children}</div>
    </div>
  );
}

function Kicker({ pack, children }: { pack: StylePack; children: React.ReactNode }) {
  return (
    <div
      className="text-[8px] leading-none"
      style={{
        color: pack.tokens.accentText,
        fontFamily: pack.type.kicker,
        fontWeight: pack.type.kickerWeight,
        letterSpacing: pack.type.kickerTracking,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function Display({
  pack,
  size = 22,
  children,
}: {
  pack: StylePack;
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        color: pack.tokens.ink,
        fontFamily: pack.type.display,
        fontWeight: pack.type.displayWeight,
        letterSpacing: pack.type.displayTracking,
        textTransform: pack.type.displayTransform,
        fontSize: size * pack.type.displayScale,
        lineHeight: 1.03,
      }}
    >
      {children}
    </div>
  );
}

function Body({
  pack,
  size = 8,
  muted = true,
  children,
}: {
  pack: StylePack;
  size?: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        color: muted ? pack.tokens.inkMuted : pack.tokens.ink,
        fontFamily: pack.type.body,
        fontSize: size,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}

function geoOf(pack: StylePack) {
  const g = packGeometry(pack);
  return {
    ...g,
    css: shapeCss(g.shape, {
      radius: pack.card.radius,
      accent: pack.tokens.accent,
      ink: pack.tokens.ink,
      baseShadow: pack.card.shadow,
      dark: pack.mode === "dark",
    }),
  };
}

function cardStyle(pack: StylePack): React.CSSProperties {
  const { css } = geoOf(pack);
  return {
    background: pack.card.bg,
    border: pack.card.border,
    borderRadius: css.radius,
    boxShadow: css.extraShadow || undefined,
    clipPath: css.clipPath,
    backdropFilter: pack.card.blur === "none" ? undefined : pack.card.blur,
  };
}

/** The pack's signature rule mark — bar, dot row, hairline or nothing. */
function Rule({ pack, width = "26%" }: { pack: StylePack; width?: string }) {
  const { layout } = geoOf(pack);
  if (layout.rule === "none") return null;
  if (layout.rule === "dots")
    return (
      <div className="flex gap-[4px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-[4px] w-[4px] rounded-full"
            style={{ background: pack.tokens.accent, opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
    );
  if (layout.rule === "hairline")
    return <div className="h-[1px] w-full" style={{ background: pack.tokens.hairline }} />;
  return <div className="h-[2px]" style={{ width, background: pack.tokens.accent }} />;
}

function StatWall({ pack }: { pack: StylePack }) {
  const { layout } = geoOf(pack);
  const all: [string, string][] = [
    ["42%", "faster cycles"],
    ["3.1×", "throughput"],
    ["18d", "to launch"],
    ["99.8%", "on-time SLA"],
  ];
  const items = layout.stats === "cards3" ? all.slice(0, 3) : all;
  const figure = (n: string, hero: boolean, size = 15) => (
    <div
      className="leading-none"
      style={{
        fontSize: size,
        color: hero ? pack.tokens.accentText : pack.tokens.ink,
        fontFamily: pack.type.display,
        fontWeight: 700,
        letterSpacing: pack.type.displayTracking,
      }}
    >
      {n}
    </div>
  );

  if (layout.stats === "rail")
    return (
      <div className="grid grid-cols-2 gap-x-[6%] gap-y-[4%]">
        {items.map(([n, l], i) => (
          <div
            key={l}
            className="border-l pl-[5%]"
            style={{ borderColor: i === 0 ? pack.tokens.accent : pack.tokens.hairline }}
          >
            {figure(n, i === 0, 17)}
            <div className="mt-[6%]">
              <Body pack={pack} size={7}>
                {l}
              </Body>
            </div>
          </div>
        ))}
      </div>
    );

  if (layout.stats === "band")
    return (
      <div className="flex items-stretch" style={cardStyle(pack)}>
        {items.map(([n, l], i) => (
          <div
            key={l}
            className="flex-1 px-[4%] py-[3%]"
            style={
              i === 0
                ? undefined
                : { borderLeft: `1px solid ${pack.tokens.hairline}` }
            }
          >
            {figure(n, i === 0, 16)}
            <div className="mt-[8%]">
              <Body pack={pack} size={7}>
                {l}
              </Body>
            </div>
          </div>
        ))}
      </div>
    );

  return (
    <div
      className={`grid gap-[3%] ${layout.stats === "cards3" ? "grid-cols-3" : "grid-cols-4"}`}
    >
      {items.map(([n, l], i) => (
        <div key={l} className="px-[7%] py-[9%]" style={cardStyle(pack)}>
          {figure(n, i === 0)}
          <div className="mt-[10%] h-[1px] w-full" style={{ background: pack.tokens.hairline }} />
          <div className="mt-[8%]">
            <Body pack={pack} size={7}>
              {l}
            </Body>
          </div>
        </div>
      ))}
    </div>
  );
}

function GridFrame({ pack }: { pack: StylePack }) {
  const { layout } = geoOf(pack);
  const tiles = ["Connectors", "Governance", "Analytics", "AI review"];
  const lead = (
    <>
      <Kicker pack={pack}>Platform</Kicker>
      <div className="mt-[2%]">
        <Display pack={pack} size={14}>
          GlobalLink Enterprise
        </Display>
      </div>
    </>
  );

  if (layout.grid === "mosaic")
    return (
      <div className="grid h-full grid-cols-3 grid-rows-3 gap-[3%]">
        <div className="col-span-3 flex items-end p-[3.5%]" style={cardStyle(pack)}>
          <div>{lead}</div>
        </div>
        {tiles.slice(0, 3).map((t) => (
          <div key={t} className="flex items-end p-[8%]" style={cardStyle(pack)}>
            <Body pack={pack} size={8} muted={false}>
              {t}
            </Body>
          </div>
        ))}
        <div className="col-span-3 flex items-center p-[3.5%]" style={cardStyle(pack)}>
          <Body pack={pack} size={8}>
            {tiles[3]} · continuous quality signal across every locale
          </Body>
        </div>
      </div>
    );

  if (layout.grid === "columns")
    return (
      <div className="flex h-full flex-col">
        <div>{lead}</div>
        <div className="mt-[4%] grid flex-1 grid-cols-4 gap-[3%]">
          {tiles.map((t, i) => (
            <div key={t} className="flex flex-col justify-between p-[8%]" style={cardStyle(pack)}>
              <span
                className="text-[8px]"
                style={{ color: pack.tokens.accentText, fontFamily: pack.type.mono }}
              >
                0{i + 1}
              </span>
              <Body pack={pack} size={8} muted={false}>
                {t}
              </Body>
            </div>
          ))}
        </div>
      </div>
    );

  if (layout.grid === "stack")
    return (
      <div className="flex h-full flex-col gap-[3%]">
        <div className="p-[4%]" style={cardStyle(pack)}>
          {lead}
        </div>
        {[tiles.slice(0, 2), tiles.slice(2)].map((row, ri) => (
          <div key={ri} className="grid flex-1 grid-cols-2 gap-[3%]">
            {row.map((t) => (
              <div key={t} className="flex items-center p-[6%]" style={cardStyle(pack)}>
                <Body pack={pack} size={8} muted={false}>
                  {t}
                </Body>
              </div>
            ))}
          </div>
        ))}
      </div>
    );

  return (
    <div className="grid h-full grid-cols-3 grid-rows-2 gap-[3%]">
      <div className="col-span-2 flex flex-col justify-end p-[5%]" style={cardStyle(pack)}>
        {lead}
      </div>
      {tiles.map((t) => (
        <div key={t} className="flex items-end p-[8%]" style={cardStyle(pack)}>
          <Body pack={pack} size={8} muted={false}>
            {t}
          </Body>
        </div>
      ))}
    </div>
  );
}

const FRAMES: Frame[] = [
  {
    key: "cover",
    label: "Cover",
    render: (p) => {
      const { layout } = geoOf(p);
      const title = (
        <Display pack={p} size={layout.cover === "centered" ? 26 : 30}>
          One system.
          <br />
          Every surface.
        </Display>
      );
      const sub = <Body pack={p}>Prepared for a global enterprise localization program</Body>;
      if (layout.cover === "centered")
        return (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Kicker pack={p}>Client proposal · 2026</Kicker>
            <div className="mt-[3%]">{title}</div>
            <div className="mt-[4%] flex justify-center">
              <Rule pack={p} width="18%" />
            </div>
            <div className="mt-[3%] max-w-[70%]">{sub}</div>
          </div>
        );
      if (layout.cover === "split")
        return (
          <div className="grid h-full grid-cols-[1.25fr_1fr] items-center gap-[6%]">
            <div>
              <Kicker pack={p}>Client proposal · 2026</Kicker>
              <div className="mt-[3%]">{title}</div>
              <div className="mt-[4%]">
                <Rule pack={p} width="34%" />
              </div>
            </div>
            <div className="h-full py-[6%]">
              <div
                className="h-full w-full"
                style={{
                  ...cardStyle(p),
                  background: `linear-gradient(150deg, ${p.tokens.accent}, ${p.tokens.accentAlt})`,
                }}
              />
            </div>
          </div>
        );
      if (layout.cover === "banded")
        return (
          <div className="flex h-full flex-col justify-center">
            <div className="p-[5%]" style={cardStyle(p)}>
              <Kicker pack={p}>Client proposal · 2026</Kicker>
              <div className="mt-[2%]">{title}</div>
            </div>
            <div className="mt-[4%]">{sub}</div>
          </div>
        );
      if (layout.cover === "stacked")
        return (
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-center justify-between">
              <Kicker pack={p}>Client proposal · 2026</Kicker>
              <Kicker pack={p}>01 / 24</Kicker>
            </div>
            <div>{title}</div>
            <div className="flex items-end justify-between gap-[6%]">
              <div className="max-w-[62%]">{sub}</div>
              <Rule pack={p} width="60px" />
            </div>
          </div>
        );
      return (
        <div className="flex h-full flex-col justify-end">
          <Kicker pack={p}>Client proposal · 2026</Kicker>
          <div className="mt-[2%]">{title}</div>
          <div className="mt-[3%]">
            <Rule pack={p} />
          </div>
          <div className="mt-[3%]">{sub}</div>
        </div>
      );
    },
  },
  {
    key: "agenda",
    label: "Agenda",
    render: (p) => (
      <div className="flex h-full flex-col">
        <Kicker pack={p}>Agenda</Kicker>
        <div className="mt-[2%]">
          <Display pack={p} size={16}>
            What we will cover
          </Display>
        </div>
        <div className="mt-[4%] grid flex-1 grid-rows-4 gap-[3%]">
          {["Where you are today", "The opportunity", "How the program works", "Next steps"].map(
            (t, i) => (
              <div
                key={t}
                className="flex items-center gap-[3%] border-b pb-[1%]"
                style={{ borderColor: p.tokens.hairline }}
              >
                <span
                  className="text-[9px]"
                  style={{
                    color: p.tokens.accentText,
                    fontFamily: p.type.mono,
                  }}
                >
                  0{i + 1}
                </span>
                <Body pack={p} size={9} muted={false}>
                  {t}
                </Body>
              </div>
            ),
          )}
        </div>
      </div>
    ),
  },
  {
    key: "statement",
    label: "Statement",
    render: (p) => (
      <div className="flex h-full items-center">
        <div>
          <Rule pack={p} width="16%" />
          <div className="mt-[3%]">
            <Display pack={p} size={26}>
              Translation stops being a project. It becomes infrastructure.
            </Display>
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "stats",
    label: "Stat wall",
    render: (p) => (
      <div className="flex h-full flex-col justify-between">
        <div>
          <Kicker pack={p}>Proof</Kicker>
          <div className="mt-[2%]">
            <Display pack={p} size={15}>
              Measured impact
            </Display>
          </div>
        </div>
        <StatWall pack={p} />
      </div>
    ),
  },
  {
    key: "split",
    label: "Split + media",
    render: (p) => (
      <div className="grid h-full grid-cols-2 gap-[5%]">
        <div className="flex flex-col justify-center">
          <Kicker pack={p}>Approach</Kicker>
          <div className="mt-[3%]">
            <Display pack={p} size={17}>
              Content in, markets out
            </Display>
          </div>
          <div className="mt-[4%]">
            <Body pack={p} size={8}>
              Connectors pull source content continuously, linguists review in context, and every
              locale ships on the same release train.
            </Body>
          </div>
        </div>
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: p.card.radius,
            border: p.card.border,
            background: `linear-gradient(135deg, ${p.tokens.accent}, ${p.tokens.accentAlt})`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(120% 80% at 20% 10%, rgba(255,255,255,0.35), transparent 60%)`,
            }}
          />
        </div>
      </div>
    ),
  },
  {
    key: "bento",
    label: "Bento grid",
    render: (p) => (
      <GridFrame pack={p} />
    ),
  },
  {
    key: "chart",
    label: "Chart",
    render: (p) => (
      <div className="flex h-full flex-col">
        <Kicker pack={p}>Cost per word, indexed</Kicker>
        <div className="mt-[2%]">
          <Display pack={p} size={14}>
            Unit cost falls as volume compounds
          </Display>
        </div>
        <div
          className="mt-[5%] flex flex-1 items-end gap-[3%] border-b pb-[1%]"
          style={{ borderColor: p.tokens.hairline }}
        >
          {[38, 52, 46, 64, 72, 88, 96].map((h, i) => (
            <div
              key={i}
              className="flex-1"
              style={{
                height: `${h}%`,
                background: i > 4 ? p.tokens.accent : p.tokens.accentAlt,
                opacity: i > 4 ? 1 : 0.55,
                borderRadius: Math.min(p.card.radius, 4),
              }}
            />
          ))}
        </div>
      </div>
    ),
  },
  {
    key: "quote",
    label: "Quote",
    render: (p) => (
      <div className="flex h-full flex-col justify-center">
        <div className="p-[6%]" style={cardStyle(p)}>
          <Display pack={p} size={15}>
            “We shipped eleven markets in the time one used to take.”
          </Display>
          <div className="mt-[4%]">
            <Body pack={p} size={8}>
              VP Digital Experience · Global retail group
            </Body>
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "timeline",
    label: "Timeline",
    render: (p) => (
      <div className="flex h-full flex-col justify-center">
        <Kicker pack={p}>Rollout</Kicker>
        <div className="mt-[4%] flex items-start gap-[2%]">
          {["Discover", "Pilot", "Scale", "Optimize"].map((t, i) => (
            <div key={t} className="flex-1">
              <div className="h-[3px] w-full" style={{ background: p.tokens.accent, opacity: 1 - i * 0.2 }} />
              <div className="mt-[8%]">
                <Body pack={p} size={9} muted={false}>
                  {t}
                </Body>
                <Body pack={p} size={7}>
                  Week {i * 3 + 1}–{i * 3 + 3}
                </Body>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: "closing",
    label: "Closing",
    render: (p) => (
      <div className="flex h-full flex-col items-start justify-center">
        <Display pack={p} size={24}>
          Let’s build the program.
        </Display>
        <div className="mt-[4%]">
          <Rule pack={p} width="20%" />
        </div>
        <div
          className="mt-[5%] px-[4%] py-[2%] text-[9px]"
          style={{
            background: p.tokens.primary,
            color: p.tokens.surface,
            borderRadius: p.card.radius,
            fontFamily: p.type.body,
            fontWeight: 600,
          }}
        >
          Book the working session
        </div>
      </div>
    ),
  },
];

export type LookMeta = {
  /** Short code or reference shown above the title (e.g. "S04 · Cyber"). */
  code: string;
  name: string;
  description: string;
  palette: string[];
  /** Label/value pairs rendered in the spec strip. */
  specs: [string, string][];
  footer?: string;
};

/** Full-deck gallery for any look, driven by a StylePack plus display meta. */
export function LookLookbook({
  pack,
  meta,
  active,
  onUse,
  onClose,
}: {
  pack: StylePack;
  meta: LookMeta;
  active: boolean;
  onUse: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[#03002C]/60 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${meta.name} look and feel gallery`}
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-black/10 px-5 py-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
              {meta.code}
            </div>
            <h2 className="truncate text-lg font-semibold tracking-[-0.02em] text-[#03002C]">
              {meta.name}
            </h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-[#03002C]/60">{meta.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden overflow-hidden rounded sm:flex" aria-hidden="true">
              {meta.palette.map((c) => (
                <span key={c} className="h-5 w-5" style={{ background: c }} />
              ))}
            </div>
            <button
              type="button"
              onClick={onUse}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#003FC7] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0033a3]"
            >
              {active && <Check size={13} />}
              {active ? "Using this style" : "Use this style"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close gallery"
              className="rounded-lg border border-black/10 p-2 text-[#03002C]/55 transition hover:text-[#03002C]"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* spec strip */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-black/10 bg-[#F2F2F2]/60 px-5 py-3 text-[11px] sm:grid-cols-5">
          {[
            ...meta.specs,
            [
              "Boxes / layout",
              `${SHAPE_LABEL[packGeometry(pack).shape]} · ${packGeometry(pack).layout.cover} cover · ${packGeometry(pack).layout.grid} grid`,
            ] as [string, string],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[9px] font-semibold uppercase tracking-widest text-[#03002C]/40">
                {k}
              </dt>
              <dd className="text-[#03002C]/75">{v}</dd>
            </div>
          ))}
        </dl>

        {/* gallery */}
        <div className="max-h-[64vh] overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {FRAMES.map((f) => (
              <figure key={f.key} className="min-w-0">
                <Sheet pack={pack} seed={`${pack.id}-${f.key}`}>
                  {f.render(pack)}
                </Sheet>
                <figcaption className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-[#03002C]/45">
                  <span>{f.label}</span>
                  <span className="text-[#03002C]/25">{meta.code.split(" ")[0]}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          {meta.footer && <p className="mt-4 text-[11px] text-[#03002C]/50">{meta.footer}</p>}
        </div>
      </div>
    </div>
  );
}

export function SkinLookbook({
  skin,
  active,
  onUse,
  onClose,
}: {
  skin: DesignSkin;
  /** Whether this skin is already the selected look. */
  active: boolean;
  onUse: () => void;
  onClose: () => void;
}) {
  return (
    <LookLookbook
      pack={stylePackFromSkin(skin)}
      meta={{
        code: `${skin.code} · ${skin.reference}`,
        name: skin.name,
        description: skin.description,
        palette: skin.palette,
        specs: [
          ["Typography", skin.typography],
          ["Surfaces", skin.surfaceNote],
          ["Imagery", skin.imagery],
          ["Backdrops", skinBackgroundSummary(skin)],
          ["Density / mode", `${skin.density} · ${skin.mode}`],
        ],
        footer: `Best fit: ${skin.bestFit} · Spec ${skin.spec}`,
      }}
      active={active}
      onUse={onUse}
      onClose={onClose}
    />
  );
}

