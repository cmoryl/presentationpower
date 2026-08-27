import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";

import { AppShell } from "@/components/AppShell";
import { PillarStudio } from "@/components/next/PillarStudio";
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
};

const KINDS: PillarKindId[] = ["welcome", "registration", "logo", "directional"];

export const Route = createFileRoute("/events/next_/pillars")({
  validateSearch: (search: Record<string, unknown>): PillarSearch => ({
    division: typeof search.division === "string" ? search.division : undefined,
    kind: KINDS.includes(search.kind as PillarKindId) ? (search.kind as PillarKindId) : undefined,
    face: search.face === "light" || search.face === "dark" ? search.face : undefined,
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
  const { division, kind, face } = Route.useSearch();

  const seeded = useMemo<PillarConfig | undefined>(() => {
    if (!division && !kind && !face) return undefined;
    const base = pillarDefault(kind ?? "welcome", division ?? "city-series");
    return { ...base, face: face ?? base.face };
  }, [division, kind, face]);

  const seedNote = seeded
    ? ` Opened on the ${pillarKind(seeded.kind).name} master for ${pillarDivision(seeded.divisionId).name} in the ${seeded.face === "light" ? "light" : "dark"} face — everything stays fully editable.`
    : "";

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> NEXT 2026 hub
        </Link>
        <PillarStudio
          scope="next"
          heading="Master pillar signs"
          initialConfig={seeded}
          configKey={seeded ? `${seeded.divisionId}|${seeded.kind}|${seeded.face}` : undefined}
          intro={`Welcome, registration, general logo and directional pillars on the approved NEXT gradient grounds, in both the dark and light approved faces. Set the measured pillar footprint, add a sub-line and a real scannable QR code, save the live file and export press-ready art. The palette and geometry are fixed for every division area — only the approved division lockup and the copy change.${seedNote}`}
        />
      </div>
    </AppShell>
  );
}
