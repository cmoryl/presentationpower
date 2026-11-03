import { describe, expect, it } from "vitest";
import {
  SJB_BRAND_GROUNDS,
  SJB_SOCIAL_FORMATS,
  SJB_SOCIAL_FORMATS_BY_ID,
  SJB_SOCIAL_TEMPLATES,
  SJB_SOCIAL_TEMPLATES_BY_ID,
  sjbSocialFormat,
  sjbSocialTemplate,
} from "@/lib/sjb-social-templates";
import { SJB_EVENT } from "@/lib/san-juan-bowl";

describe("sjb-social-templates", () => {
  it("every template id is unique and resolvable", () => {
    const ids = SJB_SOCIAL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of SJB_SOCIAL_TEMPLATES) {
      expect(SJB_SOCIAL_TEMPLATES_BY_ID[t.id]).toBe(t);
      expect(sjbSocialTemplate(t.id)).toBe(t);
    }
  });

  it("unknown ids fall back to the first template and format", () => {
    expect(sjbSocialTemplate("nope").id).toBe(SJB_SOCIAL_TEMPLATES[0].id);
    expect(sjbSocialFormat("nope").id).toBe(SJB_SOCIAL_FORMATS[0].id);
  });

  it("every template supplies a default for every editable field", () => {
    for (const t of SJB_SOCIAL_TEMPLATES) {
      for (const f of t.fields) {
        expect(t.defaults[f.key], `${t.id}.${f.key}`).toBeDefined();
      }
    }
  });

  it("defaults only use announced event facts", () => {
    const all = SJB_SOCIAL_TEMPLATES.flatMap((t) => Object.values(t.defaults)).join(" · ");
    // The date and venue appear only as the announced values.
    expect(all).toContain(SJB_EVENT.datesLabel);
    expect(all).toContain(SJB_EVENT.venue);
    expect(all).not.toMatch(/\bTBC\b/i);
  });

  it("formats carry exact native channel sizes", () => {
    expect(SJB_SOCIAL_FORMATS_BY_ID.square).toMatchObject({ width: 1080, height: 1080 });
    expect(SJB_SOCIAL_FORMATS_BY_ID.story).toMatchObject({ width: 1080, height: 1920 });
    expect(SJB_SOCIAL_FORMATS_BY_ID.wide).toMatchObject({ width: 1600, height: 900 });
    expect(SJB_SOCIAL_FORMATS_BY_ID.link).toMatchObject({ width: 1200, height: 628 });
    expect(SJB_SOCIAL_FORMATS_BY_ID.portrait).toMatchObject({ width: 1080, height: 1350 });
  });

  it("brand grounds pick the correct logo variant", () => {
    for (const g of SJB_BRAND_GROUNDS) {
      expect(g.logoVariant).toBe(g.kind === "light" ? "color" : "dark");
    }
  });
});
