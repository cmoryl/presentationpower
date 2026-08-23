// Generic copy-editing helpers for print content trees.
//
// Print content is authored JSON of nested records/arrays. The demo pages need a
// safe way to surface every human-readable string so a user can rewrite the
// whole piece and re-render the real layout from the edited content — without a
// bespoke form per print kind.

export type Rec = Record<string, unknown>;

export type TextField = {
  /** Object/array path to the string, e.g. ["pages", 0, "title"]. */
  path: (string | number)[];
  /** Field key, used for the input label. */
  key: string;
  /** Human breadcrumb of the containing node. */
  group: string;
  value: string;
  multiline: boolean;
};

/** Keys we treat as author-visible copy. */
const COPY_KEYS = new Set([
  "title",
  "subtitle",
  "eyebrow",
  "kicker",
  "headline",
  "subhead",
  "intro",
  "lede",
  "body",
  "text",
  "label",
  "caption",
  "quote",
  "attribution",
  "value",
  "unit",
  "suffix",
  "note",
  "footer",
  "cta",
  "ctaLabel",
  "summary",
  "description",
  "hub",
  "name",
  "role",
  "detail",
]);

const LONG_KEYS = new Set([
  "body",
  "text",
  "intro",
  "lede",
  "summary",
  "description",
  "quote",
  "note",
  "caption",
  "detail",
]);

const SKIP_KEYS = new Set([
  "id",
  "kind",
  "variantId",
  "moduleId",
  "icon",
  "iconName",
  "image",
  "imageUrl",
  "src",
  "url",
  "href",
  "color",
  "accent",
  "mode",
  "look",
  "pageSize",
  "density",
  "brandModeId",
  "divisionId",
]);

const MAX_FIELDS = 400;

function labelFor(node: Rec, fallback: string): string {
  for (const k of ["title", "label", "eyebrow", "headline", "kind"]) {
    const v = node[k];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 48);
  }
  return fallback;
}

/** Walk the content tree and collect every editable copy string. */
export function collectTextFields(content: unknown): TextField[] {
  const out: TextField[] = [];

  const walk = (node: unknown, path: (string | number)[], group: string) => {
    if (out.length >= MAX_FIELDS) return;
    if (Array.isArray(node)) {
      node.forEach((child, i) => {
        if (typeof child === "string") {
          if (child.trim())
            out.push({
              path: [...path, i],
              key: `Item ${i + 1}`,
              group,
              value: child,
              multiline: child.length > 90,
            });
          return;
        }
        const childGroup =
          child && typeof child === "object"
            ? `${group} · ${labelFor(child as Rec, `${i + 1}`)}`
            : group;
        walk(child, [...path, i], childGroup);
      });
      return;
    }
    if (!node || typeof node !== "object") return;
    const rec = node as Rec;
    for (const [k, v] of Object.entries(rec)) {
      if (SKIP_KEYS.has(k)) continue;
      if (typeof v === "string") {
        if (!COPY_KEYS.has(k) || !v.trim()) continue;
        out.push({
          path: [...path, k],
          key: k,
          group,
          value: v,
          multiline: LONG_KEYS.has(k) || v.length > 90,
        });
        continue;
      }
      if (typeof v === "number" || typeof v === "boolean" || v == null) continue;
      const nextGroup =
        Array.isArray(v) || typeof v === "object" ? `${group}${group ? " · " : ""}${k}` : group;
      walk(v, [...path, k], nextGroup);
    }
  };

  walk(content, [], "");
  return out;
}

/** Immutably set a value deep in a content tree. */
export function setAtPath<T>(root: T, path: (string | number)[], value: string): T {
  if (path.length === 0) return root;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const idx = Number(head);
    const next = root.slice();
    next[idx] = rest.length ? setAtPath(root[idx], rest, value) : value;
    return next as unknown as T;
  }
  if (root && typeof root === "object") {
    const rec = root as Rec;
    const key = String(head);
    return {
      ...rec,
      [key]: rest.length ? setAtPath(rec[key], rest, value) : value,
    } as unknown as T;
  }
  return root;
}

export function pathKey(path: (string | number)[]): string {
  return path.join(".");
}

/** Group fields by their breadcrumb, preserving discovery order. */
export function groupTextFields(fields: TextField[]): { group: string; fields: TextField[] }[] {
  const map = new Map<string, TextField[]>();
  for (const f of fields) {
    const g = f.group || "Piece";
    const list = map.get(g);
    if (list) list.push(f);
    else map.set(g, [f]);
  }
  return [...map.entries()].map(([group, list]) => ({ group, fields: list }));
}
