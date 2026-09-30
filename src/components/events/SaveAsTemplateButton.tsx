// "Save as template" — saves the sign's last saved design (size, layers and
// editable text) to the sign template library as a draft. It becomes usable in
// sign sets once an admin or brand lead approves it on the Approvals page.

import { useEffect, useState } from "react";
import { BookmarkPlus, X } from "lucide-react";
import { toast } from "sonner";

import { kioskEditKey, kioskFaceH, kioskFaceW, type LiveLayout } from "@/lib/next-california-kiosk-live";
import { canEditSigns, loadSignEdits, saveSignTemplate } from "@/lib/sign-set-data";
import { FIELD_KEYS, FIELD_LABEL, SIGN_KINDS, SIGN_KIND_LABEL, type FieldKey, type SignKind } from "@/lib/sign-set";

const field = "mt-1 w-full rounded-md border border-[#03002C]/20 bg-white px-2.5 py-1.5 text-[13px] text-[#03002C]";

export function SaveAsTemplateButton({ layout, sourceLabel, defaultKind = "other", className = "" }: { layout: LiveLayout; sourceLabel: string; defaultKind?: SignKind; className?: string }) {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => { void canEditSigns().then(setAllowed); }, []);
  if (allowed === false) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={allowed === null}
        className={`inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A1FBF9] disabled:opacity-50 ${className}`}>
        <BookmarkPlus className="h-3.5 w-3.5" aria-hidden /> Save as template
      </button>
      {open && <SaveDialog layout={layout} sourceLabel={sourceLabel} defaultKind={defaultKind} onClose={() => setOpen(false)} />}
    </>
  );
}

function SaveDialog({ layout, sourceLabel, defaultKind, onClose }: { layout: LiveLayout; sourceLabel: string; defaultKind: SignKind; onClose: () => void }) {
  const [name, setName] = useState(sourceLabel);
  const [kind, setKind] = useState<SignKind>(defaultKind);
  const [fields, setFields] = useState<Record<string, FieldKey | "">>({});
  const [busy, setBusy] = useState(false);
  const texts = layout.texts.filter((t) => t.text.trim());
  const w = +(kioskFaceW(layout) / 72).toFixed(2), h = +(kioskFaceH(layout) / 72).toFixed(2);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  async function save() {
    setBusy(true);
    try {
      const edits = await loadSignEdits(kioskEditKey(layout));
      const linked = Object.fromEntries(Object.entries(fields).filter(([, v]) => v)) as Record<string, FieldKey>;
      await saveSignTemplate({ name: name.trim(), kind, layoutId: layout.id, sourceLabel, wIn: w, hIn: h, edits, fields: linked });
      toast.success("Saved as a draft template. It's ready to use once approved on the Approvals page.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The template didn't save.");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="sat-h" className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-5 text-[#03002C] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="sat-h" className="text-[17px] font-bold">Save as template</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-[#F2F2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-[13px] text-[#666666]">
          Saves the last saved version of this sign ({w} × {h} in). Templates only fit sign spots of the same size; artwork is never stretched.
        </p>
        <label className="mt-4 block text-[12px] font-semibold">Name<input autoFocus className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></label>
        <label className="mt-3 block text-[12px] font-semibold">Type
          <select className={field} value={kind} onChange={(e) => setKind(e.target.value as SignKind)}>
            {SIGN_KINDS.map((k) => <option key={k} value={k}>{SIGN_KIND_LABEL[k]}</option>)}
          </select>
        </label>
        <fieldset className="mt-4">
          <legend className="text-[12px] font-semibold">Fill these lines from each event</legend>
          <p className="text-[12px] text-[#666666]">Leave a line on “Keep these words” to print it as it is. A linked line stays blank and flagged until the event has that fact.</p>
          {texts.length === 0 && <p className="mt-2 text-[12px] text-[#666666]">This sign has no editable text lines.</p>}
          <ul className="mt-2 space-y-2">
            {texts.map((t) => (
              <li key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-2">
                <span className="truncate text-[13px]" title={t.text}>“{t.text}”</span>
                <select aria-label={`Fill “${t.text}” from`} className="rounded-md border border-[#03002C]/20 bg-white px-2 py-1 text-[12px]" value={fields[t.id] ?? ""} onChange={(e) => setFields({ ...fields, [t.id]: e.target.value as FieldKey | "" })}>
                  <option value="">Keep these words</option>
                  {FIELD_KEYS.map((k) => <option key={k} value={k}>{FIELD_LABEL[k]}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </fieldset>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-[#03002C]/25 px-4 py-2 text-[13px] font-semibold hover:bg-[#F2F2F2]">Cancel</button>
          <button type="button" onClick={save} disabled={busy || !name.trim()} className="rounded-full bg-[#003FC7] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0034a6] disabled:opacity-50">{busy ? "Saving…" : "Save draft template"}</button>
        </div>
      </div>
    </div>
  );
}
