// Renders a visual demonstration of a brand-guide logo rule: do-rules show
// the correct treatment, don't-rules show the violation applied to the
// guide's own logo artwork. Violations are CSS transforms/filters/grounds
// only — the artwork files are never altered. Used by every brand guide's
// governance / rules & misuse section.

import type { LogoRuleDemo } from "@/lib/logo-rule-demos";

export interface LogoRuleVisualProps {
  demo: LogoRuleDemo;
  /** Colour lockup for light grounds. */
  src: string;
  /** Reversed/white lockup for dark grounds (falls back to `src`). */
  whiteSrc?: string;
  /** Wordmark text, used by the typeface demo. */
  wordmark?: string;
  /** Dark ground hex for reversed panels. */
  darkGround?: string;
  /** Accent hex for clear-space zone marks. */
  accent?: string;
  alt: string;
}

const IMG = "max-h-full max-w-full object-contain";

function Panel({ ground, children, label }: { ground?: string; children: React.ReactNode; label?: string }) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden p-3" style={{ background: ground }}>
      {children}
      {label && (
        <span className="absolute bottom-1 right-1.5 rounded bg-black/55 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
          {label}
        </span>
      )}
    </div>
  );
}

export function LogoRuleVisual({
  demo,
  src,
  whiteSrc,
  wordmark,
  darkGround = "#03002C",
  accent = "#003FC7",
  alt,
}: LogoRuleVisualProps) {
  const white = whiteSrc ?? src;
  let body: React.ReactNode;

  switch (demo) {
    case "variant-by-background":
    case "approved-colors":
      body = (
        <>
          <Panel ground="#ffffff" label="Light">
            <img src={src} alt="" className={IMG} />
          </Panel>
          <Panel ground={darkGround} label="Dark">
            <img src={white} alt="" className={IMG} />
          </Panel>
        </>
      );
      break;
    case "clear-space":
      body = (
        <Panel ground="#ffffff">
          <div className="relative flex h-full w-full items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-1 rounded-sm border border-dashed"
              style={{ borderColor: accent }}
            />
            <span aria-hidden className="absolute left-1.5 top-0.5 text-[8px] font-semibold" style={{ color: accent }}>
              x
            </span>
            <span aria-hidden className="absolute bottom-0.5 right-1.5 text-[8px] font-semibold" style={{ color: accent }}>
              x
            </span>
            <img src={src} alt="" className="max-h-[70%] max-w-[70%] object-contain" />
          </div>
        </Panel>
      );
      break;
    case "min-size":
      body = (
        <Panel ground="#ffffff">
          <div className="flex flex-col items-center gap-1.5">
            <img src={src} alt="" className="w-16 object-contain" />
            <div aria-hidden className="flex items-center gap-1 text-[8px] font-semibold text-black/60">
              <span className="h-px w-16 bg-black/40" />
            </div>
            <span className="text-[8px] font-semibold uppercase tracking-wider text-black/60">minimum width</span>
          </div>
        </Panel>
      );
      break;
    case "vector-crisp":
      body = (
        <>
          <Panel ground="#ffffff" label="Vector ✓">
            <img src={src} alt="" className={IMG} />
          </Panel>
          <Panel ground="#ffffff" label="Screenshot ✗">
            <img src={src} alt="" className={IMG} style={{ filter: "blur(1.6px) contrast(0.85)", opacity: 0.85 }} />
          </Panel>
        </>
      );
      break;
    case "recolor":
      body = (
        <Panel ground="#ffffff">
          <img src={src} alt="" className={IMG} style={{ filter: "hue-rotate(140deg) saturate(1.6)" }} />
        </Panel>
      );
      break;
    case "respace":
      body = (
        <Panel ground="#ffffff">
          <img src={src} alt="" className={IMG} style={{ transform: "scaleX(1.45)" }} />
        </Panel>
      );
      break;
    case "distort":
      body = (
        <Panel ground="#ffffff">
          <img src={src} alt="" className={IMG} style={{ transform: "scale(1.35, 0.68) rotate(-6deg)" }} />
        </Panel>
      );
      break;
    case "effects":
      body = (
        <Panel ground="#ffffff">
          <img
            src={src}
            alt=""
            className={IMG}
            style={{ filter: "drop-shadow(5px 5px 3px rgba(0,0,0,.55)) drop-shadow(0 0 6px rgba(0,63,199,.8))" }}
          />
        </Panel>
      );
      break;
    case "flip":
      body = (
        <Panel ground="#ffffff">
          <img src={src} alt="" className={IMG} style={{ transform: "scaleX(-1)" }} />
        </Panel>
      );
      break;
    case "typeface":
      body = (
        <Panel ground="#ffffff">
          <span
            className="text-center text-lg italic leading-tight"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: darkGround }}
          >
            {wordmark ?? "Wordmark"}
          </span>
        </Panel>
      );
      break;
    case "low-contrast":
      body = (
        <Panel ground={darkGround}>
          <img src={src} alt="" className={IMG} style={{ opacity: 0.9 }} />
        </Panel>
      );
      break;
    case "mix-lockups":
      body = (
        <Panel ground="#ffffff">
          <div className="flex items-center justify-center">
            <img src={src} alt="" className="max-h-full w-3/5 object-contain" />
            <img src={src} alt="" className="-ml-6 max-h-full w-3/5 object-contain" style={{ filter: "hue-rotate(90deg)" }} />
          </div>
        </Panel>
      );
      break;
    case "busy-bg":
      body = (
        <Panel
          ground={`repeating-linear-gradient(45deg, ${accent} 0 9px, ${darkGround} 9px 18px, #ffffff 18px 27px)`}
        >
          <img src={src} alt="" className={IMG} />
        </Panel>
      );
      break;
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className="flex h-28 overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
    >
      {body}
    </div>
  );
}
