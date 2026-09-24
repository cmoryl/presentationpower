// Email signature studio — governed port of the Signature Craft engine.
//
// Layout templates and the render/export writers come from the ported engine;
// colour, typeface and the lockup are held by the brand lock. Admins can open
// the styling controls for an exception, and anything off-brand is named on
// screen rather than quietly allowed.

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, FileText, Loader2, QrCode, Check, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { renderArchetype } from "@/lib/signature/archetypes";
import {
  SIGNATURE_BRAND_MODES,
  applyBrandLock,
  brandSignatureLook,
  signatureBrandNotes,
  signatureLockup,
  lockupBox,
} from "@/lib/signature/brand-lock";
import {
  replyShortSignature,
  signatureArchetype,
  signatureCheck,
  signatureDocument,
  signatureFileStem,
  signatureHtml,
  signatureQrPayload,
  signatureVCard,
} from "@/lib/signature/export";
import { getTemplateById, signatureTemplates } from "@/lib/signature/templates";
import {
  createDefaultSignature,
  defaultSocialLinks,
  type SignatureData,
  type SignatureTemplate,
} from "@/lib/signature/types";

const CATEGORY_ORDER: SignatureTemplate["category"][] = [
  "corporate",
  "professional",
  "modern",
  "minimal",
  "creative",
  "reply",
];

const CATEGORY_LABEL: Record<SignatureTemplate["category"], string> = {
  corporate: "Corporate",
  professional: "Professional",
  modern: "Modern",
  minimal: "Minimal",
  creative: "Expressive",
  reply: "Reply short",
};

const FIELD_ORDER = ["name", "title", "company", "phone", "email", "website", "address"] as const;

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Start from a template's own sections, keeping whatever the person typed. */
function applyTemplate(signature: SignatureData, templateId: string): SignatureData {
  const template = getTemplateById(templateId);
  if (!template) return signature;
  const typed = new Map(signature.sections.map((s) => [s.type, s.value] as const));
  return {
    ...signature,
    templateId,
    sections: template.defaultSections.map((s) => ({ ...s, value: typed.get(s.type) ?? s.value })),
    styling: {
      ...template.defaultStyling,
      archetype: template.archetype ?? template.defaultStyling.archetype,
    },
  };
}

/** Where the in-progress signature is kept on this device between visits. */
const SIGNATURE_DRAFT_KEY = "element.signature.draft.v1";

export function SignatureStudio() {
  const isAdmin = useIsAdmin();
  const [brandModeId, setBrandModeId] = useState("bm-enterprise");

  const [unlocked, setUnlocked] = useState(false);
  const [lockupWidth, setLockupWidth] = useState(150);
  const [replyShort, setReplyShort] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<SignatureData>(() => {
    const base = createDefaultSignature();
    return applyTemplate(
      {
        ...base,
        sections: base.sections.map((s) => ({ ...s, value: "" })),
        socialLinks: defaultSocialLinks.map((s) => ({ ...s, enabled: false })),
      },
      "corporate-bold",
    );
  });

  // A signature is typed out once and used for years, so losing it to a stray
  // reload is the worst outcome here. The details stay on this device (they are
  // the person's own contact details, nothing is sent anywhere) and are put back
  // the next time the studio opens.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = window.localStorage.getItem(SIGNATURE_DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { brandModeId?: string; draft?: SignatureData };
      if (saved.brandModeId) setBrandModeId(saved.brandModeId);
      if (saved.draft && Array.isArray(saved.draft.sections)) setDraft(saved.draft);
    } catch {
      // A draft we cannot read is discarded rather than allowed to break the page.
      window.localStorage.removeItem(SIGNATURE_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(
        SIGNATURE_DRAFT_KEY,
        JSON.stringify({ brandModeId, draft }),
      );
    } catch {
      // Out of space or storage blocked: the signature on screen is unaffected.
    }
  }, [brandModeId, draft]);

  // Admins who have not opened the controls get the same locked look as
  // everyone else, so an admin previews exactly what the business will send.
  const governed = useMemo(
    () => (unlocked ? draft : applyBrandLock(draft, brandModeId, { lockupWidth })),
    [draft, brandModeId, lockupWidth, unlocked],
  );
  // A field nobody has filled in is left off the signature rather than printed
  // as an empty label — the person can see exactly what will be sent.
  const shown = useMemo(() => {
    const base = replyShort ? replyShortSignature(governed) : governed;
    return {
      ...base,
      sections: base.sections.map((s) => ({ ...s, enabled: s.enabled && s.value.trim().length > 0 })),
    };
  }, [governed, replyShort]);

  const look = brandSignatureLook(brandModeId);
  const lockup = signatureLockup(brandModeId);
  const notes = signatureBrandNotes(shown, brandModeId);
  const check = useMemo(() => signatureCheck(shown), [shown]);
  const html = useMemo(() => signatureHtml(shown), [shown]);

  useEffect(() => {
    setQr(null);
  }, [shown]);

  const setField = (type: string, value: string) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.type === type ? { ...s, value } : s)),
    }));
  const toggleField = (type: string, enabled: boolean) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.type === type ? { ...s, enabled } : s)),
    }));
  const setSocial = (platform: string, url: string) =>
    setDraft((d) => ({
      ...d,
      socialLinks: d.socialLinks.map((s) =>
        s.platform === platform ? { ...s, url, enabled: url.trim().length > 0 } : s,
      ),
    }));

  const copy = async (label: string, text: string, asHtml = false) => {
    try {
      if (asHtml && navigator.clipboard && "write" in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([text], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(label);
      toast.success(asHtml ? "Signature copied — paste it into your mail signature settings." : "Copied.");
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Your browser blocked the copy. Use the download instead.");
    }
  };

  const makeQr = async () => {
    setBusy("qr");
    try {
      const QRCode = (await import("qrcode")).default;
      setQr(
        await QRCode.toDataURL(signatureQrPayload(shown), {
          width: 512,
          margin: 1,
          color: { dark: look.primaryColor, light: "#FFFFFF" },
        }),
      );
    } catch {
      toast.error("The QR code could not be built.");
    } finally {
      setBusy(null);
    }
  };

  const savePicture = async () => {
    if (!previewRef.current) return;
    setBusy("image");
    try {
      const { toPng } = await import("html-to-image");
      const data = await toPng(previewRef.current, { pixelRatio: 3, backgroundColor: "#FFFFFF" });
      const a = document.createElement("a");
      a.href = data;
      a.download = `${signatureFileStem(shown)}.png`;
      a.click();
      toast.success("Picture saved. It is a proof — use the HTML wherever links must work.");
    } catch {
      toast.error("The picture could not be made.");
    } finally {
      setBusy(null);
    }
  };

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: signatureTemplates.filter((t) => t.category === category),
      })).filter((g) => g.items.length > 0),
    [],
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Digital · Email
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Email signatures</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Fill in your details, pick a layout, and take the signature away as HTML for Outlook,
          Gmail or Apple Mail. Colour, typeface and the logo come from the approved brand — they are
          not yours to change.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ── Controls ─────────────────────────────────────────── */}
        <div className="space-y-8">
          <section className="space-y-3">
            <Label>Brand</Label>
            <Select value={brandModeId} onValueChange={setBrandModeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIGNATURE_BRAND_MODES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span
                className="inline-block h-4 w-4 rounded-sm border border-border"
                style={{ background: look.primaryColor }}
              />
              <span
                className="inline-block h-4 w-4 rounded-sm border border-border"
                style={{ background: look.accentColor }}
              />
              {lockup ? (
                <span>Approved lockup included.</span>
              ) : (
                <span>No email-safe logo on file for this brand — the signature prints without one.</span>
              )}
            </div>
            {lockup && (
              <div className="space-y-2">
                <Label htmlFor="lockup-width" className="text-xs">
                  Logo width — {lockupBox(lockup, lockupWidth).width}×
                  {lockupBox(lockup, lockupWidth).height} px
                </Label>
                <input
                  id="lockup-width"
                  type="range"
                  min={80}
                  max={260}
                  step={10}
                  value={lockupWidth}
                  onChange={(e) => setLockupWidth(Number(e.target.value))}
                  className="w-full accent-[color:var(--color-primary)]"
                />
              </div>
            )}
          </section>

          <section className="space-y-4">
            <Label>Your details</Label>
            {FIELD_ORDER.map((type) => {
              const section = draft.sections.find((s) => s.type === type);
              if (!section) return null;
              return (
                <div key={type} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`on-${type}`}
                      checked={section.enabled}
                      onCheckedChange={(v) => toggleField(type, v === true)}
                    />
                    <Label htmlFor={`f-${type}`} className="text-xs text-muted-foreground">
                      {section.label}
                    </Label>
                  </div>
                  {type === "address" ? (
                    <Textarea
                      id={`f-${type}`}
                      rows={2}
                      value={section.value}
                      onChange={(e) => setField(type, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={`f-${type}`}
                      value={section.value}
                      onChange={(e) => setField(type, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </section>

          <section className="space-y-3">
            <Label>Links</Label>
            {["linkedin", "twitter", "youtube", "calendly"].map((platform) => (
              <div key={platform} className="space-y-1">
                <Label htmlFor={`s-${platform}`} className="text-xs capitalize text-muted-foreground">
                  {platform}
                </Label>
                <Input
                  id={`s-${platform}`}
                  placeholder="https://"
                  value={draft.socialLinks.find((s) => s.platform === platform)?.url ?? ""}
                  onChange={(e) => setSocial(platform, e.target.value)}
                />
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <Label>Campaign strip</Label>
            <p className="text-xs text-muted-foreground">
              An approved campaign image under the signature. Paste the address of an approved
              image — nothing is generated here.
            </p>
            <Input
              placeholder="Image address (https://…)"
              value={draft.banner.url}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  banner: { ...d.banner, url: e.target.value, enabled: e.target.value.length > 0 },
                }))
              }
            />
            <Input
              placeholder="Where it should link to"
              value={draft.banner.link}
              onChange={(e) => setDraft((d) => ({ ...d, banner: { ...d.banner, link: e.target.value } }))}
            />
          </section>

          <section className="space-y-3">
            <Label>Legal line (optional)</Label>
            <Textarea
              rows={2}
              value={draft.mobileDisclaimer ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, mobileDisclaimer: e.target.value }))}
            />
          </section>

          {isAdmin && (
            <section className="space-y-2 rounded-md border border-border p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="unlock"
                  checked={unlocked}
                  onCheckedChange={(v) => setUnlocked(v === true)}
                />
                <Label htmlFor="unlock" className="text-sm">
                  Admin: allow this signature off the approved look
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Only for a genuine exception. Anything that departs from the brand is listed beside
                the preview.
              </p>
              {unlocked && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="c-primary" className="text-xs">
                      Name colour
                    </Label>
                    <Input
                      id="c-primary"
                      type="color"
                      value={draft.styling.primaryColor}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          styling: { ...d.styling, primaryColor: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="c-secondary" className="text-xs">
                      Contact colour
                    </Label>
                    <Input
                      id="c-secondary"
                      type="color"
                      value={draft.styling.secondaryColor}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          styling: { ...d.styling, secondaryColor: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Preview + layouts + exports ──────────────────────── */}
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label>Preview</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reply"
                  checked={replyShort}
                  onCheckedChange={(v) => setReplyShort(v === true)}
                />
                <Label htmlFor="reply" className="text-xs text-muted-foreground">
                  Short version for replies
                </Label>
              </div>
            </div>
            <div className="rounded-md border border-border bg-white p-6">
              <div ref={previewRef} className="inline-block bg-white">
                {renderArchetype(shown, signatureArchetype(shown))}
              </div>
            </div>
            {notes.length > 0 && (
              <ul className="space-y-1 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                {notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            )}
            {check.errors.length > 0 && (
              <ul className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
                <li className="font-semibold">This layout would break in Outlook:</li>
                {check.errors.slice(0, 5).map((e) => (
                  <li key={e.rule}>• {e.message}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <Label>Take it away</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => copy("html", html, true)}
                disabled={check.errors.length > 0}
              >
                {copied === "html" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy signature
              </Button>
              <Button
                variant="outline"
                onClick={() => copy("code", html)}
                disabled={check.errors.length > 0}
              >
                <FileText className="mr-2 h-4 w-4" />
                Copy the code
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  download(`${signatureFileStem(shown)}.html`, signatureDocument(shown), "text/html")
                }
                disabled={check.errors.length > 0}
              >
                <Download className="mr-2 h-4 w-4" />
                HTML file
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  download(`${signatureFileStem(shown)}.vcf`, signatureVCard(shown), "text/vcard")
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Contact card
              </Button>
              <Button variant="outline" onClick={makeQr} disabled={busy === "qr"}>
                {busy === "qr" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                QR code
              </Button>
              <Button variant="outline" onClick={savePicture} disabled={busy === "image"}>
                {busy === "image" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="mr-2 h-4 w-4" />
                )}
                Picture
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Nothing is stored — this page builds a signature and hands it to you. A picture is a
              proof only: its links and text cannot be clicked or searched.
            </p>
            {qr && (
              <div className="flex items-center gap-4 rounded-md border border-border p-4">
                <img src={qr} alt="QR code for the contact card" width={120} height={120} />
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>Scanning this adds your contact card to a phone.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = qr;
                      a.download = `${signatureFileStem(shown)}-qr.png`;
                      a.click();
                    }}
                  >
                    Save the QR code
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <Label>Layouts</Label>
            {grouped.map((group) => (
              <div key={group.category} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {CATEGORY_LABEL[group.category]}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDraft((d) => applyTemplate(d, t.id))}
                      className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                        draft.templateId === t.id
                          ? "border-primary bg-primary/5 font-semibold"
                          : "border-border hover:bg-muted/60"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Every layout is rendered in the approved palette and face —
              the layout is the choice, the brand is not.{" "}
              <Badge variant="secondary">{CATEGORY_LABEL[
                getTemplateById(draft.templateId)?.category ?? "corporate"
              ]}</Badge>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
