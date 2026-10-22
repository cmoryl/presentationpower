// San Juan Bowl small-size mark (the badge) and lockups (team matchup, official partner,
// badge + venue/date). Files in public/downloads/sjb-mark/ and sjb-lockups/ are generated: the mark
// from the exact lettering construction, the lockups with the supplied badge copied in untouched.
import { useState } from "react";
import { Download } from "lucide-react";
import { SJB_LOCKUPS, SJB_SMALL_MARK } from "@/lib/san-juan-bowl";

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";
const chip =
  "inline-flex items-center gap-1 rounded-full border border-[#03002C]/15 px-2.5 py-0.5 text-[11.5px] font-semibold hover:border-[#003FC7] hover:text-[#003FC7]";
const solid = `${chip} bg-[#03002C] text-white hover:bg-[#003FC7] hover:text-white`;
const SIZES = [160, 64, 48, 32] as const;

export function SjbSmallMark({ compact = false }: { compact?: boolean }) {
  const m = SJB_SMALL_MARK;
  return (
    <div className={`${card} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-[15px] font-bold">Small-size mark</h3>
          <p className="mt-1 text-[13px] text-[#03002C]/80">{m.use}</p>
        </div>
        <a href={m.pack} download="sjb-mark-pack.zip" className={solid}>
          <Download className="h-3.5 w-3.5" /> All mark files (ZIP)
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_1fr]">
        <div className="flex items-center justify-center rounded-xl border border-[#03002C]/10 bg-[#F2F2F2] p-6">
          <img src={m.svg} alt="San Juan Bowl small-size mark: the badge" className="h-[200px] w-auto" />
        </div>
        <div className="space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#03002C]/60">At real pixel height</p>
          {(["#FFFFFF", "#0D0E21"] as const).map((bg) => (
            <div key={bg} className="flex flex-wrap items-end gap-5 rounded-xl border border-[#03002C]/10 p-4" style={{ background: bg }}>
              {SIZES.map((h) => (
                <figure key={h} className="flex flex-col items-center gap-1.5">
                  <img src={m.svg} alt="" aria-hidden="true" style={{ height: h, width: "auto" }} />
                  <figcaption className={`font-mono text-[10px] ${bg === "#FFFFFF" ? "text-[#666666]" : "text-white/70"}`}>{h} px</figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>

      {!compact && (
        <div className="grid gap-4 md:grid-cols-2">
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#03002C]/80">
            {m.rules.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <dl className="grid gap-1.5 text-[12px]">
            {m.geometry.map((g) => (
              <div key={g.label} className="flex gap-2">
                <dt className="min-w-[84px] font-bold">{g.label}</dt>
                <dd className="font-mono text-[11.5px] text-[#03002C]/75">{g.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {compact && <p className="text-[12px] text-[#666666]">{m.rules[0]} {m.rules[1]}</p>}

      <div className="flex flex-wrap gap-1.5">
        {(compact ? m.files.filter((f) => ["SVG", "PNG 1024", "Avatar 1080 (navy)", "Favicon (ICO)"].includes(f.label)) : m.files).map((f) => (
          <a key={f.file} href={`${m.dir}/${f.file}`} download={f.file} className={chip}>
            <Download className="h-3 w-3" /> {f.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function LockupCard({ item }: { item: (typeof SJB_LOCKUPS.items)[number] }) {
  const [bg, setBg] = useState<"on-navy" | "on-white">("on-navy");
  const base = `${SJB_LOCKUPS.dir}/sjb-lockup-${item.id}-${bg}`;
  return (
    <div className="space-y-2">
      <div
        className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border border-[#03002C]/10 p-3"
        style={{ background: bg === "on-navy" ? "#0D0E21" : "#FFFFFF" }}
      >
        <img src={`${base}.svg`} alt={`San Juan Bowl ${item.name} lockup, ${bg.replace("-", " ")}`} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">{item.name}</p>
        <div role="radiogroup" aria-label="Background" className="flex gap-1">
          {(["on-navy", "on-white"] as const).map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={bg === b}
              onClick={() => setBg(b)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${bg === b ? "border-[#03002C] bg-[#03002C] text-white" : "border-[#03002C]/15 hover:border-[#003FC7]"}`}
            >
              {b === "on-navy" ? "Navy" : "White"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[12px] text-[#03002C]/80">{item.use}</p>
      <p className="text-[12px] text-[#666666]">{item.rules}</p>
      <div className="flex flex-wrap gap-1.5">
        <a href={`${base}.svg`} download={`sjb-lockup-${item.id}-${bg}.svg`} className={chip}><Download className="h-3 w-3" /> SVG (editable)</a>
        {[1200, 2400].map((w) => (
          <a key={w} href={`${base}-${w}.png`} download={`sjb-lockup-${item.id}-${bg}-${w}.png`} className={chip}>PNG {w}</a>
        ))}
      </div>
    </div>
  );
}

export function SjbLockups() {
  return (
    <div className={`${card} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-[15px] font-bold">Lockups</h3>
          <p className="mt-1 text-[13px] text-[#03002C]/80">
            Editable SVG templates: the badge exactly as supplied, clear space x on every side, Geist text you can retype,
            and dashed slots for team and partner logos. Swap the slot for the logo; keep the spacing.
          </p>
        </div>
        <a href={SJB_LOCKUPS.pack} download="sjb-lockups-pack.zip" className={solid}>
          <Download className="h-3.5 w-3.5" /> All lockups (ZIP)
        </a>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {SJB_LOCKUPS.items.map((i) => <LockupCard key={i.id} item={i} />)}
      </div>
    </div>
  );
}
