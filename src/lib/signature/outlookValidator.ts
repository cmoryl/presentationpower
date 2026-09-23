/**
 * Outlook (Word rendering engine) compatibility linter for exported
 * signature HTML. Rules encode the most common breakages we've seen.
 */

export interface ValidationIssue {
  rule: string;
  message: string;
  excerpt?: string;
}

export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const RULES_ERROR: { rule: string; pattern: RegExp; message: string }[] = [
  { rule: 'no-clip-path',   pattern: /clip-path\s*:/i, message: 'clip-path is ignored by Outlook (Word).' },
  { rule: 'no-mask',        pattern: /\bmask\s*:/i, message: 'CSS mask is ignored by Outlook.' },
  { rule: 'no-flexbox',     pattern: /display\s*:\s*(inline-)?flex/i, message: 'Flexbox is not supported in Outlook — use nested tables.' },
  { rule: 'no-grid',        pattern: /display\s*:\s*(inline-)?grid/i, message: 'CSS grid is not supported in Outlook.' },
  { rule: 'no-position',    pattern: /position\s*:\s*(absolute|fixed|sticky)/i, message: 'CSS positioning is not supported in Outlook.' },
  { rule: 'no-transform',   pattern: /(?<![-\w])transform\s*:/i, message: 'CSS transform is not supported in Outlook.' },
  { rule: 'no-filter',      pattern: /(?<!backdrop-)filter\s*:/i, message: 'CSS filter is not supported in Outlook.' },
  { rule: 'no-css-vars',    pattern: /var\(--[\w-]+\)/i, message: 'CSS variables do not resolve in Outlook.' },
  { rule: 'no-media',       pattern: /@media/i, message: 'Media queries do not run in Outlook.' },
  { rule: 'no-svg',         pattern: /<img[^>]+\.svg["'\s>]/i, message: 'Outlook does not render <img> SVG.' },
];

const RULES_WARN: { rule: string; pattern: RegExp; message: string }[] = [
  { rule: 'letter-spacing-fragile', pattern: /letter-spacing\s*:\s*(?!0)/i, message: 'letter-spacing renders unevenly in Word; consider 0 for body text.' },
];

export function validateOutlookHtml(html: string): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  for (const r of RULES_ERROR) {
    const m = html.match(r.pattern);
    if (m) errors.push({ rule: r.rule, message: r.message, excerpt: m[0].slice(0, 80) });
  }
  for (const r of RULES_WARN) {
    const m = html.match(r.pattern);
    if (m) warnings.push({ rule: r.rule, message: r.message, excerpt: m[0].slice(0, 80) });
  }

  // Structural checks
  if (!/<table[^>]*\bcellpadding=/i.test(html)) {
    errors.push({ rule: 'requires-table-root', message: 'Export must use <table> with cellpadding/cellspacing for Outlook layout.' });
  }

  // <img> safety: every <img> must declare width + height + alt + non-svg src.
  const imgs = html.matchAll(/<img\b([^>]*)>/gi);
  for (const m of imgs) {
    const attrs = m[1];
    if (!/\bwidth\s*=/i.test(attrs)) errors.push({ rule: 'img-needs-width', message: '<img> requires explicit width attribute for Outlook.', excerpt: m[0].slice(0, 100) });
    if (!/\bheight\s*=/i.test(attrs)) errors.push({ rule: 'img-needs-height', message: '<img> requires explicit height attribute for Outlook.', excerpt: m[0].slice(0, 100) });
    if (!/\balt\s*=/i.test(attrs)) errors.push({ rule: 'img-needs-alt', message: '<img> requires alt attribute for accessibility.', excerpt: m[0].slice(0, 100) });
  }

  return { errors, warnings };
}