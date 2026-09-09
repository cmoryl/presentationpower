// Live NEXT division agenda sheet. Every element is positioned from the shared
// mm block metrics in `next-agenda.ts`, so the layered press PDF places the same
// artwork at the same coordinates — the preview is the proof.

import {
  agendaBlocks,
  agendaDivision,
  agendaGeometry,
  agendaInk,
  agendaQrBackground,
  agendaQrForeground,
  agendaQrStyle,
  agendaQrTransparent,
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
  /** Supplied by the editor: drag the QR block to a new spot on the sheet. */
  onPlaceQr?: (x: number, y: number) => void;
};

export function AgendaSheet({
  config,
  pxPerMm = 0.8,
  guides = false,
  className,
  style,
  onPlaceQr,
}: Props) {
  const mm = (v: number) => v * pxPerMm;
  const geo = agendaGeometry(config);
  const blocks = agendaBlocks(config);
  const L = blocks.layout;
  const face = config.face ?? "dark";
  const ink = agendaInk(face);
  const titleInk = agendaTitleInk(config);
  const division = agendaDivision(config.divisionId);
  const stops = agendaStops(config.styleId, face, config.divisionId);
  const isHalo = config.styleId.includes("halo");
  const ramp = isHalo ? [...stops].reverse() : stops;
  const qr = buildPillarQr(config.qrData ?? "");
  const qrStyle = agendaQrStyle(config);
  const qrInk = agendaQrForeground(config);
  const qrClear = agendaQrTransparent(config);
  const qrPlate = agendaQrBackground(config);

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
  const at = (x: number, y: number) => ({
    position: "absolute" as const,
    left: tx + mm(x),
    top: ty + mm(y),
  });
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
          src={
            face === "light"
              ? division.colorUrl || division.whiteUrl
              : division.whiteUrl || division.colorUrl
          }
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
              <div
                style={{
                  fontSize: mm(L.detailSize),
                  opacity: 0.78,
                  marginTop: mm(L.detailSize * 0.35),
                }}
              >
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
        <div
          style={{
            ...at(blocks.qr.x, blocks.qr.y),
            cursor: onPlaceQr ? "grab" : undefined,
            touchAction: onPlaceQr ? "none" : undefined,
          }}
          data-export-ignore={undefined}
          onPointerDown={
            onPlaceQr
              ? (event) => {
                  event.preventDefault();
                  const startX = event.clientX;
                  const startY = event.clientY;
                  const fromX = blocks.qr!.x;
                  const fromY = blocks.qr!.y;
                  const move = (e: PointerEvent) => {
                    onPlaceQr(
                      fromX + (e.clientX - startX) / pxPerMm,
                      fromY + (e.clientY - startY) / pxPerMm,
                    );
                  };
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }
              : undefined
          }
        >
          <svg
            width={mm(blocks.qr.edge)}
            height={mm(blocks.qr.edge)}
            viewBox={`0 0 ${qr.size} ${qr.size}`}
            shapeRendering={qrStyle === "block" ? "crispEdges" : undefined}
            aria-hidden
          >
            {qrClear ? null : (
              <rect x={0} y={0} width={qr.size} height={qr.size} fill={qrPlate} />
            )}
            {qrStyle === "block" ? (
              <path d={qr.path} fill={qrInk} />
            ) : (
              qr.modules.map((on, i) =>
                on ? (
                  qrStyle === "dot" ? (
                    <circle
                      key={i}
                      cx={(i % qr.size) + 0.5}
                      cy={Math.floor(i / qr.size) + 0.5}
                      r={0.5}
                      fill={qrInk}
                    />
                  ) : (
                    <rect
                      key={i}
                      x={(i % qr.size) + 0.06}
                      y={Math.floor(i / qr.size) + 0.06}
                      width={0.88}
                      height={0.88}
                      rx={0.26}
                      fill={qrInk}
                    />
                  )
                ) : null,
              )
            )}
          </svg>
          {config.qrCaption.trim() ? (
            <div
              style={{
                width: mm(blocks.qr.edge),
                textAlign: blocks.qr.capAlign,
                marginTop: mm(blocks.qr.capSize * 0.7),
                fontSize: mm(blocks.qr.capSize),
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

      {(config.pageLabel ?? "").trim() ? (
        <div
          style={{
            ...at(blocks.x, blocks.footY),
            width: mm(blocks.contentW),
            textAlign: "right",
            fontSize: mm(L.footSize),
            fontWeight: 700,
            letterSpacing: "0.16em",
            opacity: 0.72,
            textTransform: "uppercase",
          }}
        >
          {config.pageLabel}
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
