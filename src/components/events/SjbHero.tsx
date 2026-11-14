// San Juan Bowl landing hero: crossfading stadium plates, live kickoff countdown.
// Facts come only from SJB_EVENT; colours only from SJB_COLORS.
import { useEffect, useState } from "react";
import { CalendarPlus, ExternalLink, Ticket, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/design-system/element";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/700-italic.css";
import { SJB_EVENT, SJB_COLORS, SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_STADIUM_RENDERS } from "@/lib/sjb-stadium-renders";
import { SjbSiteNav } from "./SjbMasthead";
import { SjbHeroLettering } from "./SjbHeroLettering";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { readSjbHeroColours, SJB_HERO_COLOUR_KEY, SJB_HERO_DEFAULT_COLOURS, type SjbHeroColours } from "@/lib/sjb-hero-colours";

const hex = (id: string) => SJB_COLORS.find((c) => c.id === id)?.hex ?? "#000";
// Dec 16, 2026 7:30 p.m. ET (EST, UTC-5) per SJB_EVENT.kickoffLabel.
const KICKOFF = Date.parse(SJB_EVENT.kickoffUtc);
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
  const [colours, setColours] = useState<SjbHeroColours>(SJB_HERO_DEFAULT_COLOURS);
  useEffect(() => {
    try { setColours(readSjbHeroColours(localStorage.getItem(SJB_HERO_COLOUR_KEY))); } catch { /* Storage may be disabled. */ }
  }, []);
  const updateColours = (next: SjbHeroColours) => {
    setColours(next);
    try { localStorage.setItem(SJB_HERO_COLOUR_KEY, JSON.stringify(next)); } catch { /* Keep the live preview editable. */ }
  };
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
    <section data-sjb-masthead aria-label={SJB_EVENT.name} style={{ background: navy, fontFamily: BOWL_FONT }} className="sjb-site-band relative mt-4 overflow-hidden text-white">
      {PLATES.map((p, n) => (
        <img key={p.id} src={p.src} alt="" aria-hidden
          className={`sjb-kenburns absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ${n === i ? "opacity-70" : "opacity-0"}`} />
      ))}
      <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(100deg, ${navy} 15%, ${navy}cc 45%, transparent 85%)` }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: GRIT }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 140px 30px rgb(0 0 0 / 0.55)" }} />
      <div className="relative mx-auto grid max-w-7xl gap-6 px-6 py-10 sm:px-10 sm:py-14 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="flex items-center gap-2 text-base font-bold italic uppercase tracking-wide" style={{ color: gold }}>
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none" style={{ background: gold }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: gold }} /></span>
            {SJB_EVENT.matchupLabel}
          </p>
          <div className="relative mt-4 max-w-[900px]">
            <h1 aria-label={SJB_EVENT.shortName}>
              <SjbHeroLettering face={colours.face} shadow={colours.shadow} aria-hidden className="block h-auto w-full" />
            </h1>
            <div className="mt-1 flex justify-end font-sans">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Edit hero lettering colours" title="Edit hero lettering colours" className="text-white/75 hover:bg-white/10 hover:text-white"><Palette className="size-4" /></Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 font-sans">
                  <p className="mb-3 text-sm font-semibold">Hero lettering colours</p>
                  <div className="flex gap-6">
                    <label className="flex flex-col gap-2 text-sm">Letter face<input aria-label="Letter face colour" type="color" value={colours.face} onChange={(e) => updateColours({ ...colours, face: e.target.value })} className="h-9 w-20 cursor-pointer rounded border border-border bg-background" /></label>
                    <label className="flex flex-col gap-2 text-sm">Letter shadow<input aria-label="Letter shadow colour" type="color" value={colours.shadow} onChange={(e) => updateColours({ ...colours, shadow: e.target.value })} className="h-9 w-20 cursor-pointer rounded border border-border bg-background" /></label>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => updateColours({ ...colours, face: gold })}><span aria-hidden className="size-3 rounded-sm" style={{ background: gold }} />Yellow</Button>
                    <Button size="sm" variant="ghost" onClick={() => updateColours(SJB_HERO_DEFAULT_COLOURS)}><RotateCcw className="size-4" />Reset</Button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Colour preference saved in this browser.</p>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <p className="mt-3 text-xl font-medium uppercase tracking-wide text-white/90">{SJB_EVENT.venue} · {SJB_EVENT.city}</p>
          <p className="text-xl font-medium uppercase tracking-wide text-white/90">{SJB_EVENT.datesLabel} · {SJB_EVENT.kickoffLabel}</p>
          <p className="text-lg font-medium uppercase text-white/75">{SJB_EVENT.localKickoffLabel}</p>
          <div className="mt-4 flex flex-wrap gap-2 font-sans">
            <Button asChild><a href={SJB_EVENT.ticketsUrl} target="_blank" rel="noopener noreferrer"><Ticket />Buy tickets</a></Button>
            <Button asChild variant="secondary"><a href={SJB_EVENT.websiteUrl} target="_blank" rel="noopener noreferrer"><ExternalLink />Official website</a></Button>
            <Button asChild variant="secondary"><a href={SJB_EVENT.calendarUrl}><CalendarPlus />Add to calendar</a></Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 font-sans text-sm text-white/90">
            <a className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={SJB_EVENT.directionsUrl} target="_blank" rel="noopener noreferrer">Directions</a>
            <a className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={SJB_EVENT.mediaUrl} target="_blank" rel="noopener noreferrer">Media credentials</a>
            <a className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={SJB_EVENT.sponsorshipUrl} target="_blank" rel="noopener noreferrer">Sponsorship</a>
            <a className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={`mailto:${SJB_EVENT.contactEmail}`}>Contact</a>
          </div>
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
        {logo && <img src={logo.svg} alt="San Juan Bowl logo" className="h-32 w-32 object-contain justify-self-start sm:h-56 sm:w-56 md:justify-self-end" />}
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
