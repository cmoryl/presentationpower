// San Juan Bowl landing hero: crossfading stadium plates, live kickoff countdown.
// Facts come only from SJB_EVENT; colours only from SJB_COLORS.
import { useEffect, useState } from "react";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/700-italic.css";
import { SJB_EVENT, SJB_COLORS, SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_STADIUM_RENDERS } from "@/lib/sjb-stadium-renders";
import { SjbSiteNav } from "./SjbMasthead";

const hex = (id: string) => SJB_COLORS.find((c) => c.id === id)?.hex ?? "#000";
// Dec 16, 2026 7:30 p.m. ET (EST, UTC-5) per SJB_EVENT.kickoffLabel.
const KICKOFF = Date.UTC(2026, 11, 17, 0, 30);
const BOWL_FONT = '"Barlow Condensed", sans-serif';
// Film-grain / worn-ink grit, drawn as an SVG noise tile (no image asset).
const GRIT = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1.6 -.55'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const PLATES = SJB_STADIUM_RENDERS.filter((r) => r.ratio === "16:9" || r.ratio === "2:1");

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function SjbHero() {
  const now = useNow();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (PLATES.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % PLATES.length), 7000);
    return () => clearInterval(t);
  }, []);
  const left = now == null ? null : Math.max(0, KICKOFF - now);
  const parts = left == null ? null : [
    ["Days", Math.floor(left / 864e5)],
    ["Hrs", Math.floor(left / 36e5) % 24],
    ["Min", Math.floor(left / 6e4) % 60],
    ["Sec", Math.floor(left / 1e3) % 60],
  ] as const;
  const logo = SJB_LOGOS.find((l) => l.id === "dark");
  const navy = hex("navy"), gold = hex("gold"), sky = hex("sky");
  const ticker = [
    SJB_EVENT.matchupLabel,
    SJB_EVENT.datesLabel,
    SJB_EVENT.venue,
    SJB_EVENT.city,
    SJB_EVENT.kickoffLabel,
    "SANJUANBOWL.COM",
  ];

  return (
    <section data-sjb-masthead aria-label={SJB_EVENT.name} style={{ background: navy, fontFamily: BOWL_FONT }} className="relative mt-4 overflow-hidden rounded-xl text-white">
      {PLATES.map((p, n) => (
        <img key={p.id} src={p.src} alt="" aria-hidden
          className={`sjb-kenburns absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ${n === i ? "opacity-70" : "opacity-0"}`} />
      ))}
      <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(100deg, ${navy} 15%, ${navy}cc 45%, transparent 85%)` }} />
      <div aria-hidden className="sjb-sweep absolute inset-y-0 w-1/3" style={{ background: `linear-gradient(90deg, transparent, ${sky}22, transparent)` }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay" style={{ backgroundImage: GRIT }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 140px 30px rgb(0 0 0 / 0.55)" }} />
      <div className="relative grid gap-6 p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="flex items-center gap-2 text-base font-bold italic uppercase tracking-wide" style={{ color: gold }}>
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none" style={{ background: gold }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: gold }} /></span>
            {SJB_EVENT.matchupLabel}
          </p>
          <h1
            className="sjb-title-shine mt-3 text-6xl font-bold italic uppercase leading-[0.9] sm:text-8xl"
            style={{ fontFamily: BOWL_FONT, backgroundImage: `linear-gradient(100deg, ${gold} 20%, #ffffff 40%, ${sky} 60%, ${gold} 80%)` }}
          >
            {SJB_EVENT.shortName.toUpperCase()}
          </h1>
          <p className="mt-3 text-xl font-medium uppercase tracking-wide text-white/90">{SJB_EVENT.venue} · {SJB_EVENT.city}</p>
          <p className="text-xl font-medium uppercase tracking-wide text-white/90">{SJB_EVENT.datesLabel} · {SJB_EVENT.kickoffLabel}</p>
          <div className="mt-6 inline-block rounded-md border-2 p-2 sm:p-3" role="timer" aria-label="Countdown to kickoff"
            style={{ borderColor: "#2a2a2a", background: "linear-gradient(#141414, #050505)", boxShadow: `0 10px 30px rgb(0 0 0 / .55), inset 0 0 0 1px ${gold}33` }}>
            <div className="mb-2 flex items-center justify-between px-1 text-sm font-bold italic uppercase tracking-[0.18em]">
              <span style={{ color: gold }}>Kickoff</span>
              <span className="text-white/60">{SJB_EVENT.datesLabel}</span>
            </div>
            <div className="flex items-end gap-1.5 sm:gap-2">
              {(parts ?? [["Days", "--"], ["Hrs", "--"], ["Min", "--"], ["Sec", "--"]]).map(([label, v], n) => (
                <div key={label} className="flex items-end gap-1.5 sm:gap-2">
                  {n > 0 && <span aria-hidden className="pb-7 text-3xl font-bold sm:text-4xl" style={{ color: `${gold}aa` }}>:</span>}
                  <div className="text-center">
                    <div className="relative overflow-hidden rounded-sm border px-2 py-1 sm:px-3"
                      style={{ borderColor: "#333", background: "repeating-linear-gradient(0deg, #0b0b0b 0 2px, #000 2px 4px)" }}>
                      <div className="font-mono text-4xl font-bold tabular-nums leading-none sm:text-5xl"
                        style={{ color: gold, textShadow: `0 0 6px ${gold}cc, 0 0 18px ${gold}66` }}>
                        {typeof v === "number" ? String(v).padStart(label === "Days" ? 3 : 2, "0") : v}
                      </div>
                      <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-black/80" />
                    </div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/75">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {logo && <img src={logo.svg} alt="San Juan Bowl logo" className="sjb-float h-36 w-auto justify-self-start sm:h-48 md:justify-self-end" />}
      </div>
      <div className="relative flex gap-1.5 px-6 pb-4 sm:px-10">
        {PLATES.map((p, n) => (
          <button key={p.id} type="button" aria-label={`Show background ${n + 1}`} aria-current={n === i}
            onClick={() => setI(n)} className="h-1 w-8 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-white"
            style={{ background: n === i ? gold : "rgba(255,255,255,.3)" }} />
        ))}
      </div>
      <SjbSiteNav />
      <div className="relative border-t border-white/15 py-2" style={{ background: `${navy}cc` }}>
        <p className="sr-only">{ticker.join(" · ")}</p>
        <div aria-hidden className="overflow-hidden">
          <div className="sjb-marquee flex w-max items-center gap-6 whitespace-nowrap px-3 text-sm font-bold italic uppercase tracking-[0.15em]">
            {[...ticker, ...ticker, ...ticker, ...ticker].map((t, n) => (
              <span key={n} className="flex items-center gap-6">
                <span style={{ color: t === "SANJUANBOWL.COM" ? gold : "rgba(255,255,255,0.8)" }}>{t}</span>
                <span className="sjb-pulse-bar inline-block h-3 w-[3px] rounded-full" style={{ background: n % 2 ? sky : gold }} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
