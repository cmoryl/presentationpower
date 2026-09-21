// Interactive viewer for the issued QEII Centre floor sheets.
//
// Floor chips switch the sheet, the sheet is shown as framed artwork (never as a
// background), and the room directory beside it jumps to the floor a room is on.
// Downloads are the supplied artwork itself — one sheet, or the full eight-page
// PDF, unchanged.

import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileDown, Maximize2, Pencil, Printer, Save, Search, X } from "lucide-react";

import { useSessionUser } from "@/hooks/use-session-user";
import { QeiiMapEditPanel } from "@/components/events/QeiiMapEditPanel";
import {
  EMPTY_QEII_MAP_EDITS,
  qeiiApplyRoomEdit,
  type QeiiMapEdits,
} from "@/lib/qeii-map-edits";
import {
  listVenueMapEdits,
  resetVenueMapEdits,
  saveVenueMapEdits,
} from "@/lib/qeii-map-edits.functions";

import { QeiiFloorPlan } from "@/components/events/QeiiFloorPlan";
import { PlanZoomFrame } from "@/components/events/PlanZoomFrame";
import {
  QEII_WALL_WEIGHT,
  QEII_WALL_WEIGHT_RANGE,
} from "@/lib/next-london-qeii-symbols";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { QeiiRoomColourPanel } from "@/components/events/QeiiRoomColourPanel";
import {
  qeiiColourByDivision,
  qeiiSharedShapeNotes,
  type QeiiRoomColours,
} from "@/lib/next-london-qeii-rooms";
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

const VIEW_STORAGE_KEY = "tp-element:qeii-plan-view:v1";

/** The venue these saved map edits belong to. */
const VENUE_SLUG = "next-2026-london";

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
  const [wallWeight, setWallWeight] = useState(QEII_WALL_WEIGHT);
  const [showAllSymbols, setShowAllSymbols] = useState(false);
  // A search result is ringed on the plan so it can actually be found.
  const [highlightRoom, setHighlightRoom] = useState<string | undefined>(undefined);
  const [printing, setPrinting] = useState(false);
  const [printNote, setPrintNote] = useState<string | undefined>(undefined);
  // Live editing: room names, the line beneath them and nudged positions, saved
  // for the whole crew rather than kept in one browser.
  const [editsMap, setEditsMap] = useState<Record<string, QeiiMapEdits>>({});
  const [savedAt, setSavedAt] = useState<Record<string, string | null>>({});
  const [editMode, setEditMode] = useState(false);
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | undefined>(undefined);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const userId = useSessionUser();
  const readEdits = useServerFn(listVenueMapEdits);
  const writeEdits = useServerFn(saveVenueMapEdits);
  const clearEdits = useServerFn(resetVenueMapEdits);

  // The crew set a plan up once and come back to it, so the view settings and
  // room colours are kept in this browser rather than reset on every visit.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<{
        face: QeiiPlanFace;
        labelScale: number;
        showLabels: boolean;
        showUse: boolean;
        showMarks: boolean;
        markVariant: QeiiMarkVariant;
        markScale: number;
        wallWeight: number;
        showAllSymbols: boolean;
        roomColourMap: Record<string, QeiiRoomColours>;
        keyLabelMap: Record<string, Record<string, string>>;
      }>;
      if (saved.face) setFace(saved.face);
      if (typeof saved.labelScale === "number") setLabelScale(saved.labelScale);
      if (typeof saved.showLabels === "boolean") setShowLabels(saved.showLabels);
      if (typeof saved.showUse === "boolean") setShowUse(saved.showUse);
      if (typeof saved.showMarks === "boolean") setShowMarks(saved.showMarks);
      if (saved.markVariant) setMarkVariant(saved.markVariant);
      if (typeof saved.markScale === "number") setMarkScale(saved.markScale);
      if (typeof saved.wallWeight === "number") setWallWeight(saved.wallWeight);
      if (typeof saved.showAllSymbols === "boolean") setShowAllSymbols(saved.showAllSymbols);
      if (saved.roomColourMap) setRoomColourMap(saved.roomColourMap);
      if (saved.keyLabelMap) setKeyLabelMap(saved.keyLabelMap);
    } catch {
      // A stored setting we cannot read is ignored; the house defaults stand.
    }
  }, []);


  // Saved edits are read for everyone, signed in or not, so a vendor opening the
  // link sees the same corrected plans the crew saved.
  useEffect(() => {
    let active = true;
    readEdits({ data: { venueSlug: VENUE_SLUG } })
      .then((res) => {
        if (!active) return;
        const next: Record<string, QeiiMapEdits> = {};
        const when: Record<string, string | null> = {};
        for (const floor of res.floors) {
          next[floor.floorId] = floor.edits;
          when[floor.floorId] = floor.updatedAt;
        }
        setEditsMap(next);
        setSavedAt(when);
        // A saved colour set is the crew's, so it outranks this browser's copy.
        setRoomColourMap((prev) => {
          const merged = { ...prev };
          for (const floor of res.floors) {
            if (Object.keys(floor.edits.colours).length) merged[floor.floorId] = floor.edits.colours;
          }
          return merged;
        });
        setKeyLabelMap((prev) => {
          const merged = { ...prev };
          for (const floor of res.floors) {
            if (Object.keys(floor.edits.keyLabels).length)
              merged[floor.floorId] = floor.edits.keyLabels;
          }
          return merged;
        });
      })
      .catch(() => {
        // Saved edits could not be read; the issued plans stand and the page works.
        if (active) setSaveNote("Saved map edits could not be read just now, so these plans are the issued ones.");
      });
    return () => {
      active = false;
    };
  }, [readEdits]);

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
        ? qeiiPlanLayout(plan.floor, {
            labelScale,
            showUse,
            showMarks,
            markScale,
            edits: editsMap[plan.floor.id],
          }).notes
        : [],
    [plan, labelScale, showUse, showMarks, markScale, editsMap],
  );
  const uses = useMemo(() => spaceUsesOnFloor(sheet.id), [sheet.id]);
  const roomColours = roomColourMap[sheet.id] ?? {};
  const keyLabels = keyLabelMap[sheet.id] ?? {};
  const edits = editsMap[sheet.id] ?? EMPTY_QEII_MAP_EDITS;

  function setEdits(next: QeiiMapEdits) {
    setEditsMap({ ...editsMap, [sheet.id]: next });
    setDirty({ ...dirty, [sheet.id]: true });
  }

  /** Save this floor's edits, colours and key names for the whole crew. */
  async function saveFloorEdits() {
    setSaving(true);
    setSaveNote(undefined);
    try {
      const payload: QeiiMapEdits = { ...edits, colours: roomColours, keyLabels };
      const res = await writeEdits({
        data: { venueSlug: VENUE_SLUG, floorId: sheet.id, edits: payload },
      });
      setEditsMap({ ...editsMap, [sheet.id]: res.floor.edits });
      setSavedAt({ ...savedAt, [sheet.id]: res.floor.updatedAt });
      setDirty({ ...dirty, [sheet.id]: false });
      setSaveNote(`${sheet.title} saved for everyone.`);
    } catch (err) {
      setSaveNote(
        err instanceof Error
          ? `Nothing was saved: ${err.message}`
          : "Nothing was saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  /** Put this floor back to exactly what the venue issued, for everyone. */
  async function resetFloorEdits() {
    setSaving(true);
    setSaveNote(undefined);
    try {
      await clearEdits({ data: { venueSlug: VENUE_SLUG, floorId: sheet.id } });
      setEditsMap({ ...editsMap, [sheet.id]: EMPTY_QEII_MAP_EDITS });
      setRoomColourMap({ ...roomColourMap, [sheet.id]: {} });
      setKeyLabelMap({ ...keyLabelMap, [sheet.id]: {} });
      setSavedAt({ ...savedAt, [sheet.id]: null });
      setDirty({ ...dirty, [sheet.id]: false });
      setSaveNote(`${sheet.title} is back to the issued plan for everyone.`);
    } catch (err) {
      setSaveNote(
        err instanceof Error ? `Nothing was changed: ${err.message}` : "Nothing was changed.",
      );
    } finally {
      setSaving(false);
    }
  }
  const sharedNotes = useMemo(
    () => (plan?.rebuilt && Object.keys(roomColours).length ? qeiiSharedShapeNotes(plan.floor) : []),
    [plan, roomColours],
  );

  const showRebuilt = rebuiltView && !!plan?.rebuilt;

  useEffect(() => {
    try {
      window.localStorage.setItem(
        VIEW_STORAGE_KEY,
        JSON.stringify({
          face,
          labelScale,
          showLabels,
          showUse,
          showMarks,
          markVariant,
          markScale,
          wallWeight,
          showAllSymbols,
          roomColourMap,
          keyLabelMap,
        }),
      );
    } catch {
      // Private browsing can refuse storage; the page still works this session.
    }
  }, [
    face,
    labelScale,
    showLabels,
    showUse,
    showMarks,
    markVariant,
    markScale,
    wallWeight,
    showAllSymbols,
    roomColourMap,
    keyLabelMap,
  ]);

  /** Which live export is being made, and what to tell the crew about it. */
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | undefined>(undefined);

  /**
   * One PDF of every floor, as each one currently reads — colours, room names,
   * event use and division lockups all carried. A floor that cannot be rebuilt
   * is carried as its issued sheet.
   */
  async function printAllFloorsPdf() {
    setPrinting(true);
    setPrintNote(undefined);
    try {
      const { exportQeiiFloorsPdf } = await import("@/lib/next-london-qeii-pdf");
      const pages = LONDON_VENUE_SHEETS.map((s) => {
        const state = qeiiPlanState(s.id);
        if (state?.rebuilt) {
          return {
            title: s.title,
            svg: qeiiPlanSvg(state.floor, {
              face,
              labelScale,
              showLabels,
              showUse,
              showMarks,
              markVariant,
              markScale,
              roomColours: roomColourMap[s.id] ?? {},
              keyLabels: keyLabelMap[s.id] ?? {},
              wallWeight,
              showAllSymbols,
              edits: editsMap[s.id],
            }),
          };
        }
        return {
          title: s.title,
          imageUrl: s.url,
          note: "Issued sheet — this floor is a placed picture in the issued design, so it is not rebuilt artwork.",
        };
      });
      const result = await exportQeiiFloorsPdf(pages, face);
      const lines = [`${result.pages} floor${result.pages === 1 ? "" : "s"} in ${result.filename}.`];
      for (const s of result.skipped) lines.push(`${s.title} is missing: ${s.reason}`);
      lines.push(...result.warnings);
      setPrintNote(lines.join(" "));
    } catch (err) {
      setPrintNote(
        err instanceof Error
          ? `The PDF could not be made: ${err.message}`
          : "The PDF could not be made.",
      );
    } finally {
      setPrinting(false);
    }
  }

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
      wallWeight,
      showAllSymbols,
      edits,
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
          <button
            type="button"
            className={btn}
            onClick={printAllFloorsPdf}
            disabled={printing}
          >
            <Printer className="h-4 w-4" />
            {printing ? "Making the PDF…" : "Print all floors (PDF)"}
          </button>
        </div>
      </div>

      {printNote ? (
        <p className="mt-3 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#03002C]/80">
          {printNote}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {LONDON_VENUE_SHEETS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === sheet.id}
            onClick={() => {
              setSheetId(s.id);
              setHighlightRoom(undefined);
            }}
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

            {userId ? (
              <>
                <button
                  type="button"
                  aria-pressed={editMode}
                  onClick={() => {
                    setEditMode(!editMode);
                    setPicked(undefined);
                  }}
                  className={`${chip} ${
                    editMode
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : "border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
                  }`}
                >
                  <Pencil className="mr-1.5 inline-block h-3.5 w-3.5" />
                  {editMode ? "Editing this map" : "Edit this map"}
                </button>
                {editMode ? (
                  <>
                    <button
                      type="button"
                      className={btn}
                      onClick={saveFloorEdits}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving…" : "Save for everyone"}
                    </button>
                    <button
                      type="button"
                      className={btn}
                      onClick={resetFloorEdits}
                      disabled={saving}
                    >
                      Back to the issued plan
                    </button>
                  </>
                ) : null}
              </>
            ) : null}

            <button
              type="button"
              aria-pressed={showAllSymbols}
              onClick={() => setShowAllSymbols(!showAllSymbols)}
              className={`${chip} border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]`}
            >
              {showAllSymbols ? "Every cubicle symbol" : "One bathroom symbol"}
            </button>

            <label className="flex items-center gap-2 text-[12px] text-[#03002C]/70">
              Wall weight
              <input
                type="range"
                min={QEII_WALL_WEIGHT_RANGE.min}
                max={QEII_WALL_WEIGHT_RANGE.max}
                step={0.05}
                value={wallWeight}
                onChange={(e) => setWallWeight(Number(e.target.value))}
                aria-label="Wall weight"
              />
              {wallWeight.toFixed(2)}×
            </label>

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
          onColours={(next) => {
            setRoomColourMap({ ...roomColourMap, [sheet.id]: next });
            setDirty({ ...dirty, [sheet.id]: true });
          }}
          keyLabels={keyLabels}
          onKeyLabels={(next) => {
            setKeyLabelMap({ ...keyLabelMap, [sheet.id]: next });
            setDirty({ ...dirty, [sheet.id]: true });
          }}
          onColourByDivision={() => {
            setRoomColourMap({ ...roomColourMap, [sheet.id]: qeiiColourByDivision(plan.floor) });
            setMarkVariant("white");
          }}
        />
      ) : null}

      {(saveNote || dirty[sheet.id] || savedAt[sheet.id]) ? (
        <p className="mt-3 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#03002C]/80">
          {saveNote ? `${saveNote} ` : ""}
          {dirty[sheet.id]
            ? "This floor has unsaved changes — only you can see them until you save."
            : savedAt[sheet.id]
              ? `Saved for everyone on ${new Date(savedAt[sheet.id]!).toLocaleString()}.`
              : ""}
        </p>
      ) : null}

      {showRebuilt && editMode && plan ? (
        <QeiiMapEditPanel
          floor={plan.floor}
          edits={edits}
          onEdits={setEdits}
          picked={picked}
          onPick={setPicked}
        />
      ) : null}

      {showRebuilt && highlightRoom ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-[#03002C]/75">
          <span className="rounded-full border border-[#003FC7]/40 bg-[#E0E8F5] px-3 py-1 font-semibold text-[#03002C]">
            {highlightRoom} ringed on the plan
          </span>
          <span>The ring is a screen aid only — it is not drawn into the download.</span>
          <button
            type="button"
            className="font-semibold text-[#003FC7] underline"
            onClick={() => setHighlightRoom(undefined)}
          >
            Clear
          </button>
        </p>
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
            <PlanZoomFrame label={sheet.title}>
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
              wallWeight={wallWeight}
              showAllSymbols={showAllSymbols}
              highlightRoom={highlightRoom}
              edits={edits}
              editable={editMode}
              onMoveRoom={(room, dx, dy) => setEdits(qeiiApplyRoomEdit(edits, room, { dx, dy }))}
              onPickRoom={(room) => setPicked(room)}
              className="block w-full bg-[#EEF1F7]"
            />
            </PlanZoomFrame>
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
                    onClick={() => {
                      setSheetId(r.sheetId);
                      setHighlightRoom(r.room);
                    }}
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
