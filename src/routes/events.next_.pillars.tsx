import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";

import { AppShell } from "@/components/AppShell";
import { PillarStudio } from "@/components/next/PillarStudio";
import { pickPillarFile, useSavedPillarFiles } from "@/hooks/use-next-live-masters";
import {
  pillarDefault,
  pillarDivision,
  pillarKind,
  type PillarConfig,
  type PillarKindId,
} from "@/lib/next-pillar-masters";

type PillarSearch = {
  division?: string;
  kind?: PillarKindId;
  face?: "dark" | "light";
  file?: string;
};

const KINDS: PillarKindId[] = ["welcome", "registration", "logo", "directional"];

export const Route = createFileRoute("/events/next_/pillars")({
  validateSearch: (search: Record<string, unknown>): PillarSearch => ({
    division: typeof search.division === "string" ? search.division : undefined,
    kind: KINDS.includes(search.kind as PillarKindId) ? (search.kind as PillarKindId) : undefined,
    face: search.face === "light" || search.face === "dark" ? search.face : undefined,
    file: typeof search.file === "string" ? search.file : undefined,
  }),

  head: () => ({
    meta: [
      { title: "NEXT master pillar signs · Welcome, registration, logo, directional" },
      {
        name: "description",
        content:
          "Press-ready TransPerfect NEXT pillar signs — welcome, registration, general logo and directional — on the approved London gradient grounds, available for every NEXT division area.",
      },
      { property: "og:title", content: "NEXT master pillar signs" },
      {
        property: "og:description",
        content:
          "Four master pillar kinds on the approved NEXT gradient grounds, with division lockup swapping, real print QR codes and PDF + .ai + proof exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PillarPage,
});

function PillarPage() {
  const { division, kind, face, file } = Route.useSearch();
  const saved = useSavedPillarFiles();

  // Prefer the saved live file for this division / kind / face so the editor and
  // the hub preview cards always show the same, latest artwork.
  const savedRow = useMemo(() => {
    if (file) return saved.data?.find((row) => row.id === file);
    if (!division && !kind && !face) return undefined;
    return pickPillarFile(
      saved.data,
      division ?? "city-series",
      kind ?? "welcome",
      face ?? "dark",
    );
  }, [file, saved.data, division, kind, face]);

  const seeded = useMemo<PillarConfig | undefined>(() => {
    if (savedRow?.config) {
      return { ...savedRow.config, face: face ?? savedRow.config.face };
    }
    if (!division && !kind && !face) return undefined;
    const base = pillarDefault(kind ?? "welcome", division ?? "city-series");
    return { ...base, face: face ?? base.face };
  }, [savedRow, division, kind, face]);

  const seedNote = seeded
    ? ` Opened on the ${pillarKind(seeded.kind).name} master for ${pillarDivision(seeded.divisionId).name} in the ${seeded.face === "light" ? "light" : "dark"} face${savedRow ? ` from the saved live file “${savedRow.name}”` : ""} — everything stays fully editable.`
    : "";

  const activeDivision = seeded?.divisionId ?? division ?? "city-series";
  const activeFace = seeded?.face ?? face ?? "dark";
  const activeKind = seeded?.kind ?? kind ?? "welcome";

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> NEXT 2026 hub
        </Link>

        <DemoCards
          divisionId={activeDivision}
          face={activeFace}
          activeKind={activeKind}
          activeFileId={savedRow?.id}
        />

        <PillarStudio
          scope="next"
          heading="Master pillar signs"
          initialConfig={seeded}
          initialFileId={savedRow?.id ?? null}
          configKey={
            seeded
              ? `${savedRow?.id ?? "default"}|${seeded.divisionId}|${seeded.kind}|${seeded.face}`
              : undefined
          }
          intro={`Welcome, registration, general logo and directional pillars on the approved NEXT gradient grounds, in both the dark and light approved faces. Set the measured pillar footprint, add a sub-line and a real scannable QR code, save the live file and export press-ready art. The palette and geometry are fixed for every division area — only the approved division lockup and the copy change.${seedNote}`}
        />
      </div>
    </AppShell>
  );
}

/**
 * Editable demo card examples: the four master pillar cards for this division on
 * the current face. Each card previews the live saved master (or the shipped
 * default when nothing is saved yet) and loads it straight into the editor
 * underneath, so a demo example can be updated and re-saved in place.
 */
function DemoCards({
  divisionId,
  face,
  activeKind,
  activeFileId,
}: {
  divisionId: string;
  face: "dark" | "light";
  activeKind: PillarKindId;
  activeFileId?: string;
}) {
  const navigate = Route.useNavigate();
  const saved = useSavedPillarFiles();

  const cards = useMemo(
    () =>
      KINDS.map((id) => {
        const row = pickPillarFile(saved.data, divisionId, id, face);
        const config: PillarConfig = row
          ? { ...row.config, face }
          : { ...pillarDefault(id, divisionId), face };
        return { id, config, fileId: row?.id, fileName: row?.name, updatedAt: row?.updated_at };
      }),
    [saved.data, divisionId, face],
  );

  return (
    <section className="mt-6" aria-labelledby="pillar-demo-cards">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id="pillar-demo-cards" className="text-lg font-semibold tracking-[-0.02em]">
            Demo card examples · {pillarDivision(divisionId).name}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-black/55">
            These are the live example cards used across the hub. Pick one to load it into the editor
            below, change anything, then save the live file — the card updates everywhere.
          </p>
        </div>
        <div
          role="group"
          aria-label="Demo card face"
          className="inline-flex rounded-full border border-black/10 p-0.5"
        >
          {(["light", "dark"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={face === f}
              onClick={() => navigate({ search: (prev) => ({ ...prev, face: f, file: undefined }) })}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                face === f ? "bg-[#003FC7] text-white" : "text-black/55"
              }`}
            >
              {f} face
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const selected = card.id === activeKind && (card.fileId ?? undefined) === activeFileId;
          return (
            <button
              key={card.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    division: divisionId,
                    kind: card.id,
                    face,
                    file: card.fileId,
                  }),
                })
              }
              className={`rounded-2xl border p-3 text-left transition ${
                selected
                  ? "border-[#003FC7] ring-2 ring-[#003FC7]/25"
                  : "border-black/10 hover:bg-black/[0.03]"
              }`}
            >
              <div className="flex justify-center overflow-hidden rounded-xl bg-black/[0.04] p-2">
                <PillarSign config={card.config} pxPerMm={0.1} />
              </div>
              <p className="mt-3 text-sm font-medium">{pillarKind(card.id).name} pillar</p>
              <p className="mt-1 text-xs text-black/50">
                {card.config.trimW}×{card.config.trimH} mm · {face} face ·{" "}
                {card.fileId ? "saved live file" : "editable default"}
              </p>
              {card.fileId && (
                <p className="mt-0.5 truncate text-[11px] text-[#003FC7]/80">
                  {card.fileName}
                  {card.updatedAt ? ` · updated ${new Date(card.updatedAt).toLocaleString()}` : ""}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

