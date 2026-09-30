// /events/next/signs/$eventId — build an event's sign set from the venue's sign
// list and approved templates, review every sign, and download the ready ones.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CircleDashed, Download, Hammer, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { getEventIntake } from "@/lib/event-intake.functions";
import { useEventAssets } from "@/lib/event-assets-data";
import { builtInEvent } from "@/lib/event-registry";
import { eventDisplayName } from "@/lib/event-names";
import { liveLayoutById } from "@/lib/next-california-kiosk-live";
import { liveFrontSvg } from "@/lib/next-california-kiosk-live-export";
import {
  canEditSigns, listSignSetEvents, listSignTemplates, listVenueSpots, loadSignEdits, loadSignSet, saveEventSign, saveSignSetChoices,
  type EventSignRow, type SignSpotRow, type SignTemplateRow,
} from "@/lib/sign-set-data";
import {
  SIGN_KIND_LABEL, SIGN_STATUS_LABEL, chosenTemplate, copyChoices, eventSignEditKey, fillSignFromEvent, signFileBase, templatesForSpot,
  type EventFacts, type SignKind,
} from "@/lib/sign-set";
import { signPrintChecks, signSetZip } from "@/lib/sign-set-export";

export const Route = createFileRoute("/events/next_/signs/$eventId")({
  ssr: false,
  head: ({ params }) => {
    const title = `Sign set · ${eventDisplayName(params.eventId)}`;
    const description = "Build every sign for this event from the venue's sign list and approved templates, review them and download the ready ones.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: SignSetPage,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";
const btn = "inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-[#F2F2F2] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]";
const primary = "inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0034a6] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] focus-visible:ring-offset-2";

async function loadVenueLink(eventId: string) {
  const link = await supabase.from("event_venues").select("venue_id").eq("event_id", eventId).maybeSingle();
  if (link.error) throw new Error(link.error.message);
  if (!link.data) return null;
  const v = await supabase.from("venues").select("id,slug,name,city").eq("id", link.data.venue_id).maybeSingle();
  if (v.error) throw new Error(v.error.message);
  return v.data;
}

function SignSetPage() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();
  const builtIn = builtInEvent(eventId);
  const fetchIntake = useServerFn(getEventIntake);
  const intake = useQuery({ queryKey: ["event-intake", eventId], queryFn: () => fetchIntake({ data: { eventId } }), retry: false });
  const assets = useEventAssets(eventId);
  const venue = useQuery({ queryKey: ["event-venue-link", eventId], queryFn: () => loadVenueLink(eventId), retry: false });
  const templates = useQuery({ queryKey: ["sign-templates"], queryFn: listSignTemplates, retry: false });
  const spots = useQuery({ queryKey: ["venue-sign-spots", venue.data?.id], queryFn: () => listVenueSpots(venue.data!.id), enabled: !!venue.data?.id });
  const set = useQuery({ queryKey: ["sign-set", eventId], queryFn: () => loadSignSet(eventId), retry: false });
  const others = useQuery({ queryKey: ["sign-set-events"], queryFn: listSignSetEvents, retry: false });
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [choices, setChoices] = useState<Partial<Record<SignKind, string>> | null>(null);
  const [qa, setQa] = useState<Record<string, { errors: number; notes: string[] }>>({});
  useEffect(() => { void canEditSigns().then(setCanEdit); }, []);

  const plan = intake.data?.plan;
  const name = builtIn?.name ?? plan?.name ?? eventDisplayName(eventId);
  const mapItem = intake.data?.intake.find((r) => r.item_key === "map_url");
  const facts: EventFacts = {
    eventName: name,
    dates: builtIn?.dates ?? plan?.dates_label ?? "",
    venue: builtIn?.venue ?? plan?.venue ?? venue.data?.name ?? "",
    city: builtIn?.city ?? plan?.city ?? venue.data?.city ?? "",
    mapUrl: mapItem?.status === "received" ? mapItem.source_url ?? "" : "",
    rooms: assets.data?.publishedRooms?.rooms ?? null,
    sessions: assets.data?.publishedAgenda?.sessions ?? null,
  };

  const approved = (templates.data ?? []).filter((t) => t.status === "approved");
  const spotList = spots.data ?? [];
  const current = choices ?? set.data?.choices ?? {};
  const kinds = [...new Set(spotList.map((s) => s.kind))];
  const signs = set.data?.signs ?? [];
  const bySpot = useMemo(() => new Map(signs.map((s) => [s.spot_id, s])), [signs]);

  const checklist = [
    { label: "Venue linked to this event", done: !!venue.data, link: venue.data ? { to: "/events/venues/$slug", params: { slug: venue.data.slug } } : { to: "/events/venues" } },
    { label: "Venue floors", done: (assets.data?.floors ?? 0) > 0, link: { to: "/events/next/maps/$eventId", params: { eventId } } },
    { label: "Room list published", done: !!assets.data?.publishedRooms, link: { to: "/events/next/intake/$eventId", params: { eventId } } },
    { label: "Agenda published", done: !!assets.data?.publishedAgenda, link: { to: "/events/next/intake/$eventId", params: { eventId } } },
    { label: "Sign list with measured sizes", done: spotList.length > 0 && spotList.every((s) => s.w_in != null && s.h_in != null), link: venue.data ? { to: "/events/venues/$slug", params: { slug: venue.data.slug } } : { to: "/events/venues" } },
    { label: "Template chosen for every sign type", done: kinds.length > 0 && kinds.every((k) => current[k]), link: null },
  ] as const;

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try { await fn(); toast.success(label); }
    catch (e) { toast.error(e instanceof Error ? e.message : "That didn't work."); }
    finally { setBusy(null); }
  }
  const refresh = () => qc.invalidateQueries({ queryKey: ["sign-set", eventId] });

  const saveChoices = (c: Partial<Record<SignKind, string>>, copiedFrom?: string) =>
    run(copiedFrom ? `Template choices copied from ${eventDisplayName(copiedFrom)}` : "Template choices saved", async () => {
      await saveSignSetChoices(eventId, c, copiedFrom);
      setChoices(null);
      await refresh();
    });

  const build = (overwrite: boolean) =>
    run("Sign set built", async () => {
      await saveSignSetChoices(eventId, current);
      let made = 0;
      for (const spot of spotList) {
        const t = chosenTemplate(spot, current, approved);
        if (!t) continue;
        const f = fillSignFromEvent(t, spot, facts);
        const keep = bySpot.get(spot.id);
        await saveEventSign({ eventId, spotId: spot.id, templateId: t.id, fields: f.values, status: f.status, edits: f.edits, overwriteEdits: overwrite || !keep || keep.template_id !== t.id });
        made++;
      }
      setChoices(null);
      await refresh();
      if (!made) throw new Error("No sign was built: choose an approved template for each sign type first.");
    });

  const downloadAll = () =>
    run("Sign set downloaded", async () => {
      const items = [];
      const skipped: string[] = [];
      const nextQa: typeof qa = {};
      for (const spot of spotList) {
        const s = bySpot.get(spot.id);
        const t = s && approved.find((x) => x.id === s.template_id);
        const L = t && liveLayoutById(t.layout_id);
        if (!s || !t || !L) { skipped.push(`${spot.label} — not built`); continue; }
        if (s.status !== "ready") { skipped.push(`${spot.label} — ${SIGN_STATUS_LABEL[s.status]}`); continue; }
        const edits = await loadSignEdits(eventSignEditKey(s.id));
        const checks = await signPrintChecks(L, edits);
        const errors = checks.filter((c) => c.level === "error");
        nextQa[s.id] = { errors: errors.length, notes: checks.map((c) => `${c.label}: ${c.issue}`) };
        if (errors.length) { skipped.push(`${spot.label} — print check failed (${errors.map((e) => e.issue).join("; ")})`); continue; }
        items.push({ base: signFileBase(eventId, spot.label), layout: L, edits });
      }
      setQa(nextQa);
      if (!items.length) throw new Error("No sign is ready and passing its print checks yet.");
      const blob = await signSetZip(name, items, skipped);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `rdraft-${eventId}-sign-set.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      if (skipped.length) toast.message(`${skipped.length} sign${skipped.length === 1 ? "" : "s"} left out — see the list in the zip's README.`);
    });

  const pastEvents = (others.data ?? []).filter((e) => e.event_id !== eventId && Object.keys(e.choices).length);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-5 pb-24 pt-8 text-[#03002C] sm:px-8">
        <Link to="/events/$eventId" params={{ eventId }} className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]">
          <ArrowLeft className="h-4 w-4" /> {name}
        </Link>
        <h1 className="mt-4 text-3xl font-bold leading-tight">Sign set</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-[#03002C]/75">
          Every sign on the venue's sign list, built from an approved template and filled from this event's published facts. Anything not yet published stays blank and flagged.
        </p>

        <section className={`${card} mt-6`} aria-labelledby="cl-h">
          <h2 id="cl-h" className="text-[17px] font-bold">Before you build</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-[14px]">
                {c.done ? <CheckCircle2 className="h-4 w-4 text-[#003FC7]" aria-hidden /> : <CircleDashed className="h-4 w-4 text-[#666666]" aria-hidden />}
                <span className={c.done ? "" : "font-semibold"}>{c.label}</span>
                <span className="sr-only">{c.done ? "done" : "to do"}</span>
                {!c.done && c.link ? <Link {...(c.link as never)} className="ml-auto text-[13px] font-semibold text-[#003FC7] hover:underline">Fix it</Link> : null}
              </li>
            ))}
          </ul>
          {!venue.isLoading && !venue.data && <p className="mt-3 text-[13px] text-[#666666]">This event isn't linked to a venue in the venue library yet, so there's no sign list to build from.</p>}
        </section>

        {spotList.length > 0 && (
          <section className={`${card} mt-6`} aria-labelledby="tc-h">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="tc-h" className="text-[17px] font-bold">Template for each sign type</h2>
              {pastEvents.length > 0 && canEdit && (
                <label className="text-[13px] font-semibold">Copy from{" "}
                  <select className="ml-1 rounded-md border border-[#03002C]/20 px-2 py-1 text-[13px]" value="" disabled={!!busy}
                    onChange={(e) => { const from = pastEvents.find((p) => p.event_id === e.target.value); if (from) void saveChoices({ ...current, ...copyChoices(from.choices, approved) }, from.event_id); }}>
                    <option value="">a past event…</option>
                    {pastEvents.map((p) => <option key={p.event_id} value={p.event_id}>{eventDisplayName(p.event_id)}</option>)}
                  </select>
                </label>
              )}
            </div>
            {set.data?.copiedFrom && <p className="mt-1 text-[12px] text-[#666666]">Choices copied from {eventDisplayName(set.data.copiedFrom)}. Rooms, sizes and dates always come from this event.</p>}
            {!approved.length && <p className="mt-2 text-[13px] text-[#666666]">No approved templates yet. Use “Save as template” in a sign editor, then approve it on the <Link to="/approvals" search={{ tab: "signs" }} className="font-semibold text-[#003FC7] hover:underline">Approvals page</Link>.</p>}
            <ul className="mt-4 divide-y divide-[#03002C]/10">
              {kinds.map((k) => {
                const ofKind = spotList.filter((s) => s.kind === k);
                const fit = new Map<string, SignTemplateRow>();
                for (const s of ofKind) for (const t of templatesForSpot(s, approved) as SignTemplateRow[]) fit.set(t.id, t);
                const opts = fit.size ? [...fit.values()] : approved.filter((t) => t.kind === k);
                return (
                  <li key={k} className="grid gap-2 py-3 sm:grid-cols-[180px_1fr] sm:items-center">
                    <div><p className="text-[14px] font-semibold">{SIGN_KIND_LABEL[k]}</p><p className="text-[12px] text-[#666666]">{ofKind.length} spot{ofKind.length === 1 ? "" : "s"}</p></div>
                    <select aria-label={`Template for ${SIGN_KIND_LABEL[k]} signs`} disabled={!canEdit} className="rounded-lg border border-[#03002C]/20 bg-white px-3 py-2 text-[14px]"
                      value={current[k] ?? ""} onChange={(e) => setChoices({ ...current, [k]: e.target.value || undefined })}>
                      <option value="">Choose a template…</option>
                      {opts.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.w_in} × {t.h_in} in</option>)}
                    </select>
                  </li>
                );
              })}
            </ul>
            {canEdit ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {choices && <button className={btn} disabled={!!busy} onClick={() => saveChoices(current)}>Save choices</button>}
                <button className={primary} disabled={!!busy || !kinds.some((k) => current[k])} onClick={() => build(false)}><Hammer className="h-4 w-4" /> {busy === "Sign set built" ? "Building…" : signs.length ? "Update the sign set" : "Build the sign set"}</button>
                {signs.length > 0 && <button className={btn} disabled={!!busy} onClick={() => { if (confirm("Rebuild every sign from its template? Changes made in the editor to these signs will be replaced.")) void build(true); }}>Rebuild from templates</button>}
              </div>
            ) : <p className="mt-3 text-[13px] text-[#666666]">Admins, brand leads and brand reviewers can build sign sets.</p>}
            {signs.length > 0 && <p className="mt-2 text-[12px] text-[#666666]">“Update” fills new signs and refreshes statuses; signs you've already edited keep your changes.</p>}
          </section>
        )}

        {spotList.length > 0 && (
          <section className="mt-8" aria-labelledby="rv-h">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="rv-h" className="text-[17px] font-bold">Review</h2>
              <button className={primary} disabled={!!busy || !signs.some((s) => s.status === "ready")} onClick={downloadAll}><Download className="h-4 w-4" /> {busy === "Sign set downloaded" ? "Checking and packing…" : "Download all ready signs"}</button>
            </div>
            <p className="mt-1 text-[12px] text-[#666666]">Each ready sign is print-checked before it goes in the zip. Files are named rdraft- until a revision is published.</p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {spotList.map((spot) => <SignCard key={spot.id} spot={spot} sign={bySpot.get(spot.id)} template={approved.find((t) => t.id === bySpot.get(spot.id)?.template_id)} qa={qa[bySpot.get(spot.id)?.id ?? ""]} choice={chosenTemplate(spot, current, approved)} />)}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function SignThumb({ signId, layoutId }: { signId: string; layoutId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true; let u: string | null = null;
    const L = liveLayoutById(layoutId);
    if (!L) return;
    void loadSignEdits(eventSignEditKey(signId)).then((e) => liveFrontSvg(L, e)).then((svg) => {
      if (!live) return;
      u = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      setUrl(u);
    }).catch(() => {});
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [signId, layoutId]);
  return url ? <img src={url} alt="" className="h-32 w-full rounded bg-[#F2F2F2] object-contain" /> : <div className="h-32 w-full rounded bg-[#F2F2F2]" aria-hidden />;
}

function SignCard({ spot, sign, template, qa, choice }: { spot: SignSpotRow; sign?: EventSignRow; template?: SignTemplateRow; qa?: { errors: number; notes: string[] }; choice: SignTemplateRow | null }) {
  const status = !sign ? "no_template" : qa?.errors ? "qa_failed" : sign.status;
  const missing = sign && template ? fillReasons(template, sign) : [];
  const size = spot.w_in != null && spot.h_in != null ? `${spot.w_in} × ${spot.h_in} in` : "Not measured";
  return (
    <li className="flex flex-col rounded-lg border border-[#03002C]/12 bg-white p-3">
      {sign && template ? <SignThumb signId={sign.id} layoutId={template.layout_id} /> : <div className="grid h-32 place-items-center rounded bg-[#F2F2F2] text-[12px] text-[#666666]">Not built yet</div>}
      <p className="mt-2 text-[14px] font-semibold">{spot.label}</p>
      <p className="text-[12px] text-[#666666]">{SIGN_KIND_LABEL[spot.kind]}{spot.room ? ` · ${spot.room}` : ""} · {size}</p>
      <p className={`mt-1 text-[13px] font-semibold ${status === "ready" ? "text-[#003FC7]" : ""}`}>{SIGN_STATUS_LABEL[status]}</p>
      {!sign && !choice && <p className="text-[12px] text-[#666666]">Choose a template for {SIGN_KIND_LABEL[spot.kind].toLowerCase()} signs.</p>}
      {missing.length > 0 && <ul className="mt-1 list-disc pl-4 text-[12px] text-[#666666]">{missing.map((m) => <li key={m}>{m}</li>)}</ul>}
      {qa?.notes.length ? <ul className="mt-1 list-disc pl-4 text-[12px] text-[#666666]">{qa.notes.slice(0, 4).map((m) => <li key={m}>{m}</li>)}</ul> : null}
      {sign && <Link to="/events/next/sign-set-editor/$signId" params={{ signId: sign.id }} className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[13px] font-semibold text-[#003FC7] hover:underline"><Pencil className="h-3.5 w-3.5" aria-hidden /> Open in editor</Link>}
    </li>
  );
}

/** Which linked lines came out blank, in plain words. */
function fillReasons(t: SignTemplateRow, s: EventSignRow): string[] {
  if (s.status === "needs_measuring") return ["Measure this spot on the venue's sign list"];
  if (s.status === "size_mismatch") return [`The template is ${t.w_in} × ${t.h_in} in; pick one that matches the measured size`];
  return Object.entries(t.fields).filter(([id, k]) => k && !s.fields[id]).map(([, k]) => `No ${String(k).replace(/_/g, " ")} yet`);
}
