import type { SignatureData, ArchetypeId } from "@/lib/signature/types";
import { fontSizeValues } from "@/lib/signature/types";

/** Escape user-controlled text for safe inline HTML insertion. */
export const escapeHtml = (s: string): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const escapeAttr = escapeHtml;

/** Hosted PNG social icons. PNG so Outlook (Word) renders them. */
export const socialIconUrls: Record<string, string> = {
  linkedin: 'https://cdn-icons-png.flaticon.com/512/174/174857.png',
  twitter: 'https://cdn-icons-png.flaticon.com/512/733/733579.png',
  facebook: 'https://cdn-icons-png.flaticon.com/512/733/733547.png',
  instagram: 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png',
  youtube: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
  github: 'https://cdn-icons-png.flaticon.com/512/733/733553.png',
  tiktok: 'https://cdn-icons-png.flaticon.com/512/3046/3046120.png',
  whatsapp: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
  telegram: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png',
  discord: 'https://cdn-icons-png.flaticon.com/512/3670/3670157.png',
  threads: 'https://cdn-icons-png.flaticon.com/512/12105/12105296.png',
  bluesky: 'https://cdn-icons-png.flaticon.com/512/15047/15047435.png',
  calendly: 'https://cdn-icons-png.flaticon.com/512/2693/2693560.png',
  medium: 'https://cdn-icons-png.flaticon.com/512/2111/2111505.png',
};

export const platformLabels: Record<string, string> = {
  linkedin: 'LinkedIn', twitter: 'Twitter', facebook: 'Facebook', instagram: 'Instagram',
  youtube: 'YouTube', github: 'GitHub', tiktok: 'TikTok', whatsapp: 'WhatsApp',
  telegram: 'Telegram', discord: 'Discord', threads: 'Threads', bluesky: 'Bluesky',
  calendly: 'Calendly', medium: 'Medium',
};

export interface SignatureContext {
  signature: SignatureData;
  primary: string;
  secondary: string;
  font: string;
  sizes: typeof fontSizeValues[keyof typeof fontSizeValues];
  enabledSections: SignatureData['sections'];
  enabledSocials: SignatureData['socialLinks'];
  applyUtm: (url: string) => string;
  /** Resolved per-template spacing values. */
  pad: number;
  lineHeight: number;
  sectionGap: number;
  /** Resolved card background (honors styling.card?.background). */
  bg: string;
  /** Headline name pixel size scaled by fontSize bucket. */
  nameSizePx: number;
  /** Title/company line size in px. */
  titleSizePx: number;
  /** Body / contact line size in px. */
  infoSizePx: number;
}

export function buildContext(
  signature: SignatureData,
  options: { previewMode?: boolean } = {},
): SignatureContext {
  const sizes = fontSizeValues[signature.styling.fontSize];
  const enabledSections = signature.sections.filter(s => s.enabled);
  const enabledSocials = options.previewMode
    ? signature.socialLinks
        .filter(s => s.enabled)
        .map(s => (s.url ? s : { ...s, url: '#' }))
    : signature.socialLinks.filter(s => s.enabled && s.url);
  const applyUtm = (url: string): string => {
    const utm = signature.utm;
    if (!utm?.enabled || !url) return url;
    try {
      const hasProto = /^https?:\/\//i.test(url);
      const u = new URL(hasProto ? url : `https://${url}`);
      if (utm.source) u.searchParams.set('utm_source', utm.source);
      if (utm.medium) u.searchParams.set('utm_medium', utm.medium);
      if (utm.campaign) u.searchParams.set('utm_campaign', utm.campaign);
      return hasProto ? u.toString() : u.toString().replace(/^https?:\/\//, '');
    } catch {
      return url;
    }
  };
  const bucket = signature.styling.fontSize;
  const nameSizePx = bucket === 'small' ? 17 : bucket === 'large' ? 24 : 20;
  const titleSizePx = bucket === 'small' ? 13 : bucket === 'large' ? 16 : 14;
  const infoSizePx = bucket === 'small' ? 11 : bucket === 'large' ? 14 : 12;
  const spacing = signature.styling.spacing ?? { padding: 18, lineHeight: 1.5, sectionGap: 4, iconGap: 8 };
  const bg = signature.styling.card?.background || '#ffffff';
  return {
    signature,
    primary: signature.styling.primaryColor,
    secondary: signature.styling.secondaryColor,
    font: signature.styling.fontFamily,
    sizes,
    enabledSections,
    enabledSocials,
    applyUtm,
    pad: spacing.padding,
    lineHeight: spacing.lineHeight,
    sectionGap: spacing.sectionGap,
    bg,
    nameSizePx,
    titleSizePx,
    infoSizePx,
  };
}

export const sectionValue = (signature: SignatureData, type: string): string =>
  signature.sections.find(s => s.type === type && s.enabled)?.value || '';

export const sectionAlign = (signature: SignatureData, type: string): 'left' | 'center' | 'right' =>
  (signature.sections.find(s => s.type === type && s.enabled)?.align as 'left' | 'center' | 'right' | undefined) || 'left';

export const sectionStyle = (
  signature: SignatureData,
  type: string,
): {
  fontStyle?: 'italic';
  textDecoration?: 'underline';
  fontWeight?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
} => {
  const s = signature.sections.find(sec => sec.type === type && sec.enabled);
  if (!s) return {};
  const out: {
    fontStyle?: 'italic';
    textDecoration?: 'underline';
    fontWeight?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
  } = {};
  if (s.italic) out.fontStyle = 'italic';
  if (s.underline) out.textDecoration = 'underline';
  if (s.bold) out.fontWeight = 700;
  const p = s.padding;
  if (p) {
    if (p.top) out.paddingTop = p.top;
    if (p.right) out.paddingRight = p.right;
    if (p.bottom) out.paddingBottom = p.bottom;
    if (p.left) out.paddingLeft = p.left;
  }
  return out;
};

export const sectionFontSize = (signature: SignatureData, type: string, defaultPx: number): number => {
  const s = signature.sections.find(sec => sec.type === type && sec.enabled);
  return s?.fontSize ?? defaultPx;
};

/** Resolve the archetype to use, with a safe fallback. */
export function resolveArchetype(signature: SignatureData, template?: { archetype?: ArchetypeId }): ArchetypeId | null {
  return signature.styling.archetype ?? template?.archetype ?? null;
}

/** Logo radius helper. */
export const logoRadius = (shape: SignatureData['logo']['shape']): string =>
  shape === 'circle' ? '50%' : shape === 'rounded' ? '8px' : '0';

/** Common contact-line label prefixes used across several archetypes. */
export const contactLabel = (type: string): string => {
  switch (type) {
    case 'phone': return 'P';
    case 'email': return 'E';
    case 'website': return 'W';
    case 'address': return 'A';
    default: return '';
  }
};

/** Render the extras (banner + awards + mobile disclaimer) as table HTML. */
export function renderExtrasHtml(ctx: SignatureContext): string {
  const { signature } = ctx;
  const { banner, awards, mobileDisclaimer, styling } = signature;
  let html = '';
  if (banner.enabled && banner.url) {
    html += `\n<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:14px;border-collapse:collapse;"><tr><td>`;
    if (banner.link) html += `<a href="${escapeAttr(banner.link)}" target="_blank">`;
    html += `<img src="${escapeAttr(banner.url)}" alt="Banner" width="${banner.width}" height="${banner.height}" style="display:block;border:0;max-width:100%;height:auto;" />`;
    if (banner.link) html += `</a>`;
    html += `</td></tr></table>`;
  }
  if (awards.length > 0) {
    html += `\n<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:12px;border-collapse:collapse;"><tr>`;
    awards.forEach((a, i) => {
      html += `<td style="padding-left:${i === 0 ? 0 : 8}px;">`;
      if (a.link) html += `<a href="${escapeAttr(a.link)}" target="_blank">`;
      html += `<img src="${escapeAttr(a.url)}" alt="Award" width="${a.width}" height="${Math.round(a.width * 0.6)}" style="display:block;border:0;" />`;
      if (a.link) html += `</a>`;
      html += `</td>`;
    });
    html += `</tr></table>`;
  }
  if (mobileDisclaimer) {
    html += `\n<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:10px;border-collapse:collapse;"><tr><td style="font-family:${escapeAttr(styling.fontFamily)};font-size:10px;color:${escapeAttr(styling.secondaryColor)};font-style:italic;">${escapeHtml(mobileDisclaimer)}</td></tr></table>`;
  }
  return html;
}