// Signature outputs: email HTML, a reply-short variant, a contact card and a
// QR code. Every writer is Outlook-safe (tables + inline styles only) and is
// gated through the Outlook linter before it is offered as a download.

import { exportArchetypeHtml } from "@/lib/signature/archetypes";
import { resolveArchetype } from "@/lib/signature/helpers";
import { getTemplateById } from "@/lib/signature/templates";
import { validateOutlookHtml, type ValidationResult } from "@/lib/signature/outlookValidator";
import type { ArchetypeId, SignatureData } from "@/lib/signature/types";
import { SIGNATURE_FONT } from "@/lib/signature/brand-lock";

const esc = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Archetype in force for a signature, with a safe fallback. */
export function signatureArchetype(signature: SignatureData): ArchetypeId {
  const template = getTemplateById(signature.templateId);
  return resolveArchetype(signature, template) ?? "classic-stacked";
}

/** The signature body, as an HTML fragment ready to paste into a mail client. */
export function signatureHtml(signature: SignatureData): string {
  return exportArchetypeHtml(signature, signatureArchetype(signature));
}

/** Outlook-safety report for the fragment a person is about to take away. */
export function signatureCheck(signature: SignatureData): ValidationResult {
  return validateOutlookHtml(signatureHtml(signature));
}

/** A complete HTML file, for clients that want a file rather than a paste. */
export function signatureDocument(signature: SignatureData): string {
  const body = signatureHtml(signature);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(signature.name || "Email signature")}</title>
</head>
<body style="margin:0;padding:24px;background:#FFFFFF;font-family:${esc(SIGNATURE_FONT)};">
${body}
</body></html>`;
}

/**
 * The short form for replies inside a thread: name, role, company and one way
 * to reach the person. No logo, no banner, no social row — the exact words the
 * full signature uses, just fewer of them.
 */
export function replyShortSignature(signature: SignatureData): SignatureData {
  const keep = new Set(["name", "title", "company", "phone", "email"]);
  return {
    ...signature,
    templateId: "reply-essential",
    sections: signature.sections.map((s) => ({ ...s, enabled: s.enabled && keep.has(s.type) })),
    socialLinks: signature.socialLinks.map((s) => ({ ...s, enabled: false })),
    awards: [],
    banner: { ...signature.banner, enabled: false },
    logo: { ...signature.logo, url: "" },
    styling: { ...signature.styling, archetype: "classic-stacked", fontSize: "small" },
  };
}

const fieldOf = (signature: SignatureData, type: string): string =>
  signature.sections.find((s) => s.type === type && s.enabled)?.value?.trim() ?? "";

/** vCard 3.0 contact card — the format Outlook, Apple Mail and Gmail all read. */
export function signatureVCard(signature: SignatureData): string {
  const name = fieldOf(signature, "name");
  const parts = name.split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
  const website = fieldOf(signature, "website");
  const rows = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${name}`,
    fieldOf(signature, "company") && `ORG:${fieldOf(signature, "company")}`,
    fieldOf(signature, "title") && `TITLE:${fieldOf(signature, "title")}`,
    fieldOf(signature, "phone") && `TEL;TYPE=WORK,VOICE:${fieldOf(signature, "phone")}`,
    fieldOf(signature, "email") && `EMAIL;TYPE=PREF,INTERNET:${fieldOf(signature, "email")}`,
    website && `URL:${/^https?:\/\//i.test(website) ? website : `https://${website}`}`,
    fieldOf(signature, "address") && `ADR;TYPE=WORK:;;${fieldOf(signature, "address")};;;;`,
    ...signature.socialLinks.filter((s) => s.enabled && s.url).map((s) => `X-SOCIALPROFILE;TYPE=${s.platform}:${s.url}`),
    "END:VCARD",
  ].filter(Boolean) as string[];
  return rows.join("\r\n");
}

/** What a QR code on a business card should carry: the person's contact card. */
export function signatureQrPayload(signature: SignatureData): string {
  return signatureVCard(signature);
}

/** Suggested file stem, e.g. "jane-doe-transperfect-signature". */
export function signatureFileStem(signature: SignatureData): string {
  const base = [fieldOf(signature, "name") || signature.name, "signature"].join(" ");
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "signature"
  );
}
