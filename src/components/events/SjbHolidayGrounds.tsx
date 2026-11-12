import { useEffect, useRef, useState } from "react";
import g09 from "@/assets/sjb-holiday-grounds/bithorn-09.jpg.asset.json";
import g10 from "@/assets/sjb-holiday-grounds/bithorn-10.jpg.asset.json";
import g11 from "@/assets/sjb-holiday-grounds/bithorn-11.jpg.asset.json";
import g13 from "@/assets/sjb-holiday-grounds/bithorn-13.jpg.asset.json";
import { SJB_CALENDAR_POSTS, type SjbCalendarMode } from "@/lib/sjb-social-calendar";
import { SJB_DEMO_LOOKS } from "@/lib/sjb-calendar-demo";
import { SJB_LOGOS } from "@/lib/san-juan-bowl";
import { CampaignCover } from "./SjbDemoSequence";

/** Proposed Hiram Bithorn holiday backgrounds — previews awaiting approval, not yet in Canva. */
export const SJB_HOLIDAY_GROUNDS: { post: string; theme: string; url: string }[] = [
  { post: "09", theme: "Zigzag roof in gold lights", url: g09.url },
  { post: "10", theme: "Facade under an amber Thanksgiving dusk", url: g10.url },
  { post: "11", theme: "Black-and-gold floodlight beams", url: g11.url },
  { post: "13", theme: "Electric-blue facade, neon sky", url: g13.url },
];

/** The active campaigns, each drawn with its own layout, lettering, marks and colours. */
const LOOKS: { mode: SjbCalendarMode; label: string }[] = [
  { mode: "light", label: "Light Action" },
  { mode: "set2", label: "Set 2" },
  { mode: "set3", label: "Set 3" },
  { mode: "set4", label: "Set 4" },
];

const W = 1080;
const H = 1350;

function HolidayCard({ post, mode, ground }: { post: string; mode: SjbCalendarMode; ground: string }) {
  const p = SJB_CALENDAR_POSTS.find((x) => x.n === post)!;
  const look = SJB_DEMO_LOOKS[mode];
  const logo = SJB_LOGOS.find((l) => l.id === (look.dark ? "dark" : "color"))!;
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Each campaign grades the holiday photo its own way so its copy stays readable.
  const grade = look.dark
    ? "linear-gradient(180deg, rgba(3,6,28,0.15) 0%, rgba(3,6,28,0.55) 50%, rgba(3,6,28,0.88) 100%)"
    : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.7) 45%, rgba(255,255,255,0.88) 100%)";
  return (
    <div ref={box} className="relative aspect-[4/5] overflow-hidden">
      <div data-bowl-look={mode} style={{ position: "absolute", top: 0, left: 0, width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left", backgroundColor: look.base, color: look.ink }}>
        <img src={ground} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: grade }} />
        <div style={{ position: "absolute", inset: 0, background: look.glow, mixBlendMode: look.dark ? "screen" : "multiply" }} />
        <CampaignCover post={p} mode={mode} width={W} height={H} logo={logo.svg} />
      </div>
    </div>
  );
}

export function SjbHolidayGrounds() {
  return (
    <section className="mt-8" aria-labelledby="sjb-holiday-grounds">
      <h2 id="sjb-holiday-grounds" className="text-xl font-semibold text-foreground">Holiday posts · every campaign look (proposed)</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Each holiday background shown in all four campaigns, with that campaign's layout, lettering, logos and colours. Previews for approval only — not in Canva or the downloads yet. Backgrounds start from real public-domain photos of Hiram Bithorn Stadium (Wikimedia Commons); the night sky and holiday lights are added. Hidden tags have been removed.
      </p>
      {SJB_HOLIDAY_GROUNDS.map((g) => {
        const p = SJB_CALENDAR_POSTS.find((x) => x.n === g.post);
        return (
          <div key={g.post} className="mt-6">
            <h3 className="text-sm font-semibold text-foreground">#{g.post} · {p?.title} <span className="font-normal text-muted-foreground">— {g.theme} · <a className="text-primary underline" href={g.url} download>Download background</a></span></h3>
            <div className="mt-2 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {LOOKS.map((l) => (
                <figure key={l.mode} className="overflow-hidden rounded-md border border-border bg-card">
                  <HolidayCard post={g.post} mode={l.mode} ground={g.url} />
                  <figcaption className="p-2 text-xs font-medium text-foreground">{l.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
