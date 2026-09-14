// -----------------------------------------------------------------------------
// NEXT pillar signs — CMYK sign-off ledger.
//
// Same honesty rule as the London signage kit: nothing here converts anything
// silently. It reports, per pillar, every colour the print path would put on
// press — the ground ramp, the chevron device, the lockup ink, the headline and
// the QR code — and says whether each one is a signed-off brand build or a
// machine conversion a print house still has to proof and approve.
//
// The NEXT ascent template matters most here: its violet → aqua ground and the
// chevron device are measured off the supplied Canva master, so those stops have
// never been through a press. They come out of this ledger as conversions until
// a printer signs them.
// -----------------------------------------------------------------------------

import { cmykShort, londonCmykBuild, type CmykBuild } from "@/lib/next-london-cmyk";
import {
  pillarDivision,
  pillarHeadlineInk,
  pillarInk,
  pillarQrBackground,
  pillarQrForeground,
  pillarQrTransparent,
  type PillarConfig,
  type PillarFaceId,
} from "@/lib/next-pillar-masters";
import {
  PILLAR_TEMPLATES,
  pillarChevronInk,
  pillarGroundStops,
  pillarTemplate,
} from "@/lib/next-pillar-templates";
import { buildPillarQr } from "@/lib/pillar-qr";

/** Where on the pillar a colour lands. Guides never print, so they are absent. */
export type PillarInkRole =
  | "ground"
  | "chevron device"
  | "division lockup"
  | "headline + sub-line"
  | "QR modules"
  | "QR plate";

export type PillarCmykStop = {
  /** Source brand colour, uppercase hex. */
  hex: string;
  build: CmykBuild;
  roles: PillarInkRole[];
};

export type PillarCmykLedger = {
  stops: PillarCmykStop[];
  approved: number;
  converted: number;
  /** True only when every colour on the sign carries a signed-off build. */
  fullyApproved: boolean;
};

function push(
  map: Map<string, PillarCmykStop>,
  hex: string,
  role: PillarInkRole,
  vibrance: number,
): void {
  const key = (hex || "").trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(key)) return;
  const row = map.get(key);
  if (row) {
    if (!row.roles.includes(role)) row.roles.push(role);
    return;
  }
  map.set(key, { hex: key, build: londonCmykBuild(key, vibrance), roles: [role] });
}

/** Every colour one pillar configuration puts on press, with its build. */
export function pillarCmykLedger(config: PillarConfig, vibrance = 1): PillarCmykLedger {
  const face: PillarFaceId = config.face ?? "dark";
  const template = pillarTemplate(config.templateId);
  const map = new Map<string, PillarCmykStop>();

  for (const hex of pillarGroundStops(config)) push(map, hex, "ground", vibrance);
  if (template.chevrons) push(map, pillarChevronInk(face).color, "chevron device", vibrance);
  if (config.showLockup) push(map, pillarInk(face), "division lockup", vibrance);
  push(map, pillarHeadlineInk(config), "headline + sub-line", vibrance);
  if (buildPillarQr(config.qrData ?? "")) {
    push(map, pillarQrForeground(config), "QR modules", vibrance);
    if (!pillarQrTransparent(config)) push(map, pillarQrBackground(config), "QR plate", vibrance);
  }

  const stops = [...map.values()].sort(
    (a, b) => Number(b.build.approved) - Number(a.build.approved) || a.hex.localeCompare(b.hex),
  );
  const approved = stops.filter((s) => s.build.approved).length;
  return {
    stops,
    approved,
    converted: stops.length - approved,
    fullyApproved: stops.length > 0 && stops.every((s) => s.build.approved),
  };
}

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** The sheet a print house signs for one pillar: one row per colour. */
export function pillarCmykSignOffCsv(config: PillarConfig, vibrance = 1): string {
  const ledger = pillarCmykLedger(config, vibrance);
  const template = pillarTemplate(config.templateId);
  const rows = [
    "source_rgb,cmyk_build,status,total_area_coverage,prints_as,template,division,face,printer_approval",
  ];
  for (const s of ledger.stops) {
    rows.push(
      [
        s.hex,
        cmykShort(s.build),
        s.build.approved ? "approved brand build" : "machine conversion — needs sign-off",
        `${Math.round(s.build.tac)}%`,
        cell(s.roles.join("; ")),
        cell(template.name),
        cell(pillarDivision(config.divisionId).name),
        config.face ?? "dark",
        s.build.approved ? "n/a" : "",
      ].join(","),
    );
  }
  return rows.join("\n");
}

/** One-line summary for the studio and the package README. */
export function pillarCmykSummary(config: PillarConfig, vibrance = 1): string {
  const l = pillarCmykLedger(config, vibrance);
  return l.fullyApproved
    ? `All ${l.stops.length} print colours on this pillar carry signed-off builds.`
    : `${l.approved} of ${l.stops.length} print colours carry signed-off builds — ${l.converted} are machine conversions awaiting printer sign-off.`;
}

/**
 * Kit-wide roll-up: every template × face for one division and gradient, so the
 * chevron ground can be sent for approval once instead of pillar by pillar.
 */
export function pillarTemplateCmykCsv(config: PillarConfig, vibrance = 1): string {
  const rows = [
    "template,face,source_rgb,cmyk_build,status,total_area_coverage,prints_as,printer_approval",
  ];
  for (const template of PILLAR_TEMPLATES) {
    for (const face of ["dark", "light"] as PillarFaceId[]) {
      const cfg: PillarConfig = { ...config, templateId: template.id, face };
      for (const s of pillarCmykLedger(cfg, vibrance).stops) {
        rows.push(
          [
            cell(template.name),
            face,
            s.hex,
            cmykShort(s.build),
            s.build.approved ? "approved brand build" : "machine conversion — needs sign-off",
            `${Math.round(s.build.tac)}%`,
            cell(s.roles.join("; ")),
            s.build.approved ? "n/a" : "",
          ].join(","),
        );
      }
    }
  }
  return rows.join("\n");
}
