// Event assets: bring in the agenda and room list from a link or a file,
// check every row, save a draft, publish (admins and brand leads).

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, FileUp, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractEventAssets } from "@/lib/event-assets.functions";
import {
  blankRoom, blankSession, cleanRooms, cleanSessions, roomFlags, sessionFlags,
  type AssetRoom, type AssetSession,
} from "@/lib/event-assets";
import {
  saveAgendaVersion, saveRoomsVersion, useEventAssets, useRefreshEventAssets,
} from "@/lib/event-assets-data";

const MAX_FILE = 10 * 1024 * 1024;

async function toBase64(f: File) {
  const buf = new Uint8Array(await f.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

function mimeOf(f: File) {
  if (f.type) return f.type;
  const ext = f.name.split(".").pop()?.toLowerCase();
  return ext === "csv" ? "text/csv" : ext === "pdf" ? "application/pdf" : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : ext === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/octet-stream";
}

function useImporter(kind: "agenda" | "rooms") {
  const extract = useServerFn(extractEventAssets);
  const [busy, setBusy] = useState(false);
  const run = async (src: { url?: string; file?: File }) => {
    setBusy(true);
    try {
      if (src.file) {
        if (src.file.size > MAX_FILE) throw new Error("That file is over 10 MB.");
        const mime = mimeOf(src.file);
        const text = /^text\/|csv/.test(mime) ? await src.file.text() : undefined;
        return await extract({ data: text ? { kind, text } : { kind, file: { name: src.file.name, mime, base64: await toBase64(src.file) } } });
      }
      return await extract({ data: { kind, url: src.url } });
    } finally { setBusy(false); }
  };
  return { run, busy };
}

function ImportBar({ kind, onRows }: { kind: "agenda" | "rooms"; onRows: (rows: unknown, source: { url?: string; file?: string; text: string }) => void }) {
  const [url, setUrl] = useState("");
  const { run, busy } = useImporter(kind);
  const go = async (src: { url?: string; file?: File }) => {
    try {
      const r = await run(src);
      const n = Array.isArray(r.rows) ? r.rows.length : 0;
      if (!n) toast.error("Nothing was found in that source."); else toast.success(`Read ${n} ${kind === "agenda" ? "sessions" : "rooms"}. Check them before publishing.`);
      onRows(r.rows, { url: src.url, file: src.file?.name, text: r.sourceText });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't read that source."); }
  };
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[260px] flex-1 text-xs font-semibold text-foreground">
        Web link
        <Input className="mt-1" type="url" placeholder="https://…/agenda" value={url} onChange={(e) => setUrl(e.target.value)} />
      </label>
      <Button type="button" variant="outline" disabled={busy || !/^https?:\/\//.test(url)} onClick={() => go({ url })}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}Read link
      </Button>
      <label className="inline-flex">
        <input type="file" className="sr-only" accept=".pdf,.docx,.xlsx,.csv,.txt" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) go({ file: f }); }} />
        <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
          <FileUp className="h-4 w-4" />Upload file
        </span>
      </label>
    </div>
  );
}

const cell = "h-8 w-full rounded-sm border border-input bg-background px-2 text-[13px]";

export function EventAssetsPanel({ eventId }: { eventId: string }) {
  const q = useEventAssets(eventId);
  const refresh = useRefreshEventAssets(eventId);
  const d = q.data;

  // ── agenda editing state ───────────────────────────────────────────────
  const latestAgenda = d?.agendas[0];
  const [sessions, setSessions] = useState<AssetSession[] | null>(null);
  const [agSrc, setAgSrc] = useState<{ url?: string; file?: string; text?: string }>({});
  const [agDraftId, setAgDraftId] = useState<string | null>(null);
  useEffect(() => {
    if (sessions || !latestAgenda) return;
    setSessions(latestAgenda.sessions);
    setAgDraftId(latestAgenda.status === "draft" ? latestAgenda.id : null);
    setAgSrc({ url: latestAgenda.source_url ?? undefined, file: latestAgenda.source_file ?? undefined });
  }, [latestAgenda, sessions]);

  const latestRooms = d?.rooms[0];
  const [rooms, setRooms] = useState<AssetRoom[] | null>(null);
  const [rmSrc, setRmSrc] = useState<{ url?: string; file?: string; text?: string }>({});
  const [rmDraftId, setRmDraftId] = useState<string | null>(null);
  useEffect(() => {
    if (rooms || !latestRooms) return;
    setRooms(latestRooms.rooms);
    setRmDraftId(latestRooms.status === "draft" ? latestRooms.id : null);
  }, [latestRooms, rooms]);

  const [saving, setSaving] = useState<string | null>(null);
  const roomNames = useMemo(() => (d?.publishedRooms?.rooms ?? rooms ?? []).map((r) => r.name).filter(Boolean), [d, rooms]);
  const S = sessions ?? [];
  const R = rooms ?? [];
  const agFlags = S.map((s) => sessionFlags(s, agSrc.text));
  const agIssues = agFlags.filter((f) => f.length).length;
  const nextVer = (list: { version: number }[] | undefined) => (list?.[0]?.version ?? 0) + 1;

  const saveAgenda = async (status: "draft" | "published") => {
    setSaving(`agenda-${status}`);
    try {
      const id = await saveAgendaVersion({ eventId, status, sessions: S.filter((s) => s.title.trim()), sourceUrl: agSrc.url, sourceFile: agSrc.file, draftId: agDraftId, nextVersion: nextVer(d?.agendas) });
      setAgDraftId(status === "draft" ? id : null);
      toast.success(status === "published" ? "Agenda published. The agenda boards now use it." : "Draft saved.");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save."); }
    setSaving(null);
  };
  const saveRooms = async (status: "draft" | "published") => {
    setSaving(`rooms-${status}`);
    try {
      const id = await saveRoomsVersion({ eventId, status, rooms: R.filter((r) => r.name.trim()), sourceUrl: rmSrc.url, sourceFile: rmSrc.file, draftId: rmDraftId, nextVersion: nextVer(d?.rooms) });
      setRmDraftId(status === "draft" ? id : null);
      toast.success(status === "published" ? "Room list published." : "Draft saved.");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save."); }
    setSaving(null);
  };
  const patchS = (i: number, p: Partial<AssetSession>) => setSessions(S.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const patchR = (i: number, p: Partial<AssetRoom>) => setRooms(R.map((r, j) => (j === i ? { ...r, ...p } : r)));

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading event assets…</p>;
  if (q.isError) return <p className="text-sm text-destructive">{q.error instanceof Error ? q.error.message : "Couldn't load event assets."}</p>;
  if (!d?.signedIn) return <p className="text-sm text-muted-foreground">Sign in to add agendas, floor plans and room lists.</p>;

  const pub = (v: { version: number; published_at: string | null } | null | undefined) =>
    v ? `Version ${v.version} published ${v.published_at ? new Date(v.published_at).toLocaleDateString() : ""}` : "Nothing published yet";

  return (
    <div className="grid gap-10">
      {!d.canPublish ? (
        <p role="note" className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">You can import and save drafts. An admin or brand lead publishes them.</p>
      ) : null}

      {/* Agenda */}
      <section id="agenda" aria-labelledby="assets-agenda" className="scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="assets-agenda" className="text-lg font-semibold">Agenda</h2>
          <span className="text-xs text-muted-foreground">{pub(d.publishedAgenda)}{agDraftId ? " · draft open" : ""}</span>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Paste the agenda page link or upload the programme (PDF, Word, Excel or CSV). Every row is read as written; anything the source doesn't say stays blank and is flagged.</p>
        <div className="mt-4"><ImportBar kind="agenda" onRows={(rows, src) => { setSessions(cleanSessions(rows)); setAgSrc(src); }} /></div>

        {S.length ? (
          <div className="mt-4 overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1100px] text-left text-[13px]">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>{["Day", "Start", "End", "Title", "Speakers", "Room", "Division", "Type", ""].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {S.map((s, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="w-44 p-1"><input aria-label="Day" className={cell} value={s.day} onChange={(e) => patchS(i, { day: e.target.value })} /></td>
                    <td className="w-24 p-1"><input aria-label="Start" className={cell} value={s.start} onChange={(e) => patchS(i, { start: e.target.value })} /></td>
                    <td className="w-24 p-1"><input aria-label="End" className={cell} value={s.end} onChange={(e) => patchS(i, { end: e.target.value })} /></td>
                    <td className="p-1">
                      <input aria-label="Title" className={cell} value={s.title} onChange={(e) => patchS(i, { title: e.target.value })} />
                      {agFlags[i]!.length ? <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#B4501F]"><AlertTriangle className="h-3 w-3" aria-hidden />{agFlags[i]!.join(" · ")}</p> : null}
                    </td>
                    <td className="p-1"><input aria-label="Speakers" className={cell} value={s.speakers} onChange={(e) => patchS(i, { speakers: e.target.value })} /></td>
                    <td className="w-40 p-1">
                      <input aria-label="Room" list={`rooms-${eventId}`} className={cell} placeholder="To be confirmed" value={s.room} onChange={(e) => patchS(i, { room: e.target.value })} />
                    </td>
                    <td className="w-32 p-1"><input aria-label="Division" className={cell} placeholder="All" value={s.division} onChange={(e) => patchS(i, { division: e.target.value })} /></td>
                    <td className="w-28 p-1">
                      <select aria-label="Type" className={cell} value={s.kind} onChange={(e) => patchS(i, { kind: e.target.value as AssetSession["kind"] })}>
                        <option value="session">Session</option><option value="break">Break</option>
                      </select>
                    </td>
                    <td className="w-10 p-1"><Button type="button" size="icon" variant="ghost" aria-label="Delete row" onClick={() => setSessions(S.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id={`rooms-${eventId}`}>{roomNames.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setSessions([...S, blankSession(S[S.length - 1]?.day ?? "")])}><Plus className="h-4 w-4" />Add row</Button>
          <span className="flex-1 text-xs text-muted-foreground">{S.length ? `${S.length} rows · ${agIssues} to check` : "No rows yet."}</span>
          <Button type="button" variant="outline" disabled={!S.length || !!saving} onClick={() => saveAgenda("draft")}>{saving === "agenda-draft" ? "Saving…" : "Save draft"}</Button>
          <Button type="button" disabled={!S.length || !!saving || !d.canPublish} title={d.canPublish ? undefined : "Admins and brand leads publish"} onClick={() => saveAgenda("published")}>{saving === "agenda-published" ? "Publishing…" : "Publish agenda"}</Button>
        </div>
        {d.publishedAgenda ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Open the boards: <Link to="/events/next/agendas" search={{ edition: eventId } as never} className="font-semibold text-primary hover:underline">agenda builder</Link>
          </p>
        ) : null}
        <Versions list={d.agendas} onLoad={(v) => { setSessions(v.sessions); setAgDraftId(null); setAgSrc({ url: v.source_url ?? undefined, file: v.source_file ?? undefined }); toast.message(`Loaded version ${v.version}. Publish to make it current again.`); }} />
      </section>

      {/* Floor plans */}
      <section id="floors" aria-labelledby="assets-floors" className="scroll-mt-24">
        <h2 id="assets-floors" className="text-lg font-semibold">Floor plans</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {d.floors ? `${d.floors} level${d.floors === 1 ? "" : "s"} loaded.` : "No floor plans yet."} Upload each level as SVG, PDF or an image in the venue maps; scans are kept as images and aren't traced into rooms.
        </p>
        <Button asChild className="mt-3" variant="outline"><Link to="/events/next/maps/$eventId" params={{ eventId }}><FileUp className="h-4 w-4" />{d.floors ? "Open venue maps" : "Upload floor plans"}</Link></Button>
      </section>

      {/* Rooms */}
      <section id="rooms" aria-labelledby="assets-rooms" className="scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="assets-rooms" className="text-lg font-semibold">Room list</h2>
          <span className="text-xs text-muted-foreground">{pub(d.publishedRooms)}</span>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Paste a link or upload the venue's room list. Published rooms become the room choices in the agenda and for room signage.</p>
        <div className="mt-4"><ImportBar kind="rooms" onRows={(rows, src) => { setRooms(cleanRooms(rows)); setRmSrc(src); }} /></div>
        {R.length ? (
          <div className="mt-4 overflow-x-auto rounded-md border">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="bg-muted text-xs text-muted-foreground"><tr>{["Room", "Level", "Capacity", ""].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {R.map((r, i) => {
                  const fl = roomFlags(r, rmSrc.text);
                  return (
                    <tr key={i} className="border-t align-top">
                      <td className="p-1"><input aria-label="Room" className={cell} value={r.name} onChange={(e) => patchR(i, { name: e.target.value })} />
                        {fl.length ? <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#B4501F]"><AlertTriangle className="h-3 w-3" aria-hidden />{fl.join(" · ")}</p> : null}</td>
                      <td className="w-40 p-1"><input aria-label="Level" className={cell} value={r.level} onChange={(e) => patchR(i, { level: e.target.value })} /></td>
                      <td className="w-28 p-1"><input aria-label="Capacity" className={cell} value={r.capacity} onChange={(e) => patchR(i, { capacity: e.target.value })} /></td>
                      <td className="w-10 p-1"><Button type="button" size="icon" variant="ghost" aria-label="Delete room" onClick={() => setRooms(R.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setRooms([...R, blankRoom()])}><Plus className="h-4 w-4" />Add room</Button>
          <span className="flex-1" />
          <Button type="button" variant="outline" disabled={!R.length || !!saving} onClick={() => saveRooms("draft")}>{saving === "rooms-draft" ? "Saving…" : "Save draft"}</Button>
          <Button type="button" disabled={!R.length || !!saving || !d.canPublish} title={d.canPublish ? undefined : "Admins and brand leads publish"} onClick={() => saveRooms("published")}>{saving === "rooms-published" ? "Publishing…" : "Publish room list"}</Button>
        </div>
      </section>
    </div>
  );
}

function Versions<T extends { id: string; version: number; status: string; created_at: string }>({ list, onLoad }: { list: T[]; onLoad: (v: T) => void }) {
  if (list.length < 2 && !list.some((v) => v.status === "published")) return null;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Earlier versions ({list.length})</summary>
      <ul className="mt-2 grid gap-1">
        {list.map((v) => (
          <li key={v.id} className="flex items-center gap-3 text-xs">
            <span className="font-mono">v{v.version}</span>
            <span>{v.status === "published" ? "Published" : "Draft"} · {new Date(v.created_at).toLocaleString()}</span>
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => onLoad(v)}>Load</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
