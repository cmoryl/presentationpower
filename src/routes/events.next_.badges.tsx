import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileDown, Printer, Ruler } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { NextBadge } from "@/components/next/NextBadge";
import {
  BADGE_SPEC,
  BADGE_ROLES,
  SAMPLE_ATTENDEE,
  badgeDivisions,
  badgeDivisionFor,
  type BadgeAttendee,
} from "@/lib/next-badge";

export const Route = createFileRoute("/events/next_/badges")({
  validateSearch: (search: Record<string, unknown>) => ({
    division: typeof search.division === "string" ? search.division : undefined,
  }),
  head: () => ({
    meta: [
      { title: "NEXT 2026 attendee badges · Division templates" },
      {
        name: "description",
        content:
          "Print-ready TransPerfect NEXT 2026 attendee badge templates — 4.33″ × 6.3″ dual-slot plastic badge with BLE Klik cutout, in every division colourway.",
      },
      { property: "og:title", content: "NEXT 2026 attendee badges" },
      {
        property: "og:description",
        content: "Every NEXT 2026 division badge on the approved 4.33″ × 6.3″ dual-slot template.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BadgesPage,
});

function BadgesPage() {
  const { division: divisionParam } = Route.useSearch();
  const divisions = useMemo(() => {
    const all = badgeDivisions();
    if (!divisionParam) return all;
    const one = badgeDivisionFor(divisionParam);
    return one ? [one] : all;
  }, [divisionParam]);
  const [guides, setGuides] = useState(true);
  const [side, setSide] = useState<"front" | "back" | "both">("front");
  const [roleId, setRoleId] = useState(SAMPLE_ATTENDEE.roleId);
  const [attendee, setAttendee] = useState<BadgeAttendee>(SAMPLE_ATTENDEE);
  const [pdfDivisionId, setPdfDivisionId] = useState(divisions[0]?.id ?? "");
  const [pdfExport, setPdfExport] = useState(false);

  const pdfTargetId = divisions.some((d) => d.id === pdfDivisionId)
    ? pdfDivisionId
    : (divisions[0]?.id ?? "");

  const printPdf = () => {
    setPdfExport(true);
    const done = () => {
      setPdfExport(false);
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    // let the isolate/no-guides render commit before the print dialog opens
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };


  const person: BadgeAttendee = { ...attendee, roleId };
  const sides: ("front" | "back")[] = side === "both" ? ["front", "back"] : [side];

  const field =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] outline-none focus:border-[#003FC7]";

  return (
    <AppShell>
      <style>{`
        @media print {
          @page { size: ${BADGE_SPEC.bleedW}in ${BADGE_SPEC.bleedH}in; margin: 0; }
          body { background: #fff; }
          .badge-noprint { display: none !important; }
          .badge-sheet { display: block !important; }
          .badge-card { break-inside: avoid; page-break-after: always; margin: 0 !important; border: 0 !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
          .badge-card > figcaption { display: none; }
          .badge-sheet.is-pdf-export { gap: 0 !important; }
          .badge-sheet.is-pdf-export .badge-card:not(.is-pdf-target) { display: none !important; }
          .badge-sheet.is-pdf-export .badge-card:last-of-type { page-break-after: auto; }

        }
      `}</style>

      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="badge-noprint">
          <Link
            to="/events/next"
            className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
          >
            <ArrowLeft size={13} /> NEXT 2026 hub
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#03002C]">
            Attendee badge · division templates
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/60">
            Built on the supplied print template — {BADGE_SPEC.trimW}″ × {BADGE_SPEC.trimH}″ plastic
            badge, dual top slots, BLE Klik cutout. Bleed {BADGE_SPEC.bleedW}″ × {BADGE_SPEC.bleedH}″,
            safe area {BADGE_SPEC.safeW}″ × {BADGE_SPEC.safeH}″. Artwork is CMYK, 300 ppi minimum, and
            exports as {BADGE_SPEC.exportPreset}.
          </p>

          <div className="mt-6 grid gap-4 rounded-2xl border border-black/10 bg-white p-5 md:grid-cols-[repeat(4,minmax(0,1fr))]">
            <label className="text-xs font-medium text-black/60">
              First name
              <input
                className={`mt-1 ${field}`}
                value={attendee.firstName}
                onChange={(e) => setAttendee({ ...attendee, firstName: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-black/60">
              Last name
              <input
                className={`mt-1 ${field}`}
                value={attendee.lastName}
                onChange={(e) => setAttendee({ ...attendee, lastName: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-black/60">
              Job title
              <input
                className={`mt-1 ${field}`}
                value={attendee.jobTitle}
                onChange={(e) => setAttendee({ ...attendee, jobTitle: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-black/60">
              Company
              <input
                className={`mt-1 ${field}`}
                value={attendee.company}
                onChange={(e) => setAttendee({ ...attendee, company: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-black/60">
              Role band
              <select className={`mt-1 ${field}`} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                {BADGE_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-black/60">
              Side
              <select
                className={`mt-1 ${field}`}
                value={side}
                onChange={(e) => setSide(e.target.value as typeof side)}
              >
                <option value="front">Front</option>
                <option value="back">Back</option>
                <option value="both">Front + back</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setGuides((g) => !g)}
                aria-pressed={guides}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium ${
                  guides
                    ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                    : "border-black/15 bg-white text-[#03002C]"
                }`}
              >
                <Ruler size={13} /> Print guides
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-2 text-xs font-medium text-white hover:bg-[#003FC7]/85"
              >
                <Printer size={13} /> Print sheet
              </button>
            </div>
            <label className="text-xs font-medium text-black/60">
              PDF export division
              <select
                className={`mt-1 ${field}`}
                value={pdfTargetId}
                onChange={(e) => setPdfDivisionId(e.target.value)}
              >
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={printPdf}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7] bg-white px-3 py-2 text-xs font-medium text-[#003FC7] hover:bg-[#003FC7]/10"
                title={`Exports at ${BADGE_SPEC.bleedW}″ × ${BADGE_SPEC.bleedH}″ bleed, no guides`}
              >
                <FileDown size={13} /> Print PDF ({BADGE_SPEC.bleedW}″ × {BADGE_SPEC.bleedH}″)
              </button>
            </div>
          </div>
        </div>

        <div className={`badge-sheet mt-8 flex flex-wrap gap-8 ${pdfExport ? "is-pdf-export" : ""}`}>
          {divisions.map((div) =>
            sides.map((s) => (
              <figure
                key={`${div.id}-${s}`}
                className={`badge-card m-0 rounded-xl border border-black/10 bg-white p-3 shadow-sm ${
                  div.id === pdfTargetId ? "is-pdf-target" : ""
                }`}
              >

                <NextBadge
                  division={div}
                  attendee={person}
                  side={s}
                  ppi={72}
                  guides={guides}
                  style={{ borderRadius: 6 }}
                />
                <figcaption className="mt-2 flex items-center justify-between gap-3 text-[11px] text-black/55">
                  <span className="font-medium text-[#03002C]">{div.name}</span>
                  <span className="uppercase tracking-wide">{s}</span>
                </figcaption>
              </figure>
            )),
          )}
        </div>
      </div>
    </AppShell>
  );
}
