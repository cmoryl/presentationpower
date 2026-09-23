import { describe, expect, it } from "vitest";
import {
  SIGNATURE_BRAND_MODES,
  SIGNATURE_FONT,
  applyBrandLock,
  brandSignatureLook,
  signatureBrandNotes,
} from "../brand-lock";
import {
  replyShortSignature,
  signatureCheck,
  signatureHtml,
  signatureVCard,
} from "../export";
import { signatureTemplates, getTemplateById } from "../templates";
import { createDefaultSignature, type SignatureData } from "../types";

function filled(templateId: string): SignatureData {
  const base = createDefaultSignature();
  const template = getTemplateById(templateId)!;
  return {
    ...base,
    templateId,
    sections: template.defaultSections.map((s) => ({
      ...s,
      value:
        s.type === "name"
          ? "Alex Moreau"
          : s.type === "title"
            ? "Director, Enterprise Solutions"
            : s.type === "company"
              ? "TransPerfect"
              : s.type === "email"
                ? "amoreau@transperfect.com"
                : s.type === "phone"
                  ? "+1 212 689 5555"
                  : s.value,
    })),
    styling: { ...template.defaultStyling, archetype: template.archetype ?? template.defaultStyling.archetype },
  };
}

describe("signature brand lock", () => {
  it("offers every brand mode with resolved tokens", () => {
    expect(SIGNATURE_BRAND_MODES.length).toBeGreaterThanOrEqual(11);
    for (const mode of SIGNATURE_BRAND_MODES) {
      const look = brandSignatureLook(mode.id);
      expect(look.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(look.fontFamily).toBe(SIGNATURE_FONT);
    }
  });

  it("puts every template onto the approved colour and face", () => {
    for (const template of signatureTemplates) {
      const locked = applyBrandLock(filled(template.id), "bm-enterprise");
      expect(locked.styling.fontFamily).toBe(SIGNATURE_FONT);
      expect(locked.styling.primaryColor.toLowerCase()).toBe("#03002c");
      expect(signatureBrandNotes(locked, "bm-enterprise")).toEqual([]);
    }
  });

  it("keeps the layout and the typed content untouched", () => {
    const source = filled("corporate-bold");
    const locked = applyBrandLock(source, "bm-enterprise");
    expect(locked.styling.archetype).toBe(source.styling.archetype);
    expect(locked.sections.map((s) => s.value)).toEqual(source.sections.map((s) => s.value));
  });

  it("names an off-brand colour rather than allowing it silently", () => {
    const rogue = filled("corporate-bold");
    const notes = signatureBrandNotes(
      { ...rogue, styling: { ...rogue.styling, primaryColor: "#FF0000" } },
      "bm-enterprise",
    );
    expect(notes.join(" ")).toMatch(/colour/i);
  });
});

describe("signature exports", () => {
  it("writes Outlook-safe table HTML for every template", () => {
    for (const template of signatureTemplates) {
      const html = signatureHtml(applyBrandLock(filled(template.id), "bm-enterprise"));
      expect(html).toContain("<table");
      expect(signatureCheck(applyBrandLock(filled(template.id), "bm-enterprise")).errors).toEqual([]);
    }
  });

  it("reduces the reply-short version to the essentials", () => {
    const short = replyShortSignature(applyBrandLock(filled("corporate-bold"), "bm-enterprise"));
    const kept = short.sections.filter((s) => s.enabled).map((s) => s.type);
    expect(kept).not.toContain("address");
    expect(kept).toContain("name");
    expect(short.banner.enabled).toBe(false);
  });

  it("writes a vCard carrying the typed contact details", () => {
    const vcard = signatureVCard(filled("corporate-bold"));
    expect(vcard.startsWith("BEGIN:VCARD")).toBe(true);
    expect(vcard).toContain("Alex Moreau");
    expect(vcard).toContain("amoreau@transperfect.com");
    expect(vcard.trimEnd().endsWith("END:VCARD")).toBe(true);
  });
});
