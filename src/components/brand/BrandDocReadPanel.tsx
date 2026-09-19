// Reads an uploaded brand document and offers what it found to the guide editor.
//
// Nothing is applied on its own: every colour, typeface and term found in the
// file is shown with its source value, and the brand lead ticks what belongs in
// the guide. Terms are written straight to the glossary (they are live records);
// colours and typefaces go into the unsaved draft.

import { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DOC_ACCEPT, MAX_FILE_BYTES, isPlainTextDoc, isSupportedDoc } from "@/lib/agent/doc-intake";
import { extractAgentDocument } from "@/lib/agent/doc-intake.functions";
import { upsertGlossaryTerm } from "@/lib/translation.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  COLOR_GROUP_LABEL,
  describeBrandDocRead,
  readBrandDocument,
  type BrandDocRead,
  type ColorGroupKey,
  type ReadSwatch,
} from "@/lib/brand-guide-doc-read";
import type { ColorSwatch } from "@/lib/brand-guides";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

export type DocApply = {
  colors: Partial<Record<ColorGroupKey, ColorSwatch[]>>;
  /** "replace" swaps each group's list; "add" appends new colours to it. */
  mode: "replace" | "add";
  typefacePrimary?: string;
  typefaceWeb?: string;
};


export function BrandDocReadPanel({
  divisionId,
  onApply,
  onTermsAdded,
}: {
  divisionId: string;
  onApply: (apply: DocApply) => void;
  onTermsAdded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTerm = useServerFn(upsertGlossaryTerm);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [read, setRead] = useState<BrandDocRead | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [faces, setFaces] = useState({ primary: true, web: true });
  const [replace, setReplace] = useState(true);
  const [termsBusy, setTermsBusy] = useState(false);

  const scope = divisionId === "master" ? "global" : "division";

  async function ingest(file: File) {
    if (!isSupportedDoc(file.name, file.type)) {
      toast.error(`${file.name}: this file type can't be read.`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`${file.name} is larger than 20MB.`);
      return;
    }
    setBusy(true);
    try {
      let text = "";
      if (isPlainTextDoc(file.name, file.type)) {
        text = await file.text();
      } else {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const res = await extractAgentDocument({
          data: { filename: file.name, mime: file.type || undefined, base64: toBase64(bytes) },
        });
        text = res.text;
      }
      const parsed = readBrandDocument(text);
      setRead(parsed);
      setFileName(file.name);
      setPicked(new Set(parsed.swatches.map((_, i) => String(i))));
      setFaces({ primary: true, web: true });
      if (!parsed.swatches.length && !parsed.terms.length && !parsed.typefacePrimary) {
        toast.message(`No colours, typefaces or terms were written in ${file.name}.`);
      } else {
        toast.success(describeBrandDocRead(parsed));
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function applyPicked() {
    if (!read) return;
    const chosen: ReadSwatch[] = read.swatches.filter((_, i) => picked.has(String(i)));
    const colors: Partial<Record<ColorGroupKey, ColorSwatch[]>> = {};
    for (const s of chosen) {
      const { group, ...swatch } = s;
      (colors[group] ??= []).push(swatch);
    }
    const apply: DocApply = { colors };
    if (faces.primary && read.typefacePrimary) apply.typefacePrimary = read.typefacePrimary;
    if (faces.web && read.typefaceWeb) apply.typefaceWeb = read.typefaceWeb;
    onApply(apply);
    toast.success(
      `${chosen.length} colour${chosen.length === 1 ? "" : "s"} taken from ${fileName} — press Save changes to publish them.`,
    );
  }

  async function addTerms() {
    if (!read?.terms.length) return;
    setTermsBusy(true);
    let added = 0;
    const failed: string[] = [];
    for (const t of read.terms) {
      try {
        await saveTerm({
          data: {
            term: t.term,
            do_not_translate: t.doNotTranslate,
            translations: {},
            scope,
            ...(scope === "division" ? { scope_id: divisionId } : {}),
            ...(t.note ? { notes: t.note } : {}),
          },
        });
        added += 1;
      } catch {
        failed.push(t.term);
      }
    }
    setTermsBusy(false);
    if (added) toast.success(`${added} term${added === 1 ? "" : "s"} added to the glossary.`);
    if (failed.length) toast.error(`Could not add: ${failed.join(", ")}`);
    onTermsAdded?.();
  }

  const hasFaces = Boolean(read?.typefacePrimary || read?.typefaceWeb);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="text-sm font-semibold">Read from a brand document</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Upload the brand book or palette sheet (PDF, Word, PowerPoint, text). Only values written in
        the file are offered — nothing is invented, and nothing changes until you apply it.
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="mr-1 h-4 w-4" aria-hidden />
          )}
          {busy ? "Reading…" : "Choose file"}
        </Button>
        {fileName && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {fileName}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={DOC_ACCEPT}
          className="sr-only"
          aria-label="Brand document"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void ingest(file);
          }}
        />
      </div>

      {read && (
        <div className="mt-4 space-y-4">
          <div className="text-xs text-muted-foreground">{describeBrandDocRead(read)}</div>

          {read.swatches.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Colours in the file
              </div>
              <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {read.swatches.map((s, i) => {
                  const key = String(i);
                  const on = picked.has(key);
                  return (
                    <li key={`${s.hex}-${i}`}>
                      <label className="flex items-center gap-2 rounded-lg border border-border/70 px-2 py-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => {
                            const next = new Set(picked);
                            if (e.target.checked) next.add(key);
                            else next.delete(key);
                            setPicked(next);
                          }}
                        />
                        <span
                          className="h-5 w-5 shrink-0 rounded border border-border"
                          style={{ background: s.hex }}
                          aria-hidden
                        />
                        <span className="truncate font-medium">{s.name}</span>
                        <span className="font-mono text-muted-foreground">{s.hex}</span>
                        <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {COLOR_GROUP_LABEL[s.group]}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {hasFaces && (
            <div className="space-y-1.5 text-xs">
              <div className="font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Typefaces in the file
              </div>
              {read.typefacePrimary && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={faces.primary}
                    onChange={(e) => setFaces({ ...faces, primary: e.target.checked })}
                  />
                  Primary: <span className="font-medium">{read.typefacePrimary}</span>
                </label>
              )}
              {read.typefaceWeb && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={faces.web}
                    onChange={(e) => setFaces({ ...faces, web: e.target.checked })}
                  />
                  Web: <span className="font-medium">{read.typefaceWeb}</span>
                </label>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />
              Replace the existing colours in each group (off: add to them)
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!picked.size && !hasFaces}
              onClick={() => {
                if (!read) return;
                const chosen = read.swatches.filter((_, i) => picked.has(String(i)));
                const colors: Partial<Record<ColorGroupKey, ColorSwatch[]>> = {};
                for (const s of chosen) {
                  const { group, ...swatch } = s;
                  (colors[group] ??= []).push(swatch);
                }
                if (replace) applyPicked();
                else {
                  const apply: DocApply = { colors };
                  if (faces.primary && read.typefacePrimary)
                    apply.typefacePrimary = read.typefacePrimary;
                  if (faces.web && read.typefaceWeb) apply.typefaceWeb = read.typefaceWeb;
                  onApply({ ...apply, colors });
                  toast.success(`Added ${chosen.length} colour(s) from ${fileName}.`);
                }
              }}
            >
              Use these in the guide
            </Button>
            {read.terms.length > 0 && (
              <Button size="sm" variant="outline" disabled={termsBusy} onClick={addTerms}>
                {termsBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Add {read.terms.length} term{read.terms.length === 1 ? "" : "s"} to the glossary
              </Button>
            )}
          </div>

          {read.terms.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {read.terms.map((t) => (
                <li
                  key={t.term}
                  className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {t.term}
                  {t.doNotTranslate ? " · never translate" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
