// Renders a visual demonstration of a brand-guide "Colour and legibility"
// note: do-notes show the correct colour pairing, don't-notes show the
// failing treatment beside it. Pure CSS/text — no artwork files. Used by
// every brand guide's colour-and-legibility section.

import { extractHexes, extractRatio, type LegibilityDemo } from "@/lib/legibility-demos";

export interface LegibilityNoteVisualProps {
  demo: LegibilityDemo;
  /** The note text — hex codes and ratios are parsed from it. */
  note: string;
  /** Guide ink colour (default Blue 800). */
  ink?: string;
  /** Guide primary blue (default Blue 500). */
  blue?: string;
  alt: string;
}

function Panel({
  ground,
  children,
  label,
  good,
}: {
  ground?: string;
  children: React.ReactNode;
  label?: string;
  good?: boolean;
}) {
  return (
    <div
      className="relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden p-3"
      style={{ background: ground }}
    >
      {children}
      {label && (
        <span
          className={`absolute bottom-1 right-1.5 rounded px-1 py-px text-[8px] font-semibold uppercase tracking-wider ${
            good === false ? "bg-red-600/85 text-white" : "bg-black/55 text-white"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

const AA = "text-xl font-semibold leading-none";

export function LegibilityNoteVisual({
  demo,
  note,
  ink = "#03002C",
  blue = "#003FC7",
  alt,
}: LegibilityNoteVisualProps) {
  const hexes = extractHexes(note);
  const accent = hexes[0] ?? "#A1FBF9";
  const ratio = extractRatio(note);
  let body: React.ReactNode;

  switch (demo) {
    case "text-on-ground":
      body = (
        <>
          <Panel ground="#ffffff" label="Light ✓">
            <span className={AA} style={{ color: ink }}>
              Aa
            </span>
          </Panel>
          <Panel ground={blue} label="Blue ✓">
            <span className={AA} style={{ color: "#ffffff" }}>
              Aa
            </span>
          </Panel>
        </>
      );
      break;
    case "accent-fill-not-text":
      body = (
        <>
          <Panel ground="#ffffff" label="As text ✗" good={false}>
            <span className={AA} style={{ color: accent }}>
              Aa
            </span>
          </Panel>
          <Panel ground="#ffffff" label="As fill ✓">
            <span
              className="rounded px-3 py-1.5 text-xs font-semibold"
              style={{ background: accent, color: ink }}
            >
              Label
            </span>
          </Panel>
        </>
      );
      break;
    case "white-on-blue-aa":
      body = (
        <>
          <Panel ground={blue} label="AA ✓">
            <span className={AA} style={{ color: "#ffffff" }}>
              Aa
            </span>
          </Panel>
          <Panel ground={ink} label="AAA ✓">
            <span className={AA} style={{ color: "#ffffff" }}>
              Aa
            </span>
          </Panel>
        </>
      );
      break;
    case "min-grey":
      body = (
        <>
          <Panel ground="#ffffff" label="#666 ✓">
            <span className={AA} style={{ color: "#666666" }}>
              Aa
            </span>
          </Panel>
          <Panel ground="#ffffff" label="Lighter ✗" good={false}>
            <span className={AA} style={{ color: "#9A9A9A" }}>
              Aa
            </span>
          </Panel>
        </>
      );
      break;
    case "not-colour-only":
      body = (
        <>
          <Panel ground="#ffffff" label="Colour + word ✓">
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: ink }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#3EB236" }} />
              Complete
            </span>
          </Panel>
          <Panel ground="#ffffff" label="Colour only ✗" good={false}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#3EB236" }} />
          </Panel>
        </>
      );
      break;
    case "contrast-ratio":
      body = (
        <>
          <Panel ground="#ffffff" label={`${ratio ?? "3:1"} ✓`}>
            <span className={AA} style={{ color: ink }}>
              Aa
            </span>
          </Panel>
          <Panel ground="#E0E8F5" label="Below ✗" good={false}>
            <span className={AA} style={{ color: "#9AA7BD" }}>
              Aa
            </span>
          </Panel>
        </>
      );
      break;
    case "print-100k":
      body = (
        <>
          <Panel ground="#ffffff" label="100K ✓">
            <span className={AA} style={{ color: "#000000" }}>
              Aa
            </span>
          </Panel>
          <Panel ground="#ffffff" label="4-colour ✗" good={false}>
            <span
              className={AA}
              style={{
                background: "linear-gradient(90deg,#00AEEF,#EC008C,#FFF200)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Aa
            </span>
          </Panel>
        </>
      );
      break;
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className="flex h-24 overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
    >
      {body}
    </div>
  );
}
