import { describe, it } from "vitest";
import { SJB_CALENDAR_POSTS } from "@/lib/sjb-social-calendar";
import { sjbCalendarDesign } from "@/lib/sjb-social-calendar";
const MODES = ["dark","light","set2","set3","set4"] as const;
const SIZES: Record<string,string> = { "linkedin-portrait":"1350", "linkedin-square":"1080", "instagram-carousel":"1350", "story-sequence":"1920" };
describe("count", () => {
  it("prints", () => {
    const drawn: string[] = []; let approved = 0;
    for (const p of SJB_CALENDAR_POSTS) for (const m of MODES) for (const [f,s] of Object.entries(SIZES)) {
      const url = sjbCalendarDesign(p.n, m as any, s as any)?.previewUrl ?? null;
      if (url) approved++; else drawn.push(`${p.n}:${m}:${f}`);
    }
    console.log("APPROVED", approved, "DRAWN", drawn.length, drawn.slice(0,8));
  });
});
