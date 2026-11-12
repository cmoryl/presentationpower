// San Juan Bowl landing hero: crossfading stadium plates, live kickoff countdown.
// Facts come only from SJB_EVENT; colours only from SJB_COLORS.
import { useEffect, useState } from "react";
import { SJB_EVENT, SJB_COLORS, SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_STADIUM_RENDERS } from "@/lib/sjb-stadium-renders";

const hex = (id: string) => SJB_COLORS.find((c) => c.id === id)?.hex ?? "#000";
// Dec 16, 2026 7:30 p.m. ET (EST, UTC-5) per SJB_EVENT.kickoffLabel.
const KICKOFF = Date.UTC(2026, 11, 17, 0, 30);
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

  return (
    <section aria-label={SJB_EVENT.name} className="relative mt-4 overflow-hidden rounded-xl text-white" style={{ background: navy }}>
      {PLATES.map((p, n) => (
        <img key={p.id} src={p.src} alt="" aria-hidden
          className={`sjb-kenburns absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ${n === i ? "opacity-70" : "opacity-0"}`} />
      ))}
      <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(100deg, ${navy} 15%, ${navy}cc 45%, transparent 85%)` }} />
      <div aria-hidden className="sjb-sweep absolute inset-y-0 w-1/3" style={{ background: `linear-gradient(90deg, transparent, ${sky}22, transparent)` }} />
      <div className="relative grid gap-6 p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: gold }}>
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none" style={{ background: gold }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: gold }} /></span>
            {SJB_EVENT.matchupLabel}
          </p>
          <h1 className="mt-3 text-4xl font-bold italic leading-none sm:text-6xl">{SJB_EVENT.shortName.toUpperCase()}</h1>
          <p className="mt-3 text-[15px] text-white/85">{SJB_EVENT.venue} · {SJB_EVENT.city}</p>
          <p className="text-[15px] text-white/85">{SJB_EVENT.datesLabel} · {SJB_EVENT.kickoffLabel}</p>
          <div className="mt-6 flex gap-2 sm:gap-3" role="timer" aria-label="Countdown to kickoff">
            {(parts ?? [["Days", "–"], ["Hrs", "–"], ["Min", "–"], ["Sec", "–"]]).map(([label, v]) => (
              <div key={label} className="min-w-16 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-center backdrop-blur-md">
                <div className="font-mono text-2xl font-bold tabular-nums sm:text-3xl">{typeof v === "number" ? String(v).padStart(2, "0") : v}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/70">{label}</div>
              </div>
            ))}
          </div>
        </div>
        {logo && <img src={logo.svg} alt="San Juan Bowl logo" className="sjb-float h-36 w-auto justify-self-start sm:h-48 md:justify-self-end" />}
      </div>
      <div className="relative flex gap-1.5 px-6 pb-5 sm:px-10">
        {PLATES.map((p, n) => (
          <button key={p.id} type="button" aria-label={`Show background ${n + 1}`} aria-current={n === i}
            onClick={() => setI(n)} className="h-1 w-8 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-white"
            style={{ background: n === i ? gold : "rgba(255,255,255,.3)" }} />
        ))}
      </div>
    </section>
  );
}
