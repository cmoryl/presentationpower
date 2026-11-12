import { useState } from "react";
import { Button } from "@/design-system/element";
import { SJB_ATTENDEE_TYPES, SJB_BADGE_COMPS, SJB_BADGE_SIZE, SJB_SHIRT_COMPS } from "@/lib/sjb-merch-comps";
import { SjbBadgeFace, SjbShirt } from "./SjbMerchArt";

function CompNote() {
  return <p className="mt-2 max-w-3xl text-sm text-muted-foreground">These are <strong>comps</strong> — design directions to choose finals from, not print-ready files. Names are samples; every date, venue and matchup comes from the announced event facts.</p>;
}

export function SjbBadgesPage() {
  const [type, setType] = useState(SJB_ATTENDEE_TYPES[0]!.id);
  const t = SJB_ATTENDEE_TYPES.find((x) => x.id === type)!;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-foreground">San Juan Bowl attendee badges</h1>
      <CompNote />
      <p className="mt-1 text-sm text-muted-foreground">Size: {SJB_BADGE_SIZE.trimW} × {SJB_BADGE_SIZE.trimH} in plastic badge with dual hanging slots (same stock as NEXT), {SJB_BADGE_SIZE.bleed} in bleed. Back carries a QR to SANJUANBOWL.COM.</p>
      <div role="group" aria-label="Attendee type" className="mt-6 flex flex-wrap gap-2">
        {SJB_ATTENDEE_TYPES.map((a) => <Button key={a.id} size="sm" variant={a.id === type ? "default" : "outline"} aria-pressed={a.id === type} onClick={() => setType(a.id)}>{a.label}</Button>)}
      </div>
      <div className="mt-8 space-y-12">
        {SJB_BADGE_COMPS.map((c) => (
          <section key={c.id} aria-labelledby={`badge-${c.id}`}>
            <h2 id={`badge-${c.id}`} className="text-xl font-semibold text-foreground">{c.name}</h2>
            <p className="text-sm text-muted-foreground">{c.idea}</p>
            <div className="mt-4 grid max-w-xl grid-cols-2 gap-6">
              {(["front", "back"] as const).map((s) => <figure key={s}><SjbBadgeFace comp={c} type={t} side={s} /><figcaption className="mt-2 text-sm capitalize text-muted-foreground">{s}</figcaption></figure>)}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

export function SjbShirtsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-foreground">San Juan Bowl marketing T-shirts</h1>
      <CompNote />
      <div className="mt-8 grid gap-10 md:grid-cols-2">
        {SJB_SHIRT_COMPS.map((c) => (
          <section key={c.id} aria-labelledby={`shirt-${c.id}`}>
            <h2 id={`shirt-${c.id}`} className="text-lg font-semibold text-foreground">{c.name}</h2>
            <p className="text-sm text-muted-foreground">{c.audience} · {c.idea}</p>
            <div className="mt-3 grid grid-cols-2 gap-4 rounded-md bg-muted p-4">
              {(["front", "back"] as const).map((s) => <figure key={s}><SjbShirt comp={c} side={s} /><figcaption className="text-center text-xs capitalize text-muted-foreground">{s}</figcaption></figure>)}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
