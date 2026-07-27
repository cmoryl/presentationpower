// Schema-driven Content inspector. Renders an editable field for every path
// declared in the active print kind's schema so no content is unreachable —
// even when LiveEditOverlay can't bind a canvas element for it (uppercase
// eyebrow, concatenated author/role, ambiguous values, etc).
//
// Fields already bound in the canvas by LiveEditOverlay get a small "canvas"
// badge so the two editing surfaces feel like one system, not two.

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown, MousePointerClick } from "lucide-react";
import type { FieldSpec, ContentSchema } from "@/lib/print-content-schema";

const input =
  "w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-xs text-[#03002C] focus:border-[#003FC7] focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-white";

// ---- Path helpers ---------------------------------------------------------

/** Read a value at a dotted path with `[i]` array segments. */
function readPath(root: Record<string, unknown>, path: string): unknown {
  if (!path) return root;
  const parts = tokenizePath(path);
  let cur: unknown = root;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur) && typeof p === "number") cur = cur[p];
    else if (typeof cur === "object") cur = (cur as Record<string, unknown>)[p as string];
    else return undefined;
  }
  return cur;
}

/** Immutably write a value at a dotted path. */
function writePath(root: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = tokenizePath(path);
  if (parts.length === 0) return root;
  return set(root, parts, 0, value) as Record<string, unknown>;
}

function set(node: unknown, parts: Array<string | number>, i: number, value: unknown): unknown {
  const key = parts[i]!;
  const isLast = i === parts.length - 1;
  if (Array.isArray(node)) {
    const arr = [...node];
    const idx = typeof key === "number" ? key : Number(key);
    arr[idx] = isLast ? value : set(arr[idx], parts, i + 1, value);
    return arr;
  }
  const obj = { ...((node ?? {}) as Record<string, unknown>) };
  const k = String(key);
  obj[k] = isLast ? value : set(obj[k], parts, i + 1, value);
  return obj;
}

function tokenizePath(path: string): Array<string | number> {
  const out: Array<string | number> = [];
  for (const chunk of path.split(".")) {
    let rest = chunk;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const m = /^([^\[]+)?(\[(\d+)\])?(.*)$/.exec(rest);
      if (!m) break;
      if (m[1]) out.push(m[1]);
      if (m[3] !== undefined) out.push(Number(m[3]));
      if (!m[4]) break;
      rest = m[4];
    }
  }
  return out;
}

function joinPath(a: string, b: string): string {
  if (!a) return b;
  if (b.startsWith("[")) return `${a}${b}`;
  return `${a}.${b}`;
}

// ---- Component ------------------------------------------------------------

export function ContentInspector({
  schema,
  content,
  onWritePath,
  canvasEditablePaths,
}: {
  schema: ContentSchema;
  content: Record<string, unknown>;
  onWritePath: (path: string, value: unknown) => void;
  /** Set of concrete leaf paths currently bound by LiveEditOverlay — badged
   *  so users understand the two surfaces are the same underlying data. */
  canvasEditablePaths?: Set<string>;
}) {
  return (
    <div className="space-y-3">
      {schema.fields.map((f) => (
        <FieldGroup
          key={f.path}
          spec={f}
          basePath=""
          content={content}
          onWritePath={onWritePath}
          canvasEditablePaths={canvasEditablePaths}
        />
      ))}
    </div>
  );
}

function FieldGroup({
  spec, basePath, content, onWritePath, canvasEditablePaths,
}: {
  spec: FieldSpec;
  basePath: string;
  content: Record<string, unknown>;
  onWritePath: (path: string, value: unknown) => void;
  canvasEditablePaths?: Set<string>;
}) {
  const fullPath = joinPath(basePath, spec.path);

  // Scalar renderers get a wrapping row with label + optional canvas badge.
  if (spec.kind === "string" || spec.kind === "enum") {
    return (
      <ScalarField
        spec={spec}
        fullPath={fullPath}
        value={readPath(content, fullPath)}
        onWritePath={onWritePath}
        canvasBound={canvasEditablePaths?.has(fullPath) ?? false}
      />
    );
  }

  if (spec.kind === "object") {
    return (
      <CollapsibleSection label={spec.label}>
        {spec.fields.map((child) => (
          <FieldGroup
            key={child.path}
            spec={child}
            basePath={fullPath}
            content={content}
            onWritePath={onWritePath}
            canvasEditablePaths={canvasEditablePaths}
          />
        ))}
      </CollapsibleSection>
    );
  }

  if (spec.kind === "stringArray") {
    const list = ((readPath(content, fullPath) as unknown[] | undefined) ?? []) as string[];
    const canAdd = spec.maxItems === undefined || list.length < spec.maxItems;
    const canRemove = spec.minItems === undefined || list.length > spec.minItems;
    return (
      <CollapsibleSection label={spec.label} count={list.length}>
        <div className="space-y-1.5">
          {list.map((v, i) => {
            const leafPath = `${fullPath}[${i}]`;
            const bound = canvasEditablePaths?.has(leafPath) ?? false;
            return (
              <div key={i} className="flex items-start gap-1">
                <input
                  className={input}
                  value={v ?? ""}
                  placeholder={spec.placeholder ?? spec.itemLabel ?? "Item"}
                  onChange={(e) => onWritePath(leafPath, e.target.value)}
                />
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveArray(content, fullPath, i, -1, onWritePath)}
                    disabled={i === 0}
                    className="rounded p-1 text-icon-subtle hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/5"
                    aria-label={`Move ${spec.itemLabel ?? "item"} up`}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveArray(content, fullPath, i, 1, onWritePath)}
                    disabled={i === list.length - 1}
                    className="rounded p-1 text-icon-subtle hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/5"
                    aria-label={`Move ${spec.itemLabel ?? "item"} down`}
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(content, fullPath, i, onWritePath)}
                  disabled={!canRemove}
                  className="rounded p-1 text-red-500 hover:bg-red-500/10 disabled:opacity-30"
                  aria-label={`Delete ${spec.itemLabel ?? "item"}`}
                >
                  <Trash2 size={12} />
                </button>
                {bound && <CanvasBadge />}
              </div>
            );
          })}
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => {
              const next = [...list, ""];
              onWritePath(fullPath, next);
            }}
            className="mt-1 inline-flex items-center gap-1 rounded-md border border-dashed border-black/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-black/60 hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-30 dark:border-white/25 dark:text-white/60"
          >
            <Plus size={12} /> Add {spec.itemLabel ?? "item"}
          </button>
        </div>
      </CollapsibleSection>
    );
  }

  // objectArray
  const list = ((readPath(content, fullPath) as unknown[] | undefined) ?? []) as Array<Record<string, unknown>>;
  const canAdd = spec.maxItems === undefined || list.length < spec.maxItems;
  const canRemove = spec.minItems === undefined || list.length > spec.minItems;
  return (
    <CollapsibleSection label={spec.label} count={list.length}>
      <div className="space-y-2">
        {list.map((_, i) => {
          const rowPath = `${fullPath}[${i}]`;
          return (
            <div key={i} className="rounded-lg border border-black/10 p-2 dark:border-white/10">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
                <span>{spec.itemLabel} {i + 1}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveArray(content, fullPath, i, -1, onWritePath)}
                    disabled={i === 0}
                    className="rounded p-1 text-icon-subtle hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/5"
                    aria-label={`Move ${spec.itemLabel} up`}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveArray(content, fullPath, i, 1, onWritePath)}
                    disabled={i === list.length - 1}
                    className="rounded p-1 text-icon-subtle hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/5"
                    aria-label={`Move ${spec.itemLabel} down`}
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(content, fullPath, i, onWritePath)}
                    disabled={!canRemove}
                    className="rounded p-1 text-red-500 hover:bg-red-500/10 disabled:opacity-30"
                    aria-label={`Delete ${spec.itemLabel}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {spec.itemFields.map((child) => (
                <FieldGroup
                  key={child.path}
                  spec={child}
                  basePath={rowPath}
                  content={content}
                  onWritePath={onWritePath}
                  canvasEditablePaths={canvasEditablePaths}
                />
              ))}
            </div>
          );
        })}
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            const next = [...list, spec.itemFactory()];
            onWritePath(fullPath, next);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-black/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-black/60 hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-30 dark:border-white/25 dark:text-white/60"
        >
          <Plus size={12} /> Add {spec.itemLabel}
        </button>
      </div>
    </CollapsibleSection>
  );
}

function ScalarField({
  spec, fullPath, value, onWritePath, canvasBound,
}: {
  spec: Extract<FieldSpec, { kind: "string" | "enum" }>;
  fullPath: string;
  value: unknown;
  onWritePath: (path: string, value: unknown) => void;
  canvasBound: boolean;
}) {
  const strVal = typeof value === "string" || typeof value === "number" ? String(value) : "";
  return (
    <label className="block">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-black/55 dark:text-white/55">
        <span>{spec.label}{spec.optional ? "" : " *"}</span>
        {canvasBound && <CanvasBadge />}
      </div>
      {spec.kind === "enum" ? (
        <select
          className={input}
          value={strVal}
          onChange={(e) => onWritePath(fullPath, e.target.value)}
        >
          {spec.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : spec.multiline ? (
        <textarea
          rows={3}
          className={input}
          placeholder={spec.placeholder}
          value={strVal}
          onChange={(e) => onWritePath(fullPath, e.target.value)}
        />
      ) : (
        <input
          className={input}
          placeholder={spec.placeholder}
          value={strVal}
          onChange={(e) => onWritePath(fullPath, e.target.value)}
        />
      )}
    </label>
  );
}

function CanvasBadge() {
  return (
    <span
      title="Also editable directly on the canvas"
      className="inline-flex items-center gap-0.5 rounded-full border border-[#003FC7]/30 bg-[#003FC7]/8 px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-widest text-[#003FC7]"
    >
      <MousePointerClick size={12} /> Canvas
    </span>
  );
}

function CollapsibleSection({
  label, count, children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border border-black/10 bg-white/50 p-2 dark:border-white/10 dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-black/70 dark:text-white/70"
      >
        <span className="inline-flex items-center gap-1">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {label}
        </span>
        {typeof count === "number" && (
          <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] tabular-nums text-black/60 dark:bg-white/10 dark:text-white/60">{count}</span>
        )}
      </button>
      {open && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );
}

// ---- Array ops (immutable) ------------------------------------------------

function moveArray(
  content: Record<string, unknown>,
  path: string,
  i: number,
  dir: -1 | 1,
  onWritePath: (path: string, value: unknown) => void,
) {
  const list = ((readPath(content, path) as unknown[] | undefined) ?? []) as unknown[];
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  const next = [...list];
  const tmp = next[i]!;
  next[i] = next[j]!;
  next[j] = tmp;
  onWritePath(path, next);
}

function removeAt(
  content: Record<string, unknown>,
  path: string,
  i: number,
  onWritePath: (path: string, value: unknown) => void,
) {
  const list = ((readPath(content, path) as unknown[] | undefined) ?? []) as unknown[];
  const next = list.filter((_, k) => k !== i);
  onWritePath(path, next);
}

// Re-export the writePath helper so the route can implement onWritePath in
// terms of a single immutable operation.
export const contentWritePath = writePath;
