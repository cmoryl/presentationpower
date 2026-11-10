// Demo multi-page sequences for the Bowl social calendar.
//
// Draws the four placeholder pages (cover, headline, details, tickets) for a
// post in a look at the format's true pixels, and hands them out as a PDF (the
// LinkedIn carousels) or a zip of pictures (Instagram carousel / Story
// sequence) through the shared asset exporter. Every page carries the DEMO
// badge, so a download can never be mistaken for approved artwork.
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/design-system/element";
import {
  assetFileSlug,
  downloadAssetBlob,
  exportAssetImage,
  exportAssetsPdf,
  exportAssetsZip,
  type AssetCaptureTarget,
} from "@/lib/asset-export";
import { SJB_DEMO_BADGE, SJB_DEMO_FACTS, SJB_DEMO_LOOKS, SJB_DEMO_NOTE, SJB_DEMO_SITE, sjbCalendarDemo, type SjbDemoPage } from "@/lib/sjb-calendar-demo";
import { SJB_LOGOS } from "@/lib/san-juan-bowl";
import type { SjbCalendarMode, SjbCalendarPost } from "@/lib/sjb-social-calendar";
import type { SjbCalendarFormat } from "@/lib/sjb-calendar-formats";

const FONT = '"Geist Variable", system-ui, sans-serif';

/** One page at its native pixels; the caller scales it down for display. */
function DemoPageFrame({
  page,
  index,
  total,
  post,
  mode,
  width,
  height,
  frameRef,
}: {
  page: SjbDemoPage;
  index: number;
  total: number;
  post: SjbCalendarPost;
  mode: SjbCalendarMode;
  width: number;
  height: number;
  frameRef: (node: HTMLDivElement | null) => void;
}) {
  const look = SJB_DEMO_LOOKS[mode];
  const logo = SJB_LOGOS.find((l) => l.id === (look.dark ? "dark" : "color"))!;
  // Every size below is a share of the short edge, so the same page reads the
  // same way at 1080×1080, 1080×1350 and 1080×1920.
  const s = Math.min(width, height);
  const px = (n: number) => `${(s * n) / 100}px`;
  const pad = px(7);

  return (
    <div
      ref={frameRef}
      data-kit-asset-frame
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
      <div style={{ position: "absolute", inset: 0, background: look.glow }} />

      {page.role === "cover" && page.photoUrl ? (
        <img src={page.photoUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: pad, boxSizing: "border-box" }}>
          {page.role === "cover" && (
            <>
              <img src={logo.svg} alt="" style={{ height: px(26), width: "auto", alignSelf: "center", marginTop: px(6) }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: px(2) }}>
                <div style={{ fontSize: px(9), fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em" }}>{post.headline[0]}</div>
                <div style={{ fontSize: px(9), fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em", color: look.accent }}>{post.headline[1]}</div>
              </div>
              <div style={{ fontSize: px(2.8), letterSpacing: "0.16em", textAlign: "center", opacity: 0.85, marginBottom: px(5) }}>
                {SJB_DEMO_FACTS[0].value.toUpperCase()} · {SJB_DEMO_FACTS[1].value.toUpperCase()}
              </div>
            </>
          )}

          {page.role === "headline" && (
            <>
              <div style={{ marginTop: px(9), fontSize: px(2.6), letterSpacing: "0.2em", opacity: 0.75 }}>{post.phase.toUpperCase()} · {SJB_DEMO_FACTS[0].value.toUpperCase()}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: px(2) }}>
                <div style={{ fontSize: px(10.5), fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.02em" }}>{post.headline[0]}</div>
                <div style={{ fontSize: px(10.5), fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.02em", color: look.accent }}>{post.headline[1]}</div>
                <div style={{ width: px(22), height: px(0.7), backgroundColor: look.accent, marginTop: px(4) }} />
              </div>
            </>
          )}

          {page.role === "details" && (
            <>
              <div style={{ marginTop: px(9), fontSize: px(2.6), letterSpacing: "0.2em", opacity: 0.75 }}>THE DETAILS</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: px(4) }}>
                {SJB_DEMO_FACTS.map((f) => (
                  <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: px(0.6), borderBottom: `1px solid ${look.dark ? "rgba(255,255,255,0.18)" : "rgba(13,14,33,0.18)"}`, paddingBottom: px(2.4) }}>
                    <span style={{ fontSize: px(2.2), letterSpacing: "0.18em", opacity: 0.7 }}>{f.label.toUpperCase()}</span>
                    <span style={{ fontSize: px(4.4), fontWeight: 600, lineHeight: 1.2 }}>{f.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

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
      {page.photoKind === "none" && (
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
      <div
        style={{
          position: "absolute",
          bottom: pad,
          right: pad,
          fontSize: px(2.2),
          letterSpacing: "0.12em",
          opacity: 0.8,
          fontFamily: FONT,
        }}
      >
        PAGE {index + 1} / {total}
      </div>
    </div>
  );
}

/** Native-size page shown at a display height, via a CSS scale. */
function ScaledPage(props: {
  page: SjbDemoPage;
  index: number;
  total: number;
  post: SjbCalendarPost;
  mode: SjbCalendarMode;
  width: number;
  height: number;
  displayHeight: number;
  frameRef: (node: HTMLDivElement | null) => void;
}) {
  const { displayHeight, width, height, ...rest } = props;
  const k = displayHeight / height;
  return (
    <div style={{ position: "relative", width: width * k, height: displayHeight, overflow: "hidden", borderRadius: 4, border: "1px solid var(--color-border)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${k})`, transformOrigin: "top left" }}>
        <DemoPageFrame page={rest.page} index={rest.index} total={rest.total} post={rest.post} mode={rest.mode} width={width} height={height} frameRef={rest.frameRef} />
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
  const [busy, setBusy] = useState<"pdf" | "zip" | "page" | null>(null);
  const frames = useRef<Array<HTMLDivElement | null>>([]);

  const spec = demo?.spec;
  const look = SJB_DEMO_LOOKS[mode];
  const slug = `san-juan-bowl-${post.n}-${mode}-${format}-demo`;

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
        <ScaledPage
          page={demo.pages[active]}
          index={active}
          total={demo.pages.length}
          post={post}
          mode={mode}
          width={spec.width}
          height={spec.height}
          displayHeight={380}
          frameRef={() => {}}
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
                  index={i}
                  total={demo.pages.length}
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
      index={0}
      total={demo.pages.length}
      post={post}
      mode={mode}
      width={demo.spec.width}
      height={demo.spec.height}
      displayHeight={displayHeight}
      frameRef={() => {}}
    />
  );
}
