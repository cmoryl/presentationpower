/**
 * The AI sometimes returns list/object fields as text — JSON or Python-style
 * "[{'title': 'x'}]". Left as text, a slide shows zero items and export blocks.
 * Parse those back into real lists wherever the starter content had a list/object.
 */
export function parseLooseLiteral(src: string): unknown {
  const t = src.trim();
  if (!/^[[{]/.test(t)) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    /* fall through to python-style */
  }
  let i = 0;
  const ws = () => {
    while (i < t.length && /\s/.test(t[i])) i++;
  };
  const val = (): unknown => {
    ws();
    const c = t[i];
    if (c === "[" || c === "{") {
      const obj = c === "{";
      i++;
      const out: unknown[] | Record<string, unknown> = obj ? {} : [];
      ws();
      while (t[i] !== (obj ? "}" : "]")) {
        if (i >= t.length) throw new Error("eof");
        if (obj) {
          const k = String(val());
          ws();
          if (t[i++] !== ":") throw new Error("colon");
          (out as Record<string, unknown>)[k] = val();
        } else (out as unknown[]).push(val());
        ws();
        if (t[i] === ",") i++;
        ws();
      }
      i++;
      return out;
    }
    if (c === "'" || c === '"') {
      i++;
      let s = "";
      while (t[i] !== c) {
        if (i >= t.length) throw new Error("eof");
        if (t[i] === "\\") {
          i++;
          const e = t[i++];
          s += e === "n" ? "\n" : e === "t" ? "\t" : e;
        } else s += t[i++];
      }
      i++;
      return s;
    }
    const m = /^(True|False|None|null|true|false|-?\d+(?:\.\d+)?)/.exec(t.slice(i));
    if (!m) throw new Error("token");
    i += m[0].length;
    const w = m[0];
    if (w === "True" || w === "true") return true;
    if (w === "False" || w === "false") return false;
    if (w === "None" || w === "null") return null;
    return Number(w);
  };
  try {
    const v = val();
    ws();
    return i === t.length ? v : undefined;
  } catch {
    return undefined;
  }
}

export function coerceAiLists<T extends Record<string, unknown>>(
  ai: T,
  prior: Record<string, unknown> = {},
): T {
  const out: Record<string, unknown> = { ...ai };
  for (const [k, v] of Object.entries(ai)) {
    if (typeof v !== "string") continue;
    const was = prior[k];
    const expectsStructure = Array.isArray(was) || (was !== null && typeof was === "object");
    if (!expectsStructure && !/^\s*\[\s*[{'"]/.test(v)) continue;
    const parsed = parseLooseLiteral(v);
    if (parsed !== undefined && typeof parsed === "object") out[k] = parsed;
  }
  return out as T;
}
