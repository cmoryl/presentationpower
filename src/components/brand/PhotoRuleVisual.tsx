// Renders a visual demonstration of a brand-guide photography rule. Do-rules
// show the correct treatment, don't-rules show the violation, applied to the
// guide's own approved photography via CSS overlays/filters only — the image
// files are never altered. Used by every brand guide's Imagery section.

import { Binary, Bot, Check, Globe, Handshake, TestTube, X } from "lucide-react";
import type { PhotoRuleDemo } from "@/lib/photo-rule-demos";

export interface PhotoRuleVisualProps {
  demo: PhotoRuleDemo;
  /** true = do-rule (✓ badge), false = don't-rule (✗ badge). */
  isDo: boolean;
  /** Approved photography from the guide's division imagery pool. */
  photoSrc?: string;
  /** White/reversed lockup, used by the logo-placement demo. */
  logoSrc?: string;
  /** Accent hex for washes and diagram lines. */
  accent?: string;
  /** Dark ground hex. */
  darkGround?: string;
}

const PHOTO = "absolute inset-0 h-full w-full object-cover";

function Badge({ isDo }: { isDo: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-white ${
        isDo ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {isDo ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
    </span>
  );
}

function Panel({
  children,
  ground,
  label,
}: {
  children?: React.ReactNode;
  ground?: string;
  label?: string;
}) {
  return (
    <div
      className="relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden"
      style={{ background: ground }}
    >
      {children}
      {label && (
        <span className="absolute bottom-1 left-1.5 rounded bg-black/55 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
          {label}
        </span>
      )}
    </div>
  );
}

function Photo({ src, className }: { src?: string; className?: string }) {
  if (!src) return null;
  return <img src={src} alt="" aria-hidden className={`${PHOTO} ${className ?? ""}`} />;
}

/** Small fake UI card used by product/crop demos. */
function UiCard({ accent, bad }: { accent: string; bad?: boolean }) {
  return (
    <div className="w-3/4 rounded-md bg-white/95 p-1.5 shadow">
      <div className="h-1 w-1/2 rounded-full" style={{ background: bad ? "#F97316" : accent }} />
      <div className="mt-1 space-y-0.5">
        <div className="h-0.5 w-full rounded-full bg-slate-300" />
        <div className="h-0.5 w-5/6 rounded-full bg-slate-300" />
        <div className="h-0.5 w-2/3 rounded-full bg-slate-300" />
      </div>
      <div className="mt-1 flex gap-0.5">
        <div className="h-2 flex-1 rounded-sm" style={{ background: bad ? "#F97316" : accent }} />
        <div className="h-2 flex-1 rounded-sm bg-slate-200" />
      </div>
    </div>
  );
}

export function PhotoRuleVisual({
  demo,
  isDo,
  photoSrc,
  logoSrc,
  accent = "#003FC7",
  darkGround = "#03002C",
}: PhotoRuleVisualProps) {
  let body: React.ReactNode;

  switch (demo) {
    case "real-people":
      body = (
        <Panel>
          <Photo src={photoSrc} />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 35% 45%, transparent 30%, rgba(3,0,44,0.45) 100%)" }}
          />
          <span className="absolute bottom-1 left-1.5 rounded bg-black/55 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
            Real people at work
          </span>
        </Panel>
      );
      break;
    case "soft-light-dof":
      body = (
        <>
          <Panel label="Sharp subject">
            <Photo src={photoSrc} />
          </Panel>
          <Panel label="Soft field">
            <Photo src={photoSrc} className="blur-[2px] scale-105" />
          </Panel>
        </>
      );
      break;
    case "open-space":
      body = (
        <Panel>
          <Photo src={photoSrc} />
          <div aria-hidden className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-white/95 to-transparent" />
          <div className="absolute left-2 top-1/2 w-2/5 -translate-y-1/2 space-y-1">
            <div className="h-1.5 w-full rounded-full" style={{ background: darkGround }} />
            <div className="h-1.5 w-4/5 rounded-full" style={{ background: darkGround }} />
            <div className="h-0.5 w-3/5 rounded-full bg-slate-400" />
          </div>
        </Panel>
      );
      break;
    case "gradient-wash":
      body = (
        <Panel>
          <Photo src={photoSrc} />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(100deg, ${accent}E6 0%, ${accent}66 45%, transparent 75%)` }}
          />
          <span className="absolute bottom-1 left-1.5 rounded bg-black/55 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
            Soft-transition wash
          </span>
        </Panel>
      );
      break;
    case "product-first":
      body = (
        <Panel ground="#F2F2F2">
          <Photo src={photoSrc} className="opacity-25" />
          <UiCard accent={accent} />
        </Panel>
      );
      break;
    case "humans-in-frame":
      body = (
        <Panel>
          <Photo src={photoSrc} />
          <div aria-hidden className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow" />
          <span className="absolute bottom-1 left-1.5 rounded bg-black/55 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
            Person in frame
          </span>
        </Panel>
      );
      break;
    case "clean-surfaces":
      body = (
        <Panel ground="#FFFFFF">
          <div className="w-4/5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm" style={{ background: accent }} />
              <div className="h-0.5 flex-1 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center gap-1.5 pl-3">
              <div className="h-3 w-3 rounded-sm bg-slate-200" />
              <div className="h-0.5 flex-1 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center gap-1.5 pl-6">
              <div className="h-3 w-3 rounded-sm bg-slate-200" />
              <div className="h-0.5 flex-1 rounded-full bg-slate-300" />
            </div>
          </div>
        </Panel>
      );
      break;
    case "legible-crop":
      body = (
        <Panel ground={darkGround}>
          <div className="rounded-md bg-white/10 px-3 py-1.5 text-center">
            <div className="text-lg font-bold leading-none text-white">98.2%</div>
            <div className="mt-0.5 h-0.5 w-14 rounded-full bg-white/50" />
          </div>
        </Panel>
      );
      break;
    case "consent-privacy":
      body = (
        <Panel>
          <Photo src={photoSrc} />
          <div aria-hidden className="absolute left-1/2 top-1/3 h-8 w-8 -translate-x-1/2 rounded-full bg-white/40 blur-[3px]" />
          <span className="absolute bottom-1 left-1.5 rounded bg-black/55 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
            Identity protected
          </span>
        </Panel>
      );
      break;
    case "stock-cliche":
      body = (
        <Panel ground="#F2F2F2">
          <div className="flex items-center gap-3 text-slate-400">
            <Handshake className="h-6 w-6" />
            <Globe className="h-6 w-6" />
            <Binary className="h-6 w-6" />
          </div>
          <span className="absolute bottom-1 left-1.5 rounded bg-black/55 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
            Stock clichés
          </span>
        </Panel>
      );
      break;
    case "no-recolor-skin":
      body = (
        <>
          <Panel label="Natural">
            <Photo src={photoSrc} />
          </Panel>
          <Panel label="Recoloured">
            <Photo src={photoSrc} className="saturate-[2.5] hue-rotate-[40deg]" />
          </Panel>
        </>
      );
      break;
    case "scrim":
      body = (
        <>
          <Panel label="No scrim">
            <Photo src={photoSrc} />
            <div className="absolute left-2 top-1/2 w-2/5 -translate-y-1/2 space-y-1">
              <div className="h-1 w-full rounded-full bg-white" />
              <div className="h-1 w-4/5 rounded-full bg-white" />
            </div>
          </Panel>
          <Panel label="With scrim">
            <Photo src={photoSrc} />
            <div aria-hidden className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-black/75 to-transparent" />
            <div className="absolute left-2 top-1/2 w-2/5 -translate-y-1/2 space-y-1">
              <div className="h-1 w-full rounded-full bg-white" />
              <div className="h-1 w-4/5 rounded-full bg-white" />
            </div>
          </Panel>
        </>
      );
      break;
    case "logo-placement":
      body = (
        <>
          <Panel label="Busy area">
            <Photo src={photoSrc} />
            {logoSrc && <img src={logoSrc} alt="" aria-hidden className="relative z-10 max-h-5 max-w-[60%] object-contain opacity-90" />}
          </Panel>
          <Panel ground={darkGround} label="Calm area">
            {logoSrc && <img src={logoSrc} alt="" aria-hidden className="max-h-5 max-w-[60%] object-contain" />}
          </Panel>
        </>
      );
      break;
    case "no-ai-stock":
      body = (
        <Panel ground={darkGround}>
          <div className="relative flex items-center gap-3">
            <Bot className="h-7 w-7" style={{ color: accent }} />
            <div aria-hidden className="absolute -inset-2 rounded-full blur-md" style={{ background: `${accent}55` }} />
          </div>
          <span className="absolute bottom-1 left-1.5 rounded bg-black/55 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
            Synthetic AI stock
          </span>
        </Panel>
      );
      break;
    case "off-brand-ui":
      body = (
        <>
          <Panel ground="#F2F2F2" label="Off-brand">
            <UiCard accent={accent} bad />
          </Panel>
          <Panel ground="#F2F2F2" label="On palette">
            <UiCard accent={accent} />
          </Panel>
        </>
      );
      break;
    case "illegible-crop":
      body = (
        <>
          <Panel label="Over-cropped">
            <Photo src={photoSrc} className="scale-[2.5] blur-[1px]" />
          </Panel>
          <Panel ground="#F2F2F2" label="Readable">
            <UiCard accent={accent} />
          </Panel>
        </>
      );
      break;
    case "no-sterile-stock":
      body = (
        <Panel ground="#F2F2F2">
          <TestTube className="h-7 w-7 text-slate-400" />
          <span className="absolute bottom-1 left-1.5 rounded bg-black/55 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
            Sterile stock
          </span>
        </Panel>
      );
      break;
    case "no-false-claim":
      body = (
        <Panel ground="#FFFFFF">
          <div className="relative rounded-md border border-slate-200 px-3 py-1.5 text-center">
            <div className="text-sm font-bold text-slate-700">+240% cured</div>
            <div aria-hidden className="absolute inset-0 flex items-center justify-center">
              <div className="h-0.5 w-full rotate-[-8deg] bg-red-500" />
            </div>
          </div>
        </Panel>
      );
      break;
    case "color-not-approval":
      body = (
        <Panel ground="#FFFFFF">
          <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-[10px] font-bold text-emerald-950">
            APPROVED
          </span>
        </Panel>
      );
      break;
    case "no-invented-chart":
      body = (
        <Panel ground="#FFFFFF">
          <div className="flex h-12 items-end gap-1.5">
            <div className="w-4 rounded-t-sm" style={{ height: "40%", background: accent }} />
            <div className="w-4 rounded-t-sm" style={{ height: "65%", background: accent }} />
            <div aria-hidden className="w-4 rounded-t-sm border border-dashed border-red-500 bg-red-100" style={{ height: "95%" }} />
          </div>
          <span className="absolute bottom-1 left-1.5 rounded bg-black/55 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
            Invented bar
          </span>
        </Panel>
      );
      break;
    case "generic-photo":
    default:
      body = (
        <Panel>
          <Photo src={photoSrc} />
        </Panel>
      );
  }

  return (
    <div className="relative flex h-24 overflow-hidden rounded-lg border border-border bg-muted">
      {body}
      <Badge isDo={isDo} />
    </div>
  );
}
