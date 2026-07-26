import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDecks from "./tools/list-decks";
import getDeck from "./tools/get-deck";
import listPrintAssets from "./tools/list-print-assets";
import getPrintAsset from "./tools/get-print-asset";
import listCampaignKits from "./tools/list-campaign-kits";
import createBrief from "./tools/create-brief";

// The OAuth issuer must be the direct Supabase host; the project ref is the one
// value that survives publish unchanged.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "transperfect-modular-mcp",
  title: "TransPerfect Modular",
  version: "0.1.0",
  instructions:
    "Tools for the TransPerfect Modular content system. Read the signed-in user's decks, print assets (case studies, spotlights, e-brochures, adaptor briefs) and saved social/event campaign kits, and create new deck briefs. All data is scoped to the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listDecks, getDeck, listPrintAssets, getPrintAsset, listCampaignKits, createBrief],
});
