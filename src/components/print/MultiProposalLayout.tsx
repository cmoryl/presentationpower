// MULTI-PAGE SOLUTION PROPOSAL — 1:1 PORT
// ---------------------------------------------------------------------------
// Rebuilt directly from TransPerfect_Solutions_Proposal_Template.pptx. Every
// page is composed on the source deck's own coordinate system (8.5in x 11in),
// so plate geometry, gradients, type sizes and logo placement match the
// original slide-for-slide instead of being re-interpreted through generic
// print chrome.
//
// Geometry helpers
//   u(inches)  → container-relative length (cqw), so a page scales cleanly at
//                any preview or export DPI.
//   fs(points) → the same unit, expressed in the source deck's point sizes.
//
// Each page renders as its own `[data-print-page]` node so the asset editor can
// stack them and exportPrintAssetAsPdf() can emit a real multi-page PDF. All
// visible strings come from `content.pages[i]`, which keeps them live-editable.

import type { CSSProperties, ReactNode } from "react";

import type { BrandMode } from "@/lib/taxonomy";
import type {
  MultiProposalPage,
  PrintDensity,
  PrintPageSize,
  SolutionProposalContent,
} from "@/lib/print-assets.types";
import { SlideModeContext, SlideAccentContext } from "@/components/slide/SlideChrome";
import {
  AFFINITY_LOGOS,
  CAUSE_LOGOS,
  CLIENT_LOGOS,
  STORY_LOGOS,
  PROPOSAL_AQUA,
  PROPOSAL_ART,
} from "@/lib/print-library/proposal-art";
import { PROPOSAL_REGIONS, PROPOSAL_TEAL } from "@/lib/print-library/proposal-locations";
import { EditableImage, usePrintImageEdit } from "./PrintImageEdit";

// ---------------------------------------------------------------------------
// Source-deck constants
// ---------------------------------------------------------------------------

const PAGE_W_IN = 8.5;
const PAGE_H_IN = 11;

/** inches → container unit (1 page width === 100cqw). */
const u = (inches: number) => `${((inches / PAGE_W_IN) * 100).toFixed(4)}cqw`;
/** points → container unit. */
const fs = (points: number) => u(points / 72);

const NAVY = "#03002C";
const BLUE = "#003FC7";
const LAV = "#A9A3FD";
const AQUA_FIELD = "#A1F8F9";

/** Slides 3/4/7/10 — blue → lavender → aqua diagonal band. */
const BRIGHT_FIELD = `linear-gradient(101deg, ${BLUE} 0%, #4B63E8 26%, ${LAV} 58%, #BFE6FA 82%, ${AQUA_FIELD} 100%)`;
/** Slide 2/5 — deep navy → blue → lavender field. */
const DEEP_FIELD = `linear-gradient(72deg, ${NAVY} 0%, #061E6E 22%, ${BLUE} 52%, #7FA6F5 74%, ${LAV} 100%)`;
/** Slide 1 — pale aqua → white → lavender. */
const COVER_FIELD = `linear-gradient(122deg, ${AQUA_FIELD} 0%, #D8F4FC 18%, #F4FBFF 40%, #F2F0FF 56%, #C6B8FD 82%, ${LAV} 100%)`;

const TRANSPARENT_PX =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const FONT = "Geist, ui-sans-serif, system-ui, sans-serif";

// ---------------------------------------------------------------------------
// Public helpers (kept stable — imported by the asset editor + library)
// ---------------------------------------------------------------------------

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
  "team-cards": "Team cards",
  "team-leads": "Engagement leads",
  "team-wall": "Team wall",
  summary: "Summary",
};

export function multiPageLabel(page: MultiProposalPage, index: number): string {
  return page.navLabel || page.title || `${MULTI_PAGE_LABELS[page.kind]} ${index + 1}`;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

type BoxProps = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  children?: ReactNode;
  style?: CSSProperties;
};

/** Absolutely-positioned layer in source-deck inches. */
function L({ x, y, w, h, children, style }: BoxProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: u(x),
        top: u(y),
        width: w === undefined ? undefined : u(w),
        height: h === undefined ? undefined : u(h),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Text layer — point size + weight straight off the source shape. */
function T({
  x,
  y,
  w,
  size,
  weight = 400,
  color = "#FFFFFF",
  align = "left",
  leading = 1.18,
  tracking,
  upper,
  children,
  style,
}: BoxProps & {
  size: number;
  weight?: number;
  color?: string;
  align?: CSSProperties["textAlign"];
  leading?: number;
  tracking?: string;
  upper?: boolean;
}) {
  return (
    <L x={x} y={y} w={w} style={style}>
      <div
        style={{
          fontFamily: FONT,
          fontSize: fs(size),
          fontWeight: weight,
          lineHeight: leading,
          color,
          textAlign: align,
          letterSpacing: tracking,
          textTransform: upper ? "uppercase" : undefined,
          whiteSpace: "pre-wrap",
        }}
      >
        {children}
      </div>
    </L>
  );
}

/** Hairline rule. */
function Rule({
  x,
  y,
  w,
  color = "rgba(255,255,255,0.55)",
  thickness = 0.008,
}: {
  x: number;
  y: number;
  w: number;
  color?: string;
  thickness?: number;
}) {
  return <L x={x} y={y} w={w} h={thickness} style={{ background: color }} />;
}

function Img({
  x,
  y,
  w,
  h,
  src,
  alt = "",
  fit = "contain",
  radius,
  align = "center",
  slot,
  label,
}: BoxProps & {
  src: string;
  alt?: string;
  fit?: "contain" | "cover";
  radius?: number;
  align?: "left" | "center" | "right";
  /** When set (and the editor context is present) the picture is replaceable. */
  slot?: string;
  label?: string;
}) {
  return (
    <L x={x} y={y} w={w} h={h}>
      {slot ? (
        <EditableImage
          slot={slot}
          src={src}
          alt={alt}
          fit={fit}
          align={align}
          radius={radius === undefined ? undefined : u(radius)}
          label={label}
        />
      ) : (
        <img
          alt={alt}
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
            objectPosition: align === "center" ? "center" : `${align} center`,
            borderRadius: radius === undefined ? undefined : u(radius),
            display: "block",
          }}
        />
      )}
    </L>
  );
}


function lines(value: string | undefined): string[] {
  return (value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** `*highlighted*` runs render in the aqua accent, matching the source deck. */
function AccentRuns({ text, accent }: { text: string; accent: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <span key={i} style={{ color: accent }}>
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared page chrome (slides 3 / 4 / 7 / 10 share a header band + white plate)
// ---------------------------------------------------------------------------

function BandHeader({ title, logo }: { title: string; logo: string }) {
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={2.95} style={{ background: BRIGHT_FIELD }} />
      <Img x={6.38} y={0.47} w={1.88} h={0.28} src={logo} alt="TransPerfect" slot="band.logo" label="logo" />
      <T x={0.47} y={0.86} w={6} size={39.7} weight={700} leading={1.05} tracking="-0.02em">
        {title}
      </T>
    </>
  );
}

function Plate({
  x,
  y,
  w,
  h,
  radius = 0.34,
  bg = "#FFFFFF",
  border,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  bg?: string;
  border?: string;
}) {
  return (
    <L
      x={x}
      y={y}
      w={w}
      h={h}
      style={{ background: bg, borderRadius: u(radius), border }}
    />
  );
}

/**
 * Client-logo drop slot. Prints the uploaded mark once one exists; until then
 * it shows the template's "[insert client logo here]" prompt, and in the editor
 * that prompt doubles as a drag-and-drop / click-to-replace target.
 */
function ClientLogoSlot({
  x,
  y,
  w,
  h,
  slot,
  placeholder,
  color = NAVY,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  slot: string;
  placeholder: string;
  color?: string;
}) {
  const ctx = usePrintImageEdit();
  const url = ctx?.overrides?.[slot];
  if (url) {
    return <Img x={x} y={y} w={w} h={h} src={url} alt="Client logo" slot={slot} label="client logo" />;
  }
  if (!ctx?.active) {
    return (
      <T x={x} y={y + 0.12} w={w} size={18} weight={400} color={color} align="center" leading={1.3}>
        {placeholder}
      </T>
    );
  }
  return (
    <L x={x} y={y} w={w} h={h}>
      <EditableImage slot={slot} src={TRANSPARENT_PX} alt="Client logo" label="client logo" />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `${u(0.012)} dashed rgba(3,0,44,0.35)`,
          borderRadius: u(0.12),
          color,
          fontSize: u(0.19),
          pointerEvents: "none",
        }}
      >
        {placeholder}
      </div>
    </L>
  );
}

// ---------------------------------------------------------------------------
// Page 1 — Cover
// ---------------------------------------------------------------------------

function CoverPage({ page, logoDark }: { page: MultiProposalPage; logoDark: string }) {
  const prepared = page.cards ?? [];
  const forBlock = prepared[0];
  const byBlock = prepared[1];
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: COVER_FIELD }} />
      <L
        x={0}
        y={0}
        w={PAGE_W_IN}
        h={PAGE_H_IN}
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0) 52%, rgba(255,255,255,0.72) 66%, #FFFFFF 76%)",
        }}
      />

      <Plate
        x={0.4}
        y={0.5}
        w={7.72}
        h={3.52}
        radius={0.36}
        bg="linear-gradient(118deg, rgba(232,251,253,0.94) 0%, rgba(247,253,255,0.9) 42%, rgba(255,255,255,0.92) 66%, rgba(244,242,255,0.9) 100%)"
      />

      <T x={0.4} y={0.9} w={7.72} size={17} weight={400} color={BLUE} align="center" leading={1.3}>
        {page.eyebrow || "Transforming Global Performance"}
      </T>
      <Img x={1.84} y={1.34} w={4.9} h={0.62} src={logoDark} alt="TransPerfect" slot="cover.logo" label="logo" />
      <T
        x={0.4}
        y={2.24}
        w={7.72}
        size={19.2}
        weight={500}
        color={NAVY}
        align="center"
        tracking="0.14em"
      >
        {page.title || "SOLUTIONS PROPOSAL"}
      </T>
      <ClientLogoSlot
        x={2.0}
        y={2.86}
        w={4.52}
        h={0.72}
        slot="cover.clientLogo"
        placeholder={page.subtitle || "[insert client logo here]"}
      />


      <L
        x={2.28}
        y={4.53}
        w={4.37}
        h={0.014}
        style={{ background: `linear-gradient(90deg, ${BLUE}, ${LAV} 60%, #7FD8F2)` }}
      />

      <T x={0.4} y={4.9} w={7.72} size={14} weight={400} color={NAVY} align="center">
        <span style={{ fontWeight: 700 }}>DATE: </span>
        {page.footnote || "MM.DD.YY"}
      </T>

      <T x={1.84} y={5.32} w={2.33} size={14} weight={700} color={NAVY} align="right">
        {forBlock?.title || "PREPARED FOR:"}
      </T>
      <T x={4.59} y={5.32} w={2.4} size={14} weight={700} color={NAVY}>
        {byBlock?.title || "PREPARED BY:"}
      </T>
      <T x={1.84} y={5.79} w={2.33} size={14} weight={400} color={NAVY} align="right" leading={1.55}>
        {forBlock?.body || "Client Contact\nTitle\nCompany Name\nAddress One\nCity, Zip\nClient Email"}
      </T>
      <T x={4.59} y={5.79} w={2.4} size={14} weight={400} color={NAVY} leading={1.55}>
        {byBlock?.body || "Contact\nTitle\nTransPerfect\nAddress One\nCity, Zip\nYour Email"}
      </T>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page 2 — By the numbers
// ---------------------------------------------------------------------------

const STAT_SLOTS: Array<{
  vx: number;
  vy: number;
  vSize: number;
  lx: number;
  ly: number;
  lw: number;
  lSize: number;
  value: string;
  label: string;
}> = [
  { vx: 0.66, vy: 5.6, vSize: 66.2, lx: 0.68, ly: 6.78, lw: 2.8, lSize: 15.5, value: "$1.3B", label: "IN GLOBAL REVENUE" },
  { vx: 0.66, vy: 7.36, vSize: 44.1, lx: 1.53, ly: 7.42, lw: 2.0, lSize: 13.6, value: "34", label: "CONSECUTIVE\nYEARS OF GROWTH" },
  { vx: 0.66, vy: 8.55, vSize: 21.7, lx: 2.3, ly: 8.6, lw: 1.4, lSize: 16.5, value: "24/7/365", label: "SERVICE" },
  { vx: 3.9, vy: 5.5, vSize: 36.6, lx: 5.24, ly: 5.66, lw: 3.1, lSize: 16.5, value: "150+", label: "CITIES WORLDWIDE" },
  { vx: 3.9, vy: 6.46, vSize: 36.6, lx: 5.14, ly: 6.62, lw: 3.2, lSize: 16.5, value: "90%", label: "OF THE FORTUNE 500" },
  { vx: 3.9, vy: 7.45, vSize: 36.6, lx: 6.06, ly: 7.61, lw: 2.3, lSize: 16.5, value: "10,000+", label: "TEAM MEMBERS" },
  { vx: 3.9, vy: 8.43, vSize: 30, lx: 4.95, ly: 8.55, lw: 3.4, lSize: 16.5, value: "200+", label: "LANGUAGES SUPPORTED" },
];

function StatsPage({ page, logoWhite }: { page: MultiProposalPage; logoWhite: string }) {
  const headline = lines(page.title) .length
    ? lines(page.title)
    : ["Value.", "Intelligence.", "Performance.", "In any language."];
  const stats = page.stats ?? [];

  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: DEEP_FIELD }} />

      {/* Speech bubble — outline only, tail pointing at the revenue figure. */}
      <svg
        viewBox={`0 0 ${PAGE_W_IN} ${PAGE_H_IN}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        <path
          d="M 1.28,0.55 H 5.06 A 1.75,1.75 0 0 1 5.06,4.05 H 2.36 L 1.53,5.58 L 1.47,4.05 H 1.28 A 0.3,0.3 0 0 1 0.98,3.75 V 0.85 A 0.3,0.3 0 0 1 1.28,0.55 Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={0.032}
          strokeLinejoin="round"
        />
      </svg>

      <T x={1.2} y={0.94} w={4.6} size={37} weight={400} leading={1.28} tracking="-0.015em">
        {headline.map((line, i) => (
          <div key={i} style={{ fontWeight: i === headline.length - 1 ? 700 : 400 }}>
            {line}
          </div>
        ))}
      </T>

      {/* Column divider + hairlines */}
      <L x={3.62} y={5.42} w={0.01} h={3.5} style={{ background: "rgba(255,255,255,0.35)" }} />
      <Rule x={0.66} y={7.16} w={2.78} color="rgba(255,255,255,0.35)" />
      <Rule x={0.66} y={8.32} w={2.78} color="rgba(255,255,255,0.35)" />
      <Rule x={3.9} y={6.32} w={4.05} color="rgba(255,255,255,0.35)" />
      <Rule x={3.9} y={7.31} w={4.05} color="rgba(255,255,255,0.35)" />
      <Rule x={3.9} y={8.3} w={4.05} color="rgba(255,255,255,0.35)" />
      <Rule x={0.66} y={9.2} w={7.3} color="rgba(255,255,255,0.35)" />

      {STAT_SLOTS.map((slot, i) => {
        const authored = stats[i];
        const value = authored ? `${authored.value ?? ""}${authored.unit ?? ""}` : slot.value;
        const label = authored?.label ?? slot.label;
        return (
          <div key={i}>
            <T
              x={slot.vx}
              y={slot.vy}
              w={3}
              size={slot.vSize}
              weight={700}
              color={PROPOSAL_AQUA}
              leading={1}
              tracking="-0.03em"
            >
              {value}
            </T>
            <T
              x={slot.lx}
              y={slot.ly}
              w={slot.lw}
              size={slot.lSize}
              weight={700}
              leading={1.2}
              upper
              tracking="0.01em"
            >
              {label}
            </T>
          </div>
        );
      })}

      <Img x={2.52} y={9.86} w={3.48} h={0.44} src={logoWhite} alt="TransPerfect" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page 3 — Project scope
// ---------------------------------------------------------------------------

function ScopePage({ page, logoWhite }: { page: MultiProposalPage; logoWhite: string }) {
  const rows = page.cards?.length
    ? page.cards
    : [
        { title: "WHAT'S INCLUDED", body: "Language Pre-Flight\nLocalization\nDesktop Publishing\nProject Management" },
        { title: "SOURCE FILES", body: "1 PDF Document" },
        { title: "DELIVERABLES", body: "1 PDF Document\n1 Certificate" },
      ];
  const heights = [1.78, 1.24, 2.05];
  const tableX = 1.11;
  const tableY = 2.93;
  const colW = [3.18, 3.23];
  const timeline = page.bullets?.length
    ? page.bullets
    : ["Project timeline is estimated at X business days.", "CLIENT has requested a rush X-day turnaround time."];

  let cursor = tableY;

  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: "#FFFFFF" }} />
      <BandHeader title={page.title || "Project Scope"} logo={logoWhite} />

      <Plate
        x={0.27}
        y={2.18}
        w={7.98}
        h={6.4}
        radius={0.4}
        bg="linear-gradient(160deg, #E9EEFC 0%, #EDF1FD 60%, #E4ECFA 100%)"
      />
      <Plate x={0.7} y={2.51} w={7.15} h={5.85} radius={0.06} />

      {rows.slice(0, 3).map((row, i) => {
        const h = heights[i] ?? 1.4;
        const y = cursor;
        cursor += h;
        return (
          <div key={i}>
            <L
              x={tableX}
              y={y}
              w={colW[0]}
              h={h}
              style={{ border: `${u(0.008)} solid ${NAVY}`, borderRight: "none" }}
            />
            <L
              x={tableX + colW[0]!}
              y={y}
              w={colW[1]}
              h={h}
              style={{ border: `${u(0.008)} solid ${NAVY}` }}
            />
            <T
              x={tableX + 0.14}
              y={y + h / 2 - 0.09}
              w={colW[0]! - 0.28}
              size={11}
              weight={700}
              color={NAVY}
              upper
            >
              {row.title}
            </T>
            <T
              x={tableX + colW[0]! + 0.14}
              y={y + h / 2 - (lines(row.body).length * 0.1)}
              w={colW[1]! - 0.28}
              size={11}
              weight={400}
              color={NAVY}
              leading={1.42}
            >
              {row.body}
            </T>
          </div>
        );
      })}

      {/* Timeline table */}
      <L x={0.75} y={8.78} w={7.02} h={0.46} style={{ border: `${u(0.008)} solid ${NAVY}` }} />
      <T x={0.89} y={8.88} w={4} size={18} weight={700} color={NAVY}>
        {page.subtitle || "TIMELINE"}
      </T>
      <L
        x={0.75}
        y={9.24}
        w={7.02}
        h={1.0}
        style={{ border: `${u(0.008)} solid ${NAVY}`, borderTop: "none" }}
      />
      {timeline.slice(0, 3).map((line, i) => (
        <T key={i} x={0.89} y={9.42 + i * 0.34} w={6.7} size={10} weight={400} color={NAVY}>
          {line}
        </T>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page 4 — Cost summary
// ---------------------------------------------------------------------------

function CostPage({ page, logoWhite }: { page: MultiProposalPage; logoWhite: string }) {
  const rows = page.costRows ?? [];
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: "#FFFFFF" }} />
      <BandHeader title={page.title || "Cost Summary"} logo={logoWhite} />
      <Plate x={0.27} y={2.18} w={7.98} h={8.2} radius={0.4} />

      {rows.length > 0 && (
        <>
          <L x={0.75} y={2.72} w={7.02} h={0.46} style={{ background: "#EEF2FD" }} />
          <T x={0.92} y={2.83} w={3.6} size={11} weight={700} color={NAVY} upper tracking="0.06em">
            Service
          </T>
          <T x={4.6} y={2.83} w={1.4} size={11} weight={700} color={NAVY} upper tracking="0.06em">
            Volume
          </T>
          <T x={6.1} y={2.83} w={1.5} size={11} weight={700} color={NAVY} upper tracking="0.06em" align="right">
            Investment
          </T>
          {rows.map((row, i) => {
            const y = 3.18 + i * 0.46;
            return (
              <div key={i}>
                <Rule x={0.75} y={y + 0.44} w={7.02} color="rgba(3,0,44,0.14)" />
                <T x={0.92} y={y + 0.12} w={3.6} size={11} color={NAVY}>
                  {row.item ?? ""}
                </T>
                <T x={4.6} y={y + 0.12} w={1.4} size={11} color="#555555">
                  {row.qty ?? row.detail ?? ""}
                </T>
                <T x={5.9} y={y + 0.12} w={1.7} size={11} weight={600} color={NAVY} align="right">
                  {row.price ?? ""}
                </T>
              </div>
            );
          })}
          <T
            x={4.0}
            y={3.34 + rows.length * 0.46}
            w={2.2}
            size={12}
            weight={700}
            color={NAVY}
            align="right"
            upper
            tracking="0.05em"
          >
            {page.costTotalLabel || "Total"}
          </T>
          <T
            x={6.3}
            y={3.28 + rows.length * 0.46}
            w={1.3}
            size={16}
            weight={700}
            color={BLUE}
            align="right"
          >
            {page.costTotal || ""}
          </T>
          {page.costNote && (
            <T
              x={0.92}
              y={3.98 + rows.length * 0.46}
              w={6.7}
              size={9.5}
              color="#555555"
              leading={1.45}
            >
              {page.costNote}
            </T>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page 5 — Global locations
// ---------------------------------------------------------------------------

const REGION_COLS: Record<string, { headX: number; headY: number; cols: number[]; colY: number; colW: number }> = {
  AMERICAS: { headX: 0.56, headY: 8.92, cols: [0.56, 1.13, 1.72, 2.3, 3.18], colY: 9.18, colW: 0.62 },
  EMEA: { headX: 4.23, headY: 9.02, cols: [4.23, 4.76, 5.39], colY: 9.26, colW: 0.58 },
  APAC: { headX: 6.35, headY: 9.05, cols: [6.36, 6.98, 7.52], colY: 9.3, colW: 0.62 },
};


function LocationsPage({ page }: { page: MultiProposalPage }) {
  const title = lines(page.title).length ? lines(page.title) : ["Global", "Locations"];
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: DEEP_FIELD }} />

      <Plate
        x={0.55}
        y={0.85}
        w={7.42}
        h={2.02}
        radius={0.16}
        bg="rgba(255,255,255,0.14)"
      />
      <T x={0.55} y={1.24} w={7.42} size={40} weight={700} align="center" leading={1.14} tracking="-0.02em">
        {title.join("\n")}
      </T>

      <Img x={-0.2} y={2.72} w={8.9} h={4.96} src={PROPOSAL_ART.worldMap} alt="World map" slot="locations.map" label="map" />

      {/* Legend */}
      <L x={0.56} y={7.9} w={0.058} h={0.058} style={{ background: "#FFFFFF", borderRadius: 999 }} />
      <T x={0.68} y={7.84} w={1.4} size={7.2} weight={700} leading={1.25} upper>
        {"Client\nService"}
      </T>
      <L x={0.56} y={8.2} w={0.058} h={0.058} style={{ background: PROPOSAL_TEAL, borderRadius: 999 }} />
      <T x={0.68} y={8.14} w={1.6} size={7.2} weight={700} color={PROPOSAL_TEAL} leading={1.25} upper>
        {"Client Service\n& Production"}
      </T>


      {PROPOSAL_REGIONS.map((region) => {
        const spec = REGION_COLS[region.region];
        if (!spec) return null;
        return (
          <div key={region.region}>
            <T x={spec.headX} y={spec.headY} w={2} size={13.8} weight={700} tracking="-0.01em">
              {region.region}
            </T>
            {region.columns.map((col, ci) => (
              <T
                key={ci}
                x={spec.cols[ci] ?? spec.cols[spec.cols.length - 1]!}
                y={spec.colY}
                w={spec.colW}
                size={4.3}
                leading={1.5}
              >
                {col.map((city, i) => (
                  <div key={i} style={{ color: city.prod ? PROPOSAL_TEAL : "#FFFFFF" }}>
                    {city.name}
                  </div>
                ))}
              </T>
            ))}
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page 6 — Clients
// ---------------------------------------------------------------------------

function ClientsPage({ page, logoWhite }: { page: MultiProposalPage; logoWhite: string }) {
  const title = lines(page.title).length ? lines(page.title) : ["Our", "clients."];
  const editing = !!usePrintImageEdit()?.active;
  // Column centres and row baselines lifted straight off the source slide.
  const tileX = [1.3, 2.84, 4.37, 5.9];
  const tileY = [4.98, 6.55, 8.06];
  const tiles = Array.from({ length: 12 }, (_, i) => ({
    // Names are opt-in captions — the source slide shows logos only.
    name: page.clients?.[i]?.name ?? "",
    alt: page.clients?.[i]?.name || CLIENT_LOGOS[i]?.name || "Client logo",
    url: page.clients?.[i]?.url || CLIENT_LOGOS[i]?.url || TRANSPARENT_PX,
  }));

  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: BRIGHT_FIELD }} />
      <L x={0} y={0} w={PAGE_W_IN} h={5.78} style={{ background: "#FFFFFF" }} />
      <Plate x={0.43} y={3.5} w={7.59} h={5.87} radius={0.3} />

      <T x={0.68} y={1.3} w={5} size={65.5} weight={700} leading={1.02} tracking="-0.035em">
        <span style={{ color: NAVY }}>{title[0]}</span>
        {"\n"}
        <span style={{ color: BLUE }}>{title[1]}</span>
      </T>
      <T x={0.43} y={3.94} w={7.59} size={13.5} weight={700} color={NAVY} align="center" leading={1.3}>
        {page.subtitle || "We're proud of the company we keep"}
      </T>

      {tiles.map((tile, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = tileX[col]!;
        const y = tileY[row]!;
        return (
          <div key={i}>
            <Img
              x={x}
              y={y}
              w={1.4}
              h={0.62}
              src={tile.url}
              alt={tile.alt}
              fit="contain"
              slot={`clients.logo.${i + 1}`}
              label="client logo"
            />
            {(tile.name || editing) && (
              <T
                x={x}
                y={y + 0.68}
                w={1.4}
                size={7.5}
                weight={600}
                color={editing && !tile.name ? "rgba(3,0,44,0.35)" : "#555555"}
                align="center"
                tracking="0.06em"
                upper
              >
                {tile.name || "Client name"}
              </T>
            )}
          </div>
        );
      })}


      <Img x={2.92} y={10.02} w={2.59} h={0.33} src={logoWhite} alt="TransPerfect" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page 7 — Success stories
// ---------------------------------------------------------------------------

function Dots({ x, y, color = NAVY }: { x: number; y: number; color?: string }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <L
          key={i}
          x={x + i * 0.16}
          y={y}
          w={0.062}
          h={0.062}
          style={{ background: color, borderRadius: 999 }}
        />
      ))}
    </>
  );
}

function StoriesPage({ page, logoWhite }: { page: MultiProposalPage; logoWhite: string }) {
  const quotes = page.quotes ?? [];
  const first = quotes[0];
  const second = quotes[1];
  const cardBorder = `${u(0.008)} solid rgba(3,0,44,0.85)`;
  const firstLogo = STORY_LOGOS[(first?.company || "Lufthansa").toLowerCase()];
  const secondLogo = STORY_LOGOS[(second?.company || "Lavazza").toLowerCase()];

  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: "#FFFFFF" }} />
      <BandHeader title={page.title || "Success Stories"} logo={logoWhite} />
      <Plate x={0.32} y={1.61} w={7.93} h={9.4} radius={0.4} />

      {/* Connector rails (top card in, bottom card out) as in the source deck. */}
      <svg
        viewBox={`0 0 ${PAGE_W_IN} ${PAGE_H_IN}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        aria-hidden
      >
        <g stroke="rgba(3,0,44,0.85)" strokeWidth={0.012} fill="rgba(3,0,44,0.85)">
          <path d="M0.44 1.89 L4.05 1.89" />
          <path d="M4.05 1.83 L4.22 1.89 L4.05 1.95 Z" />
          <path d="M8.02 6.25 L3.95 6.25" />
          <path d="M3.95 6.19 L3.78 6.25 L3.95 6.31 Z" />
          <path d="M0.64 10.42 L4.05 10.42" />
          <path d="M4.05 10.36 L4.22 10.42 L4.05 10.48 Z" />
        </g>
      </svg>

      {/* Card 1 */}
      <L x={0.64} y={1.89} w={7.38} h={4.36} style={{ border: cardBorder, borderRadius: u(0.34) }} />
      <Img
        x={0.27}
        y={2.42}
        w={3.25}
        h={3.13}
        src={PROPOSAL_ART.photoClouds}
        alt="Above the clouds"
        fit="cover"
        radius={0.3}
        slot="stories.photo.1"
        label="photo"
      />
      {firstLogo ? (
        <Img
          x={3.72}
          y={2.42}
          w={3.35}
          h={0.5}
          src={firstLogo}
          alt={first?.company || "Lufthansa"}
          fit="contain"
          align="left"
          slot="stories.logo.1"
          label="logo"
        />
      ) : (
        <T x={3.72} y={2.5} w={3.6} size={26} weight={700} color={NAVY} tracking="-0.02em">
          {first?.company || "Lufthansa"}
        </T>
      )}
      <Dots x={3.72} y={3.05} color={BLUE} />
      <T x={3.72} y={3.33} w={3.5} size={10} color={NAVY} leading={1.42}>
        {first?.text ? `"${first.text.replace(/^"|"$/g, "")}"` : ""}
      </T>
      <T x={3.72} y={5.02} w={3.5} size={10} color={NAVY}>
        {first ? `– ${[first.role || first.author, first.company].filter(Boolean).join(", ")}` : ""}
      </T>

      {/* Card 2 */}
      <L x={0.64} y={6.8} w={7.38} h={3.62} style={{ border: cardBorder, borderRadius: u(0.34) }} />
      <Img
        x={4.89}
        y={6.57}
        w={3.29}
        h={3.44}
        src={PROPOSAL_ART.photoCoffee}
        alt="Coffee"
        fit="cover"
        radius={0.3}
        slot="stories.photo.2"
        label="photo"
      />
      {secondLogo ? (
        <Img
          x={1.16}
          y={6.62}
          w={3.35}
          h={0.62}
          src={secondLogo}
          alt={second?.company || "Lavazza"}
          fit="contain"
          align="right"
          slot="stories.logo.2"
          label="logo"
        />
      ) : (
        <T x={1.07} y={6.62} w={3.44} size={26} weight={700} color={NAVY} align="right" tracking="-0.02em">
          {second?.company || "Lavazza"}
        </T>
      )}
      <Dots x={3.94} y={7.4} color={BLUE} />
      <T x={1.07} y={7.68} w={3.44} size={10} color={NAVY} align="right" leading={1.42}>
        {second?.headline || ""}
      </T>
      <T x={1.07} y={8.16} w={3.44} size={10} color={NAVY} align="right" leading={1.42}>
        {second?.text ? `"${second.text.replace(/^"|"$/g, "")}"` : ""}
      </T>
      <T x={1.07} y={9.34} w={3.44} size={10} color={NAVY} align="right">
        {second ? `– ${[second.role || second.author, second.company].filter(Boolean).join(", ")}` : ""}
      </T>
    </>
  );
}


// ---------------------------------------------------------------------------
// Page 8 — Why TransPerfect
// ---------------------------------------------------------------------------

const WHY_LINES = [
  "UNMATCHED *GLOBAL SCALE* & RESOURCES",
  "GLOBAL *REACH*, LOCAL *FOCUS*",
  "PROVEN *RECORD OF SUCCESS*",
  "*TECHNOLOGY* SOLUTIONS",
  "*FLEXIBLE* AND *SCALABLE*",
  "INDUSTRY *EXPERTISE*",
];

function WhyPage({ page, logoDark }: { page: MultiProposalPage; logoDark: string }) {
  const bullets = page.bullets?.length ? page.bullets : WHY_LINES;
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: DEEP_FIELD }} />
      <Img x={0} y={0} w={8.53} h={3.6} src={PROPOSAL_ART.teamGrid} alt="TransPerfect team" fit="cover" slot="why.photo" label="photo" />

      {/* White statement bubble with a downward tail. */}
      <svg
        viewBox={`0 0 ${PAGE_W_IN} ${PAGE_H_IN}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        <path
          d="M 0,3.6 H 6.32 A 0.34,0.34 0 0 1 6.66,3.94 V 5.9 A 0.34,0.34 0 0 1 6.32,6.24 H 5.98 L 5.86,6.72 L 5.42,6.24 H 0 Z"
          fill="#FFFFFF"
        />
      </svg>

      <T x={0.64} y={4.06} w={3} size={44} weight={700} color={BLUE} tracking="-0.03em">
        {page.title || "WHY"}
      </T>
      <Img x={0.64} y={4.9} w={5.33} h={0.67} src={logoDark} alt="TransPerfect" />

      {bullets.slice(0, 6).map((line, i) => (
        <T
          key={i}
          x={1.4}
          y={6.9 + i * 0.655}
          w={4.41}
          size={13}
          weight={700}
          align="right"
          leading={1.2}
          upper
          tracking="0.02em"
        >
          <AccentRuns text={line} accent="#7CC6F5" />
        </T>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page 9 — Advocates
// ---------------------------------------------------------------------------

const CAUSE_SLOTS = [
  { x: 3.0, y: 2.55, w: 1.06, h: 0.44 },
  { x: 4.28, y: 2.48, w: 0.92, h: 0.5 },
  { x: 5.28, y: 2.5, w: 0.9, h: 0.48 },
  { x: 6.3, y: 2.5, w: 1.02, h: 0.48 },
  { x: 7.36, y: 2.5, w: 0.72, h: 0.48 },
  { x: 3.12, y: 3.28, w: 1.14, h: 0.44 },
  { x: 4.42, y: 3.22, w: 1.0, h: 0.5 },
  { x: 5.66, y: 3.2, w: 1.06, h: 0.54 },
  { x: 6.86, y: 3.24, w: 1.06, h: 0.46 },
];

const AFFINITY_SLOTS = [
  { x: 3.0, y: 8.6, w: 1.82, h: 0.52 },
  { x: 4.86, y: 8.44, w: 1.36, h: 0.6 },
  { x: 6.86, y: 8.5, w: 1.04, h: 0.72 },
  { x: 4.3, y: 9.6, w: 2.36, h: 0.56 },
];

function AdvocatesPage({ page, logoDark }: { page: MultiProposalPage; logoDark: string }) {
  const advocacy = page.cards?.[0];
  const affinity = page.cards?.[1];
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: "#FFFFFF" }} />
      <L
        x={2.51}
        y={0}
        w={PAGE_W_IN - 2.51}
        h={PAGE_H_IN}
        style={{
          background: `linear-gradient(160deg, ${BLUE} 0%, #6E86F0 24%, #9FB7F8 48%, ${LAV} 74%, #C7B6FB 100%)`,
        }}
      />

      <T x={3.12} y={0.78} w={4.8} size={39.9} weight={300} leading={1.1} tracking="-0.01em">
        {page.title || "Giving Back"}
      </T>
      <T x={3.13} y={1.5} w={4.9} size={13} weight={400} tracking="0.03em" upper>
        {page.subtitle || "We are proud to support these causes"}
      </T>
      <Rule x={3.12} y={2.06} w={5.08} color="rgba(255,255,255,0.7)" />

      {CAUSE_LOGOS.slice(0, 9).map((logo, i) => {
        const box = CAUSE_SLOTS[i]!;
        return (
          <Img
            key={logo.name}
            x={box.x}
            y={box.y}
            w={box.w}
            h={box.h}
            src={logo.url}
            alt={logo.name}
            fit="contain"
            slot={`advocates.cause.${i + 1}`}
            label="logo"
          />
        );
      })}

      <L
        x={0}
        y={4.24}
        w={6.86}
        h={2.68}
        style={{
          background: "#FFFFFF",
          borderTopRightRadius: u(0.3),
          borderBottomRightRadius: u(0.3),
        }}
      />
      <Img x={3.99} y={4.78} w={2.59} h={0.33} src={logoDark} alt="TransPerfect" />
      <T x={2.6} y={5.18} w={3.98} size={48.5} weight={700} color={BLUE} align="right" leading={1.05} tracking="-0.03em">
        {advocacy?.title || "Advocacy"}
      </T>
      <T x={2.6} y={5.9} w={3.98} size={48.5} weight={400} color={NAVY} align="right" leading={1.05} tracking="-0.03em">
        {advocacy?.body || "Updates"}
      </T>

      <T x={3.13} y={7.5} w={5} size={35.9} weight={300} leading={1.1} tracking="-0.01em">
        {affinity?.title || "Our Affinity Groups"}
      </T>
      <T x={3.14} y={8.16} w={2} size={13} weight={400} tracking="0.03em" upper>
        {affinity?.body || "Are growing"}
      </T>
      <Rule x={4.63} y={8.29} w={3.17} color="rgba(255,255,255,0.7)" />

      {AFFINITY_LOGOS.slice(0, 4).map((logo, i) => {
        const box = AFFINITY_SLOTS[i]!;
        return (
          <Img
            key={logo.name}
            x={box.x}
            y={box.y}
            w={box.w}
            h={box.h}
            src={logo.url}
            alt={logo.name}
            fit="contain"
            slot={`advocates.affinity.${i + 1}`}
            label="logo"
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Pages 10–11 — team + closing (source uses a white plate over the band)
// ---------------------------------------------------------------------------

function TeamPage({
  page,
  logoWhite,
  bios,
}: {
  page: MultiProposalPage;
  logoWhite: string;
  bios: boolean;
}) {
  const team = page.team ?? [];
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: "#FFFFFF" }} />
      <BandHeader title={page.title || "Meet the Team"} logo={logoWhite} />
      <Plate x={0.27} y={2.18} w={7.98} h={8.35} radius={0.4} />

      {page.body && (
        <T x={0.78} y={2.7} w={6.96} size={11} color="#555555" leading={1.5}>
          {page.body}
        </T>
      )}

      {bios
        ? team.slice(0, 3).map((member, i) => {
            const y = 3.4 + i * 2.4;
            const tx = 2.28;
            const tw = 5.46;
            return (
              <div key={i}>
                <Rule x={0.78} y={y - 0.24} w={6.96} color="rgba(3,0,44,0.12)" />
                <Img
                  x={0.78}
                  y={y}
                  w={1.3}
                  h={1.3}
                  src={member.photo || TRANSPARENT_PX}
                  alt={member.name ?? "Team member"}
                  fit="cover"
                  radius={0.12}
                  slot={`team.bio.photo.${i + 1}`}
                  label="headshot"
                />
                <T x={tx} y={y} w={4} size={16} weight={700} color={NAVY}>
                  {member.name ?? ""}
                </T>
                <T x={tx} y={y + 0.3} w={4} size={11} weight={600} color={BLUE} upper tracking="0.05em">
                  {member.role ?? ""}
                </T>
                <T x={tx} y={y + 0.62} w={tw} size={10.5} color="#555555" leading={1.5}>
                  {member.bio ?? ""}
                </T>
                <T x={tx} y={y + 1.72} w={tw} size={10} color={NAVY}>
                  {[member.email, member.phone, member.office].filter(Boolean).join("  ·  ")}
                </T>
              </div>
            );
          })
        : team.slice(0, 6).map((member, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = 0.78 + col * 3.6;
            const y = 3.4 + row * 1.7;
            return (
              <div key={i}>
                <L
                  x={x}
                  y={y}
                  w={3.32}
                  h={1.36}
                  style={{ background: "#F3F6FE", borderRadius: u(0.16) }}
                />
                <Img
                  x={x + 0.18}
                  y={y + 0.2}
                  w={0.96}
                  h={0.96}
                  src={member.photo || TRANSPARENT_PX}
                  alt={member.name ?? "Team member"}
                  fit="cover"
                  radius={0.48}
                  slot={`team.contact.photo.${i + 1}`}
                  label="headshot"
                />
                <T x={x + 1.28} y={y + 0.2} w={1.86} size={13} weight={700} color={NAVY} leading={1.15}>
                  {member.name ?? ""}
                </T>
                <T x={x + 1.28} y={y + 0.52} w={1.86} size={9} weight={600} color={BLUE} upper tracking="0.05em" leading={1.25}>
                  {member.role ?? ""}
                </T>
                <T x={x + 1.28} y={y + 0.82} w={1.86} size={8.5} color="#555555" leading={1.35}>
                  {[member.office, member.email].filter(Boolean).join("\n")}
                </T>
              </div>
            );
          })}

    </>
  );
}

// --- Additional team page designs -----------------------------------------

/** Photo card grid — 3 columns × 2 rows of headshot cards. */
function TeamCardsPage({ page, logoWhite }: { page: MultiProposalPage; logoWhite: string }) {
  const team = page.team ?? [];
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: "#FFFFFF" }} />
      <BandHeader title={page.title || "Meet the Team"} logo={logoWhite} />
      <Plate x={0.27} y={2.18} w={7.98} h={8.35} radius={0.4} />
      {page.body && (
        <T x={0.78} y={2.62} w={6.96} size={11} color="#555555" leading={1.5}>
          {page.body}
        </T>
      )}
      {team.slice(0, 6).map((member, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 0.7 + col * 2.44;
        const y = 3.42 + row * 3.18;
        return (
          <div key={i}>
            <L
              x={x}
              y={y}
              w={2.2}
              h={2.86}
              style={{
                background: "#F3F6FE",
                borderRadius: u(0.18),
                border: `${u(0.008)} solid rgba(3,0,44,0.08)`,
              }}
            />
            <Img
              x={x + 0.16}
              y={y + 0.16}
              w={1.88}
              h={1.5}
              src={member.photo || TRANSPARENT_PX}
              alt={member.name ?? "Team member"}
              fit="cover"
              radius={0.12}
              slot={`team.photo.${i + 1}`}
              label="headshot"
            />
            <T x={x + 0.18} y={y + 1.8} w={1.86} size={12.5} weight={700} color={NAVY} leading={1.15}>
              {member.name ?? ""}
            </T>
            <T
              x={x + 0.18}
              y={y + 2.14}
              w={1.86}
              size={8.5}
              weight={600}
              color={BLUE}
              upper
              tracking="0.06em"
              leading={1.25}
            >
              {member.role ?? ""}
            </T>
            <T x={x + 0.18} y={y + 2.46} w={1.86} size={8.5} color="#555555" leading={1.35}>
              {[member.office, member.email].filter(Boolean).join("\n")}
            </T>
          </div>
        );
      })}
    </>
  );
}

/** Two engagement leads, large portraits with a full bio column. */
function TeamLeadsPage({ page, logoWhite }: { page: MultiProposalPage; logoWhite: string }) {
  const team = page.team ?? [];
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: "#FFFFFF" }} />
      <BandHeader title={page.title || "Your engagement leads"} logo={logoWhite} />
      <Plate x={0.27} y={2.18} w={7.98} h={8.35} radius={0.4} />
      {page.body && (
        <T x={0.78} y={2.62} w={6.96} size={11} color="#555555" leading={1.5}>
          {page.body}
        </T>
      )}
      {team.slice(0, 2).map((member, i) => {
        const y = 3.5 + i * 3.5;
        return (
          <div key={i}>
            <Img
              x={0.78}
              y={y}
              w={2.3}
              h={2.6}
              src={member.photo || TRANSPARENT_PX}
              alt={member.name ?? "Engagement lead"}
              fit="cover"
              radius={0.16}
              slot={`team.lead.photo.${i + 1}`}
              label="portrait"
            />
            <T x={3.3} y={y} w={4.44} size={20} weight={700} color={NAVY} leading={1.1} tracking="-0.02em">
              {member.name ?? ""}
            </T>
            <T x={3.3} y={y + 0.42} w={4.44} size={10} weight={600} color={BLUE} upper tracking="0.07em">
              {member.role ?? ""}
            </T>
            <Rule x={3.3} y={y + 0.68} w={4.44} color="rgba(3,0,44,0.12)" />
            <T x={3.3} y={y + 0.84} w={4.44} size={10.5} color="#555555" leading={1.5}>
              {member.bio ?? ""}
            </T>
            <T x={3.3} y={y + 2.28} w={4.44} size={9.5} color={NAVY} leading={1.4}>
              {[member.email, member.phone, member.office].filter(Boolean).join("  ·  ")}
            </T>
          </div>
        );
      })}
    </>
  );
}

/** Dense headshot wall — up to 12 people on a single page. */
function TeamWallPage({ page, logoWhite }: { page: MultiProposalPage; logoWhite: string }) {
  const team = page.team ?? [];
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: BRIGHT_FIELD }} />
      <Plate x={0.27} y={0.5} w={7.98} h={9.95} radius={0.4} />
      <T x={0.78} y={1.0} w={6.6} size={39.7} weight={700} color={NAVY} leading={1.04} tracking="-0.025em">
        {page.title || "Your global team"}
      </T>
      {page.subtitle && (
        <T x={0.78} y={1.86} w={6.6} size={13} weight={600} color={BLUE} leading={1.35}>
          {page.subtitle}
        </T>
      )}
      {team.slice(0, 12).map((member, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 0.78 + col * 1.72;
        const y = 2.6 + row * 2.5;
        return (
          <div key={i}>
            <Img
              x={x}
              y={y}
              w={1.5}
              h={1.5}
              src={member.photo || TRANSPARENT_PX}
              alt={member.name ?? "Team member"}
              fit="cover"
              radius={0.75}
              slot={`team.wall.photo.${i + 1}`}
              label="headshot"
            />
            <T x={x - 0.06} y={y + 1.62} w={1.62} size={10} weight={700} color={NAVY} align="center" leading={1.2}>
              {member.name ?? ""}
            </T>
            <T
              x={x - 0.06}
              y={y + 1.94}
              w={1.62}
              size={7.5}
              weight={600}
              color={BLUE}
              align="center"
              upper
              tracking="0.06em"
              leading={1.25}
            >
              {member.role ?? ""}
            </T>
          </div>
        );
      })}
      <Img x={5.54} y={10.55} w={2.7} h={0.34} src={logoWhite} alt="TransPerfect" />
    </>
  );
}

function SummaryPage({ page, logoWhite }: { page: MultiProposalPage; logoWhite: string }) {
  const bullets = page.bullets ?? [];
  return (
    <>
      <L x={0} y={0} w={PAGE_W_IN} h={PAGE_H_IN} style={{ background: BRIGHT_FIELD }} />
      <Plate x={0.26} y={-0.36} w={7.98} h={9.81} radius={0.4} />

      <T x={0.78} y={1.1} w={6.6} size={39.7} weight={700} color={NAVY} leading={1.05} tracking="-0.025em">
        {page.title || "Next steps"}
      </T>
      {page.body && (
        <T x={0.78} y={2.1} w={6.6} size={12} color="#555555" leading={1.55}>
          {page.body}
        </T>
      )}
      {bullets.map((line, i) => (
        <div key={i}>
          <L
            x={0.78}
            y={3.06 + i * 0.62}
            w={0.09}
            h={0.09}
            style={{ background: BLUE, borderRadius: 999 }}
          />
          <T x={1.06} y={2.98 + i * 0.62} w={6.3} size={12.5} color={NAVY} leading={1.4}>
            {line}
          </T>
        </div>
      ))}
      {page.footnote && (
        <T x={0.78} y={8.6} w={6.6} size={9.5} color="#555555">
          {page.footnote}
        </T>
      )}

      <Img x={5.54} y={9.85} w={2.7} h={0.34} src={logoWhite} alt="TransPerfect" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

function PageBody({
  page,
  logoWhite,
  logoDark,
}: {
  page: MultiProposalPage;
  logoWhite: string;
  logoDark: string;
}) {
  switch (page.kind) {
    case "cover":
      return <CoverPage page={page} logoDark={logoDark} />;
    case "stats":
      return <StatsPage page={page} logoWhite={logoWhite} />;
    case "scope":
      return <ScopePage page={page} logoWhite={logoWhite} />;
    case "cost":
      return <CostPage page={page} logoWhite={logoWhite} />;
    case "locations":
      return <LocationsPage page={page} />;
    case "clients":
      return <ClientsPage page={page} logoWhite={logoWhite} />;
    case "success-stories":
      return <StoriesPage page={page} logoWhite={logoWhite} />;
    case "why":
      return <WhyPage page={page} logoDark={logoDark} />;
    case "advocates":
      return <AdvocatesPage page={page} logoDark={logoDark} />;
    case "team-grid":
      return <TeamPage page={page} logoWhite={logoWhite} bios={false} />;
    case "team-bio":
      return <TeamPage page={page} logoWhite={logoWhite} bios />;
    case "team-cards":
      return <TeamCardsPage page={page} logoWhite={logoWhite} />;
    case "team-leads":
      return <TeamLeadsPage page={page} logoWhite={logoWhite} />;
    case "team-wall":
      return <TeamWallPage page={page} logoWhite={logoWhite} />;
    default:
      return <SummaryPage page={page} logoWhite={logoWhite} />;
  }
}

export function MultiProposalLayout({
  content,
  brand,
  mode,
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
  const accent = brand?.tokens?.accent || brand?.tokens?.primary || BLUE;
  const pages = content.pages ?? [];
  const shown = typeof pageIndex === "number" ? pages.slice(pageIndex, pageIndex + 1) : pages;
  const logoWhite = PROPOSAL_ART.logoWhite;
  const logoDark = PROPOSAL_ART.lockupDark;

  return (
    <SlideModeContext.Provider value={mode}>
      <SlideAccentContext.Provider value={accent}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", ...style }}>
          {shown.map((page, i) => (
            <div
              key={page.id || `${page.kind}-${i}`}
              data-print-page
              data-proposal-page={page.kind}
              className="relative w-full overflow-hidden [container-type:inline-size]"
              style={{
                aspectRatio: `${PAGE_W_IN} / ${PAGE_H_IN}`,
                background: "#FFFFFF",
                color: NAVY,
                fontFamily: FONT,
              }}
            >
              <PageBody page={page} logoWhite={logoWhite} logoDark={logoDark} />
            </div>
          ))}
        </div>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}
