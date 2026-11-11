// Demo multi-page sequences for the Bowl social calendar.
//
// Draws the four placeholder pages (cover, headline, details, tickets) for a
// post in a look at the format's true pixels, and hands them out as a PDF (the
// LinkedIn carousels) or a zip of pictures (Instagram carousel / Story
// sequence) through the shared asset exporter. Every page carries the DEMO
// badge, so a download can never be mistaken for approved artwork.
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/design-system/element";
import {
  assetFileSlug,
  captureAssetCanvas,
  downloadAssetBlob,
  exportAssetImage,
  exportAssetsPdf,
  exportAssetsZip,
  type AssetCaptureTarget,
} from "@/lib/asset-export";
import { SJB_DEMO_BADGE, SJB_DEMO_FACTS, SJB_DEMO_LOOKS, SJB_DEMO_NOTE, SJB_DEMO_SITE, sjbCalendarDemo, type SjbCalendarDemo, type SjbDemoPage, type SjbDemoLook } from "@/lib/sjb-calendar-demo";
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/700-italic.css';
import { SJB_CALENDAR_STYLE, SJB_CALENDAR_MARKS, sjbBroadcastMark } from '@/lib/sjb-calendar-style';
import { SJB_LOGOS } from "@/lib/san-juan-bowl";
import type { SjbCalendarMode, SjbCalendarPost } from "@/lib/sjb-social-calendar";
import type { SjbCalendarFormat, SjbCalendarFormatSpec } from "@/lib/sjb-calendar-formats";
import {
  renderSequenceVideo,
  sjbSequenceDuration,
  sjbSequenceMotion,
  transitionFrame,
  type SjbSequenceMotion,
} from "@/lib/sjb-sequence-motion";

const FONT = '"Geist Variable", system-ui, sans-serif';

/** Plain words for each handover, so the controls say what the clip will do. */
const SJB_STYLE_LABEL: Record<SjbSequenceMotion["style"], string> = {
  push: "pushes sideways",
  "fade-up": "fades upward",
  "slide-up": "rises into place",
};

/** One page at its native pixels; the caller scales it down for display. */
function DemoPageFrame({
  page,
  post,
  mode,
  width,
  height,
  frameRef,
}: {
  page: SjbDemoPage;
  post: SjbCalendarPost;
  mode: SjbCalendarMode;
  width: number;
  height: number;
  frameRef: (node: HTMLDivElement | null) => void;
}) {
  const look = SJB_DEMO_LOOKS[mode];
  const style = SJB_CALENDAR_STYLE[mode];
  const broadcaster = sjbBroadcastMark(post.headline, mode);
  const logo = SJB_LOGOS.find((l) => l.id === (look.dark ? "dark" : "color"));
  if (!logo) return null;
  // Every size below is a share of the short edge, so the same page reads the
  // same way at 1080×1080, 1080×1350 and 1080×1920.
  const s = Math.min(width, height);
  const px = (n: number) => `${(s * n) / 100}px`;
  const pad = px(7);

  return (
    <div
      ref={frameRef}
      data-kit-asset-frame
      data-bowl-look={mode}
      data-bowl-role={page.role}
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        backgroundColor: look.base,
        color: look.ink,
        fontFamily: FONT,
      }}
    >
      <img src={style.ground} alt="" data-bowl-ground style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {mode === 'set3' && <img src={SJB_CALENDAR_MARKS.player} alt="" style={{ position: 'absolute', right: '-2%', bottom: '4%', height: '78%', width: '48%', objectFit: 'contain', objectPosition: 'right bottom', opacity: page.role === 'cover' ? 1 : 0.3 }} />}
      {/* Scrim keeps every line of copy readable over the look's ground. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: page.role === 'cover' ? 'none' : look.dark
            ? "linear-gradient(180deg, rgba(3,6,28,0.45) 0%, rgba(3,6,28,0.72) 45%, rgba(3,6,28,0.86) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,0.9) 100%)",
        }}
      />

      {page.role === "cover" && page.photoUrl ? (
        <img src={page.photoUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: pad, boxSizing: "border-box" }}>
          {page.role === "cover" && (
            <CampaignCover post={post} mode={mode} width={width} height={height} logo={logo.svg} />
          )}

          {page.role === "headline" && (
            <>
              <div style={{ marginTop: px(9), fontSize: px(2.6), letterSpacing: "0.2em", opacity: 0.75 }}>{post.phase.toUpperCase()} · {SJB_DEMO_FACTS[0].value.toUpperCase()}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: px(2) }}>
                {broadcaster ? <>
                  <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: px(10.5), fontWeight: 700, lineHeight: 1.06 }}>{broadcaster.label}</div>
                  <img data-bowl-broadcaster src={broadcaster.url} alt={broadcaster.alt} style={{ width: '100%', height: 'auto', marginTop: px(4) }} />
                </> : <>
                  <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: px(10.5), fontWeight: 700, lineHeight: 1.06, letterSpacing: 0, fontStyle: style.italic ? 'italic' : 'normal', overflowWrap: 'anywhere' }}>{post.headline[0]}</div>
                  <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: px(10.5), fontWeight: 700, lineHeight: 1.06, letterSpacing: 0, color: look.accent, overflowWrap: 'anywhere' }}>{post.headline[1]}</div>
                </>}
                <div style={{ width: px(22), height: px(0.7), backgroundColor: look.accent, marginTop: px(4) }} />
              </div>
            </>
          )}

          {page.role === "details" && <DetailsPage look={look} px={px} wide={width / height >= 0.95} tall={height / width >= 1.6} />}

          {page.role === "tickets" && (
            <>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: px(3) }}>
                <div style={{ fontSize: px(4), letterSpacing: "0.16em", opacity: 0.8 }}>GET YOUR TICKETS</div>
                <div style={{ fontSize: px(8.5), fontWeight: 700, letterSpacing: "-0.01em", color: look.accent }}>{SJB_DEMO_SITE}</div>
                <div style={{ fontSize: px(2.8), opacity: 0.8 }}>{SJB_DEMO_FACTS[0].value} · {SJB_DEMO_FACTS[1].value}</div>
              </div>
              <img src={logo.svg} alt="" style={{ height: px(16), width: "auto", alignSelf: "center", marginBottom: px(6) }} />
            </>
          )}
        </div>
      )}

      {/* Demo badges ride along into every download. */}
      <div
        style={{
          position: "absolute",
          top: pad,
          left: pad,
          padding: `${px(0.9)} ${px(2)}`,
          borderRadius: px(0.6),
          backgroundColor: look.accent,
          color: look.badgeInk,
          fontSize: px(2.2),
          fontWeight: 700,
          letterSpacing: "0.14em",
          fontFamily: FONT,
        }}
      >
        {SJB_DEMO_BADGE}
      </div>
      {page.photoKind === "approved" && (
        <div
          style={{
            position: "absolute",
            top: pad,
            right: pad,
            padding: `${px(0.9)} ${px(2)}`,
            borderRadius: px(0.6),
            backgroundColor: "rgba(0, 0, 0, 0.62)",
            color: "#FFFFFF",
            fontSize: px(2.2),
            fontWeight: 600,
            letterSpacing: "0.1em",
            fontFamily: FONT,
          }}
        >
          APPROVED SINGLE IMAGE
        </div>
      )}
      {/* Drawn pages carry the site line; the approved-image cover is left untouched. */}
      {page.photoKind === "none" && page.role !== 'cover' && (
        <div
          style={{
            position: "absolute",
            bottom: pad,
            left: pad,
            fontSize: px(2.6),
            fontWeight: 600,
            letterSpacing: "0.14em",
            opacity: 0.9,
            fontFamily: FONT,
          }}
        >
          {SJB_DEMO_SITE}
        </div>
      )}
    </div>
  );
}

/** A composition reflow, never a different campaign or a stretched finished picture. */
function CampaignCover({ post, mode, width, height, logo }: { post: SjbCalendarPost; mode: SjbCalendarMode; width: number; height: number; logo: string }) {
  const look = SJB_DEMO_LOOKS[mode];
  const style = SJB_CALENDAR_STYLE[mode];
  const broadcaster = sjbBroadcastMark(post.headline, mode);
  const square = height === width;
  const tall = height / width > 1.6;
  const spotlight = mode === 'set3';
  const unit = width / 100;
  const markSize = width * (square ? 0.40 : 0.48);
  const markTop = height * 0.07;
  const groupBottom = markTop + markSize + width * 0.08;
  const copyTop = Math.max(groupBottom + width * 0.035, height * (square ? 0.57 : tall ? 0.48 : 0.55));
  const copyWidth = width * (spotlight ? 0.64 : 0.90);
  const maxChars = Math.max(...post.headline.map(h => h.length));
  const headlineSize = Math.min(width * (tall ? 0.105 : 0.105), copyWidth / (maxChars * 0.46));
  const markLeft = spotlight ? width * 0.07 : (width - markSize) / 2;
  return <div style={{ position: 'absolute', inset: 0, textAlign: spotlight ? 'left' : 'center', letterSpacing: 0 }}>
    <img data-bowl-logo src={logo} alt="San Juan Bowl" style={{ position: 'absolute', top: markTop, left: markLeft, width: markSize, height: markSize, objectFit: 'contain' }} />
    <div data-bowl-conferences style={{ position: 'absolute', top: markTop + markSize + unit * 2, left: spotlight ? width * 0.09 : width * 0.30, width: spotlight ? width * 0.42 : width * 0.40, height: unit * 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <img src={look.dark ? SJB_CALENDAR_MARKS.accWhite : SJB_CALENDAR_MARKS.accColor} alt="ACC" style={{ width: unit * 10, height: unit * 5.5, objectFit: 'contain' }} />
      <img src={SJB_CALENDAR_MARKS.sunBelt} alt="Sun Belt Conference" style={{ width: unit * 10, height: unit * 5.5, objectFit: 'contain' }} />
    </div>
    <div data-bowl-copy style={{ position: 'absolute', top: copyTop, left: width * (spotlight ? 0.07 : 0.05), width: copyWidth }}>
      <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: headlineSize, lineHeight: 1.05, color: mode === 'light' ? look.ink : spotlight ? look.ink : look.accent, fontStyle: style.italic ? 'italic' : 'normal' }}>
        {broadcaster ? <>
          <div>{broadcaster.label}</div>
          <img data-bowl-broadcaster src={broadcaster.url} alt={broadcaster.alt} style={{ width: '100%', height: 'auto', marginTop: unit * 4 }} />
        </> : post.headline.map((h, i) => <div key={i} style={{ overflowWrap: 'anywhere' }}>{h}</div>)}
      </div>
      <div data-bowl-footer style={{ marginTop: unit * 2.7, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: unit * (spotlight ? 2.6 : 2.8), lineHeight: 1.3, color: look.ink }}>
        <div>{SJB_DEMO_FACTS[0].value.toUpperCase()} · {SJB_DEMO_FACTS[1].value.toUpperCase()}</div>
        <div style={{ marginTop: unit }}>{SJB_DEMO_SITE}</div>
      </div>
    </div>
  </div>;
}

/** Native-size page shown at a display height, via a CSS scale. */
function ScaledPage(props: {
  page: SjbDemoPage;
  post: SjbCalendarPost;
  mode: SjbCalendarMode;
  width: number;
  height: number;
  displayHeight: number;
  /** Drop the own frame so a parent stage can supply border and clipping. */
  plain?: boolean;
  frameRef: (node: HTMLDivElement | null) => void;
}) {
  const { displayHeight, width, height, plain, ...rest } = props;
  const k = displayHeight / height;
  return (
    <div style={{ position: "relative", width: width * k, height: displayHeight, overflow: "hidden", borderRadius: plain ? 0 : 4, border: plain ? "none" : "1px solid var(--color-border)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${k})`, transformOrigin: "top left" }}>
        <DemoPageFrame page={rest.page} post={rest.post} mode={rest.mode} width={width} height={height} frameRef={rest.frameRef} />
      </div>
    </div>
  );
}

/**
 * The preview's transition, derived from the very numbers the MP4 recorder
 * paints with, so what you watch in the calendar is what the file will do.
 */
function stageKeyframes(motion: SjbSequenceMotion) {
  const a = transitionFrame(motion.style, 0);
  const b = transitionFrame(motion.style, 1);
  const at = (x: number, y: number) => `translate(${x * 100}%, ${y * 100}%)`;
  return {
    in: [
      { transform: at(a.toX, a.toY), opacity: a.toAlpha },
      { transform: at(b.toX, b.toY), opacity: b.toAlpha },
    ],
    out: [
      { transform: at(a.fromX, a.fromY), opacity: a.fromAlpha },
      { transform: at(b.fromX, b.fromY), opacity: b.fromAlpha },
    ],
  };
}

/** A hand-off in flight: which page is leaving, which has arrived. */
interface SjbHandoff {
  from: number;
  to: number;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The big page view. Pages swap with the format's own transition: a carousel
 * pushes sideways, a Story fades up, a LinkedIn carousel rises into place.
 * Nothing animates for anyone who has asked the system to reduce motion.
 */
function SequenceStage({
  post,
  mode,
  demo,
  spec,
  active,
  motion,
  displayHeight = 380,
}: {
  post: SjbCalendarPost;
  mode: SjbCalendarMode;
  demo: SjbCalendarDemo;
  spec: SjbCalendarFormatSpec;
  active: number;
  motion: SjbSequenceMotion;
  displayHeight?: number;
}) {
  const inRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const lastIndex = useRef<number | null>(null);
  const [handoff, setHandoff] = useState<SjbHandoff | null>(null);

  useEffect(() => {
    const from = lastIndex.current;
    lastIndex.current = active;
    if (from === null || from === active || prefersReducedMotion()) return;
    setHandoff({ from, to: active });
  }, [active]);

  useEffect(() => {
    if (!handoff) return;
    const kf = stageKeyframes(motion);
    const opts: KeyframeAnimationOptions = { duration: motion.moveMs, easing: motion.easing, fill: "both" };
    const runs: Animation[] = [];
    if (inRef.current) runs.push(inRef.current.animate(kf.in, opts));
    if (outRef.current) runs.push(outRef.current.animate(kf.out, opts));
    const clear = () => setHandoff(null);
    const last = runs[runs.length - 1];
    if (last) {
      last.onfinish = clear;
      last.oncancel = clear;
    } else {
      clear();
    }
    return () => {
      for (const r of runs) {
        try {
          r.cancel();
        } catch {
          /* already over */
        }
      }
    };
  }, [handoff, motion]);

  const k = displayHeight / spec.height;
  return (
    <div
      style={{
        position: "relative",
        width: spec.width * k,
        height: displayHeight,
        overflow: "hidden",
        borderRadius: 4,
        border: "1px solid var(--color-border)",
        backgroundColor: SJB_DEMO_LOOKS[mode].base,
      }}
    >
      {handoff && (
        <div ref={outRef} style={{ position: "absolute", inset: 0 }}>
          <ScaledPage
            page={demo.pages[handoff.from]}
            post={post}
            mode={mode}
            width={spec.width}
            height={spec.height}
            displayHeight={displayHeight}
            plain
            frameRef={() => {}}
          />
        </div>
      )}
      <div ref={inRef} style={{ position: "absolute", inset: 0 }}>
        <ScaledPage
          page={demo.pages[active]}
          post={post}
          mode={mode}
          width={spec.width}
          height={spec.height}
          displayHeight={displayHeight}
          plain
          frameRef={() => {}}
        />
      </div>
    </div>
  );
}

export type SjbDemoSequenceProps = {
  post: SjbCalendarPost;
  mode: SjbCalendarMode;
  format: SjbCalendarFormat;
};

export function SjbDemoSequence({ post, mode, format }: SjbDemoSequenceProps) {
  const demo = useMemo(() => sjbCalendarDemo(post, mode, format), [post, mode, format]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState<"pdf" | "zip" | "page" | "video" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [videoPage, setVideoPage] = useState(0);
  const frames = useRef<Array<HTMLDivElement | null>>([]);

  const spec = demo?.spec;
  const look = SJB_DEMO_LOOKS[mode];
  const motion = sjbSequenceMotion(format);
  const slug = `san-juan-bowl-${post.n}-${mode}-${format}-demo`;

  // The preview advances at the same pace the exported clip runs at, so the
  // play-through and the downloaded video are the same piece of motion.
  useEffect(() => {
    if (!playing || !demo) return;
    if (active >= demo.pages.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setActive((a) => Math.min(demo.pages.length - 1, a + 1)), motion.holdMs + motion.moveMs);
    return () => clearTimeout(t);
  }, [playing, active, demo, motion]);

  const targets = (): AssetCaptureTarget[] =>
    (demo?.pages ?? [])
      .map((p, i) => ({ node: frames.current[i], i }))
      .filter((e): e is { node: HTMLDivElement; i: number } => !!e.node)
      .map(({ node, i }) => ({ node, width: spec!.width, height: spec!.height, label: `${slug}-page-${i + 1}` }));

  if (!demo || !spec) return null;

  const run = async (kind: "pdf" | "zip" | "page") => {
    const t = targets();
    if (t.length !== demo.pages.length) {
      toast.error("This demo isn't ready to download yet.");
      return;
    }
    setBusy(kind);
    try {
      if (kind === "pdf") downloadAssetBlob(await exportAssetsPdf(t, { background: look.base }), `${slug}.pdf`);
      else if (kind === "zip") downloadAssetBlob(await exportAssetsZip(t, { format: "jpg", bundleName: slug, background: look.base }), `${slug}.zip`);
      else downloadAssetBlob(await exportAssetImage(t[active], { format: "jpg", background: look.base }), `${slug}-page-${active + 1}.jpg`);
    } catch (e) {
      toast.error(`Download failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(null);
    }
  };

  // Records the same four pages, at the format's exact pixels, with the
  // format's transition between them. Real time: the clip is as long as the
  // holds and handovers add up to.
  const runVideo = async () => {
    const t = targets();
    if (t.length !== demo.pages.length) {
      toast.error("This demo isn't ready to export yet.");
      return;
    }
    setBusy("video");
    setVideoPage(0);
    try {
      const canvases: HTMLCanvasElement[] = [];
      for (const target of t) canvases.push(await captureAssetCanvas(target, { background: look.base }));
      const out = await renderSequenceVideo({
        pages: canvases,
        width: spec.width,
        height: spec.height,
        motion,
        background: look.base,
        onProgress: (done) => setVideoPage(done),
      });
      downloadAssetBlob(out.blob, `${slug}.${out.ext}`);
      if (out.ext !== "mp4") toast.message("This browser can't write MP4, so the clip saved as WebM instead.");
    } catch (e) {
      toast.error(`Video export failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(null);
      setVideoPage(0);
    }
  };

  const isPdf = spec.delivery === "pdf";

  return (
    <section className="mt-4 rounded border border-dashed border-border bg-muted/30 p-4" aria-label={`${spec.label} demo`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">
          {spec.label} · <span className="text-amber-700">demo</span>
        </h4>
        <span className="text-xs text-muted-foreground">
          {spec.width}×{spec.height} per {format === "story-sequence" ? "frame" : "page"} · {demo.pages.length} pages
        </span>
      </div>
      <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{SJB_DEMO_NOTE}</p>
      {demo.placeholderCopy && <p className="mt-1 text-xs text-amber-800">Team names in this post are still placeholders.</p>}

      <div className="mt-3 flex flex-wrap items-end gap-4">
        <SequenceStage
          post={post}
          mode={mode}
          demo={demo}
          spec={spec}
          active={active}
          motion={motion}
          displayHeight={380}
        />
        <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Demo pages">
          {demo.pages.map((p, i) => (
            <li key={p.role} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                aria-label={`Show ${p.label}`}
                className={`block rounded border p-1 transition-colors ${i === active ? "border-primary" : "border-border hover:border-primary/60"}`}
              >
                <ScaledPage
                  page={p}
                  post={post}
                  mode={mode}
                  width={spec.width}
                  height={spec.height}
                  displayHeight={110}
                  frameRef={(n) => {
                    frames.current[i] = n;
                  }}
                />
              </button>
              <p className="mt-1 text-center text-[11px] text-muted-foreground">{p.label}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (!playing && active >= demo.pages.length - 1) setActive(0);
            setPlaying((p) => !p);
          }}
          disabled={!!busy}
        >
          {playing ? "Stop preview" : active >= demo.pages.length - 1 ? "Play again" : "Play sequence"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void runVideo()} disabled={!!busy}>
          {busy === "video" ? `Rendering… page ${videoPage} of ${demo.pages.length}` : "Download demo video (MP4)"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void run("page")} disabled={!!busy}>
          {busy === "page" ? "Saving…" : `Download page ${active + 1}`}
        </Button>
        {isPdf ? (
          <Button size="sm" variant="outline" onClick={() => void run("pdf")} disabled={!!busy}>
            {busy === "pdf" ? "Saving…" : "Download demo PDF"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => void run("zip")} disabled={!!busy}>
            {busy === "zip" ? "Saving…" : "Download demo pictures (ZIP)"}
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Pages hand over the way the exported clip does: the sequence {SJB_STYLE_LABEL[motion.style]} ·{" "}
        {(sjbSequenceDuration(motion, demo.pages.length) / 1000).toFixed(1)} s at {spec.width}×{spec.height}.
      </p>
    </section>
  );
}

/** Small demo cover for the month-grid chips. The single-image format has no
 *  sequence of its own, so its chip reuses the drawn 1080×1350 cover. */
export function SjbDemoChip({ post, mode, format, displayHeight = 96 }: SjbDemoSequenceProps & { displayHeight?: number }) {
  const demo = useMemo(
    () => sjbCalendarDemo(post, mode, format === "single" ? "linkedin-portrait" : format),
    [post, mode, format],
  );
  if (!demo?.spec) return null;
  return (
    <ScaledPage
      page={demo.pages[0]}
      post={post}
      mode={mode}
      width={demo.spec.width}
      height={demo.spec.height}
      displayHeight={displayHeight}
      frameRef={() => {}}
    />
  );
}

/** Splits "December 16, 2026" into the parts the date block sets at three sizes. */
function dateParts(label: string) {
  const m = label.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  return m ? { month: m[1].slice(0, 3).toUpperCase(), day: m[2], year: m[3] } : null;
}

/**
 * The details page: the date is the hero, the other facts sit as short
 * labelled rows a reader can scan in a second. Square pages put date and
 * facts side by side; portrait and story pages stack them, story with more air.
 */
function DetailsPage({ look, px, wide, tall }: { look: SjbDemoLook; px: (n: number) => string; wide: boolean; tall: boolean }) {
  const [date, venue, kickoff, matchup] = SJB_DEMO_FACTS;
  const d = dateParts(date.value);
  const rule = look.dark ? "rgba(255,255,255,0.16)" : "rgba(13,14,33,0.14)";
  const label = { fontSize: px(2.3), fontWeight: 700, letterSpacing: "0.2em", color: look.accent } as const;

  const dateBlock = d ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", lineHeight: 0.9 }}>
      <span style={label}>SAVE THE DATE</span>
      <span style={{ fontSize: px(wide ? 9 : 10), fontWeight: 800, letterSpacing: "0.04em", marginTop: px(2.4) }}>{d.month}</span>
      <span style={{ fontSize: px(wide ? 27 : tall ? 30 : 24), fontWeight: 800, letterSpacing: 0, color: look.accent, lineHeight: 0.9 }}>{d.day}</span>
      <span style={{ fontSize: px(wide ? 6 : 6.6), fontWeight: 600, letterSpacing: "0.12em", opacity: 0.9, marginTop: px(1.6) }}>{d.year}</span>
    </div>
  ) : (
    <div style={{ fontSize: px(7), fontWeight: 800 }}>{date.value}</div>
  );

  const [time, ...zones] = kickoff.value.split(" / ");
  const rows = [
    { k: "Where", main: venue.value.split(",")[0], sub: venue.value.split(",").slice(1).join(",").trim() },
    { k: "Kickoff", main: time, sub: zones.join(" / ") },
    { k: "Matchup", main: matchup.value, sub: "" },
  ];
  const facts = (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", textAlign: "left" }}>
      {rows.map((r, i) => (
        <div key={r.k} style={{ display: "flex", gap: px(3), alignItems: "flex-start", padding: `${px(tall ? 3.6 : 1.8)} 0`, borderTop: i ? `1px solid ${rule}` : "none" }}>
          <div style={{ width: px(0.9), alignSelf: "stretch", backgroundColor: look.accent, borderRadius: px(0.4) }} />
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ ...label, color: look.ink, opacity: 0.72, lineHeight: 1.2 }}>{r.k.toUpperCase()}</div>
            <div style={{ fontSize: px(wide ? 4.6 : 4.8), fontWeight: 700, lineHeight: 1.15, letterSpacing: 0, marginTop: px(1) }}>{r.main}</div>
            {r.sub && <div style={{ fontSize: px(wide ? 3 : 3.3), fontWeight: 500, lineHeight: 1.3, opacity: 0.85, marginTop: px(0.8) }}>{r.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div data-bowl-details style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: wide ? "row" : "column", gap: px(wide ? 6 : tall ? 8 : 3), marginTop: px(9), marginBottom: px(10), alignItems: wide ? "center" : "stretch", textAlign: "left" }}>
      <div style={{ flex: wide ? "0 0 38%" : "0 0 auto", paddingRight: wide ? px(5) : 0, borderRight: wide ? `1px solid ${rule}` : "none" }}>{dateBlock}</div>
      {facts}
    </div>
  );
}
