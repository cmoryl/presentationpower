import liftJpg from "@/assets/next-lift-door/lift-liftyour.jpg.asset.json";
import { globallinkPillarRows } from "@/lib/next-globallink-pillars";
import liftPdf from "@/assets/next-lift-door/lift-liftyour.pdf.asset.json";
import liftAi from "@/assets/next-lift-door/masters/Lifts_Template_LiftYour.ai.asset.json";
import demoBoothJpg from "@/assets/next-demo-booth/demo-booth.jpg.asset.json";
import demoBoothPdf from "@/assets/next-demo-booth/demo-booth.pdf.asset.json";
import demoBoothAi from "@/assets/next-demo-booth/masters/GLCoach_TVTestDrive_Demo_Booth.ai.asset.json";
// Designer-supplied NEXT templates — the ONE place they join the registry.
// Add a supplied division file by appending its rows here; the assets listing,
// division tiles and template counts all read loadNextRegistry(), so nothing
// else needs to change for it to appear.
import type { NextRegistryRow } from "@/lib/next-event";
import { financePillarRows } from "@/lib/next-finance-pillars";
import { globallinkPedestalRows } from "@/lib/next-globallink-pedestals";
import { sfScreenSurroundRows } from "@/lib/next-sf-screen-surrounds";
import financeDeskPreview from "@/assets/finance-pillars/reg-desk.jpg.asset.json";
import globallinkDeskPreview from "@/assets/globallink-desk/reg-desk.jpg.asset.json";
import globallinkDeskAi from "@/assets/globallink-desk/reg-desk.ai.asset.json";

/** Supplied division desk fronts (edited live in the sign editor). */
function deskRows(): NextRegistryRow[] {
  return [
    {
      divisionId: "finance",
      group: "event-signage",
      code: "D1",
      format: "Registration desk front",
      size: "71.25 × 40.5 in",
      exampleUrl: financeDeskPreview.url,
      liveSignId: "finance-reg-desk",
    },
    {
      divisionId: "globallink",
      group: "event-signage",
      code: "D1",
      format: "Registration desk front",
      size: "96 × 34.625 in · supplied .ai master",
      exampleUrl: globallinkDeskPreview.url,
      downloadUrl: globallinkDeskAi.url,
      liveSignId: "globallink-reg-desk",
    },
  ];
}

export function suppliedTemplateRows(): NextRegistryRow[] {
  return [...financePillarRows(), ...globallinkPillarRows(), ...globallinkPedestalRows(), ...sfScreenSurroundRows(), ...deskRows(), demoBoothRow(), liftDoorRow()];
}

/** Basic NEXT demo booth (main NEXT templates); later demos swap logo, wording and background in the editor. */
function demoBoothRow(): NextRegistryRow {
  return {
    divisionId: "transperfect",
    group: "event-signage",
    code: "DB1",
    format: "Demo booth",
    size: "45 × 96 in front + two 4 × 96 in sides · supplied .ai master",
    exampleUrl: demoBoothJpg.url,
    downloadUrl: demoBoothAi.url,
    secondaryUrl: demoBoothPdf.url,
    secondaryLabel: "PDF",
    liveSignId: "demo-booth",
  };
}

/** General NEXT lift-door wrap ("Lift your global profile"). */
function liftDoorRow(): NextRegistryRow {
  return {
    divisionId: "transperfect",
    group: "event-signage",
    code: "LD1",
    format: "Lift door wrap — Lift Your Global Profile",
    size: "43.3 × 82.1 in (both doors) · supplied .ai master",
    exampleUrl: liftJpg.url,
    downloadUrl: liftAi.url,
    secondaryUrl: liftPdf.url,
    secondaryLabel: "PDF",
    liveSignId: "lift-liftyour",
  };
}
