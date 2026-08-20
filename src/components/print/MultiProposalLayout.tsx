// MULTI-PAGE SOLUTION PROPOSAL
// ---------------------------------------------------------------------------
// PORT — TransPerfect_Solutions_Proposal_Template_1.pptx (15 slides) → a
// multi-page print asset. Each authored page in `content.pages` renders as its
// own `[data-print-page]` node so:
//   * the asset editor renders them stacked and every string stays live-editable
//     (LiveEditOverlay binds by content path, so no per-page wiring is needed),
//   * exportPrintAssetAsPdf() receives one node per page and emits a real
//     multi-page PDF.
//
// Page kinds: cover · stats · scope · cost · locations · clients ·
// success-stories · why · advocates · team-grid · team-bio · summary.

import type { CSSProperties } from "react";

import type { BrandMode } from "@/lib/taxonomy";
import type {
  MultiProposalPage,
  PrintDensity,
  PrintPageSize,
  SolutionProposalContent,
} from "@/lib/print-assets.types";
import { SlideModeContext, SlideAccentContext } from "@/components/slide/SlideChrome";
import { BrandLockup } from "@/components/BrandLockup";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import {
  cq,
  padCq,
  pageAspect,
  pagePadX as padX,
  ICON_PATHS,
  clampLines,
  type IconName,
} from "@/components/print/print-primitives";
import {
  AFFINITY_LOGOS,
  CAUSE_LOGOS,
  CLIENT_LOGOS,
  PROPOSAL_AQUA,
  PROPOSAL_ART,
  type LogoTile,
} from "@/lib/print-library/proposal-art";

const FALLBACK_ICONS: IconName[] = [
  "check",
  "language",
  "grid",
  "users",
  "clock",
  "target",
  "globe-alt",
  "star",
];

function iconFor(name: string | undefined, i: number): string {
  if (name && name in ICON_PATHS) return ICON_PATHS[name as IconName];
  return ICON_PATHS[FALLBACK_ICONS[i % FALLBACK_ICONS.length]!];
}

/** True when the proposal should render as the multi-page document. */
export function isMultiProposal(content: Partial<SolutionProposalContent> | undefined): boolean {
  if (!content) return false;
  if (content.docMode === "multi") return true;
  return (content.pages?.length ?? 0) > 0;
}

export const MULTI_PAGE_LABELS: Record<MultiProposalPage["kind"], string> = {
  cover: "Cover",
  stats: "By the numbers",
  scope: "Scope",
  cost: "Cost summary",
  locations: "Global footprint",
  clients: "Clients",
  "success-stories": "Success stories",
  why: "Why TransPerfect",
  advocates: "Advocates",
  "team-grid": "Meet the team",
  "team-bio": "Team bios",
  summary: "Summary",
};

export function multiPageLabel(page: MultiProposalPage, index: number): string {
  return page.navLabel || page.title || `${MULTI_PAGE_LABELS[page.kind]} ${index + 1}`;
}

type Tokens = {
  accent: string;
  primary: string;
  ink: string;
  inkSoft: string;
  line: string;
  cardBg: string;
  rowAlt: string;
  pad: string;
  /** True when the page body sits on a dark/brand-gradient field. */
  onDark: boolean;
};

/** Page chrome recipes ported from the source template's visual language. */
type ChromeSpec = {
  /** Page field behind everything. */
  field: "white" | "band" | "brand" | "navy" | "wash" | "art";
  /** Body sits on a floating white plate. */
  plate: boolean;
  /** Header treatment. */
  header: "band" | "hero" | "bubble" | "card" | "cover" | "statement" | "none";
  /** Body renders on a dark field. */
  onDark: boolean;
};

const CHROME: Record<MultiProposalPage["kind"], ChromeSpec> = {
  cover: { field: "art", plate: false, header: "cover", onDark: true },
  stats: { field: "art", plate: false, header: "bubble", onDark: true },
  scope: { field: "band", plate: true, header: "band", onDark: false },
  cost: { field: "band", plate: true, header: "band", onDark: false },
  locations: { field: "art", plate: false, header: "card", onDark: true },
  clients: { field: "white", plate: false, header: "hero", onDark: false },
  "success-stories": { field: "band", plate: true, header: "band", onDark: false },
  why: { field: "art", plate: false, header: "statement", onDark: true },
  advocates: { field: "art", plate: false, header: "statement", onDark: true },
  "team-grid": { field: "white", plate: false, header: "hero", onDark: false },
  "team-bio": { field: "band", plate: true, header: "band", onDark: false },
  summary: { field: "art", plate: false, header: "statement", onDark: true },
};


function brandGradient(primary: string, accent: string): string {
  return `linear-gradient(115deg, ${primary} 0%, ${primary} 18%, ${accent} 100%)`;
}

function makeTokens({
  onDark,
  accent,
  primary,
  pad,
}: {
  onDark: boolean;
  accent: string;
  primary: string;
  pad: string;
}): Tokens {
  return {
    accent,
    primary: onDark ? "#FFFFFF" : primary,
    ink: onDark ? "#FFFFFF" : "#03002C",
    inkSoft: onDark ? "rgba(255,255,255,0.80)" : "rgba(85,85,85,0.94)",
    line: onDark ? "rgba(255,255,255,0.22)" : "rgba(3,0,44,0.12)",
    cardBg: onDark ? "rgba(255,255,255,0.08)" : "#F2F6FF",
    rowAlt: onDark ? "rgba(255,255,255,0.06)" : "rgba(3,0,44,0.035)",
    pad,
    onDark,
  };
}

export function MultiProposalLayout({
  content,
  brand,
  mode,
  pageSize = "Letter",
  density = "standard",
  style,
  pageIndex,
}: {
  content: SolutionProposalContent;
  brand: BrandMode;
  mode: "light" | "dark";
  pageSize?: PrintPageSize;
  density?: PrintDensity;
  seed?: string;
  style?: CSSProperties;
  /** Render one page only (used by thumbnails). Omit to render the document. */
  pageIndex?: number;
}) {
  const accent = brand.tokens.accent || brand.tokens.primary;
  const primary = brand.tokens.primary;
  const pad = padCq(padX(density));
  const gradient = brandGradient(primary, accent);
  const pages = content.pages ?? [];
  const shown =
    typeof pageIndex === "number" ? pages.slice(pageIndex, pageIndex + 1) : pages;
  const offset = typeof pageIndex === "number" ? pageIndex : 0;

  return (
    <SlideModeContext.Provider value={mode}>
      <SlideAccentContext.Provider value={accent}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", ...style }}>
          {shown.map((page, i) => {
            const spec = CHROME[page.kind] ?? CHROME.summary;
            const onDark = spec.onDark || mode === "dark";
            const t = makeTokens({ onDark, accent, primary, pad });
            const bandTokens = makeTokens({ onDark: true, accent, primary, pad });
            const pageBg =
              spec.field === "navy" || spec.field === "art"
                ? `linear-gradient(125deg, #03002C 0%, ${primary} 46%, ${accent} 108%)`
                : spec.field === "brand"
                  ? gradient
                  : spec.field === "wash"
                    ? `linear-gradient(135deg, #E0E8F5 0%, #EEF6FF 34%, #E4DEFF 72%, ${accent} 132%)`
                    : mode === "dark"
                      ? "#111114"
                      : "#FFFFFF";

            return (
              <div
                key={page.id || `${page.kind}-${i}`}
                data-print-page
                data-proposal-page={page.kind}
                className="relative w-full overflow-hidden [container-type:inline-size]"
                style={{
                  aspectRatio: pageAspect(pageSize),
                  background: pageBg,
                  color: t.ink,
                  fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {spec.field === "art" && (
                  <img
                    aria-hidden
                    alt=""
                    src={PROPOSAL_ART.field}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.96,
                    }}
                  />
                )}
                {spec.field === "band" && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: `0 0 auto 0`,
                      height: "24%",
                      background: gradient,
                    }}
                  />
                )}
                {spec.field === "white" && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: "auto 0 0 0",
                      height: cq(6),
                      background: gradient,
                    }}
                  />
                )}


                <PageHeader
                  brand={brand}
                  spec={spec}
                  page={page}
                  tokens={spec.header === "band" ? bandTokens : t}
                  plateTokens={t}
                />

                <div
                  style={{
                    position: "relative",
                    flex: 1,
                    minHeight: 0,
                    marginLeft: t.pad,
                    marginRight: t.pad,
                    marginTop: cq(4),
                    padding: spec.plate ? `${cq(20)} ${cq(20)}` : 0,
                    borderRadius: spec.plate ? cq(24) : 0,
                    background: spec.plate
                      ? mode === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "#FFFFFF"
                      : "transparent",
                    boxShadow:
                      spec.plate && mode !== "dark"
                        ? `0 ${cq(10)} ${cq(30)} rgba(3,0,44,0.10)`
                        : "none",
                    overflow: "hidden",
                  }}
                  data-section={`page-${offset + i}`}
                  data-section-label={multiPageLabel(page, offset + i)}
                >
                  <PageBody
                    page={page}
                    index={offset + i}
                    content={content}
                    tokens={t}
                    brand={brand}
                    mode={onDark ? "dark" : "light"}
                  />
                </div>
                <PageFooter
                  tokens={t}
                  label={content.footerUrl || "transperfect.com"}
                  number={offset + i + 1}
                  total={pages.length}
                  note={page.footnote}
                />
              </div>
            );
          })}
        </div>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}

/* ------------------------------------------------------------------ chrome */

function PageHeader({
  brand,
  spec,
  page,
  tokens: t,
  plateTokens,
}: {
  brand: BrandMode;
  spec: ChromeSpec;
  page: MultiProposalPage;
  tokens: Tokens;
  plateTokens: Tokens;
}) {
  const lockupColor = t.onDark ? "#FFFFFF" : t.primary;

  /* Cover — full-width white TransPerfect wordmark over the gradient field,
     with the proposal title set beneath it, exactly as the source template. */
  if (spec.header === "cover") {
    return (
      <div
        style={{
          paddingLeft: t.pad,
          paddingRight: t.pad,
          paddingTop: cq(64),
          textAlign: "center",
        }}
      >
        <img
          src={PROPOSAL_ART.logoWhite}
          alt="TransPerfect"
          style={{ width: "62%", height: "auto", margin: "0 auto", display: "block" }}
        />
        {page.eyebrow && (
          <div
            style={{
              marginTop: cq(40),
              fontSize: cq(10),
              fontWeight: 700,
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              color: PROPOSAL_AQUA,
            }}
          >
            {page.eyebrow}
          </div>
        )}
        <h1
          style={{
            margin: `${cq(14)} 0 0`,
            fontSize: cq(40),
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "#FFFFFF",
            ...clampLines(3),
          }}
        >
          {page.title}
        </h1>
        {page.subtitle && (
          <div
            style={{
              margin: `${cq(12)} auto 0`,
              maxWidth: "74%",
              fontSize: cq(12),
              lineHeight: 1.5,
              fontWeight: 500,
              color: "rgba(255,255,255,0.88)",
            }}
          >
            {page.subtitle}
          </div>
        )}
      </div>
    );
  }

  /* Statement pages — heavy right-aligned headline mixing white and aqua. */
  if (spec.header === "statement") {
    return (
      <div style={{ paddingLeft: t.pad, paddingRight: t.pad, paddingTop: cq(40) }}>
        {page.eyebrow && (
          <div
            style={{
              fontSize: cq(9),
              fontWeight: 700,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: PROPOSAL_AQUA,
              textAlign: "right",
            }}
          >
            {page.eyebrow}
          </div>
        )}
        <h2
          style={{
            margin: `${page.eyebrow ? cq(12) : 0} 0 0`,
            fontSize: cq(42),
            lineHeight: 0.98,
            fontWeight: 800,
            letterSpacing: "-0.045em",
            color: "#FFFFFF",
            textAlign: "right",
            ...clampLines(3),
          }}
        >
          {page.title}
        </h2>
        {page.subtitle && (
          <div
            style={{
              marginTop: cq(12),
              marginLeft: "auto",
              maxWidth: "70%",
              fontSize: cq(12),
              lineHeight: 1.5,
              fontWeight: 600,
              color: PROPOSAL_AQUA,
              textAlign: "right",
            }}
          >
            {page.subtitle}
          </div>
        )}
      </div>
    );
  }


  if (spec.header === "bubble") {
    return (
      <div
        style={{
          position: "relative",
          paddingLeft: t.pad,
          paddingRight: t.pad,
          paddingTop: cq(30),
        }}
      >
        <div
          style={{
            position: "relative",
            border: `${cq(2.5)} solid rgba(255,255,255,0.92)`,
            borderRadius: cq(30),
            padding: `${cq(22)} ${cq(24)} ${cq(24)}`,
            maxWidth: "84%",
          }}
        >
          {page.eyebrow && (
            <div
              style={{
                fontSize: cq(8.5),
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {page.eyebrow}
            </div>
          )}
          <h2
            style={{
              margin: `${page.eyebrow ? cq(8) : 0} 0 0`,
              fontSize: cq(28),
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#FFFFFF",
              ...clampLines(4),
            }}
          >
            {page.title}
          </h2>
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: cq(34),
              bottom: cq(-1),
              width: cq(26),
              height: cq(26),
              background: "transparent",
              borderLeft: `${cq(2.5)} solid rgba(255,255,255,0.92)`,
              transform: `skewX(-28deg) translateY(${cq(24)})`,
            }}
          />
        </div>
      </div>
    );
  }

  /* Big two-line hero headline (clients page). */
  if (spec.header === "hero") {
    return (
      <div style={{ paddingLeft: t.pad, paddingRight: t.pad, paddingTop: cq(34) }}>
        <h2
          style={{
            margin: 0,
            fontSize: cq(44),
            lineHeight: 0.98,
            fontWeight: 800,
            letterSpacing: "-0.045em",
            color: plateTokens.primary,
            maxWidth: "70%",
            ...clampLines(2),
          }}
        >
          {page.title}
        </h2>
        {page.body && (
          <div
            style={{
              marginTop: cq(14),
              fontSize: cq(12),
              fontWeight: 700,
              color: plateTokens.ink,
              ...clampLines(2),
            }}
          >
            {page.body}
          </div>
        )}
      </div>
    );
  }

  /* Centered card title (cover, global locations). */
  if (spec.header === "card") {
    return (
      <div style={{ paddingLeft: t.pad, paddingRight: t.pad, paddingTop: cq(28) }}>
        <div
          style={{
            borderRadius: cq(24),
            background: t.onDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.78)",
            padding: `${cq(22)} ${cq(24)}`,
            textAlign: "center",
          }}
        >
          {page.eyebrow && (
            <div
              style={{
                fontSize: cq(9),
                fontWeight: 700,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: t.onDark ? "rgba(255,255,255,0.82)" : t.primary,
              }}
            >
              {page.eyebrow}
            </div>
          )}
          <h2
            style={{
              margin: `${page.eyebrow ? cq(10) : 0} 0 0`,
              fontSize: cq(30),
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              color: t.onDark ? "#FFFFFF" : plateTokens.ink,
              ...clampLines(3),
            }}
          >
            {page.title}
          </h2>
          {page.subtitle && (
            <div
              style={{
                marginTop: cq(8),
                fontSize: cq(11.5),
                fontWeight: 600,
                color: t.onDark ? "rgba(255,255,255,0.86)" : t.primary,
                ...clampLines(2),
              }}
            >
              {page.subtitle}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (spec.header === "none") return null;

  /* Default: gradient band with the page title reversed out of it. */
  return (
    <div
      style={{
        position: "relative",
        paddingLeft: t.pad,
        paddingRight: t.pad,
        paddingTop: cq(22),
        paddingBottom: cq(10),
      }}
    >
      <div className="flex items-start justify-between" style={{ gap: cq(14) }}>
        <div style={{ minWidth: 0 }}>
          {page.eyebrow && (
            <div
              style={{
                fontSize: cq(8.5),
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.76)",
              }}
            >
              {page.eyebrow}
            </div>
          )}
          {page.title && (
            <h2
              style={{
                margin: `${page.eyebrow ? cq(8) : 0} 0 0`,
                fontSize: cq(30),
                lineHeight: 1.04,
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#FFFFFF",
                ...clampLines(2),
              }}
            >
              {page.title}
            </h2>
          )}
          {page.subtitle && (
            <div
              style={{
                marginTop: cq(6),
                fontSize: cq(11),
                fontWeight: 600,
                color: "rgba(255,255,255,0.88)",
                ...clampLines(2),
              }}
            >
              {page.subtitle}
            </div>
          )}
        </div>
        <BrandLockup brand={brand} color={lockupColor} size="xs" orientation="horizontal" />
      </div>
    </div>
  );
}

function PageFooter({
  tokens: t,
  label,
  number,
  total,
  note,
}: {
  tokens: Tokens;
  label: string;
  number: number;
  total: number;
  note?: string;
}) {
  return (
    <div
      className="relative flex items-center"
      style={{
        gap: cq(12),
        paddingLeft: t.pad,
        paddingRight: t.pad,
        paddingTop: cq(12),
        paddingBottom: cq(18),
        marginTop: "auto",
      }}
    >
      <div
        style={{
          fontSize: cq(9),
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: t.onDark ? "rgba(255,255,255,0.86)" : t.primary,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, height: 1, background: t.line }} />
      {note && (
        <div style={{ fontSize: cq(7.5), color: t.inkSoft, ...clampLines(1) }}>{note}</div>
      )}
      <div style={{ fontSize: cq(8.5), fontWeight: 700, color: t.inkSoft }}>
        {number} / {total}
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------- body */

function SectionLabel({ tokens: t, children }: { tokens: Tokens; children: string }) {
  return (
    <div
      style={{
        fontSize: cq(8.5),
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: t.primary,
      }}
    >
      {children}
    </div>
  );
}

function Body({ tokens: t, children }: { tokens: Tokens; children: string }) {
  return (
    <p
      style={{
        margin: `${cq(10)} 0 0`,
        fontSize: cq(11),
        lineHeight: 1.55,
        color: t.inkSoft,
        maxWidth: cq(760),
      }}
    >
      {children}
    </p>
  );
}

function Bullets({ tokens: t, items }: { tokens: Tokens; items: string[] }) {
  return (
    <ul
      style={{
        margin: `${cq(12)} 0 0`,
        padding: 0,
        listStyle: "none",
        display: "flex",
        flexDirection: "column",
        gap: cq(7),
      }}
    >
      {items.map((v, i) => (
        <li key={i} className="flex" style={{ gap: cq(8) }}>
          <span
            style={{
              marginTop: cq(5),
              width: cq(6),
              height: cq(6),
              borderRadius: 999,
              background: t.accent,
              flex: "0 0 auto",
            }}
          />
          <span style={{ fontSize: cq(10), lineHeight: 1.5, color: t.ink }}>{v}</span>
        </li>
      ))}
    </ul>
  );
}

function StatGrid({ tokens: t, stats }: { tokens: Tokens; stats: MultiProposalPage["stats"] }) {
  const list = (stats ?? []).slice(0, 8);
  if (list.length === 0) return null;
  const cols = list.length >= 6 ? 2 : Math.min(list.length, 4) || 1;

  /* On the dark/brand field the template uses big accent figures on hairlines
     with the label set beside them — not boxed cards. */
  if (t.onDark) {
    return (
      <div
        className="grid"
        style={{
          marginTop: cq(18),
          gridTemplateColumns: `repeat(${Math.min(cols, 2)}, minmax(0, 1fr))`,
          columnGap: cq(24),
          rowGap: cq(2),
        }}
      >
        {list.map((s, i) => (
          <div
            key={i}
            className="flex items-baseline"
            style={{
              gap: cq(10),
              paddingTop: cq(10),
              paddingBottom: cq(10),
              borderBottom: `1px solid ${t.line}`,
            }}
          >
            <div
              style={{
                fontSize: cq(28),
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "-0.035em",
                color: t.accent,
                whiteSpace: "nowrap",
              }}
            >
              {`${s.value ?? ""}${s.unit ?? ""}`}
            </div>
            <div
              style={{
                fontSize: cq(9),
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                lineHeight: 1.25,
                color: "#FFFFFF",
                ...clampLines(2),
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid"
      style={{
        marginTop: cq(14),
        gridTemplateColumns: `repeat(${list.length >= 6 ? 3 : cols}, minmax(0, 1fr))`,
        gap: cq(12),
      }}
    >
      {list.map((s, i) => (
        <div
          key={i}
          style={{
            borderRadius: cq(14),
            border: `1px solid ${t.line}`,
            background: t.cardBg,
            padding: `${cq(14)} ${cq(12)}`,
          }}
        >
          <div
            style={{
              fontSize: cq(26),
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: t.primary,
            }}
          >
            {`${s.value ?? ""}${s.unit ?? ""}`}
          </div>
          <div
            style={{
              marginTop: cq(6),
              fontSize: cq(9),
              lineHeight: 1.35,
              fontWeight: 600,
              color: t.inkSoft,
              ...clampLines(3),
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}


function CardGrid({
  tokens: t,
  cards,
  withIcons,
}: {
  tokens: Tokens;
  cards: MultiProposalPage["cards"];
  withIcons?: boolean;
}) {
  const list = (cards ?? []).slice(0, 9);
  if (list.length === 0) return null;
  const cols = list.length >= 5 ? 3 : Math.min(list.length, 4) || 1;
  return (
    <div
      className="grid"
      style={{
        marginTop: cq(14),
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: cq(12),
      }}
    >
      {list.map((c, i) => (
        <div
          key={i}
          style={{
            borderRadius: cq(14),
            border: `1px solid ${t.line}`,
            padding: `${cq(13)} ${cq(12)}`,
          }}
        >
          {withIcons && (
            <EditableIcon
              slot={`proposal.cards.${i}`}
              d={iconFor(c.icon, i)}
              size={cq(18)}
              color={t.primary}
            />
          )}
          {c.title && (
            <div
              style={{
                marginTop: withIcons ? cq(8) : 0,
                fontSize: cq(11),
                fontWeight: 700,
                lineHeight: 1.3,
                color: t.ink,
                ...clampLines(2),
              }}
            >
              {c.title}
            </div>
          )}
          {c.body && (
            <div
              style={{
                marginTop: cq(5),
                fontSize: cq(9),
                lineHeight: 1.45,
                color: t.inkSoft,
                ...clampLines(5),
              }}
            >
              {c.body}
            </div>
          )}
          {c.meta && (
            <div
              style={{
                marginTop: cq(6),
                fontSize: cq(8),
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: t.primary,
              }}
            >
              {c.meta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Quotes({ tokens: t, quotes }: { tokens: Tokens; quotes: MultiProposalPage["quotes"] }) {
  const list = (quotes ?? []).slice(0, 3);
  if (list.length === 0) return null;
  return (
    <div
      style={{
        marginTop: cq(14),
        display: "flex",
        flexDirection: "column",
        gap: cq(14),
      }}
    >
      {list.map((q, i) => (
        <div
          key={i}
          style={{
            borderRadius: cq(14),
            border: `1px solid ${t.line}`,
            background: i % 2 === 0 ? t.cardBg : "transparent",
            padding: `${cq(14)} ${cq(14)}`,
          }}
        >
          {q.headline && (
            <div
              style={{
                fontSize: cq(11),
                fontWeight: 700,
                color: t.primary,
                ...clampLines(2),
              }}
            >
              {q.headline}
            </div>
          )}
          {q.text && (
            <blockquote
              style={{
                margin: `${q.headline ? cq(8) : 0} 0 0`,
                borderLeft: `${cq(3)} solid ${t.accent}`,
                paddingLeft: cq(12),
                fontSize: cq(10),
                lineHeight: 1.5,
                fontStyle: "italic",
                color: t.ink,
                ...clampLines(8),
              }}
            >
              {q.text}
            </blockquote>
          )}
          <div
            style={{
              marginTop: cq(8),
              fontSize: cq(8.5),
              fontWeight: 700,
              color: t.primary,
            }}
          >
            {[q.author, q.role, q.company].filter(Boolean).join(" · ")}
          </div>
        </div>
      ))}
    </div>
  );
}

function CostTable({
  tokens: t,
  page,
}: {
  tokens: Tokens;
  page: MultiProposalPage;
}) {
  const rows = (page.costRows ?? []).slice(0, 12);
  if (rows.length === 0) return null;
  return (
    <div style={{ marginTop: cq(14) }}>
      <div style={{ border: `1px solid ${t.line}`, borderRadius: cq(10), overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 0.4fr 0.6fr",
            background: t.primary,
            color: "#FFFFFF",
            padding: `${cq(8)} ${cq(12)}`,
            fontSize: cq(8.5),
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            gap: cq(8),
          }}
        >
          <div>Service</div>
          <div style={{ textAlign: "center" }}>Qty</div>
          <div style={{ textAlign: "right" }}>Price</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.4fr 0.6fr",
              borderTop: `1px solid ${t.line}`,
              background: i % 2 === 1 ? t.rowAlt : "transparent",
              padding: `${cq(8)} ${cq(12)}`,
              gap: cq(8),
              alignItems: "baseline",
            }}
          >
            <div>
              <div style={{ fontSize: cq(10), fontWeight: 700, color: t.ink }}>{r.item}</div>
              {r.detail && (
                <div style={{ fontSize: cq(8.5), color: t.inkSoft, ...clampLines(2) }}>
                  {r.detail}
                </div>
              )}
            </div>
            <div style={{ fontSize: cq(9.5), color: t.inkSoft, textAlign: "center" }}>
              {r.qty ?? ""}
            </div>
            <div
              style={{ fontSize: cq(10.5), fontWeight: 700, color: t.ink, textAlign: "right" }}
            >
              {r.price ?? ""}
            </div>
          </div>
        ))}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            borderTop: `1px solid ${t.line}`,
            background: t.cardBg,
            padding: `${cq(10)} ${cq(12)}`,
            alignItems: "baseline",
            gap: cq(10),
          }}
        >
          <div
            style={{
              fontSize: cq(9),
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: t.primary,
            }}
          >
            {page.costTotalLabel || "Total"}
          </div>
          <div style={{ fontSize: cq(18), fontWeight: 700, color: t.ink }}>
            {page.costTotal ?? ""}
          </div>
        </div>
      </div>
      {page.costNote && (
        <div
          style={{
            marginTop: cq(8),
            fontSize: cq(8),
            lineHeight: 1.45,
            color: t.inkSoft,
            ...clampLines(4),
          }}
        >
          {page.costNote}
        </div>
      )}
    </div>
  );
}

function Locations({
  tokens: t,
  locations,
}: {
  tokens: Tokens;
  locations: MultiProposalPage["locations"];
}) {
  const list = (locations ?? []).slice(0, 6);
  if (list.length === 0) return null;
  return (
    <div
      className="grid"
      style={{
        marginTop: cq(14),
        gridTemplateColumns: `repeat(${Math.min(list.length, 3)}, minmax(0, 1fr))`,
        gap: cq(14),
      }}
    >
      {list.map((l, i) => (
        <div key={i} style={{ borderTop: `${cq(2)} solid ${t.accent}`, paddingTop: cq(8) }}>
          <div style={{ fontSize: cq(10.5), fontWeight: 700, color: t.ink }}>{l.region}</div>
          <div
            style={{
              marginTop: cq(5),
              fontSize: cq(9),
              lineHeight: 1.5,
              color: t.inkSoft,
            }}
          >
            {(l.offices ?? []).join(" · ")}
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizeLogoKey(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Resolve authored logo names against the template's real logo artwork. */
function resolveLogoTiles(names: string[], pool: LogoTile[]): LogoTile[] {
  if (names.length === 0) return pool;
  return names.slice(0, 24).map((name, i) => {
    const key = normalizeLogoKey(name);
    const hit = pool.find((p) => {
      const pk = normalizeLogoKey(p.name);
      return pk === key || pk.startsWith(key) || key.startsWith(pk);
    });
    return hit ?? { name, url: pool[i % Math.max(pool.length, 1)]?.url ?? "" };
  });
}

/** Slide 6 client wall — white rounded cards, four across. */
function LogoWall({ tokens: t, logos }: { tokens: Tokens; logos: string[] }) {
  const tiles = resolveLogoTiles(logos, CLIENT_LOGOS);
  if (tiles.length === 0) return null;
  return (
    <div
      className="grid"
      style={{
        marginTop: cq(22),
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: cq(14),
      }}
    >
      {tiles.map((tile, i) => (
        <div
          key={`${tile.name}-${i}`}
          className="flex items-center justify-center"
          style={{
            borderRadius: cq(16),
            background: "#FFFFFF",
            boxShadow: `0 ${cq(4)} ${cq(16)} rgba(3,0,44,0.10)`,
            aspectRatio: "1.45",
            padding: `${cq(12)} ${cq(14)}`,
          }}
        >
          {tile.url ? (
            <img
              src={tile.url}
              alt={tile.name}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: cq(9), fontWeight: 700, color: t.ink }}>{tile.name}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Giving-back / affinity marks — reversed-out logos straight on the field. */
function MarkWall({
  tiles,
  cols,
  marginTop,
}: {
  tiles: LogoTile[];
  cols: number;
  marginTop: number;
}) {
  if (tiles.length === 0) return null;
  return (
    <div
      className="grid"
      style={{
        marginTop: cq(marginTop),
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        columnGap: cq(20),
        rowGap: cq(22),
        alignItems: "center",
      }}
    >
      {tiles.map((tile, i) => (
        <div key={`${tile.name}-${i}`} className="flex items-center justify-center">
          <img
            src={tile.url}
            alt={tile.name}
            style={{ maxWidth: "100%", maxHeight: cq(54), objectFit: "contain" }}
          />
        </div>
      ))}
    </div>
  );
}

/** Slide 5 world map plate. */
function WorldMap() {
  return (
    <img
      src={PROPOSAL_ART.worldMap}
      alt="TransPerfect global office locations"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        marginTop: cq(18),
        opacity: 0.95,
      }}
    />
  );
}


function TeamGrid({
  tokens: t,
  team,
  detailed,
}: {
  tokens: Tokens;
  team: MultiProposalPage["team"];
  detailed?: boolean;
}) {
  const list = (team ?? []).slice(0, detailed ? 2 : 6);
  if (list.length === 0) return null;
  return (
    <div
      className="grid"
      style={{
        marginTop: cq(14),
        gridTemplateColumns: `repeat(${detailed ? 1 : Math.min(list.length, 3)}, minmax(0, 1fr))`,
        gap: cq(14),
      }}
    >
      {list.map((m, i) => (
        <div
          key={i}
          style={{
            borderTop: `${cq(2)} solid ${t.accent}`,
            paddingTop: cq(9),
            display: detailed ? "grid" : "block",
            gridTemplateColumns: detailed ? "0.8fr 1.6fr" : undefined,
            gap: detailed ? cq(16) : undefined,
          }}
        >
          <div>
            <div style={{ fontSize: cq(11.5), fontWeight: 700, color: t.ink }}>{m.name}</div>
            {m.role && (
              <div style={{ fontSize: cq(9.5), color: t.inkSoft, ...clampLines(2) }}>{m.role}</div>
            )}
            {m.office && <div style={{ fontSize: cq(9), color: t.inkSoft }}>{m.office}</div>}
            {m.email && (
              <div style={{ fontSize: cq(9), color: t.inkSoft, wordBreak: "break-all" }}>
                {m.email}
              </div>
            )}
            {m.phone && <div style={{ fontSize: cq(9), color: t.inkSoft }}>{m.phone}</div>}
          </div>
          {detailed && m.bio && (
            <div
              style={{
                fontSize: cq(9.5),
                lineHeight: 1.55,
                color: t.inkSoft,
                ...clampLines(14),
              }}
            >
              {m.bio}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CoverParties({
  tokens: t,
  content,
}: {
  tokens: Tokens;
  content: SolutionProposalContent;
}) {
  const parties = [
    { key: "for", party: content.preparedFor, fallback: "Prepared for:" },
    { key: "by", party: content.preparedBy, fallback: "Prepared by:" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr auto",
        gap: cq(18),
        marginTop: cq(10),
      }}
    >
      {parties.map(({ key, party, fallback }) => (
        <div key={key}>
          <SectionLabel tokens={t}>{party?.label || fallback}</SectionLabel>
          <div style={{ marginTop: cq(6), fontSize: cq(11.5), fontWeight: 700, color: t.ink }}>
            {party?.contact ?? ""}
          </div>
          {party?.role && <div style={{ fontSize: cq(9.5), color: t.inkSoft }}>{party.role}</div>}
          {party?.company && (
            <div style={{ marginTop: cq(4), fontSize: cq(10), fontWeight: 600, color: t.ink }}>
              {party.company}
            </div>
          )}
          {party?.address1 && (
            <div style={{ fontSize: cq(9.5), color: t.inkSoft }}>{party.address1}</div>
          )}
          {party?.address2 && (
            <div style={{ fontSize: cq(9.5), color: t.inkSoft }}>{party.address2}</div>
          )}
          {party?.email && (
            <div style={{ fontSize: cq(9.5), color: t.inkSoft, wordBreak: "break-all" }}>
              {party.email}
            </div>
          )}
          {party?.phone && <div style={{ fontSize: cq(9.5), color: t.inkSoft }}>{party.phone}</div>}
        </div>
      ))}
      <div style={{ textAlign: "right" }}>
        <SectionLabel tokens={t}>Date:</SectionLabel>
        <div style={{ marginTop: cq(6), fontSize: cq(12), fontWeight: 700, color: t.ink }}>
          {content.dateLabel || ""}
        </div>
      </div>
    </div>
  );
}

function ScopeColumns({
  tokens: t,
  content,
}: {
  tokens: Tokens;
  content: SolutionProposalContent;
}) {
  const cols: Array<{ title: string; items: string[] }> = [
    { title: content.sourceFilesTitle || "Source files", items: content.sourceFiles ?? [] },
    { title: content.deliverablesTitle || "Deliverables", items: content.deliverables ?? [] },
  ];
  return (
    <div
      className="grid"
      style={{ marginTop: cq(16), gridTemplateColumns: "1fr 1fr 1.4fr", gap: cq(14) }}
    >
      {cols.map((col, i) => (
        <div key={i} style={{ borderTop: `1px solid ${t.line}`, paddingTop: cq(10) }}>
          <SectionLabel tokens={t}>{col.title}</SectionLabel>
          <ul style={{ margin: `${cq(8)} 0 0`, padding: 0, listStyle: "none" }}>
            {col.items.slice(0, 8).map((v, j) => (
              <li key={j} style={{ fontSize: cq(9.5), lineHeight: 1.5, color: t.ink }}>
                {v}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${t.line}`, paddingTop: cq(10) }}>
        <SectionLabel tokens={t}>{content.timelineTitle || "Timeline"}</SectionLabel>
        <p style={{ margin: `${cq(8)} 0 0`, fontSize: cq(9.5), lineHeight: 1.5, color: t.inkSoft }}>
          {content.timelineNote}
        </p>
      </div>
    </div>
  );
}

function PageBody({
  page,
  index,
  content,
  tokens: t,
  brand,
  mode,
}: {
  page: MultiProposalPage;
  index: number;
  content: SolutionProposalContent;
  tokens: Tokens;
  brand: BrandMode;
  mode: "light" | "dark";
}) {
  switch (page.kind) {
    case "cover": {
      const plate = makeTokens({
        onDark: false,
        accent: t.accent,
        primary: brand.tokens.primary,
        pad: t.pad,
      });
      return (
        <div className="flex h-full flex-col justify-end">
          <div
            className="flex items-center justify-center"
            style={{
              borderRadius: cq(20),
              border: `${cq(1.5)} solid rgba(255,255,255,0.55)`,
              background: "rgba(255,255,255,0.10)",
              padding: `${cq(18)} ${cq(20)}`,
              minHeight: cq(86),
              marginBottom: cq(20),
            }}
          >
            {content.clientLogoUrl ? (
              <img
                src={content.clientLogoUrl}
                alt={content.preparedFor?.company ? `${content.preparedFor.company} logo` : ""}
                style={{ maxHeight: cq(60), maxWidth: "70%", objectFit: "contain" }}
              />
            ) : (
              <span
                style={{
                  fontSize: cq(10),
                  fontWeight: 700,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                Client logo
              </span>
            )}
          </div>
          <div
            style={{
              borderRadius: cq(20),
              background: mode === "dark" ? "rgba(255,255,255,0.10)" : "#FFFFFF",
              padding: `${cq(20)} ${cq(20)}`,
            }}
          >
            {page.body && <Body tokens={plate}>{page.body}</Body>}
            <CoverParties tokens={plate} content={content} />
          </div>
        </div>
      );
    }

    case "stats":
      return (
        <div>
          {page.body && <Body tokens={t}>{page.body}</Body>}
          <StatGrid tokens={t} stats={page.stats ?? content.stats} />
          {page.bullets?.length ? <Bullets tokens={t} items={page.bullets} /> : null}
        </div>
      );
    case "scope":
      return (
        <div>
          {page.body && <Body tokens={t}>{page.body}</Body>}
          <CardGrid
            tokens={t}
            withIcons
            cards={
              page.cards?.length
                ? page.cards
                : (content.included ?? []).map((s) => ({
                    title: s.label,
                    body: s.detail,
                    icon: s.icon,
                  }))
            }
          />
          <ScopeColumns tokens={t} content={content} />
        </div>
      );
    case "cost":
      return (
        <div>
          {page.body && <Body tokens={t}>{page.body}</Body>}
          <CostTable
            tokens={t}
            page={{
              ...page,
              costRows: page.costRows?.length ? page.costRows : content.costRows,
              costTotal: page.costTotal ?? content.costTotal,
              costTotalLabel: page.costTotalLabel ?? content.costTotalLabel,
              costNote: page.costNote ?? content.costNote,
            }}
          />
        </div>
      );
    case "locations":
      return (
        <div>
          {page.body && <Body tokens={t}>{page.body}</Body>}
          <WorldMap />
          <Locations tokens={t} locations={page.locations} />
          <StatGrid tokens={t} stats={page.stats} />
        </div>
      );
    case "clients":
      return (
        <div>
          <LogoWall tokens={t} logos={page.logos ?? []} />
          <StatGrid tokens={t} stats={page.stats} />
        </div>
      );
    case "success-stories":
      return (
        <div>
          {page.body && <Body tokens={t}>{page.body}</Body>}
          <Quotes tokens={t} quotes={page.quotes ?? (content.quote ? [content.quote] : [])} />
        </div>
      );
    case "why":
      return (
        <div>
          {page.body && <Body tokens={t}>{page.body}</Body>}
          <CardGrid tokens={t} withIcons cards={page.cards} />
          {page.bullets?.length ? <Bullets tokens={t} items={page.bullets} /> : null}
        </div>
      );
    case "advocates":
      return (
        <div>
          {page.body && <Body tokens={t}>{page.body}</Body>}
          <MarkWall tiles={CAUSE_LOGOS} cols={3} marginTop={24} />
          <MarkWall tiles={AFFINITY_LOGOS} cols={4} marginTop={26} />
          <Quotes tokens={t} quotes={page.quotes} />
        </div>
      );
    case "team-grid":
      return (
        <div>
          {page.body && <Body tokens={t}>{page.body}</Body>}
          <img
            src={PROPOSAL_ART.teamGrid}
            alt="TransPerfect project team"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              marginTop: cq(18),
              borderRadius: cq(16),
            }}
          />
          <TeamGrid tokens={t} team={page.team ?? content.team} />
        </div>
      );

    case "team-bio":
      return (
        <div>
          {page.body && <Body tokens={t}>{page.body}</Body>}
          <TeamGrid tokens={t} team={page.team} detailed />
        </div>
      );
    case "summary":
      return (
        <div>
          {page.body && <Body tokens={t}>{page.body}</Body>}
          {page.bullets?.length ? <Bullets tokens={t} items={page.bullets} /> : null}
          <CardGrid tokens={t} cards={page.cards} />
          {content.contacts?.ctaLabel && (
            <div
              style={{ marginTop: cq(16), fontSize: cq(11), fontWeight: 700, color: t.primary }}
            >
              {content.contacts.ctaLabel}{" "}
              <span style={{ color: t.ink, fontWeight: 600 }}>
                {content.contacts.ctaEmail ?? ""}
              </span>
            </div>
          )}
        </div>
      );
    default:
      return <div data-empty-page={index} />;
  }
}
