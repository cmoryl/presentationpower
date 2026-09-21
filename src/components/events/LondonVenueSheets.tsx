// Interactive viewer for the issued QEII Centre floor sheets.
//
// Floor chips switch the sheet, the sheet is shown as framed artwork (never as a
// background), and the room directory beside it jumps to the floor a room is on.
// Downloads are the supplied artwork itself — one sheet, or the full eight-page
// PDF, unchanged.

import { useMemo, useState } from "react";
import { Download, FileDown, Maximize2, Search, X } from "lucide-react";

import { QeiiFloorPlan } from "@/components/events/QeiiFloorPlan";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { QeiiRoomColourPanel } from "@/components/events/QeiiRoomColourPanel";
import { qeiiSharedShapeNotes, type QeiiRoomColours } from "@/lib/next-london-qeii-rooms";
import { spaceUseLine, spaceUseMarks, spaceUsesOnFloor } from "@/lib/next-london-space-use";

import {
  qeiiPlanFilename,
  qeiiPlanState,
  type QeiiMarkVariant,
  qeiiPlanSvg,
  type QeiiPlanFace,
} from "@/lib/next-london-qeii-plan";
import {
  LONDON_VENUE_SHEETS,
  VENUE_SHEET_LEGEND,
  VENUE_SHEET_PDF,
  searchVenueRooms,
  venueRoomDirectory,
  venueSheetFilename,
  type VenueSheet,
} from "@/lib/next-london-venue-sheets";


const chip =
  "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]";
const btn =
  "inline-flex items-center gap-2 rounded-full border border-[#03002C]/20 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-[#F2F2F2]";

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function LondonVenueSheets() {
  const [sheetId, setSheetId] = useState(LONDON_VENUE_SHEETS[0]!.id);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(false);
  const [rebuiltView, setRebuiltView] = useState(true);
  const [face, setFace] = useState<QeiiPlanFace>("issued");
  const [labelScale, setLabelScale] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [showUse, setShowUse] = useState(true);
  const [showMarks, setShowMarks] = useState(true);
  const [markVariant, setMarkVariant] = useState<QeiiMarkVariant>("reverse");
  const [markScale, setMarkScale] = useState(1);
  const [showColourPanel, setShowColourPanel] = useState(false);
  // Colours are held per floor, so one sheet's key never leaks onto another.
  const [roomColourMap, setRoomColourMap] = useState<Record<string, QeiiRoomColours>>({});
  const [keyLabelMap, setKeyLabelMap] = useState<Record<string, Record<string, string>>>({});


  const rows = useMemo(() => venueRoomDirectory(), []);
  const found = useMemo(() => {
    const byName = searchVenueRooms(query, rows);
    const q = query.trim().toLowerCase();
    if (!q) return byName;
    const seen = new Set(byName.map((r) => `${r.sheetId}|${r.room}`));
    // A search also finds a space by what it holds — "LegalNEXT", "Plenary", "Mart".
    const byUse = rows.filter(
      (r) =>
        !seen.has(`${r.sheetId}|${r.room}`) &&
        (spaceUseLine(r.room, r.sheetId) ?? "").toLowerCase().includes(q),
    );
    return [...byName, ...byUse];
  }, [query, rows]);

  const sheet: VenueSheet =
    LONDON_VENUE_SHEETS.find((s) => s.id === sheetId) ?? LONDON_VENUE_SHEETS[0]!;
  const plan = useMemo(() => qeiiPlanState(sheet.id), [sheet.id]);
  const planNotes = useMemo(
    () =>
      plan
        ? qeiiPlanLayout(plan.floor, { labelScale, showUse, showMarks, markScale }).notes
        : [],
    [plan, labelScale, showUse, showMarks, markScale],
  );
  const uses = useMemo(() => spaceUsesOnFloor(sheet.id), [sheet.id]);
  const roomColours = roomColourMap[sheet.id] ?? {};
  const keyLabels = keyLabelMap[sheet.id] ?? {};
  const sharedNotes = useMemo(
    () => (plan?.rebuilt && Object.keys(roomColours).length ? qeiiSharedShapeNotes(plan.floor) : []),
    [plan, roomColours],
  );

  const showRebuilt = rebuiltView && !!plan?.rebuilt;

  function downloadPlanSvg() {
    if (!plan?.rebuilt) return;
    const svg = qeiiPlanSvg(plan.floor, {
      face,
      labelScale,
      showLabels,
      showUse,
      showMarks,
      markVariant,
      markScale,
      roomColours,
      keyLabels,
    });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    download(url, qeiiPlanFilename(plan.floor, face));
    URL.revokeObjectURL(url);
  }


  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#03002C]/60">
            Venue floor sheets · Queen Elizabeth II Centre
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#03002C]">
            Every floor, as issued to the crew
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            onClick={() => download(sheet.url, venueSheetFilename(sheet))}
          >
            <Download className="h-4 w-4" /> This sheet (PNG)
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            onClick={() => download(VENUE_SHEET_PDF.url, VENUE_SHEET_PDF.filename)}
          >
            <FileDown className="h-4 w-4" /> All {VENUE_SHEET_PDF.pages} sheets (
            {VENUE_SHEET_PDF.paper} PDF)
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {LONDON_VENUE_SHEETS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === sheet.id}
            onClick={() => setSheetId(s.id)}
            className={`${chip} ${
              s.id === sheet.id
                ? "border-[#03002C] bg-[#03002C] text-white"
                : "border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
            }`}
          >
            {s.kind === "room" ? s.title : `${s.marker} · ${s.title}`}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={showRebuilt}
          disabled={!plan?.rebuilt}
          onClick={() => setRebuiltView(true)}
          className={`${chip} ${
            showRebuilt
              ? "border-[#003FC7] bg-[#003FC7] text-white"
              : "border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2] disabled:opacity-40"
          }`}
        >
          Rebuilt in Element
        </button>
        <button
          type="button"
          aria-pressed={!showRebuilt}
          onClick={() => setRebuiltView(false)}
          className={`${chip} ${
            !showRebuilt
              ? "border-[#03002C] bg-[#03002C] text-white"
              : "border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
          }`}
        >
          Issued artwork
        </button>
        {showRebuilt ? (
          <>
            <button
              type="button"
              aria-pressed={face === "element"}
              onClick={() => setFace(face === "element" ? "issued" : "element")}
              className={`${chip} ${
                face === "element"
                  ? "border-[#003FC7] bg-[#E0E8F5] text-[#03002C]"
                  : "border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
              }`}
            >
              {face === "element" ? "Enterprise inks on" : "Enterprise inks off"}
            </button>
            <button
              type="button"
              aria-pressed={showLabels}
              onClick={() => setShowLabels(!showLabels)}
              className={`${chip} border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]`}
            >
              {showLabels ? "Room names on" : "Room names off"}
            </button>
            <button
              type="button"
              aria-pressed={showUse}
              onClick={() => setShowUse(!showUse)}
              className={`${chip} border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]`}
            >
              {showUse ? "Event use on" : "Event use off"}
            </button>
            <button
              type="button"
              aria-pressed={showMarks}
              onClick={() => setShowMarks(!showMarks)}
              className={`${chip} border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]`}
            >
              {showMarks ? "Division logos on" : "Division logos off"}
            </button>

            {showMarks ? (
              <>
                <span className="inline-flex overflow-hidden rounded-full border border-[#03002C]/20 bg-white">
                  {(
                    [
                      ["reverse", "Reverse logo"],
                      ["white", "All white logo"],
                      ["colour", "Colour logo"],
                    ] as [QeiiMarkVariant, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={markVariant === id}
                      onClick={() => setMarkVariant(id)}
                      className={`px-3 py-1.5 text-[12px] font-semibold ${
                        markVariant === id
                          ? "bg-[#03002C] text-white"
                          : "text-[#03002C] hover:bg-[#F2F2F2]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </span>
                <label className="flex items-center gap-2 text-[12px] text-[#03002C]/70">
                  Logo size
                  <input
                    type="range"
                    min={0.6}
                    max={2.4}
                    step={0.1}
                    value={markScale}
                    onChange={(e) => setMarkScale(Number(e.target.value))}
                    aria-label="Division logo size"
                  />
                  {markScale.toFixed(1)}×
                </label>
              </>
            ) : null}

            <button
              type="button"
              aria-pressed={showColourPanel}
              onClick={() => setShowColourPanel(!showColourPanel)}
              className={`${chip} ${
                showColourPanel
                  ? "border-[#003FC7] bg-[#003FC7] text-white"
                  : "border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
              }`}
            >
              Room colours &amp; key
            </button>

            <label className="flex items-center gap-2 text-[12px] text-[#03002C]/70">
              Name size
              <input
                type="range"
                min={0.8}
                max={1.6}
                step={0.05}
                value={labelScale}
                onChange={(e) => setLabelScale(Number(e.target.value))}
                aria-label="Room name size"
              />
              {labelScale.toFixed(2)}×
            </label>
            <button type="button" className={btn} onClick={downloadPlanSvg}>
              <Download className="h-4 w-4" /> This plan (editable SVG)
            </button>
          </>
        ) : null}
      </div>

      {plan && !plan.rebuilt ? (
        <p className="mt-3 rounded-xl border border-[#FFEB66] bg-[#FFEB66]/25 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#03002C]">
          {plan.reason}
        </p>
      ) : null}

      {showRebuilt && showColourPanel && plan ? (
        <QeiiRoomColourPanel
          floor={plan.floor}
          colours={roomColours}
          onColours={(next) => setRoomColourMap({ ...roomColourMap, [sheet.id]: next })}
          keyLabels={keyLabels}
          onKeyLabels={(next) => setKeyLabelMap({ ...keyLabelMap, [sheet.id]: next })}
        />
      ) : null}

      {showRebuilt && sharedNotes.length ? (
        <ul className="mt-4 space-y-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-[12px] text-[#03002C]/75">
          {sharedNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {showRebuilt && planNotes.length ? (
        <ul className="mt-4 space-y-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-[12px] text-[#03002C]/75">
          {planNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <figure className="overflow-hidden rounded-2xl border border-black/10 bg-[#F2F2F2]">

          {showRebuilt && plan ? (
            <QeiiFloorPlan
              floor={plan.floor}
              face={face}
              labelScale={labelScale}
              showLabels={showLabels}
              showUse={showUse}
              showMarks={showMarks}
              markVariant={markVariant}
              markScale={markScale}
              roomColours={roomColours}
              keyLabels={keyLabels}

              className="block w-full bg-[#EEF1F7]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setZoom(true)}
              aria-label={`Enlarge the ${sheet.title} sheet`}
              className="group relative block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
            >
              <img
                src={sheet.url}
                alt={`Queen Elizabeth II Centre ${sheet.title} plan, page ${sheet.page} of the issued set`}
                width={sheet.w}
                height={sheet.h}
                loading="lazy"
                className="block w-full"
              />
              <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#03002C]/85 px-3 py-1.5 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-3.5 w-3.5" /> Enlarge
              </span>
            </button>
          )}
          <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 bg-white px-4 py-3 text-[12px] text-[#03002C]/70">
            <span>
              {showRebuilt
                ? `Page ${sheet.page} rebuilt as native artwork · ${plan?.floor.shapes.length} shapes, ${plan?.floor.labels.length} names`
                : `Page ${sheet.page} of ${VENUE_SHEET_PDF.pages} · issued venue artwork`}
            </span>
            <span>
              {showRebuilt && plan
                ? `${Math.round(plan.floor.w)} × ${Math.round(plan.floor.h)} units`
                : `${sheet.w} × ${sheet.h} px`}
            </span>
          </figcaption>
        </figure>


        <div>
          <h3 className="text-sm font-semibold text-[#03002C]">{sheet.title}</h3>
          {sheet.note ? (
            <p className="mt-2 text-[13px] leading-relaxed text-[#03002C]/75">{sheet.note}</p>
          ) : null}
          {sheet.capacities?.length ? (
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {sheet.capacities.map((c) => (
                <div key={c.label} className="rounded-xl border border-black/10 bg-white px-3 py-2">
                  <dd className="text-lg font-semibold tracking-tight text-[#03002C]">{c.value}</dd>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#03002C]/60">
                    {c.label}
                  </dt>
                </div>
              ))}
            </dl>
          ) : null}

          {sheet.rooms.length ? (
            <>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#03002C]/60">
                Rooms on this sheet
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {sheet.rooms.map((r) => (
                  <li
                    key={r}
                    className="rounded-full border border-[#003FC7]/30 bg-[#E0E8F5] px-2.5 py-1 text-[12px] font-semibold text-[#03002C]"
                  >
                    {r}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {uses.length ? (
            <>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#03002C]/60">
                What this floor holds at NEXT 2026
              </p>
              <ul className="mt-2 divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
                {uses.map((u) => (
                  <li key={`${u.space}-${u.event}`} className="flex items-center gap-3 px-3 py-2">
                    {spaceUseMarks(u.space, u.sheetId).map((m) => (
                      <img
                        key={m.divisionId}
                        src={m.url}
                        alt={`${m.name} NEXT lockup`}
                        className="h-7 w-auto shrink-0"
                      />
                    ))}
                    <span className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#03002C]">{u.space}</p>
                    <p className="text-[12px] text-[#03002C]/70">
                      {u.fn ? `${u.fn} · ` : ""}
                      {u.event}
                    </p>
                    {u.fn ? null : (
                      <p className="mt-0.5 text-[11px] text-[#03002C]/55">
                        No function recorded for this space.
                      </p>
                    )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}



          {sheet.facilities.length ? (
            <>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#03002C]/60">
                Also marked
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {sheet.facilities.map((f) => (
                  <li
                    key={f}
                    className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[12px] text-[#03002C]/80"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#03002C]/60">
            Sheet legend
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#03002C]/70">
            {VENUE_SHEET_LEGEND.join(" · ")}
          </p>

          <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
            <label
              htmlFor="venue-room-search"
              className="flex items-center gap-2 text-sm font-semibold text-[#03002C]"
            >
              <Search className="h-4 w-4 text-[#003FC7]" /> Room directory
            </label>
            <input
              id="venue-room-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a room — Fleming, Abbey, Churchill…"
              className="mt-2 w-full rounded-xl border border-black/15 px-3 py-2 text-[13px] text-[#03002C] focus:border-[#003FC7] focus:outline-none"
            />
            <p className="mt-2 text-[11.5px] text-[#03002C]/60">
              {found.length} of {rows.length} spaces
            </p>
            <ul className="mt-2 max-h-72 divide-y divide-black/5 overflow-y-auto">
              {found.map((r) => (
                <li key={`${r.sheetId}-${r.room}`}>
                  <button
                    type="button"
                    onClick={() => setSheetId(r.sheetId)}
                    className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left text-[13px] text-[#03002C] hover:bg-[#F2F2F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
                  >
                    {spaceUseMarks(r.room, r.sheetId).map((m) => (
                      <img
                        key={m.divisionId}
                        src={m.url}
                        alt={`${m.name} NEXT lockup`}
                        className="mr-2 inline-block h-5 w-auto align-middle"
                      />
                    ))}
                    <span className="min-w-0">
                      <span className={`block ${r.kind === "room" ? "font-semibold" : ""}`}>
                        {r.room}
                      </span>
                      {spaceUseLine(r.room, r.sheetId) ? (
                        <span className="block text-[11.5px] text-[#03002C]/60">
                          {spaceUseLine(r.room, r.sheetId)}
                        </span>
                      ) : null}
                    </span>

                    <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#03002C]/55">
                      {r.marker} · {r.floor}
                    </span>
                  </button>
                </li>
              ))}
              {found.length === 0 ? (
                <li className="py-3 text-[13px] text-[#03002C]/65">
                  No room of that name is printed on these sheets.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>

      {zoom ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${sheet.title} sheet, enlarged`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#03002C]/90 p-4"
          onClick={() => setZoom(false)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-5 top-5 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            onClick={() => setZoom(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={sheet.url}
            alt={`Queen Elizabeth II Centre ${sheet.title} plan, enlarged`}
            className="max-h-full max-w-full rounded-xl bg-white object-contain"
          />
        </div>
      ) : null}
    </section>
  );
}
