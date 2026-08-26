// Live NEXT division agenda sheet. Every element is positioned from the shared
// mm block metrics in `next-agenda.ts`, so the layered press PDF places the same
// artwork at the same coordinates — the preview is the proof.

import {
  agendaBlocks,
  agendaDivision,
  agendaGeometry,
  agendaInk,
  agendaStops,
  agendaTitleInk,
  type AgendaConfig,
} from "@/lib/next-agenda";
import { buildPillarQr } from "@/lib/pillar-qr";

type Props = {
  config: AgendaConfig;
  /** Preview pixels per mm on the bleed sheet. */
  pxPerMm?: number;
  guides?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function AgendaSheet({ config, pxPerMm = 0.8, guides = false, className, style }: Props) {
  const mm = (v: number) => v * pxPerMm;
  const geo = agendaGeometry(config);
  const blocks = agendaBlocks(config);
  const L = blocks.layout;
  const face = config.face ?? "dark";
  const ink = agendaInk(face);
  const titleInk = agendaTitleInk(config);
  const division = agendaDivision(config.divisionId);
  const stops = agendaStops(config.styleId, face);
  const isHalo = config.styleId.includes("halo");
  const ramp = isHalo ? [...stops].reverse() : stops;
  const qr = buildPillarQr(config.qrData ?? "");

  const axis = config.styleId.includes("diagonal")
    ? "135deg"
    : config.styleId.includes("prism")
      ? "45deg"
      : config.styleId.includes("bloom")
        ? "125deg"
        : "180deg";

  const ground = isHalo
    ? `radial-gradient(120% 90% at 50% 42%, ${ramp.join(", ")})`
    : `linear-gradient(${axis}, ${ramp.join(", ")})`;

  // Trim origin inside the bleed sheet.
  const tx = mm(geo.bleedEdge);
  const ty = mm(geo.bleedEdge);
  const at = (x: number, y: number) => ({ position: "absolute" as const, left: tx + mm(x), top: ty + mm(y) });
  const rule = face === "light" ? "rgba(3,0,44,0.22)" : "rgba(255,255,255,0.28)";

  return (
    <div
      className={className}
      data-kit-asset-frame="true"
      style={{
        position: "relative",
        width: mm(geo.bleedW),
        height: mm(geo.bleedH),
        background: ground,
        color: ink,
        fontFamily: "'Geist', system-ui, sans-serif",
        overflow: "hidden",
        ...style,
      }}
    >
      {blocks.lockup && (division.whiteUrl || division.colorUrl) ? (
        <img
          src={face === "light" ? division.colorUrl || division.whiteUrl : division.whiteUrl || division.colorUrl}
          alt={`${division.name} lockup`}
          style={{
            ...at(blocks.lockup.x, blocks.lockup.y),
            width: mm(blocks.lockup.w),
            height: mm(blocks.lockup.h),
            objectFit: "contain",
            objectPosition: "left top",
          }}
        />
      ) : null}

      {config.eyebrow.trim() ? (
        <div
          style={{
            ...at(blocks.x, blocks.eyebrowY),
            fontSize: mm(L.eyebrowSize),
            fontWeight: 700,
            letterSpacing: "0.22em",
            opacity: 0.82,
            textTransform: "uppercase",
          }}
        >
          {config.eyebrow}
        </div>
      ) : null}

      <div
        style={{
          ...at(blocks.x, blocks.titleY),
          width: mm(blocks.contentW),
          fontSize: mm(L.titleSize),
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: titleInk,
        }}
      >
        {config.title}
      </div>

      {config.meta.trim() ? (
        <div
          style={{
            ...at(blocks.x, blocks.metaY),
            width: mm(blocks.contentW),
            fontSize: mm(L.metaSize),
            fontWeight: 500,
            opacity: 0.86,
          }}
        >
          {config.meta}
        </div>
      ) : null}

      {blocks.rows.map((row, i) => (
        <div
          key={i}
          style={{
            ...at(blocks.x, row.y),
            width: mm(blocks.contentW),
            height: mm(row.h),
            borderTop: `${Math.max(0.6, mm(0.35))}px solid ${rule}`,
            display: "flex",
            alignItems: "flex-start",
            paddingTop: mm(row.h * 0.16),
            opacity: row.session.muted ? 0.7 : 1,
          }}
        >
          <div
            style={{
              width: mm(L.timeColW),
              flex: "0 0 auto",
              fontSize: mm(L.timeSize),
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: row.session.muted ? ink : titleInk,
            }}
          >
            {row.session.time}
          </div>
          <div style={{ flex: "1 1 auto", minWidth: 0, paddingRight: mm(4) }}>
            <div
              style={{
                fontSize: mm(L.titleRowSize),
                fontWeight: row.session.muted ? 500 : 700,
                lineHeight: 1.12,
                letterSpacing: "-0.01em",
              }}
            >
              {row.session.title}
            </div>
            {row.session.detail.trim() ? (
              <div style={{ fontSize: mm(L.detailSize), opacity: 0.78, marginTop: mm(L.detailSize * 0.35) }}>
                {row.session.detail}
              </div>
            ) : null}
          </div>
          {row.session.track.trim() ? (
            <div
              style={{
                width: mm(L.trackColW),
                flex: "0 0 auto",
                textAlign: "right",
                fontSize: mm(L.trackSize),
                fontWeight: 700,
                letterSpacing: "0.16em",
                opacity: 0.8,
                textTransform: "uppercase",
              }}
            >
              {row.session.track}
            </div>
          ) : null}
        </div>
      ))}

      {/* closing rule under the last session */}
      <div
        style={{
          ...at(blocks.x, blocks.rowsTop + blocks.rowH * blocks.rows.length),
          width: mm(blocks.contentW),
          borderTop: `${Math.max(0.6, mm(0.35))}px solid ${rule}`,
        }}
      />

      {qr && blocks.qr ? (
        <div style={{ ...at(blocks.qr.x, blocks.qr.y) }}>
          <svg width={mm(blocks.qr.edge)} height={mm(blocks.qr.edge)} viewBox={`0 0 ${qr.size} ${qr.size}`} aria-hidden>
            <rect x={0} y={0} width={qr.size} height={qr.size} fill="#FFFFFF" />
            <path d={qr.path} fill="#03002C" />
          </svg>
          {config.qrCaption.trim() ? (
            <div
              style={{
                width: mm(blocks.qr.edge),
                textAlign: "center",
                marginTop: mm(L.footSize * 0.7),
                fontSize: mm(L.footSize),
                fontWeight: 700,
                letterSpacing: "0.16em",
              }}
            >
              {config.qrCaption}
            </div>
          ) : null}
        </div>
      ) : null}

      {config.footnote.trim() ? (
        <div
          style={{
            ...at(blocks.x, blocks.footY),
            width: mm(blocks.contentW * 0.72),
            fontSize: mm(L.footSize),
            opacity: 0.74,
            lineHeight: 1.25,
          }}
        >
          {config.footnote}
        </div>
      ) : null}

      {guides ? (
        <>
          <div
            style={{
              position: "absolute",
              left: tx,
              top: ty,
              width: mm(geo.trimW),
              height: mm(geo.trimH),
              border: `1px dashed ${face === "light" ? "rgba(3,0,44,0.5)" : "rgba(255,255,255,0.55)"}`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              ...at(geo.safeInset, geo.safeInset),
              width: mm(geo.trimW - geo.safeInset * 2),
              height: mm(geo.trimH - geo.safeInset * 2),
              border: `1px dashed ${face === "light" ? "rgba(3,0,44,0.3)" : "rgba(255,255,255,0.3)"}`,
              pointerEvents: "none",
            }}
          />
        </>
      ) : null}
    </div>
  );
}
