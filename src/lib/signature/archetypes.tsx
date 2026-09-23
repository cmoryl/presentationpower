import type { ReactNode } from 'react';
import type { ArchetypeId, SignatureData } from "@/lib/signature/types";
import {
  buildContext,
  contactLabel,
  escapeAttr,
  escapeHtml,
  logoRadius,
  platformLabels,
  renderExtrasHtml,
  sectionValue,
  sectionAlign,
  sectionStyle,
  sectionFontSize,
  type SignatureContext,
} from './helpers';

/* ──────────────────────────────────────────────────────────────────────────
 *   Shared React helpers (preview-only — exports do not use these)
 * ────────────────────────────────────────────────────────────────────────── */

function ContactRows({ ctx, color, includeName = false }: { ctx: SignatureContext; color?: string; includeName?: boolean }) {
  const { enabledSections, font, primary, secondary, infoSizePx, lineHeight } = ctx;
  const c = color ?? secondary;
  return (
    <>
      {enabledSections
        .filter(s => includeName || !['name', 'title', 'company'].includes(s.type))
        .map(s => {
          const lbl = contactLabel(s.type);
          const href =
            s.type === 'email' ? `mailto:${s.value}` :
            s.type === 'phone' ? `tel:${s.value}` :
            s.type === 'website' ? (s.value.startsWith('http') ? s.value : `https://${s.value}`) : null;
          const align = (s.align as 'left' | 'center' | 'right' | undefined) || 'left';
          const fontStyle = s.italic ? 'italic' : undefined;
          const textDecoration = s.underline ? 'underline' : undefined;
          const fontWeight = s.bold ? 700 : undefined;
          const fontSize = s.fontSize ?? infoSizePx;
          return (
            <div key={s.id} style={{ fontSize, color: c, fontFamily: font, lineHeight, marginBottom: 2, textAlign: align, fontStyle, fontWeight }}>
              {lbl && <span style={{ color: primary, fontWeight: 600, marginRight: 6 }}>{lbl}:</span>}
              {href ? (
                <a href={href} style={{ color: c, textDecoration: textDecoration || 'none' }}>{s.value}</a>
              ) : s.value}
            </div>
          );
        })}
    </>
  );
}

function SocialChipRow({ ctx, variant = 'square' }: { ctx: SignatureContext; variant?: 'square' | 'pill' | 'plain' }) {
  const { enabledSocials, primary, infoSizePx } = ctx;
  if (enabledSocials.length === 0) return null;
  return (
    <div style={{ marginTop: 10, lineHeight: 0 }}>
      {enabledSocials.map((s, i) => (
        <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block', marginRight: i === enabledSocials.length - 1 ? 0 : 6,
          padding: variant === 'pill' ? '4px 10px' : 0,
          background: variant === 'pill' ? primary : 'transparent',
          color: variant === 'pill' ? '#fff' : primary,
          borderRadius: variant === 'pill' ? 999 : 4,
          fontSize: Math.max(11, infoSizePx - 1), textDecoration: 'none', verticalAlign: 'middle',
        }}>
          <img src={socialIconUrls[s.platform]} alt={s.platform} width={variant === 'pill' ? 12 : 18} height={variant === 'pill' ? 12 : 18} style={{ display: 'inline-block', verticalAlign: 'middle', border: 0 }} />
          {variant === 'pill' && <span style={{ marginLeft: 6, verticalAlign: 'middle' }}>{platformLabels[s.platform]}</span>}
        </a>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 *   Shared HTML helpers (export-only)
 * ────────────────────────────────────────────────────────────────────────── */

function nameRowHtml(ctx: SignatureContext, opts?: { size?: string; color?: string; weight?: number | string; align?: 'left' | 'center' | 'right'; uppercase?: boolean; tracking?: string }) {
  const name = sectionValue(ctx.signature, 'name');
  if (!name) return '';
  const size = opts?.size ?? `${ctx.nameSizePx}px`;
  const color = opts?.color ?? ctx.primary;
  const weight = opts?.weight ?? 700;
  const align = opts?.align ?? 'left';
  return `<div style="font-family:${escapeAttr(ctx.font)};font-size:${size};color:${escapeAttr(color)};font-weight:${weight};text-align:${align};${opts?.uppercase ? 'text-transform:uppercase;' : ''}${opts?.tracking ? `letter-spacing:${opts.tracking};` : ''}line-height:1.2;">${escapeHtml(name)}</div>`;
}

function titleCompanyHtml(ctx: SignatureContext, opts?: { color?: string; align?: 'left' | 'center' | 'right'; size?: string }) {
  const title = sectionValue(ctx.signature, 'title');
  const company = sectionValue(ctx.signature, 'company');
  if (!title && !company) return '';
  const color = opts?.color ?? ctx.secondary;
  const align = opts?.align ?? 'left';
  const size = opts?.size ?? `${ctx.titleSizePx}px`;
  const joiner = title && company ? ' · ' : '';
  return `<div style="font-family:${escapeAttr(ctx.font)};font-size:${size};color:${escapeAttr(color)};text-align:${align};margin-top:2px;line-height:1.3;">${escapeHtml(title)}${joiner}${escapeHtml(company)}</div>`;
}

function contactLinesHtml(ctx: SignatureContext, opts?: { color?: string; align?: 'left' | 'center' | 'right'; labels?: boolean; inline?: boolean }) {
  const color = opts?.color ?? ctx.secondary;
  const align = opts?.align ?? 'left';
  const size = `${ctx.infoSizePx}px`;
  const lines = ctx.enabledSections
    .filter(s => !['name', 'title', 'company'].includes(s.type))
    .map(s => {
      const lbl = opts?.labels ? `<span style="color:${escapeAttr(ctx.primary)};font-weight:600;">${contactLabel(s.type)}:</span> ` : '';
      const href =
        s.type === 'email' ? `mailto:${escapeAttr(s.value)}` :
        s.type === 'phone' ? `tel:${escapeAttr(s.value)}` :
        s.type === 'website' ? escapeAttr(ctx.applyUtm(s.value.startsWith('http') ? s.value : `https://${s.value}`)) : null;
      const inner = href
        ? `<a href="${href}" style="color:${escapeAttr(color)};text-decoration:none;">${escapeHtml(s.value)}</a>`
        : escapeHtml(s.value);
      return `${lbl}${inner}`;
    });
  if (lines.length === 0) return '';
  if (opts?.inline) {
    return `<div style="font-family:${escapeAttr(ctx.font)};font-size:${size};color:${escapeAttr(color)};text-align:${align};margin-top:6px;line-height:${ctx.lineHeight};">${lines.join(' &nbsp;·&nbsp; ')}</div>`;
  }
  return lines.map(l => `<div style="font-family:${escapeAttr(ctx.font)};font-size:${size};color:${escapeAttr(color)};text-align:${align};line-height:${ctx.lineHeight};">${l}</div>`).join('');
}

function socialRowHtml(ctx: SignatureContext, opts?: { variant?: 'square' | 'pill' | 'plain'; color?: string; align?: 'left' | 'center' | 'right' }) {
  const { enabledSocials } = ctx;
  if (enabledSocials.length === 0) return '';
  const variant = opts?.variant ?? 'square';
  const align = opts?.align ?? 'left';
  const cells = enabledSocials.map(s => {
    if (variant === 'pill') {
      return `<td style="padding-right:6px;"><a href="${escapeAttr(s.url)}" target="_blank" style="background:${escapeAttr(ctx.primary)};color:#ffffff;text-decoration:none;font-family:${escapeAttr(ctx.font)};font-size:11px;display:inline-block;padding:5px 10px;border-radius:999px;">${escapeHtml(platformLabels[s.platform] || s.platform)}</a></td>`;
    }
    return `<td style="padding-right:6px;"><a href="${escapeAttr(s.url)}" target="_blank"><img src="${escapeAttr(socialIconUrls[s.platform])}" alt="${escapeAttr(s.platform)}" width="20" height="20" style="display:block;border:0;" /></a></td>`;
  }).join('');
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" align="${align}" style="margin-top:10px;border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

function logoImgHtml(ctx: SignatureContext): string {
  const { logo } = ctx.signature;
  if (!logo.url) return '';
  const r = logo.shape === 'circle' ? `border-radius:50%;` : logo.shape === 'rounded' ? `border-radius:8px;` : '';
  return `<img src="${escapeAttr(logo.url)}" alt="Logo" width="${logo.width}" height="${logo.height}" style="display:block;border:0;${r}" />`;
}

/* ──────────────────────────────────────────────────────────────────────────
 *   Archetypes — each returns { render: ReactNode, html: string }
 * ────────────────────────────────────────────────────────────────────────── */

export interface ArchetypeOutput { render: ReactNode; html: string }
type Archetype = (ctx: SignatureContext) => ArchetypeOutput;

// 1. CLASSIC STACKED — text-only single column with thin accent rule under name.
const classicStacked: Archetype = (ctx) => {
  const { font, primary, secondary, pad, bg, nameSizePx, titleSizePx, lineHeight } = ctx;
  const name = sectionValue(ctx.signature, 'name');
  const title = sectionValue(ctx.signature, 'title');
  const company = sectionValue(ctx.signature, 'company');
  const nameAlign = sectionAlign(ctx.signature, 'name');
  const titleAlign = sectionAlign(ctx.signature, 'title');
  const nameSz = sectionFontSize(ctx.signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(ctx.signature, 'title', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, padding: pad, maxWidth: 600, background: bg, lineHeight }}>
        {name && <div style={{ fontSize: nameSz, color: primary, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', textAlign: nameAlign, ...sectionStyle(ctx.signature, 'name') }}>{name}</div>}
        {(title || company) && <div style={{ fontSize: titleSz, color: secondary, marginTop: 3, textAlign: titleAlign, ...sectionStyle(ctx.signature, 'title') }}>{title}{title && company ? ' · ' : ''}{company}</div>}
        <div style={{ height: 2, width: 44, background: primary, margin: '12px 0', borderRadius: 1 }} />
        <ContactRows ctx={ctx} />
        <SocialChipRow ctx={ctx} />
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;background:${escapeAttr(bg)};"><tr><td style="padding:${pad}px;font-family:${escapeAttr(font)};">`
      + nameRowHtml(ctx, { color: primary, weight: 700 })
      + titleCompanyHtml(ctx)
      + `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:12px 0;border-collapse:collapse;"><tr><td width="44" height="2" bgcolor="${escapeAttr(primary)}" style="background:${escapeAttr(primary)};font-size:0;line-height:0;">&nbsp;</td></tr></table>`
      + contactLinesHtml(ctx)
      + socialRowHtml(ctx)
      + `</td></tr></table>`,
  };
};

// 2. PHOTO + VERTICAL DIVIDER — logo left, vertical brand rule, contacts right.
const photoDivider: Archetype = (ctx) => {
  const { font, primary, secondary, signature, pad, bg, nameSizePx, titleSizePx } = ctx;
  const hasLogo = !!signature.logo.url;
  const nameAlign = sectionAlign(signature, 'name');
  const titleAlign = sectionAlign(signature, 'title');
  const nameSz = sectionFontSize(signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(signature, 'title', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, padding: pad, maxWidth: 600, background: bg, display: 'flex', alignItems: 'flex-start', gap: pad }}>
        {hasLogo && (
          <div>
            <img src={signature.logo.url} alt="Logo" width={signature.logo.width} height={signature.logo.height} style={{ display: 'block', objectFit: 'cover', borderRadius: logoRadius(signature.logo.shape) }} />
          </div>
        )}
        <div style={{ borderLeft: `3px solid ${primary}`, paddingLeft: pad }}>
          <div style={{ fontSize: nameSz, color: primary, fontWeight: 700, letterSpacing: '-0.01em', textAlign: nameAlign, ...sectionStyle(signature, 'name') }}>{sectionValue(signature, 'name')}</div>
          <div style={{ fontSize: titleSz, color: secondary, marginTop: 3, textAlign: titleAlign, ...sectionStyle(signature, 'title') }}>{sectionValue(signature, 'title')}{sectionValue(signature, 'company') && ` · ${sectionValue(signature, 'company')}`}</div>
          <div style={{ marginTop: 8 }}><ContactRows ctx={ctx} /></div>
          <SocialChipRow ctx={ctx} />
        </div>
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;background:${escapeAttr(bg)};"><tr>`
      + (hasLogo ? `<td valign="top" style="padding:${pad}px 0 ${pad}px ${pad}px;">${logoImgHtml(ctx)}</td>` : '')
      + `<td valign="top" style="padding:${pad}px;border-left:3px solid ${escapeAttr(primary)};">`
      + nameRowHtml(ctx, { color: primary })
      + titleCompanyHtml(ctx)
      + `<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>`
      + contactLinesHtml(ctx)
      + socialRowHtml(ctx)
      + `</td></tr></table>`,
  };
};

// 3. AFTER DARK — dark card, light text, brand-color top edge band.
const afterDark: Archetype = (ctx) => {
  const { font, primary, signature, pad, nameSizePx, titleSizePx } = ctx;
  const bg = '#0f1729';
  const text = '#f9fafb';
  const dim = '#94a3b8';
  const nameAlign = sectionAlign(signature, 'name');
  const titleAlign = sectionAlign(signature, 'title');
  const nameSz = sectionFontSize(signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(signature, 'title', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, maxWidth: 600, background: bg, color: text }}>
        <div style={{ height: 4, background: primary }} />
        <div style={{ padding: pad }}>
          <div style={{ fontSize: nameSz + 2, color: text, fontWeight: 700, letterSpacing: '-0.01em', textAlign: nameAlign, ...sectionStyle(signature, 'name') }}>{sectionValue(signature, 'name')}</div>
          <div style={{ fontSize: titleSz, color: primary, marginTop: 3, fontWeight: 600, textAlign: titleAlign, ...sectionStyle(signature, 'title') }}>{sectionValue(signature, 'title')}{sectionValue(signature, 'company') && ` · ${sectionValue(signature, 'company')}`}</div>
          <div style={{ marginTop: 10 }}><ContactRows ctx={{ ...ctx, secondary: dim, primary }} color={dim} /></div>
          <SocialChipRow ctx={ctx} />
        </div>
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="540" bgcolor="${bg}" style="border-collapse:collapse;background:${bg};color:${text};">`
      + `<tr><td height="4" bgcolor="${escapeAttr(primary)}" style="background:${escapeAttr(primary)};font-size:0;line-height:0;">&nbsp;</td></tr>`
      + `<tr><td bgcolor="${bg}" style="padding:${pad}px;font-family:${escapeAttr(font)};background:${bg};color:${text};">`
      + nameRowHtml(ctx, { size: `${nameSizePx + 2}px`, color: text })
      + titleCompanyHtml(ctx, { color: primary })
      + `<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>`
      + contactLinesHtml(ctx, { color: dim })
      + socialRowHtml(ctx)
      + `</td></tr></table>`,
  };
};

// 4. TWO-COLUMN SPLIT — no photo, name/logo left, labeled contacts right.
const twoColumnSplit: Archetype = (ctx) => {
  const { font, primary, secondary, signature, pad, bg, nameSizePx, titleSizePx } = ctx;
  const nameAlign = sectionAlign(signature, 'name');
  const titleAlign = sectionAlign(signature, 'title');
  const nameSz = sectionFontSize(signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(signature, 'title', titleSizePx);
  const companySz = sectionFontSize(signature, 'company', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, padding: pad, maxWidth: 600, background: bg, display: 'flex', gap: pad + 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: nameSz, color: primary, fontWeight: 700, letterSpacing: '-0.01em', textAlign: nameAlign, ...sectionStyle(signature, 'name') }}>{sectionValue(signature, 'name')}</div>
          <div style={{ fontSize: titleSz, color: secondary, marginTop: 3, textAlign: titleAlign, ...sectionStyle(signature, 'title') }}>{sectionValue(signature, 'title')}</div>
          {sectionValue(signature, 'company') && <div style={{ fontSize: companySz, color: primary, fontWeight: 600, marginTop: 2, textAlign: sectionAlign(signature, 'company'), ...sectionStyle(signature, 'company') }}>{sectionValue(signature, 'company')}</div>}
          {signature.logo.url && <img src={signature.logo.url} alt="Logo" width={signature.logo.width} height={signature.logo.height} style={{ marginTop: 10, display: 'block', objectFit: 'cover', borderRadius: logoRadius(signature.logo.shape) }} />}
        </div>
        <div style={{ flex: 1, borderLeft: `1px solid ${primary}33`, paddingLeft: pad }}>
          <ContactRows ctx={ctx} />
          <SocialChipRow ctx={ctx} />
        </div>
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="560" style="border-collapse:collapse;background:${escapeAttr(bg)};"><tr>`
      + `<td valign="top" width="50%" style="padding:${pad}px;font-family:${escapeAttr(font)};">`
      + nameRowHtml(ctx, { color: primary })
      + titleCompanyHtml(ctx)
      + (signature.logo.url ? `<div style="margin-top:10px;">${logoImgHtml(ctx)}</div>` : '')
      + `</td>`
      + `<td valign="top" width="50%" style="padding:${pad}px;border-left:1px solid ${escapeAttr(primary)};font-family:${escapeAttr(font)};">`
      + contactLinesHtml(ctx, { labels: true })
      + socialRowHtml(ctx)
      + `</td></tr></table>`,
  };
};

// 5. CARD WITH SHADOW + PILL SOCIALS
const cardShadow: Archetype = (ctx) => {
  const { font, primary, secondary, signature, pad, bg, nameSizePx, titleSizePx } = ctx;
  const radius = Math.max(10, signature.styling.border?.radius ?? 0) + 2;
  const logoSize = signature.logo.url ? Math.min(72, Math.max(48, signature.logo.width)) : 0;
  const nameAlign = sectionAlign(signature, 'name');
  const titleAlign = sectionAlign(signature, 'title');
  const nameSz = sectionFontSize(signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(signature, 'title', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, maxWidth: 540, background: bg, border: `1px solid ${primary}22`, borderRadius: radius, padding: pad, boxShadow: '0 6px 18px rgba(15,23,42,0.10)' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {signature.logo.url && <img src={signature.logo.url} alt="Logo" width={logoSize} height={logoSize} style={{ borderRadius: '50%', display: 'block', objectFit: 'cover' }} />}
          <div>
            <div style={{ fontSize: nameSz, color: primary, fontWeight: 700, letterSpacing: '-0.01em', textAlign: nameAlign, ...sectionStyle(signature, 'name') }}>{sectionValue(signature, 'name')}</div>
            <div style={{ fontSize: titleSz, color: secondary, marginTop: 2, textAlign: titleAlign, ...sectionStyle(signature, 'title') }}>{sectionValue(signature, 'title')}{sectionValue(signature, 'company') && ` · ${sectionValue(signature, 'company')}`}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}><ContactRows ctx={ctx} /></div>
        <SocialChipRow ctx={ctx} variant="pill" />
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="540" bgcolor="${escapeAttr(bg)}" style="border-collapse:collapse;background:${escapeAttr(bg)};border:1px solid ${escapeAttr(primary)};border-radius:${radius}px;"><tr><td style="padding:${pad}px;font-family:${escapeAttr(font)};">`
      + `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr>`
      + (signature.logo.url ? `<td valign="middle" style="padding-right:14px;">${logoImgHtml(ctx)}</td>` : '')
      + `<td valign="middle">`
      + nameRowHtml(ctx)
      + titleCompanyHtml(ctx)
      + `</td></tr></table>`
      + `<div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>`
      + contactLinesHtml(ctx)
      + socialRowHtml(ctx, { variant: 'pill' })
      + `</td></tr></table>`,
  };
};

// 6. BANNER-BOTTOM — compact contacts on top, full-width banner below.
const bannerBottom: Archetype = (ctx) => {
  const { font, primary, secondary, signature, pad, bg, nameSizePx, titleSizePx } = ctx;
  const nameAlign = sectionAlign(signature, 'name');
  const titleAlign = sectionAlign(signature, 'title');
  const nameSz = sectionFontSize(signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(signature, 'title', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, maxWidth: 560, background: bg }}>
        <div style={{ padding: `${Math.max(12, pad - 4)}px ${pad}px` }}>
          <div style={{ fontSize: nameSz, color: primary, fontWeight: 700, letterSpacing: '-0.01em', textAlign: nameAlign, ...sectionStyle(signature, 'name') }}>{sectionValue(signature, 'name')}</div>
          <div style={{ fontSize: titleSz, color: secondary, marginTop: 3, textAlign: titleAlign, ...sectionStyle(signature, 'title') }}>{sectionValue(signature, 'title')}{sectionValue(signature, 'company') && ` · ${sectionValue(signature, 'company')}`}</div>
          <div style={{ marginTop: 6 }}>
            <ContactRows ctx={ctx} />
          </div>
          <SocialChipRow ctx={ctx} />
        </div>
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="560" bgcolor="${escapeAttr(bg)}" style="border-collapse:collapse;background:${escapeAttr(bg)};"><tr><td style="padding:${Math.max(12, pad - 4)}px ${pad}px;font-family:${escapeAttr(font)};">`
      + nameRowHtml(ctx)
      + titleCompanyHtml(ctx)
      + `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>`
      + contactLinesHtml(ctx, { inline: true })
      + socialRowHtml(ctx)
      + `</td></tr></table>`,
  };
};

// 7. ACCENT BAR — 4px left bar, ultra minimal.
const accentBar: Archetype = (ctx) => {
  const { font, primary, secondary, signature, pad, bg, nameSizePx, titleSizePx } = ctx;
  const barW = signature.styling.border?.width && signature.styling.border.width >= 3
    ? signature.styling.border.width : 4;
  const nameAlign = sectionAlign(signature, 'name');
  const titleAlign = sectionAlign(signature, 'title');
  const nameSz = sectionFontSize(signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(signature, 'title', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, maxWidth: 540, background: bg, display: 'flex' }}>
        <div style={{ width: barW, background: primary, flexShrink: 0 }} />
        <div style={{ padding: `${Math.max(10, pad - 6)}px ${pad}px`, flex: 1 }}>
          <div style={{ fontSize: nameSz, color: primary, fontWeight: 700, letterSpacing: '-0.01em', textAlign: nameAlign, ...sectionStyle(signature, 'name') }}>{sectionValue(signature, 'name')}</div>
          <div style={{ fontSize: titleSz, color: secondary, marginTop: 3, textAlign: titleAlign, ...sectionStyle(signature, 'title') }}>{sectionValue(signature, 'title')}{sectionValue(signature, 'company') && ` · ${sectionValue(signature, 'company')}`}</div>
          <div style={{ marginTop: 6 }}><ContactRows ctx={ctx} /></div>
          <SocialChipRow ctx={ctx} variant="plain" />
        </div>
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;background:${escapeAttr(bg)};"><tr>`
      + `<td width="${barW}" bgcolor="${escapeAttr(primary)}" style="background:${escapeAttr(primary)};font-size:0;line-height:0;">&nbsp;</td>`
      + `<td valign="top" style="padding:${Math.max(10, pad - 6)}px ${pad}px;font-family:${escapeAttr(font)};">`
      + nameRowHtml(ctx)
      + titleCompanyHtml(ctx)
      + `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>`
      + contactLinesHtml(ctx)
      + socialRowHtml(ctx)
      + `</td></tr></table>`,
  };
};

// 8. BUSINESS CARD BOX — bordered card with colored header band.
const businessCardBox: Archetype = (ctx) => {
  const { font, primary, secondary, signature, pad, bg, nameSizePx, titleSizePx } = ctx;
  const nameAlign = sectionAlign(signature, 'name');
  const titleAlign = sectionAlign(signature, 'title');
  const nameSz = sectionFontSize(signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(signature, 'title', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, maxWidth: 560, background: bg, border: `1px solid ${primary}`, borderRadius: 4 }}>
        <div style={{ height: 10, background: primary }} />
        <div style={{ padding: pad, display: 'flex', gap: 14 }}>
          {signature.logo.url && <img src={signature.logo.url} alt="Logo" width={signature.logo.width} height={signature.logo.height} style={{ borderRadius: 4, display: 'block', objectFit: 'cover' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: nameSz, color: primary, fontWeight: 700, letterSpacing: '-0.01em', textAlign: nameAlign, ...sectionStyle(signature, 'name') }}>{sectionValue(signature, 'name')}</div>
            <div style={{ fontSize: titleSz, color: secondary, marginTop: 2, textAlign: titleAlign, ...sectionStyle(signature, 'title') }}>{sectionValue(signature, 'title')}{sectionValue(signature, 'company') && ` · ${sectionValue(signature, 'company')}`}</div>
            <div style={{ height: 1, background: `${primary}33`, margin: '8px 0' }} />
            <ContactRows ctx={ctx} />
            <SocialChipRow ctx={ctx} />
          </div>
        </div>
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="1" role="presentation" width="560" bgcolor="${escapeAttr(bg)}" bordercolor="${escapeAttr(primary)}" style="border-collapse:collapse;background:${escapeAttr(bg)};border:1px solid ${escapeAttr(primary)};">`
      + `<tr><td height="10" bgcolor="${escapeAttr(primary)}" style="background:${escapeAttr(primary)};font-size:0;line-height:0;">&nbsp;</td></tr>`
      + `<tr><td style="padding:${pad}px;font-family:${escapeAttr(font)};">`
      + `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr>`
      + (signature.logo.url ? `<td valign="top" style="padding-right:14px;">${logoImgHtml(ctx)}</td>` : '')
      + `<td valign="top">`
      + nameRowHtml(ctx)
      + titleCompanyHtml(ctx)
      + `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:8px 0;border-collapse:collapse;"><tr><td width="120" height="1" bgcolor="${escapeAttr(primary)}" style="background:${escapeAttr(primary)};font-size:0;line-height:0;">&nbsp;</td></tr></table>`
      + contactLinesHtml(ctx)
      + socialRowHtml(ctx)
      + `</td></tr></table>`
      + `</td></tr></table>`,
  };
};

// 9. CENTERED PERSONAL — fully centered, large circle photo, pill chips.
const centeredPersonal: Archetype = (ctx) => {
  const { font, primary, secondary, signature, pad, bg, nameSizePx, titleSizePx } = ctx;
  const logoSize = signature.logo.url ? Math.min(96, Math.max(64, signature.logo.width)) : 0;
  const nameSz = sectionFontSize(signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(signature, 'title', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, maxWidth: 500, background: bg, padding: pad, textAlign: 'center' }}>
        {signature.logo.url && <img src={signature.logo.url} alt="Logo" width={logoSize} height={logoSize} style={{ borderRadius: '50%', margin: '0 auto 12px', display: 'block', objectFit: 'cover' }} />}
        <div style={{ fontSize: nameSz + 4, color: primary, fontWeight: 700, letterSpacing: '-0.01em' }}>{sectionValue(signature, 'name')}</div>
        <div style={{ fontSize: titleSz, color: secondary, marginTop: 4 }}>{sectionValue(signature, 'title')}{sectionValue(signature, 'company') && ` · ${sectionValue(signature, 'company')}`}</div>
        <div style={{ height: 1, background: `${primary}55`, width: 64, margin: '12px auto' }} />
        <ContactRows ctx={ctx} />
        <div style={{ display: 'flex', justifyContent: 'center' }}><SocialChipRow ctx={ctx} variant="pill" /></div>
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="500" bgcolor="${escapeAttr(bg)}" align="center" style="border-collapse:collapse;background:${escapeAttr(bg)};"><tr><td align="center" style="padding:${pad}px;font-family:${escapeAttr(font)};text-align:center;">`
      + (signature.logo.url ? `<img src="${escapeAttr(signature.logo.url)}" alt="Logo" width="${logoSize}" height="${logoSize}" style="display:block;margin:0 auto 12px;border-radius:50%;border:0;" />` : '')
      + nameRowHtml(ctx, { size: `${nameSz + 4}px`, align: 'center' })
      + titleCompanyHtml(ctx, { align: 'center' })
      + `<table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center" style="margin:12px auto;border-collapse:collapse;"><tr><td width="64" height="1" bgcolor="${escapeAttr(primary)}" style="background:${escapeAttr(primary)};font-size:0;line-height:0;">&nbsp;</td></tr></table>`
      + contactLinesHtml(ctx, { align: 'center' })
      + socialRowHtml(ctx, { variant: 'pill', align: 'center' })
      + `</td></tr></table>`,
  };
};

// 10. EXECUTIVE NAME-FIRST — oversized name, single-line contacts, logo right.
const executiveNameFirst: Archetype = (ctx) => {
  const { font, primary, secondary, signature, pad, bg, nameSizePx, titleSizePx } = ctx;
  const nameAlign = sectionAlign(signature, 'name');
  const titleAlign = sectionAlign(signature, 'title');
  const nameSz = sectionFontSize(signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(signature, 'title', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, maxWidth: 620, background: bg, padding: pad }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: nameSz + 6, color: primary, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', textAlign: nameAlign, ...sectionStyle(signature, 'name') }}>{sectionValue(signature, 'name')}</div>
            <div style={{ fontSize: titleSz, color: secondary, marginTop: 4, textAlign: titleAlign, ...sectionStyle(signature, 'title') }}>{sectionValue(signature, 'title')}{sectionValue(signature, 'company') && ` · ${sectionValue(signature, 'company')}`}</div>
          </div>
          {signature.logo.url && <img src={signature.logo.url} alt="Logo" width={Math.min(signature.logo.width, 90)} height={Math.min(signature.logo.height, 90)} style={{ display: 'block', objectFit: 'cover' }} />}
        </div>
        <div style={{ height: 1, background: `${primary}33`, margin: '10px 0' }} />
        <ContactRows ctx={ctx} />
        <SocialChipRow ctx={ctx} variant="plain" />
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="620" bgcolor="${escapeAttr(bg)}" style="border-collapse:collapse;background:${escapeAttr(bg)};"><tr><td style="padding:${pad}px;font-family:${escapeAttr(font)};">`
      + `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;"><tr>`
      + `<td valign="bottom">`
      + nameRowHtml(ctx, { size: `${nameSz + 6}px` })
      + titleCompanyHtml(ctx)
      + `</td>`
      + (signature.logo.url ? `<td valign="bottom" align="right">${logoImgHtml(ctx)}</td>` : '')
      + `</tr></table>`
      + `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="margin:10px 0;border-collapse:collapse;"><tr><td height="1" bgcolor="${escapeAttr(primary)}" style="background:${escapeAttr(primary)};font-size:0;line-height:0;">&nbsp;</td></tr></table>`
      + contactLinesHtml(ctx, { inline: true })
      + socialRowHtml(ctx)
      + `</td></tr></table>`,
  };
};

// 11. RETRO EDITORIAL — all-caps wide-tracked name, rules above/below, monochrome.
const retroEditorial: Archetype = (ctx) => {
  const { font, primary, secondary, signature, pad, bg, nameSizePx, titleSizePx, infoSizePx } = ctx;
  const nameSz = sectionFontSize(signature, 'name', nameSizePx);
  const titleSz = sectionFontSize(signature, 'title', titleSizePx);
  return {
    render: (
      <div style={{ fontFamily: font, maxWidth: 580, background: bg, padding: pad }}>
        <div style={{ height: 1, background: primary }} />
        <div style={{ fontSize: nameSz, color: primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center', padding: '14px 0' }}>{sectionValue(signature, 'name')}</div>
        <div style={{ height: 1, background: primary }} />
        <div style={{ fontSize: titleSz, color: secondary, textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>{sectionValue(signature, 'title')}{sectionValue(signature, 'company') && ` · ${sectionValue(signature, 'company')}`}</div>
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          {ctx.enabledSections.filter(s => !['name','title','company'].includes(s.type)).map(s => (
            <span key={s.id} style={{ fontSize: s.fontSize ?? infoSizePx, color: secondary, marginRight: 10 }}>{s.value}</span>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}><SocialChipRow ctx={ctx} variant="plain" /></div>
      </div>
    ),
    html:
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="580" bgcolor="${escapeAttr(bg)}" style="border-collapse:collapse;background:${escapeAttr(bg)};"><tr><td style="padding:${pad}px;font-family:${escapeAttr(font)};">`
      + `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;"><tr><td height="1" bgcolor="${escapeAttr(primary)}" style="background:${escapeAttr(primary)};font-size:0;line-height:0;">&nbsp;</td></tr></table>`
      + nameRowHtml(ctx, { align: 'center', uppercase: true })
      + `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;"><tr><td height="1" bgcolor="${escapeAttr(primary)}" style="background:${escapeAttr(primary)};font-size:0;line-height:0;">&nbsp;</td></tr></table>`
      + titleCompanyHtml(ctx, { align: 'center' })
      + contactLinesHtml(ctx, { inline: true, align: 'center' })
      + socialRowHtml(ctx, { align: 'center' })
      + `</td></tr></table>`,
  };
};

/* ──────────────────────────────────────────────────────────────────────────
 *   Registry + entry points
 * ────────────────────────────────────────────────────────────────────────── */

const registry: Record<ArchetypeId, Archetype> = {
  'classic-stacked': classicStacked,
  'photo-divider': photoDivider,
  'after-dark': afterDark,
  'two-column-split': twoColumnSplit,
  'card-shadow': cardShadow,
  'banner-bottom': bannerBottom,
  'accent-bar': accentBar,
  'business-card-box': businessCardBox,
  'centered-personal': centeredPersonal,
  'executive-name-first': executiveNameFirst,
  'retro-editorial': retroEditorial,
};

export const archetypeIds = Object.keys(registry) as ArchetypeId[];

export function renderArchetype(signature: SignatureData, archetype: ArchetypeId): ReactNode {
  const ctx = buildContext(signature, { previewMode: true });
  const { render } = registry[archetype](ctx);
  // banner/awards/disclaimer rendered as plain block below the archetype core
  return (
    <>
      {render}
      <ExtrasPreview ctx={ctx} />
    </>
  );
}

export function exportArchetypeHtml(signature: SignatureData, archetype: ArchetypeId): string {
  const ctx = buildContext(signature);
  const { html } = registry[archetype](ctx);
  return appendAttribution(html + renderExtrasHtml(ctx));
}

function ExtrasPreview({ ctx }: { ctx: SignatureContext }) {
  const { signature, primary, secondary, font } = ctx;
  const showBannerDemo = signature.banner.enabled && !signature.banner.url;
  const hasExtras =
    (signature.banner.enabled && signature.banner.url) ||
    showBannerDemo ||
    signature.awards.length > 0 ||
    !!signature.mobileDisclaimer;
  if (!hasExtras) return null;
  const cardBg = signature.styling.card?.background || '#ffffff';
  const isDarkBg = (() => {
    const hex = cardBg.replace('#', '');
    if (hex.length < 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
  })();
  const borderEnabled = signature.styling.border?.enabled;
  const borderColor = borderEnabled ? signature.styling.border!.color : `${primary}66`;
  const borderStyle = borderEnabled ? signature.styling.border!.style : 'dashed';
  const borderWidth = borderEnabled ? Math.max(1, signature.styling.border!.width) : 1;
  const radius = signature.styling.border?.radius ?? signature.styling.card?.radius ?? 6;
  const badgeBg = isDarkBg ? cardBg : '#ffffff';
  const subTextColor = isDarkBg ? primary : secondary;
  return (
    <div style={{ marginTop: 10 }}>
      {signature.banner.enabled && signature.banner.url && (
        <div style={{ marginTop: 4 }}>
          {signature.banner.link ? (
            <a href={signature.banner.link} target="_blank" rel="noopener noreferrer">
              <img src={signature.banner.url} alt="Banner" width={signature.banner.width} height={signature.banner.height} style={{ maxWidth: '100%', display: 'block', border: 0, width: signature.banner.width, height: signature.banner.height, objectFit: 'contain' }} />
            </a>
          ) : (
            <img src={signature.banner.url} alt="Banner" width={signature.banner.width} height={signature.banner.height} style={{ maxWidth: '100%', display: 'block', border: 0, width: signature.banner.width, height: signature.banner.height, objectFit: 'contain' }} />
          )}
        </div>
      )}
      {showBannerDemo && (
        <div style={{ marginTop: 4 }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: signature.banner.width,
              height: signature.banner.height,
              borderRadius: radius,
              border: `${borderWidth}px ${borderStyle} ${borderColor}`,
              background: `linear-gradient(135deg, ${primary}1a 0%, ${primary}33 100%)`,
              fontFamily: font,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <div style={{ textAlign: 'center', padding: '0 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Your Promotional Banner
              </div>
              <div style={{ fontSize: 11, color: subTextColor, marginTop: 4 }}>
                Upload an image to replace this demo preview
              </div>
            </div>
            <div
              style={{
                position: 'absolute', top: 6, right: 8,
                fontSize: 9, fontWeight: 700, color: primary,
                background: badgeBg, padding: '2px 6px',
                borderRadius: 3, letterSpacing: '0.08em',
                border: `1px solid ${primary}33`,
              }}
            >
              DEMO
            </div>
          </div>
        </div>
      )}
      {signature.awards.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {signature.awards.map(a => (
            <a key={a.id} href={a.link || undefined} target="_blank" rel="noopener noreferrer">
              <img src={a.url} alt="Award" style={{ width: a.width, height: 'auto', display: 'block' }} />
            </a>
          ))}
        </div>
      )}
      {signature.mobileDisclaimer && (
        <div style={{ marginTop: 10, fontSize: 10, color: ctx.secondary, fontStyle: 'italic', fontFamily: ctx.font }}>
          {signature.mobileDisclaimer}
        </div>
      )}
    </div>
  );
}