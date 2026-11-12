import type React from "react";
// Badge style comps that follow the user's live Canva badge layout (DAHauhoJEx8):
// front = shield, ACC + Sun Belt marks, date/venue line, photo area, name, site;
// back = venue header, shield, date, big attendee word over campaign ground, QR box.
// Grounds are the existing campaign sequence grounds; logos are placed unchanged.
import QRCode from "qrcode";
import logoColor from "@/assets/san-juan-bowl/sjb-logo-color.png.asset.json";
import logoDark from "@/assets/san-juan-bowl/sjb-logo-dark.png.asset.json";
import { SJB_EVENT } from "@/lib/san-juan-bowl";
import { SJB_CALENDAR_MARKS } from "@/lib/sjb-calendar-style";
import { sjbSequenceGround } from "@/lib/sjb-sequence-backgrounds";
import { SJB_BADGE_SIZE, SJB_INK, SJB_SITE, SJB_SITE_URL, type SjbAttendeeType } from "@/lib/sjb-merch-comps";
import type { SjbCalendarMode } from "@/lib/sjb-social-calendar";

const W = SJB_BADGE_SIZE.trimW * 100;
const H = SJB_BADGE_SIZE.trimH * 100;
const FONT = "Geist, sans-serif";

export type SjbBadgeStyle = { id: string; name: string; idea: string; mode: SjbCalendarMode; dark: boolean };
export const SJB_BADGE_STYLES: SjbBadgeStyle[] = [
  { id: "light", name: "Style 1 · Light Action", idea: "Matches the live Canva file: white sky, rising football and palms behind the attendee word.", mode: "light", dark: false },
  { id: "night", name: "Style 2 · Night Game", idea: "Navy stadium-night ground with the white-outline shield.", mode: "dark", dark: true },
  { id: "set2", name: "Style 3 · Set 2 campaign", idea: "Uses the Set 2 social campaign ground so badges match those posts.", mode: "set2", dark: true },
  { id: "set3", name: "Style 4 · Set 3 campaign", idea: "Set 3 ground with white ACC mark, same layout.", mode: "set3", dark: true },
  { id: "set4", name: "Style 5 · Set 4 campaign", idea: "Set 4 ground for a bolder, high-energy look.", mode: "set4", dark: true },
];

function Qr({ x, y, size }: { x: number; y: number; size: number }) {
  const q = QRCode.create(SJB_SITE_URL, { errorCorrectionLevel: "M" });
  const n = q.modules.size, m = size / (n + 4);
  const r: React.ReactElement[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (q.modules.get(i, j)) r.push(<rect key={`${i}-${j}`} x={x + (j + 2) * m} y={y + (i + 2) * m} width={m + 0.2} height={m + 0.2} fill={SJB_INK.navy} />);
  return <g><rect x={x - 8} y={y - 8} width={size + 16} height={size + 16} rx={14} fill="#fff" />{r}</g>;
}

function Slots() {
  const s = SJB_BADGE_SIZE.slot;
  return <>{[s.fromSide, SJB_BADGE_SIZE.trimW - s.fromSide - s.w].map((sx) => <rect key={sx} x={sx * 100} y={s.fromTop * 100} width={s.w * 100} height={s.h * 100} rx={s.radius * 100} fill="#fff" stroke="#999" strokeWidth={1} />)}</>;
}

export function SjbStyledBadge({ style, type, side }: { style: SjbBadgeStyle; type: SjbAttendeeType; side: "front" | "back" }) {
  const ink = style.dark ? SJB_INK.white : SJB_INK.navy;
  const logo = style.dark ? logoDark.url : logoColor.url;
  const acc = style.dark ? SJB_CALENDAR_MARKS.accWhite : SJB_CALENDAR_MARKS.accColor;
  const ground = sjbSequenceGround(style.mode, side === "front" ? "headline" : "tickets", 1920);
  const wordFill = type.band === "white" || (type.band === "navy" && style.dark) ? ink : SJB_INK[type.band];
  const wordStroke = style.dark ? SJB_INK.navy : SJB_INK.white;
  const scrim = style.dark ? SJB_INK.navy : SJB_INK.white;
  const id = `${style.id}-${type.id}-${side}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${style.name}, ${type.label} badge, ${side}`} className="h-auto w-full rounded-md border border-border shadow-sm">
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={scrim} stopOpacity={0.85} /><stop offset="0.45" stopColor={scrim} stopOpacity={0.35} /><stop offset="1" stopColor={scrim} stopOpacity={0.85} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={scrim} />
      <image href={ground} width={W} height={H} preserveAspectRatio="xMidYMid slice" />
      <rect width={W} height={H} fill={`url(#g-${id})`} />
      {side === "front" ? (
        <>
          <image href={logo} x={W / 2 - 80} y={58} width={160} height={160} preserveAspectRatio="xMidYMid meet" />
          <image href={acc} x={W / 2 - 120} y={226} width={90} height={40} preserveAspectRatio="xMidYMid meet" />
          <image href={SJB_CALENDAR_MARKS.sunBelt} x={W / 2 + 30} y={226} width={90} height={40} preserveAspectRatio="xMidYMid meet" />
          <text x={W / 2} y={292} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={11.5} letterSpacing={1.2} fill={ink}>{`DEC. 16, 2026 • ${SJB_EVENT.venue.toUpperCase()} • SAN JUAN`}</text>
          <rect x={W / 2 - 80} y={312} width={160} height={180} rx={10} fill={style.dark ? "#ffffff22" : "#03002C10"} stroke={ink} strokeWidth={1.5} strokeDasharray="6 4" />
          <text x={W / 2} y={408} textAnchor="middle" fontFamily={FONT} fontSize={12} fill={ink} opacity={0.7}>PHOTO</text>
          <text x={W / 2} y={530} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={30} fill={ink}>First Last</text>
          <text x={W / 2} y={556} textAnchor="middle" fontFamily={FONT} fontSize={16} fill={ink} opacity={0.85}>Organization</text>
          <text x={W / 2} y={H - 24} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={14} letterSpacing={2} fill={ink}>{SJB_SITE}</text>
        </>
      ) : (
        <>
          <text x={W / 2} y={80} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={20} letterSpacing={2} fill={ink}>{SJB_EVENT.venue.toUpperCase()}</text>
          <text x={W / 2} y={104} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={14} letterSpacing={2} fill={ink}>{SJB_EVENT.city.toUpperCase()}</text>
          <image href={logo} x={W / 2 - 60} y={120} width={120} height={120} preserveAspectRatio="xMidYMid meet" />
          <text x={W / 2} y={268} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={18} letterSpacing={2} fill={ink}>{SJB_EVENT.datesLabel.toUpperCase()}</text>
          <text x={W / 2} y={360} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontStyle="italic" fontSize={type.label.length > 4 ? 76 : 96} letterSpacing={3} fill={wordFill} stroke={wordStroke} strokeWidth={2} paintOrder="stroke">{type.label}</text>
          <Qr x={W / 2 - 70} y={440} size={140} />
          <text x={W / 2} y={H - 24} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={14} letterSpacing={2} fill={ink}>{SJB_SITE}</text>
        </>
      )}
      <Slots />
    </svg>
  );
}
