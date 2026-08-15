/**
 * Resolve CSS custom properties inside serialized SVG markup.
 *
 * Why this exists: slide art (gauges, halos, glow filters, stroke arcs) paints
 * with `var(--slide-accent-text)` and friends. That resolves fine on screen —
 * the custom property cascades from the slide stage. But the exporter
 * serializes each `<svg>` into a standalone data URL, and a standalone document
 * has NO cascade: every `var()` reference becomes invalid, so accent strokes
 * and gradient stops fall back to black. That is exactly how the dashboard
 * gauge row shipped to PowerPoint as grey hairlines with dark smudges instead
 * of blue arcs with accent halos.
 *
 * Fix: substitute every `var(--name[, fallback])` with the value the property
 * actually computes to on the live element before serializing.
 */

const VAR_RE = /var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,([^()]*(?:\([^()]*\)[^()]*)*))?\)/g;

/**
 * Replace `var()` references in an arbitrary CSS/SVG-markup string using
 * `lookup` (a custom-property name → computed value resolver). Falls back to
 * the inline `var()` fallback when the property resolves to nothing.
 *
 * Runs a few passes so nested references (`--a: var(--b)`) collapse too.
 */
export function substituteCssVars(
  input: string,
  lookup: (name: string) => string | null | undefined,
): string {
  let out = input;
  for (let pass = 0; pass < 4; pass += 1) {
    if (!out.includes("var(")) break;
    const next = out.replace(VAR_RE, (_m, rawName: string, rawFallback?: string) => {
      const resolved = (lookup(rawName) ?? "").trim();
      if (resolved) return resolved;
      const fb = (rawFallback ?? "").trim();
      return fb || "";
    });
    if (next === out) break;
    out = next;
  }
  return out;
}

/**
 * Resolve `var()` references in serialized SVG markup against a live host
 * element (normally the `<svg>` being exported, so per-section accent
 * overrides are honoured).
 */
export function resolveSvgMarkupVars(xml: string, host: Element | null): string {
  if (!xml.includes("var(")) return xml;
  if (typeof window === "undefined" || !host) {
    // No cascade available: strip to the authored fallbacks so nothing paints black.
    return substituteCssVars(xml, () => null);
  }
  const cs = window.getComputedStyle(host);
  const cache = new Map<string, string>();
  return substituteCssVars(xml, (name) => {
    if (cache.has(name)) return cache.get(name)!;
    let value = "";
    try {
      value = cs.getPropertyValue(name).trim();
    } catch {
      value = "";
    }
    if (!value) {
      // Walk ancestors — some properties are declared above the svg and the
      // computed style of a non-inherited custom property can read empty when
      // the element is detached mid-export.
      let node: Element | null = host.parentElement;
      while (node && !value) {
        try {
          value = window.getComputedStyle(node).getPropertyValue(name).trim();
        } catch {
          value = "";
        }
        node = node.parentElement;
      }
    }
    cache.set(name, value);
    return value;
  });
}
