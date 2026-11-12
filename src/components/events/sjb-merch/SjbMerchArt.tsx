// Drawn COMP artwork for Bowl badges and T-shirts. Logos are the supplied
// files placed unchanged (white-outline master on dark grounds).
import QRCode from "qrcode";
import logoColor from "@/assets/san-juan-bowl/sjb-logo-color.png.asset.json";
import logoDark from "@/assets/san-juan-bowl/sjb-logo-dark.png.asset.json";
import letterWhite from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering-white.png.asset.json";
import letterNavy from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering-Navy.png.asset.json";
import { SJB_EVENT } from "@/lib/san-juan-bowl";
import { SJB_INK, SJB_SITE, SJB_SITE_URL, SJB_BADGE_SIZE, type SjbAttendeeType, type SjbBadgeComp, type SjbShirtComp } from "@/lib/sjb-merch-comps";

const W = SJB_BADGE_SIZE.trimW * 100;
const H = SJB_BADGE_SIZE.trimH * 100;
const FONT = "Geist, sans-serif";
const isDark = (k: keyof typeof SJB_INK) => k === "navy" || k === "sky";

function Qr({ x, y, size, fg, bg }: { x: number; y: number; size: number; fg: string; bg: string }) {
  const q = QRCode.create(SJB_SITE_URL, { errorCorrectionLevel: "M" });
  const n = q.modules.size;
  const m = size / (n + 4);
  const rects = [];
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.modules.get(r, col)) rects.push(<rect key={`${r}-${col}`} x={x + (col + 2) * m} y={y + (r + 2) * m} width={m + 0.2} height={m + 0.2} fill={fg} />);
  return <g><rect x={x} y={y} width={size} height={size} fill={bg} rx={6} />{rects}</g>;
}

function Slots() {
  const s = SJB_BADGE_SIZE.slot;
  return <>{[s.fromSide, SJB_BADGE_SIZE.trimW - s.fromSide - s.w].map((sx) => <rect key={sx} x={sx * 100} y={s.fromTop * 100} width={s.w * 100} height={s.h * 100} rx={s.radius * 100} fill="#fff" stroke="#999" strokeWidth={1} strokeDasharray="3 2" />)}</>;
}

export function SjbBadgeFace({ comp, type, side }: { comp: SjbBadgeComp; type: SjbAttendeeType; side: "front" | "back" }) {
  const band = SJB_INK[type.band];
  const bandInk = SJB_INK[type.ink];
  const navy = SJB_INK.navy, white = SJB_INK.white;
  const ground = comp.id === "b" ? white : navy;
  const groundInk = comp.id === "b" ? navy : white;
  const logo = comp.id === "b" ? logoColor.url : logoDark.url;
  const label = `${comp.name}, ${type.label} badge, ${side}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full rounded-md border border-border shadow-sm">
      <rect width={W} height={H} fill={ground} />
      {comp.id === "c" && side === "front" && <><rect y={H * 0.5} width={W} height={H * 0.5} fill={white} /><polygon points={`0,${H * 0.47} ${W},${H * 0.4} ${W},${H * 0.52} 0,${H * 0.59}`} fill={band} /></>}
      {comp.id === "b" && side === "front" && <rect y={H * 0.68} width={W} height={H * 0.32} fill={band} />}
      {side === "front" ? (
        <>
          <image href={comp.id === "c" ? logoDark.url : logo} x={comp.id === "c" ? W * 0.25 : W * 0.2} y={comp.id === "c" ? 50 : 58} width={comp.id === "c" ? W * 0.5 : W * 0.6} height={comp.id === "c" ? W * 0.5 : W * 0.6} preserveAspectRatio="xMidYMid meet" />
          {comp.id === "a" && <rect y={H * 0.74} width={W} height={H * 0.14} fill={band} stroke={type.band === "navy" ? white : "none"} strokeWidth={2} />}
          {(() => {
            const nameInk = comp.id === "a" ? white : navy;
            const ny = comp.id === "c" ? H * 0.72 : comp.id === "b" ? H * 0.56 : H * 0.62;
            return <>
              <text x={W / 2} y={ny} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={34} fill={nameInk}>First Last</text>
              <text x={W / 2} y={ny + 30} textAnchor="middle" fontFamily={FONT} fontSize={18} fill={nameInk} opacity={0.8}>Organization</text>
            </>;
          })()}
          {(() => {
            const ty = comp.id === "a" ? H * 0.83 : comp.id === "b" ? H * 0.86 : H * 0.53;
            const ink = comp.id === "c" ? (isDark(type.band) ? white : navy) : bandInk;
            return <text x={W / 2} y={ty} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={comp.id === "c" ? 30 : 48} letterSpacing={4} fill={ink} transform={comp.id === "c" ? `rotate(-1.8 ${W / 2} ${ty})` : undefined}>{type.label}</text>;
          })()}
          <text x={W / 2} y={H - 26} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={14} letterSpacing={2} fill={comp.id === "a" ? white : navy}>{SJB_SITE}</text>
        </>
      ) : (
        <>
          <text x={W / 2} y={120} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} fill={groundInk}>{SJB_EVENT.name}</text>
          <text x={W / 2} y={152} textAnchor="middle" fontFamily={FONT} fontSize={16} fill={groundInk}>{SJB_EVENT.datesLabel} · {SJB_EVENT.venue}</text>
          <Qr x={W / 2 - 100} y={180} size={200} fg={navy} bg={white} />
          <text x={W / 2} y={410} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} letterSpacing={2} fill={groundInk}>{SJB_SITE}</text>
          <text x={W / 2} y={438} textAnchor="middle" fontFamily={FONT} fontSize={14} fill={groundInk} opacity={0.8}>Scan for schedule, tickets and info</text>
          <rect y={H - 70} width={W} height={70} fill={band} />
          <text x={W / 2} y={H - 26} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} letterSpacing={4} fill={bandInk}>{type.label}</text>
        </>
      )}
      <Slots />
    </svg>
  );
}

// ---------------- T-shirts ----------------
const SHIRT = "M120 40 L180 20 Q200 50 240 50 Q280 50 300 20 L360 40 L440 110 L395 165 L360 140 L360 470 L120 470 L120 140 L85 165 L40 110 Z";

export function SjbShirt({ comp, side }: { comp: SjbShirtComp; side: "front" | "back" }) {
  const ground = SJB_INK[comp.shirt];
  const dark = comp.shirt === "navy";
  const ink = dark ? SJB_INK.white : SJB_INK.navy;
  const accent = comp.shirt === "gold" ? SJB_INK.navy : SJB_INK.gold;
  const logo = dark || comp.shirt === "sky" ? logoDark.url : logoColor.url;
  const letters = dark || comp.shirt === "sky" ? letterWhite.url : letterNavy.url;
  const print = side === "front" ? comp.front : comp.back;
  const art = (() => {
    switch (print) {
      case "chest-shield": return <image href={logo} x={275} y={95} width={60} height={60} />;
      case "big-shield": return <image href={logo} x={160} y={110} width={160} height={160} />;
      case "lettering": return <image href={letters} x={150} y={120} width={180} height={110} preserveAspectRatio="xMidYMid meet" />;
      case "matchup": return <>
        <image href={logo} x={190} y={90} width={100} height={100} />
        <text x={240} y={230} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={26} fill={ink}>ACC</text>
        <text x={240} y={256} textAnchor="middle" fontFamily={FONT} fontStyle="italic" fontSize={16} fill={accent}>vs.</text>
        <text x={240} y={284} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={26} fill={ink}>SUN BELT</text>
      </>;
      case "type-word": return <>
        <image href={logo} x={275} y={95} width={50} height={50} />
        <text x={240} y={210} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={44} letterSpacing={4} fill={ink}>{comp.word}</text>
      </>;
      case "crew": return <>
        <text x={240} y={150} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={comp.word && comp.word.length > 6 ? 30 : 58} letterSpacing={4} fill={ink}>{comp.word}</text>
        <text x={240} y={185} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={16} letterSpacing={2} fill={ink}>{SJB_EVENT.shortName.toUpperCase()}</text>
        <text x={240} y={420} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={13} letterSpacing={2} fill={ink}>{SJB_SITE}</text>
      </>;
      case "date-stack": return <>
        <text x={240} y={140} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill={accent}>{SJB_EVENT.datesLabel.toUpperCase()}</text>
        <text x={240} y={172} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={18} fill={ink}>{SJB_EVENT.venue}</text>
        <text x={240} y={196} textAnchor="middle" fontFamily={FONT} fontSize={16} fill={ink}>{SJB_EVENT.city}</text>
        <text x={240} y={420} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={13} letterSpacing={2} fill={ink}>{SJB_SITE}</text>
      </>;
      case "site": return <text x={240} y={95} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={20} letterSpacing={3} fill={ink}>{SJB_SITE}</text>;
    }
  })();
  return (
    <svg viewBox="0 0 480 490" role="img" aria-label={`${comp.name}, ${side}`} className="h-auto w-full">
      <path d={SHIRT} fill={ground} stroke="#B8BCC8" strokeWidth={2} strokeLinejoin="round" />
      {side === "front" ? <path d="M180 20 Q200 60 240 60 Q280 60 300 20" fill="none" stroke="#B8BCC8" strokeWidth={2} /> : <path d="M180 20 Q240 34 300 20" fill="none" stroke="#B8BCC8" strokeWidth={2} />}
      {art}
    </svg>
  );
}
