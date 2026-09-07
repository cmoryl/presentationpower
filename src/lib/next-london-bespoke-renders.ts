// In-situ visual references for the Bespoke scenic units.
//
// These are photoreal *visualisations* of each build in a room of this type,
// generated to brand (deep navy #03002C, blue #003FC7) so the crew and the
// client can see the intent at a glance. They are not surveyed photographs of
// the QEII Centre and must never be used to scale or check a build — the GA
// drawings in the Bespoke pack are the only dimensional authority.

import helpDesk from "@/assets/london-renders/help-desk.jpg";
import merchMarket from "@/assets/london-renders/merch-market.jpg";
import demoArea from "@/assets/london-renders/demo-area.jpg";
import mainStage from "@/assets/london-renders/main-stage.jpg";
import screenSurround from "@/assets/london-renders/screen-surround.jpg";
import cameraRiser from "@/assets/london-renders/camera-riser.jpg";
import techDesk from "@/assets/london-renders/tech-desk.jpg";

/** Unit id → in-situ visual. Units without one simply show no image. */
export const BESPOKE_RENDERS: Record<string, string> = {
  "help-desk": helpDesk,
  "merch-market": merchMarket,
  "demo-area-displays": demoArea,
  "plinth-500": demoArea,
  "plinth-600": demoArea,
  "churchill-stage-graphics": mainStage,
  "gielgud-screen-surround": screenSurround,
  "olivier-screen-surround": screenSurround,
  "fleming-monitor-hide": cameraRiser,
  "camera-riser": cameraRiser,
  "tech-desk": techDesk,
};

export function bespokeRender(unitId: string): string | null {
  return BESPOKE_RENDERS[unitId] ?? null;
}

export const BESPOKE_RENDER_DISCLAIMER =
  "Visualisation only — brand intent in a room of this type, not a survey photograph. Build to the Bespoke GA dimensions.";
