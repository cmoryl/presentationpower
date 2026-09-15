import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Ruler, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { CityBadge } from "@/components/next/CityBadge";
import { useSignedIn } from "@/components/CloudDeckControls";
import { exportCityBadge } from "@/lib/next-city-badge-export";
import {
  BADGE_SPEC,
  CITY_BADGE_DEFAULT,
  CITY_BADGE_DIVISIONS,
  CITY_BADGE_ROLES,
  CITY_BADGE_FACE,
  normalizeCityBadgeConfig,
  type CityBadgeConfig,
  type CityBadgeFaceId,
} from "@/lib/next-city-badge";
import {
  deleteCityBadgeVersion,
  listCityBadgeVersions,
  saveCityBadgeVersion,
} from "@/lib/next-city-badge.functions";

export const Route = createFileRoute("/events/next_/city-badges")({
  validateSearch: (search: Record<string, unknown>) => ({
    division: typeof search.division === "string" ? search.division : undefined,
    face:
      search.face === "next"
        ? (search.face as CityBadgeFaceId)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "NEXT attendee badge studio · Print-ready template" },
      {
        name: "description",
        content:
          "The approved TransPerfect NEXT attendee badge template — front and back on the 4.33″ × 6.3″ dual-slot plastic sheet, with print-run versions exporting PDF, .ai and a proof PNG.",
      },
      { property: "og:title", content: "NEXT attendee badge studio" },
      {
        property: "og:description",
        content:
          "One NEXT badge template with per-division front and back live versions, press geometry, and saved print-run versions with PDF + .ai + proof exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CityBadgePage,
});

const PREVIEW_PPI = 96;

function CityBadgePage() {
  const signedIn = useSignedIn();
  const queryClient = useQueryClient();
  const listVersions = useServerFn(listCityBadgeVersions);
  const saveVersion = useServerFn(saveCityBadgeVersion);
  const removeVersion = useServerFn(deleteCityBadgeVersion);

  const { division: divisionParam, face: faceParam } = Route.useSearch();
  const [config, setConfig] = useState<CityBadgeConfig>(() =>
    normalizeCityBadgeConfig({
      ...CITY_BADGE_DEFAULT,
      ...(divisionParam ? { divisionId: divisionParam } : {}),
      ...(faceParam ? { face: faceParam } : {}),
    }),
  );
  const [versionName, setVersionName] = useState("City Series · Q4 run");
  const [notes, setNotes] = useState("");
  const [guides, setGuides] = useState(false);
  const [busy, setBusy] = useState(false);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);

  const versions = useQuery({
    queryKey: ["city-badge-versions"],
    queryFn: () => listVersions(),
    enabled: signedIn === true,
  });

  const save = useMutation({
    mutationFn: () => saveVersion({ data: { name: versionName, notes, status: "draft", config } }),
    onSuccess: () => {
      toast.success("Print-run version saved", { description: versionName });
      queryClient.invalidateQueries({ queryKey: ["city-badge-versions"] });
    },
    onError: (e: Error) => toast.error("Could not save version", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeVersion({ data: { id } }),
    onSuccess: () => {
      toast.success("Version removed");
      queryClient.invalidateQueries({ queryKey: ["city-badge-versions"] });
    },
    onError: (e: Error) => toast.error("Could not remove version", { description: e.message }),
  });

  const set = <K extends keyof CityBadgeConfig>(key: K, value: CityBadgeConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const runExport = async (name: string, cfg: CityBadgeConfig) => {
    const node = plateRef.current;
    if (!node) return;
    setBusy(true);
    const id = toast.loading("Preparing the print package…");
    try {
      const result = await exportCityBadge({
        node,
        backNode: backRef.current,
        nativeWidth: BADGE_SPEC.bleedW * PREVIEW_PPI,

        nativeHeight: BADGE_SPEC.bleedH * PREVIEW_PPI,
        config: cfg,
        versionName: name,
        onProgress: (p) => toast.loading(p.label, { id }),
      });
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Print package downloaded", {
        id,
        description: `PDF + .ai + proof · plate ${result.plate.width}×${result.plate.height}px at ${result.plate.dpi} ppi`,
      });
      if (!result.x4) {
        toast.warning("Exported without PDF/X-4 wrap — re-export online before press", { id });
      }
    } catch (e) {
      toast.error("Export failed", { id, description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] outline-none focus:border-[#003FC7]";
  const label = "text-xs font-medium text-black/60";

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> NEXT 2026 hub
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#03002C]">
          NEXT attendee badge
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/60">
          One approved NEXT template for every area, run full bleed on the {BADGE_SPEC.trimW}″ ×{" "}
          {BADGE_SPEC.trimH}″ dual-slot plastic sheet with the BLE Klik cutout. Pick a division and
          its white-with-accent lockup prints on the front and the back, pick the attendee tier, then
          export PDF, an Illustrator twin and a proof PNG.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* Live plate */}
          <div>
            <div className="rounded-2xl border border-black/10 bg-[#F2F2F2] p-5">
              <div className="flex flex-wrap items-start justify-center gap-5">
                <div>
                  <div className="overflow-hidden rounded-xl shadow-lg">
                    <div ref={plateRef}>
                      <CityBadge config={config} ppi={PREVIEW_PPI} guides={guides} />
                    </div>
                  </div>
                  <div className="mt-2 text-center text-[11px] font-medium uppercase tracking-wide text-black/50">
                    Front
                  </div>
                </div>
                <div>
                  <div className="overflow-hidden rounded-xl shadow-lg">
                    <div ref={backRef}>
                      <CityBadge config={config} ppi={PREVIEW_PPI} guides={guides} side="back" />
                    </div>
                  </div>
                  <div className="mt-2 text-center text-[11px] font-medium uppercase tracking-wide text-black/50">
                    Back — same logo swap, no copy
                  </div>
                </div>
              </div>

              <label className="mt-4 flex items-center justify-center gap-2 text-xs text-black/60">
                <input
                  type="checkbox"
                  checked={guides}
                  onChange={(e) => setGuides(e.target.checked)}
                />
                Show bleed / trim / safe-area and cutout guides
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-white p-5 text-xs leading-relaxed text-black/60">
              <div className="flex items-center gap-2 text-[#03002C]">
                <Ruler size={14} /> <span className="font-medium">Press geometry</span>
              </div>
              <ul className="mt-2 space-y-1">
                <li>
                  Trim {BADGE_SPEC.trimW}″ × {BADGE_SPEC.trimH}″ · bleed {BADGE_SPEC.bleedW}″ ×{" "}
                  {BADGE_SPEC.bleedH}″ ({BADGE_SPEC.bleed}″ per edge)
                </li>
                <li>
                  Safe area {BADGE_SPEC.safeW}″ × {BADGE_SPEC.safeH}″ · dual top slots · BLE Klik
                  cutout {BADGE_SPEC.klik.w}″ × {BADGE_SPEC.klik.h}″
                </li>
                <li>
                  {BADGE_SPEC.colorMode} at output, {BADGE_SPEC.minImageDpi} ppi minimum, exported
                  as {BADGE_SPEC.exportPreset}
                </li>
              </ul>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-sm font-semibold text-[#03002C]">Badge logo</h2>
              <p className="mt-1 text-xs text-black/55">
                One general NEXT badge. Picking a division swaps the mark at the head of the artwork
                on both the front and the back — nothing else is added or changed.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {CITY_BADGE_DIVISIONS.map((div) => {
                  const active = config.divisionId === div.id;
                  return (
                    <button
                      key={div.id}
                      type="button"
                      onClick={() => set("divisionId", div.id)}
                      className={`flex items-center gap-2 rounded-lg border p-2 text-left transition ${
                        active
                          ? "border-[#003FC7] bg-[#003FC7]/5"
                          : "border-black/10 hover:border-black/25"
                      }`}
                    >
                      <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-[#03002C] p-1">
                        <img
                          src={div.whiteUrl || div.colorUrl}
                          alt={div.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </span>
                      <span className="text-[11px] font-medium leading-tight text-[#03002C]">
                        {div.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs text-black/70">
                <input
                  type="checkbox"
                  checked={config.showLockup}
                  onChange={(e) => set("showLockup", e.target.checked)}
                />
                Print this division lockup on the front and back
              </label>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-4">
              <h2 className="text-sm font-semibold text-[#03002C]">Template</h2>
              <p className="mt-1.5 text-[11.5px] leading-snug text-black/60">
                {CITY_BADGE_FACE.description} It is the only badge template — the earlier dark,
                light and City Series faces are retired, so every division area prints the same
                artwork with its own lockup.
              </p>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-sm font-semibold text-[#03002C]">Blank below the lockup</h2>
              <p className="mt-1.5 text-[11.5px] leading-snug text-black/60">
                The clear area under the lockup is covered by the badge sleeve, so nothing is
                printed there — no attendee name, tier, company or event line. Each template is the
                approved artwork plus that division&rsquo;s lockup on the front and the back.
              </p>
            </section>


            <section className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-sm font-semibold text-[#03002C]">Print run</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  Version name
                  <input
                    className={`mt-1 ${field}`}
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                  />
                </label>
                <label className={label}>
                  Production notes
                  <input
                    className={`mt-1 ${field}`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Quantity, substrate, printer"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runExport(versionName, config)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#03002C] disabled:opacity-50"
                >
                  <Download size={15} /> Export PDF + .ai + proof
                </button>
                <button
                  type="button"
                  disabled={signedIn !== true || save.isPending || versionName.trim().length < 2}
                  onClick={() => save.mutate()}
                  className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-sm font-medium text-[#03002C] transition hover:border-black/35 disabled:opacity-50"
                >
                  <Save size={15} /> {save.isPending ? "Saving…" : "Save version"}
                </button>
              </div>
              {signedIn === false ? (
                <p className="mt-3 text-xs text-black/55">
                  <Link to="/auth" className="text-[#003FC7] hover:underline">
                    Sign in
                  </Link>{" "}
                  to save print-run versions. Exporting works either way.
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-sm font-semibold text-[#03002C]">Saved versions</h2>
              {signedIn !== true ? (
                <p className="mt-2 text-xs text-black/55">Sign in to see saved print runs.</p>
              ) : versions.isLoading ? (
                <p className="mt-2 text-xs text-black/55">Loading…</p>
              ) : (versions.data?.length ?? 0) === 0 ? (
                <p className="mt-2 text-xs text-black/55">
                  No saved runs yet. Configure a badge above and save it.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-black/10">
                  {(versions.data ?? []).map((row) => {
                    const cfg = normalizeCityBadgeConfig(row.config);
                    return (
                      <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-[#03002C]">
                            {row.name}
                          </div>
                          <div className="truncate text-[11px] text-black/55">
                            NEXT template · {cityBadgeDivision(cfg.divisionId).name}
                            {row.notes ? ` · ${row.notes}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setConfig(cfg);
                            setVersionName(row.name);
                            setNotes(row.notes ?? "");
                            toast.success("Version loaded into the editor");
                          }}
                          className="rounded-full border border-black/15 px-3 py-1 text-xs text-[#03002C] hover:border-black/35"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            setConfig(cfg);
                            await new Promise((r) => requestAnimationFrame(() => r(null)));
                            await runExport(row.name, cfg);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1 text-xs text-[#03002C] hover:border-black/35 disabled:opacity-50"
                        >
                          <Download size={12} /> Export
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${row.name}`}
                          onClick={() => del.mutate(row.id)}
                          className="rounded-full border border-black/15 p-1.5 text-black/50 hover:border-[#E53D2E] hover:text-[#E53D2E]"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
