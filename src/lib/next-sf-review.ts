import photos from "./next-sf-review-photos.json";
import { SF_VENUE } from "./next-sf-event";

export const SF_REVIEW = {
  version: "1.0",
  reviewedAt: "2026-11-02",
  eventId: "san-francisco",
  venue: SF_VENUE,
  status: "research-review",
  photos,
  outcomes: { attendance: null, satisfaction: null, pipeline: null, awards: null },
  sources: [
    { id: "S1", title: "Official USA event page", date: "Undated · scheduled event", url: "https://transperfectnext.com/usa/", evidence: "programme" },
    { id: "S2", title: "TransPerfect event listing", date: "Undated · promotional listing", url: "https://www.transperfect.com/insights/webinars-events/globallink-next-usa/", evidence: "programme" },
    { id: "S3", title: "Published agenda", date: "Planned programme, not delivery", url: "https://transperfectnext.com/usa/agenda/", evidence: "programme" },
    { id: "S4", title: "Published speakers", date: "Listed, not reconciled attendance", url: "https://transperfectnext.com/usa/speakers/", evidence: "programme" },
    { id: "S5", title: "CMSWire event calendar", date: "Calendar corroboration, not recap", url: "https://www.cmswire.com/events/conference/transperfect-globallink-next-usa-san-francisco-2026/", evidence: "programme" },
    { id: "S6", title: "Tracey Larrow · opening day", date: "October 27 · search-index only", url: "https://www.linkedin.com/posts/tracey-larrow-7b926615_globallink-next-kicks-off-in-san-francisco-activity-7520889826972385280-BpfQ", evidence: "index-only" },
    { id: "S7", title: "Jessica Wanamaker · attendee reflection", date: "October 28 · directly retrieved", url: photos[0].sourceUrl, evidence: "direct" },
    { id: "S8", title: "Verndale · panel retrospective", date: "October 29 · directly retrieved", url: "https://www.linkedin.com/posts/verndale_what-if-the-biggest-opportunity-with-ai-isnt-activity-7521632439295836161-Xw1W", evidence: "direct" },
  ],
} as const;

export const SF_REVIEW_LEARNING = {
  whatWorked: "Research review v1.0 (2026-11-02), NOT approved outcomes. Jessica Wanamaker's Oct28 San Francisco post supports on-site activity, a hospitality keynote reflection, and five photographs: welcome, staircase, agenda, digital-health panel, pins. Verndale's Oct29 retrospective supports workflow/outcome discussion. Source: " + SF_REVIEW.sources[6].url + " ; " + SF_REVIEW.sources[7].url,
  whatWentWrong: "Evidence gaps, not confirmed failures: no verified attendance, satisfaction, pipeline, awards or full delivered programme. Five attendee images cannot grade the entire event. Image rights/photographer/releases unconfirmed; private references only, marketing_ok=false. Review lighting, agenda reading distance, panel sightlines and stair safety against originals. Request organiser archive and outcome reports. Admin approval required before learning promotion. Report: /events/next/san-francisco/review (v1.0).",
};