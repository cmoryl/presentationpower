import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDecks from "./tools/list-decks";
import getDeck from "./tools/get-deck";
import listPrintAssets from "./tools/list-print-assets";
import getPrintAsset from "./tools/get-print-asset";
import listCampaignKits from "./tools/list-campaign-kits";
import createBrief from "./tools/create-brief";
import updateSlideContent from "./tools/update-slide-content";
import setSlideIcon from "./tools/set-slide-icon";
import changeSlideVariant from "./tools/change-slide-variant";
import updateSlideNotes from "./tools/update-slide-notes";
import insertSlide from "./tools/insert-slide";
import deleteSlide from "./tools/delete-slide";
import reorderSlides from "./tools/reorder-slides";
import listSectionVariants from "./tools/list-section-variants";
import searchIcons from "./tools/search-icons";
import searchKnowledge from "./tools/search-knowledge";
import createShareLink from "./tools/create-share-link";
import generateDeck from "./tools/generate-deck";
import getTaxonomy from "./tools/get-taxonomy";
import listVariants from "./tools/list-variants";
import createDeck from "./tools/create-deck";
import buildDeck from "./tools/build-deck";
import auditDeckVisuals from "./tools/audit-deck-visuals";
import auditDeckCompleteness from "./tools/audit-deck-completeness";
import exportDeck from "./tools/export-deck";
import authorCustomModule from "./tools/author-custom-module";

// The OAuth issuer must be the direct Supabase host; the project ref is the one
// value that survives publish unchanged.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "transperfect-modular-mcp",
  title: "TransPerfect Element",
  version: "0.3.0",
  instructions: [
    "Tools for the TransPerfect Element content system. All data is scoped to the authenticated user.",
    "Read: list_decks / get_deck for decks and their slides, list_print_assets / get_print_asset for case studies, spotlights, e-brochures and adaptor briefs, list_campaign_kits for saved social and event kits.",
    "Discover: get_taxonomy returns brand modes (divisions), module families, section frameworks, layout frameworks and narrative archetypes; list_variants is the filtered module catalogue.",
    "Author: create_brief starts a new deck brief and generate_deck turns a brief (or inline brief fields) into a saved deck with a planned narrative; build_deck creates a deck AND writes every slide's full content, notes and icons in one call — prefer it for whole-deck builds; insert_slide, delete_slide, reorder_slides, update_slide_content, set_slide_icon, change_slide_variant and update_slide_notes edit an existing deck slide by its 0-based position (get_deck first to see positions).",
    "Rules that mirror the in-app copilot: prefer the smallest edit; update_slide_content deep-merges, so send only changed fields; numeric stats, dates and currency stay locked unless the user explicitly asks for numeric edits (allow_numeric_edits); a variant must be permitted for the slide's section — call list_section_variants first; ground every factual claim with search_knowledge before writing it into a slide.",
    "Verify: audit_deck_completeness is the finishing gate — it lists every slide with empty content fields, grids holding fewer cards than the layout is built for, copy far under the space a block reserves, unplotted visuals or missing speaker notes, with the exact writable paths and their character budgets. audit_deck_visuals lists every chart, KPI board or process diagram in a deck whose plotted data is missing, with the exact keys to fill — run it after any build or batch of content writes and fix what it lists before reporting the deck as done.",
    "Deliver: export_deck builds the finished, layered, fully editable .pptx from a saved deck and returns a private download link valid for one hour. That link IS the deliverable — always hand it to the user directly, never tell them to open the app and export it themselves, and never present it as partial. Only if export_deck returns optional_full_fidelity_url may you mention it, after the download link, as an optional pixel-exact re-export. When a build is destined for a PowerPoint, prefer modules whose listing shows hasNativePptxRenderer: true (list_variants and list_section_variants both report it) so every slide exports pixel-true.",
    "Gap filling: when the user asks for a slide whose shape no permitted native module can hold, author_custom_module builds a NEW module for it in the approved look (blank base variant plus editable canvas objects) and inserts it, optionally filing it in the module library as a draft. Try list_section_variants and insert_slide first; only reach for it when the closest layout would drop content.",
    "Share: create_share_link enables a read-only link for a deck.",
  ].join("\n"),

  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listDecks,
    getDeck,
    listPrintAssets,
    getPrintAsset,
    listCampaignKits,
    createBrief,
    listSectionVariants,
    listVariants,
    getTaxonomy,
    generateDeck,
    createDeck,
    buildDeck,
    searchIcons,
    searchKnowledge,
    insertSlide,
    authorCustomModule,
    deleteSlide,
    reorderSlides,
    updateSlideContent,
    setSlideIcon,
    changeSlideVariant,
    updateSlideNotes,
    createShareLink,
    auditDeckVisuals,
    auditDeckCompleteness,
    exportDeck,
  ],
});
