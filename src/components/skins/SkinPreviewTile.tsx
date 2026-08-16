// Miniature slide preview for a design look. Renders a real 16:9 composition
// from the look's style-pack tokens (ground layers, card treatment, type
// stacks) so users judge the look, not a colour chip.
//
// Each section (cover, agenda, stats, bento, chart, quote, timeline…) renders
// its OWN composition, so a look's preview grid reads like a real deck instead
// of the same slide eleven times.
import { stylePackFromSkin } from "@/lib/design-skin-pack";
import type { DesignSkin } from "@/lib/design-skins";
import type { StylePack } from "@/lib/style-packs";
import { packGeometry, shapeCss } from "@/lib/pack-geometry";
import { SKIN_SCENES, sceneFromSeed, type SkinScene } from "@/lib/skin-backgrounds";

export function SkinPreviewTile({
  skin,
  seed = "cover",
  className = "",
}: {
  skin: DesignSkin;
  /** Section key or seed; drives which background preset the tile shows. */
  seed?: string;
  className?: string;
}) {
  return (
    <LookPreviewTile
      pack={stylePackFromSkin(skin)}
      kicker={`${skin.code} · ${skin.density}`}
      seed={seed}
      className={className}
    />
  );
}

type Ctx = {
  pack: StylePack;
  kicker: string;
  scene: SkinScene;
  card: React.CSSProperties;
};

/** Same composition family, driven straight off a StylePack. */
export function LookPreviewTile({
  pack,
  kicker,
  seed = "cover",
  className = "",
}: {
  pack: StylePack;
  kicker: string;
  seed?: string;
  className?: string;
}) {
  const t = pack.tokens;
  // An exact section name wins outright: the fuzzy seed matcher would read
  // "agenda" as a closing slide (it contains "end").
  const scene = (SKIN_SCENES as readonly string[]).includes(seed)
    ? (seed as SkinScene)
    : sceneFromSeed(seed);
  const tileShape = shapeCss(packGeometry(pack).shape, {
    radius: pack.card.radius,
    accent: t.accent,
    ink: t.ink,
    baseShadow: pack.card.shadow,
    dark: pack.mode === "dark",
  });
  const card: React.CSSProperties = {
    background: pack.card.bg,
    border: pack.card.border,
    borderRadius: tileShape.radius,
    boxShadow: tileShape.extraShadow || undefined,
    clipPath: tileShape.clipPath,
    backdropFilter: pack.card.blur === "none" ? undefined : pack.card.blur,
  };
  const ctx: Ctx = { pack, kicker, scene, card };

  return (
    <div
      aria-hidden="true"
      className={`relative aspect-[16/9] w-full overflow-hidden ${className}`}
      style={{
        background: pack.ground(seed).join(", "),
        borderRadius: Math.max(pack.card.radius, 6),
      }}
    >
      {pack.topBar && (
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: t.accent }} />
      )}
      <div className="absolute inset-0 p-[7%]">{renderScene(ctx)}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shared type atoms
// -----------------------------------------------------------------------------

function Kicker({ pack, children }: { pack: StylePack; children: React.ReactNode }) {
  return (
    <div
      className="text-[6px] leading-none"
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
  size = 13,
  children,
}: {
  pack: StylePack;
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="leading-[1.05]"
      style={{
        fontSize: size,
        color: pack.tokens.ink,
        fontFamily: pack.type.display,
        fontWeight: pack.type.displayWeight,
        letterSpacing: pack.type.displayTracking,
        textTransform: pack.type.displayTransform,
      }}
    >
      {children}
    </div>
  );
}

function Body({
  pack,
  size = 5,
  children,
}: {
  pack: StylePack;
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="leading-tight"
      style={{ fontSize: size, color: pack.tokens.inkMuted, fontFamily: pack.type.body }}
    >
      {children}
    </div>
  );
}

function Rule({ pack, width = "22%" }: { pack: StylePack; width?: string }) {
  return <div className="h-[2px]" style={{ background: pack.tokens.accent, width, opacity: 0.9 }} />;
}

function StatCard({
  ctx,
  value,
  label,
  highlight = false,
}: {
  ctx: Ctx;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  const { pack, card } = ctx;
  return (
    <div className="min-w-0 flex-1 px-[5%] py-[4%]" style={card}>
      <div
        className="text-[9px] leading-none"
        style={{
          color: highlight ? pack.tokens.accentText : pack.tokens.ink,
          fontFamily: pack.type.display,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
      <div className="mt-[6%] h-[2px] w-full" style={{ background: pack.tokens.hairline }} />
      <div className="mt-[6%]">
        <Body pack={pack}>{label}</Body>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Per-section compositions
// -----------------------------------------------------------------------------

function renderScene(ctx: Ctx) {
  switch (ctx.scene) {
    case "agenda":
      return <Agenda ctx={ctx} />;
    case "statement":
      return <Statement ctx={ctx} />;
    case "stats":
      return <Stats ctx={ctx} />;
    case "split":
      return <Split ctx={ctx} />;
    case "bento":
      return <Bento ctx={ctx} />;
    case "chart":
      return <Chart ctx={ctx} />;
    case "quote":
      return <Quote ctx={ctx} />;
    case "timeline":
      return <Timeline ctx={ctx} />;
    case "closing":
      return <Closing ctx={ctx} />;
    case "section":
      return <SectionDivider ctx={ctx} />;
    case "cover":
    default:
      return <Cover ctx={ctx} />;
  }
}

/** Cover — headline low-left, three proof cards along the base. */
function Cover({ ctx }: { ctx: Ctx }) {
  const { pack, kicker } = ctx;
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <Kicker pack={pack}>{kicker}</Kicker>
        <div className="mt-[4%]">
          <Display pack={pack} size={15}>
            One system.
            <br />
            Every surface.
          </Display>
        </div>
        <div className="mt-[3%]">
          <Rule pack={pack} />
        </div>
      </div>
      <div className="flex items-end gap-[4%]">
        <StatCard ctx={ctx} value="42%" label="Narrative and data stay synchronized." highlight />
        <StatCard ctx={ctx} value="3.1×" label="One template, every market." />
        <StatCard ctx={ctx} value="18d" label="From brief to boardroom." />
      </div>
    </div>
  );
}

/** Agenda — numbered running order, two columns. */
function Agenda({ ctx }: { ctx: Ctx }) {
  const { pack } = ctx;
  const items = [
    "Where we are",
    "What changed",
    "The system",
    "Proof in market",
    "Rollout plan",
    "What we need",
  ];
  return (
    <div className="flex h-full flex-col">
      <Kicker pack={pack}>Agenda</Kicker>
      <div className="mt-[2%]">
        <Display pack={pack} size={11}>
          Running order
        </Display>
      </div>
      <div className="mt-[4%] grid flex-1 grid-cols-2 gap-x-[6%] gap-y-[3%] content-start">
        {items.map((label, i) => (
          <div key={label} className="flex items-baseline gap-[4%] border-t pt-[2%]" style={{ borderColor: pack.tokens.hairline }}>
            <span
              className="text-[7px] leading-none"
              style={{ color: pack.tokens.accentText, fontFamily: pack.type.display, fontWeight: 700 }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <Body pack={pack} size={6}>
              {label}
            </Body>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Statement — one monumental line, nothing else. */
function Statement({ ctx }: { ctx: Ctx }) {
  const { pack } = ctx;
  return (
    <div className="flex h-full flex-col justify-center">
      <Rule pack={pack} width="12%" />
      <div className="mt-[3%]">
        <Display pack={pack} size={22}>
          Every surface,
          <br />
          one voice.
        </Display>
      </div>
      <div className="mt-[3%] max-w-[62%]">
        <Body pack={pack} size={6}>
          The system carries the message so each market never rebuilds it.
        </Body>
      </div>
    </div>
  );
}

/** Stats — four-up KPI band with a lead figure. */
function Stats({ ctx }: { ctx: Ctx }) {
  const { pack } = ctx;
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-start justify-between gap-[5%]">
        <div>
          <Kicker pack={pack}>Measured</Kicker>
          <div className="mt-[3%]">
            <Display pack={pack} size={11}>
              Performance
            </Display>
          </div>
        </div>
        <div
          className="text-[26px] leading-none"
          style={{ color: pack.tokens.accentText, fontFamily: pack.type.display, fontWeight: 800 }}
        >
          42%
        </div>
      </div>
      <div className="flex items-end gap-[3%]">
        {[
          ["3.1×", "Throughput"],
          ["18d", "Cycle time"],
          ["96", "NPS"],
          ["24", "Markets"],
        ].map(([v, l], i) => (
          <StatCard key={l} ctx={ctx} value={v!} label={l!} highlight={i === 0} />
        ))}
      </div>
    </div>
  );
}

/** Split — copy left, media plate right. */
function Split({ ctx }: { ctx: Ctx }) {
  const { pack, card } = ctx;
  return (
    <div className="flex h-full items-stretch gap-[5%]">
      <div className="flex w-[46%] flex-col justify-center">
        <Kicker pack={pack}>The approach</Kicker>
        <div className="mt-[3%]">
          <Display pack={pack} size={12}>
            Built once,
            <br />
            adapted fast.
          </Display>
        </div>
        <div className="mt-[4%] space-y-[4%]">
          {["Single source of truth", "Local nuance preserved", "Editable everywhere"].map((s) => (
            <div key={s} className="flex items-center gap-[3%]">
              <span className="h-[3px] w-[3px] shrink-0" style={{ background: pack.tokens.accent }} />
              <Body pack={pack} size={6}>
                {s}
              </Body>
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden" style={card}>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${pack.tokens.accent}, ${pack.tokens.accentAlt})`,
            opacity: 0.55,
          }}
        />
      </div>
    </div>
  );
}

/** Bento — asymmetric tile mosaic. */
function Bento({ ctx }: { ctx: Ctx }) {
  const { pack, card } = ctx;
  return (
    <div className="flex h-full flex-col">
      <Kicker pack={pack}>Capabilities</Kicker>
      <div className="mt-[3%] grid flex-1 grid-cols-3 grid-rows-2 gap-[3%]">
        <div className="col-span-2 flex flex-col justify-end p-[4%]" style={card}>
          <Display pack={pack} size={10}>
            One system
          </Display>
          <div className="mt-[2%]">
            <Body pack={pack}>Content, design and language in a single pass.</Body>
          </div>
        </div>
        <div className="p-[6%]" style={card}>
          <div
            className="text-[11px] leading-none"
            style={{ color: pack.tokens.accentText, fontFamily: pack.type.display, fontWeight: 700 }}
          >
            42%
          </div>
        </div>
        <div style={{ ...card, background: pack.tokens.accent, opacity: 0.85 }} />
        <div className="p-[6%]" style={card}>
          <Body pack={pack}>Governance</Body>
        </div>
        <div className="p-[6%]" style={card}>
          <Body pack={pack}>Automation</Body>
        </div>
      </div>
    </div>
  );
}

/** Chart — column series with axis and legend. */
function Chart({ ctx }: { ctx: Ctx }) {
  const { pack, card } = ctx;
  const bars = [42, 58, 51, 74, 66, 88];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <div>
          <Kicker pack={pack}>Trend</Kicker>
          <div className="mt-[2%]">
            <Display pack={pack} size={10}>
              Adoption by quarter
            </Display>
          </div>
        </div>
        <div className="flex items-center gap-[6px]">
          <span className="h-[4px] w-[8px]" style={{ background: pack.tokens.accent }} />
          <Body pack={pack}>2026</Body>
        </div>
      </div>
      <div className="mt-[4%] flex flex-1 items-end gap-[2.5%] p-[3%]" style={card}>
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              height: `${h}%`,
              background: i === bars.length - 1 ? pack.tokens.accent : pack.tokens.accentAlt,
              opacity: i === bars.length - 1 ? 1 : 0.55,
            }}
          />
        ))}
      </div>
      <div className="mt-[2%] h-[1px] w-full" style={{ background: pack.tokens.hairline }} />
    </div>
  );
}

/** Quote — pull quote with attribution. */
function Quote({ ctx }: { ctx: Ctx }) {
  const { pack } = ctx;
  return (
    <div className="flex h-full flex-col justify-center">
      <div
        className="text-[24px] leading-none"
        style={{ color: pack.tokens.accentText, fontFamily: pack.type.display, fontWeight: 700 }}
      >
        “
      </div>
      <div className="mt-[1%] max-w-[80%]">
        <Display pack={pack} size={12}>
          It finally feels like one company speaking.
        </Display>
      </div>
      <div className="mt-[4%]">
        <Rule pack={pack} width="8%" />
      </div>
      <div className="mt-[3%]">
        <Body pack={pack} size={6}>
          VP Global Marketing · Fortune 100 client
        </Body>
      </div>
    </div>
  );
}

/** Timeline — horizontal spine with milestone nodes. */
function Timeline({ ctx }: { ctx: Ctx }) {
  const { pack } = ctx;
  const steps = ["Discover", "Design", "Build", "Scale"];
  return (
    <div className="flex h-full flex-col justify-center">
      <Kicker pack={pack}>Rollout</Kicker>
      <div className="mt-[2%]">
        <Display pack={pack} size={10}>
          Four phases, one path
        </Display>
      </div>
      <div className="relative mt-[8%]">
        <div className="absolute left-0 right-0 top-[3px] h-[2px]" style={{ background: pack.tokens.hairline }} />
        <div className="relative flex justify-between">
          {steps.map((s, i) => (
            <div key={s} className="flex w-[22%] flex-col items-start gap-[6px]">
              <span
                className="h-[8px] w-[8px] rounded-full"
                style={{ background: i === 0 ? pack.tokens.accent : pack.tokens.accentAlt }}
              />
              <Body pack={pack} size={6}>
                {s}
              </Body>
              <Body pack={pack}>Q{i + 1}</Body>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Closing — call to action plus contact block. */
function Closing({ ctx }: { ctx: Ctx }) {
  const { pack, card } = ctx;
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="mt-[6%]">
        <Display pack={pack} size={17}>
          Let’s build it.
        </Display>
        <div className="mt-[3%]">
          <Rule pack={pack} width="16%" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-[5%]">
        <div className="max-w-[52%]">
          <Body pack={pack} size={6}>
            One system, every surface, every language.
          </Body>
        </div>
        <div className="px-[3%] py-[1.5%]" style={{ ...card, background: pack.tokens.accent }}>
          <div
            className="text-[6px] leading-none"
            style={{
              color: pack.mode === "dark" ? pack.tokens.ink : "#FFFFFF",
              fontFamily: pack.type.kicker,
              letterSpacing: pack.type.kickerTracking,
              textTransform: "uppercase",
            }}
          >
            Start the pilot
          </div>
        </div>
      </div>
    </div>
  );
}

/** Section divider — chapter number and title, deliberately sparse. */
function SectionDivider({ ctx }: { ctx: Ctx }) {
  const { pack } = ctx;
  return (
    <div className="flex h-full items-end justify-between gap-[6%]">
      <div>
        <Kicker pack={pack}>Section</Kicker>
        <div className="mt-[2%]">
          <Display pack={pack} size={14}>
            The system
          </Display>
        </div>
      </div>
      <div
        className="text-[34px] leading-none"
        style={{ color: pack.tokens.accent, fontFamily: pack.type.display, fontWeight: 800, opacity: 0.5 }}
      >
        02
      </div>
    </div>
  );
}

/** Four-stop palette strip for compact list rows. */
export function SkinSwatch({ skin }: { skin: DesignSkin }) {
  return (
    <div className="flex overflow-hidden rounded" aria-hidden="true">
      {skin.palette.slice(0, 5).map((c) => (
        <span key={c} className="h-3 w-3" style={{ background: c }} />
      ))}
    </div>
  );
}
