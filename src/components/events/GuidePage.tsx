// On-screen proof of one guide page. It follows the same fractions the press PDF
// uses — the same ground ramp, the same chevron watermark, the same disc, panels
// and photograph placements — so what the operator types here is what the
// printed page does. It is still a screen proof, not the press artwork.

import type { GuideBlock, GuideConfig } from "@/lib/next-guide";
import {
  guideAccent,
  guideChevronPathAt,
  guideChevrons,
  guideGround,
  guideGroundCss,
  guideImage,
} from "@/lib/next-guide-theme";
import { qrRaster } from "@/lib/qr-print";

/** The chevron watermark, cut to the page. */
function Chevrons({ variant }: { variant: "cover" | "page" | "band" }) {
  const runs = guideChevrons(variant);
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden
    >
      {runs.map((c, i) => (
        <path key={i} d={guideChevronPathAt(c, 100, 100)} fill="#FFFFFF" opacity={c.opacity} />
      ))}
    </svg>
  );
}

/** Small white card with a live code, as the master uses for the app and support. */
function QrCard({ label, url, ink }: { label: string; url: string; ink: string }) {
  const raster = url ? qrRaster(url, { style: "block", modulePx: 1 }) : null;
  return (
    <div className="flex items-center gap-[3%] rounded-[1.2cqw] bg-white p-[1.6%]" style={{ color: ink }}>
      {raster ? (
        <svg viewBox={`0 0 ${raster.width} ${raster.width}`} className="w-[9cqw] shrink-0" aria-hidden>
          <rect width={raster.width} height={raster.width} fill="#FFFFFF" />
          {Array.from({ length: Math.floor(raster.width / 2) }).flatMap((_, ry) =>
            Array.from({ length: Math.floor(raster.width / 2) }).map((__, rx) =>
              raster.ink[ry * 2 * raster.width + rx * 2] === 1 ? (
                <rect key={`${rx}-${ry}`} x={rx * 2} y={ry * 2} width={2} height={2} fill="#03002C" />
              ) : null,
            ),
          )}
        </svg>
      ) : null}
      <div className="min-w-0">
        <p className="text-[1.7cqw] font-bold leading-tight">{label}</p>
        <p className="truncate text-[1.4cqw] opacity-70">{url}</p>
      </div>
    </div>
  );
}

export function GuidePage({
  block,
  config,
  trim,
  pageNo,
}: {
  block: GuideBlock;
  config: GuideConfig;
  trim: { w: number; h: number };
  pageNo: number;
}) {
  const aspect = { aspectRatio: `${trim.w} / ${trim.h}` };
  const ground = guideGround(block.ground);
  const accent = guideAccent(block.accent);
  const ink = ground.ink;
  const photo = block.imagePlace === "none" ? null : guideImage(block.imageId);
  const head = [config.location.city, config.location.dates].filter(Boolean).join(" · ");

  const shell = {
    ...aspect,
    background: guideGroundCss(block.ground),
    color: ink,
    containerType: "inline-size" as const,
  };

  // ── cover ─────────────────────────────────────────────────────────────────
  if (block.kind === "cover") {
    return (
      <div className="relative w-full overflow-hidden rounded-md" style={shell}>
        <Chevrons variant="cover" />
        {photo ? (
          <div className="absolute inset-x-0 bottom-0 h-[38%] overflow-hidden">
            <img src={photo.url} alt="" className="size-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(3,0,44,0.72), rgba(3,0,44,0.18))" }}
            />
          </div>
        ) : null}

        {block.disc ? (
          <div
            className="absolute right-[7%] top-[6%] flex items-center justify-center rounded-full text-center"
            style={{ width: "26%", aspectRatio: "1 / 1", background: accent, color: "#03002C" }}
          >
            <span className="px-[8%] text-[2.6cqw] font-bold uppercase leading-[1.15]">{block.disc}</span>
          </div>
        ) : null}

        <div className="absolute inset-x-[9%] top-[30%]">
          <p className="text-[12.5cqw] font-bold uppercase leading-[0.94] tracking-[-0.02em]">
            {block.title || "YOUR GUIDE"}
          </p>
          {block.theme ? (
            <p className="mt-[3%] text-[4.4cqw] font-bold uppercase leading-[1.05]" style={{ color: accent }}>
              {block.theme}
            </p>
          ) : null}
          {block.strapline ? (
            <p className="mt-[2%] text-[2cqw] font-bold uppercase tracking-[0.16em]">{block.strapline}</p>
          ) : null}
        </div>

        <div className="absolute inset-x-[9%] bottom-[6%]">
          <p className="text-[2.1cqw] font-bold">
            {[config.location.venue, config.location.city, config.location.dates]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {block.footnote ? (
            <p className="text-[1.8cqw]" style={{ color: accent }}>
              {block.footnote}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // ── back cover ────────────────────────────────────────────────────────────
  if (block.kind === "closing") {
    return (
      <div className="relative w-full overflow-hidden rounded-md" style={shell}>
        <Chevrons variant="page" />
        <div className="absolute inset-x-[9%] top-[38%] text-center">
          <p className="text-[6.5cqw] font-bold uppercase leading-[1.02]" style={{ color: accent }}>
            {block.title}
          </p>
          {block.standfirst ? (
            <p className="mt-[4%] text-[2.2cqw] font-bold uppercase tracking-[0.18em]">{block.standfirst}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const title =
    block.kind === "keynote" ? block.talkTitle || block.name : "title" in block ? block.title : "";
  const standfirst = "standfirst" in block ? block.standfirst : "";
  const sidePhoto = photo && block.imagePlace === "side";
  const heroPhoto = photo && block.imagePlace === "hero";
  const bandPhoto = photo && (block.imagePlace === "band" || !block.imagePlace);

  return (
    <div className="relative w-full overflow-hidden rounded-md" style={shell}>
      <Chevrons variant={bandPhoto ? "band" : "page"} />

      {bandPhoto ? (
        <div className="absolute inset-x-0 bottom-0 h-[26%] overflow-hidden">
          <img src={photo!.url} alt="" className="size-full object-cover" />
          <div className="absolute inset-0" style={{ background: "rgba(3,0,44,0.28)" }} />
        </div>
      ) : null}

      {block.sidebar ? (
        <p
          className="absolute left-[2.2%] top-[52%] origin-left -rotate-90 whitespace-nowrap text-[1.8cqw] font-bold uppercase tracking-[0.28em]"
          style={{ color: accent }}
        >
          {block.sidebar}
        </p>
      ) : null}

      <div className="relative px-[9%] py-[7.5%]">
        {head ? (
          <p className="text-[1.6cqw] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
            {head}
          </p>
        ) : null}
        <div className="mt-[1.4%] h-[2px] w-[22%]" style={{ background: accent }} />

        {block.kind === "keynote" && block.eyebrow ? (
          <p className="mt-[4%] text-[1.9cqw] font-bold uppercase tracking-[0.18em]">{block.eyebrow}</p>
        ) : null}
        {title ? (
          <p
            className="mt-[3%] text-[6cqw] font-bold uppercase leading-[1.02] tracking-[-0.01em]"
            style={{ color: accent }}
          >
            {title}
          </p>
        ) : null}
        {standfirst ? <p className="mt-[2.6%] text-[2.2cqw] leading-[1.4]">{standfirst}</p> : null}

        {heroPhoto ? (
          <div className="mt-[4%] overflow-hidden rounded-[1.4cqw]" style={{ aspectRatio: "16 / 7" }}>
            <img src={photo!.url} alt="" className="size-full object-cover" />
          </div>
        ) : null}

        <div className={`mt-[4%] ${sidePhoto ? "flex gap-[5%]" : ""}`}>
          <div className={`${sidePhoto ? "w-[58%]" : "w-full"} space-y-[2.6%] text-[2.05cqw] leading-[1.45]`}>
            {block.kind === "welcome" ? (
              <>
                <p className="text-[2.3cqw] leading-[1.5]">{block.body}</p>
                {block.byline ? (
                  <p className="text-[2.2cqw] font-bold" style={{ color: accent }}>
                    {block.byline}
                  </p>
                ) : null}
                {block.note ? (
                  <p
                    className="rounded-[1.2cqw] border px-[4%] py-[3.4%]"
                    style={{ borderColor: accent, color: ink }}
                  >
                    {block.note}
                  </p>
                ) : null}
              </>
            ) : null}

            {block.kind === "info" || block.kind === "list"
              ? block.items.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-[1.2cqw] border px-[4%] py-[3%]"
                    style={{ borderColor: "rgba(255,255,255,0.45)" }}
                  >
                    <p className="text-[2.4cqw] font-bold" style={{ color: accent }}>
                      {it.label}
                    </p>
                    <p className="mt-[1.4%]">{it.body}</p>
                  </div>
                ))
              : null}

            {block.kind === "schedule" ? (
              <div className="flex gap-[5%]">
                {block.days.map((day) => (
                  <div key={day.id} className="flex-1">
                    <p className="text-[2.4cqw] font-bold uppercase" style={{ color: accent }}>
                      {day.name}
                    </p>
                    <div className="mt-[3%] space-y-[2%]">
                      {day.rows.map((r) => (
                        <div
                          key={r.id}
                          className="border-b pb-[2%]"
                          style={{ borderColor: "rgba(255,255,255,0.35)" }}
                        >
                          <p className="text-[2cqw] font-bold" style={{ color: accent }}>
                            {r.time}
                          </p>
                          <p>{r.item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {block.kind === "keynote" ? (
              <>
                <p className="text-[3.6cqw] font-bold">{block.name}</p>
                {block.when ? (
                  <p className="text-[2.1cqw] font-bold" style={{ color: accent }}>
                    {block.when}
                  </p>
                ) : null}
                <p className="text-[2cqw] leading-[1.5]">{block.body}</p>
              </>
            ) : null}

            {block.kind === "floors"
              ? block.floors.map((floor) => (
                  <div
                    key={floor.id}
                    className="rounded-[1.2cqw] border px-[4%] py-[3%]"
                    style={{ borderColor: "rgba(255,255,255,0.45)" }}
                  >
                    <p className="text-[2.4cqw] font-bold" style={{ color: accent }}>
                      {floor.name}
                    </p>
                    {floor.room ? <p className="font-bold">{floor.room}</p> : null}
                    {floor.lines.map((line, i) => (
                      <p key={i} className="opacity-90">
                        {line}
                      </p>
                    ))}
                  </div>
                ))
              : null}

            {block.kind === "links"
              ? block.links.map((link) => (
                  <div key={link.id}>
                    <p className="text-[2.3cqw] font-bold">{link.label}</p>
                    <p style={{ color: accent }}>{link.url}</p>
                  </div>
                ))
              : null}
          </div>

          {sidePhoto ? (
            <div className="w-[37%] overflow-hidden rounded-[1.4cqw]" style={{ aspectRatio: "3 / 4" }}>
              <img src={photo!.url} alt="" className="size-full object-cover" />
            </div>
          ) : null}
        </div>

        {block.qrLabel && block.qrUrl ? (
          <div className="mt-[4%] w-[52%]">
            <QrCard label={block.qrLabel} url={block.qrUrl} ink="#03002C" />
          </div>
        ) : null}
      </div>

      <span
        className="absolute bottom-[3.6%] right-[9%] text-[1.9cqw] font-bold"
        style={{ color: accent }}
      >
        {pageNo}
      </span>
    </div>
  );
}
