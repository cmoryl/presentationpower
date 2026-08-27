// Admin: edit each NEXT MART sign individually.
//
// Pick any sign in the kit — pillar or flat panel — and it opens as a live
// master in the pillar studio with its production facts beside it. Saving writes
// the plate and the facts back onto that sign, so the overview cards, the spec
// table and the layered vector export bundles all pick the edit up.

import { useMemo, useState } from "react";
import { Lock, PencilLine, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { PillarStudio } from "@/components/next/PillarStudio";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { martPillarConfig } from "@/lib/next-mart";
import { martFlatConfig } from "@/lib/next-mart-placement";
import {
  listMartFlatSigns,
  listMartPillarSigns,
  martSignConfig,
  martSignIsEdited,
  resetMartSign,
  saveMartFlatMeta,
  saveMartPillarMeta,
  saveMartSignConfig,
} from "@/lib/next-mart-signs";
import type { PillarConfig } from "@/lib/next-pillar-masters";

type Target = {
  id: string;
  name: string;
  kind: "pillar" | "flat";
  config: PillarConfig;
};

const inputClass =
  "w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[12px] text-[#03002C] outline-none focus:border-[#003FC7]";

export function MartSignEditor() {
  const isAdmin = useIsAdmin();
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PillarConfig | null>(null);

  const targets = useMemo<Target[]>(() => {
    void version;
    const pillars = listMartPillarSigns().map<Target>((sign) => ({
      id: sign.id,
      name: sign.name,
      kind: "pillar",
      config: martSignConfig(sign.id) ?? martPillarConfig(sign),
    }));
    const flats = listMartFlatSigns().map<Target>((sign) => ({
      id: sign.id,
      name: sign.name,
      kind: "flat",
      config: martSignConfig(sign.id) ?? martFlatConfig(sign),
    }));
    return [...pillars, ...flats];
  }, [version]);

  const pillarMeta = useMemo(
    () => listMartPillarSigns().find((s) => s.id === selectedId) ?? null,
    [selectedId, version],
  );
  const flatMeta = useMemo(
    () => listMartFlatSigns().find((s) => s.id === selectedId) ?? null,
    [selectedId, version],
  );

  const selected = targets.find((t) => t.id === selectedId) ?? null;

  if (!isAdmin) {
    return (
      <section className="mt-12 rounded-2xl border border-black/10 bg-white px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[#03002C]">
          <Lock size={14} /> Per-sign editing is admin only
        </div>
        <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-black/60">
          The issued mart signs above are production files. Ask an admin to open a sign if the copy,
          quantity or plate needs to change for your stop.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
            Edit each sign · admin
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/60">
            Open any sign in the kit as a live master. The plate edits in the studio below and the
            production facts edit beside it — saving writes both back onto that sign, so the
            overview, the spec table and every export bundle use the edited file.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {targets.map((t) => {
          const active = t.id === selectedId;
          const edited = martSignIsEdited(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedId(t.id);
                setDraft(t.config);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium ${
                active
                  ? "border-[#003FC7] bg-[#003FC7] text-white"
                  : "border-black/15 bg-white text-[#03002C] hover:border-[#003FC7]"
              }`}
            >
              <PencilLine size={12} /> {t.name}
              {edited ? (
                <span
                  className={`rounded px-1 text-[10px] ${active ? "bg-white/20" : "bg-[#E0E8F5] text-[#003FC7]"}`}
                >
                  Edited
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {!selected ? (
        <p className="mt-4 text-[12px] text-black/55">Pick a sign to edit it.</p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-medium text-[#03002C]">
                {selected.name} · production facts
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (draft) saveMartSignConfig(selected.id, draft);
                      setVersion((v) => v + 1);
                      toast.success("Sign saved", {
                        description: `${selected.name} now uses your edited master.`,
                      });
                    } catch (e) {
                      toast.error("Could not save", { description: (e as Error).message });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#003FC7] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#0033a3]"
                >
                  <Save size={13} /> Save to this sign
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetMartSign(selected.id);
                    setVersion((v) => v + 1);
                    setDraft(null);
                    setSelectedId(null);
                    toast.success("Sign reset to the issued master");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-[12px] font-medium text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]"
                >
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
            </div>

            {selected.kind === "pillar" && pillarMeta ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(
                  [
                    ["name", "Sign name"],
                    ["role", "Role"],
                    ["placement", "Placement"],
                    ["substrate", "Substrate"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="text-[11px] uppercase tracking-wide text-black/45">
                      {label}
                    </span>
                    <input
                      className={`mt-1 ${inputClass}`}
                      defaultValue={pillarMeta[field]}
                      onBlur={(e) => {
                        saveMartPillarMeta(selected.id, { [field]: e.target.value } as never);
                        setVersion((v) => v + 1);
                      }}
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-black/45">
                    Quantity
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    className={`mt-1 ${inputClass}`}
                    defaultValue={pillarMeta.quantity}
                    onBlur={(e) => {
                      saveMartPillarMeta(selected.id, {
                        quantity: Math.max(1, Math.min(200, Number(e.target.value) || 1)),
                      });
                      setVersion((v) => v + 1);
                    }}
                  />
                </label>
              </div>
            ) : null}

            {selected.kind === "flat" && flatMeta ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(
                  [
                    ["name", "Sign name"],
                    ["role", "Role"],
                    ["substrate", "Substrate"],
                    ["finishing", "Finishing"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="text-[11px] uppercase tracking-wide text-black/45">
                      {label}
                    </span>
                    <input
                      className={`mt-1 ${inputClass}`}
                      defaultValue={flatMeta[field]}
                      onBlur={(e) => {
                        saveMartFlatMeta(selected.id, { [field]: e.target.value } as never);
                        setVersion((v) => v + 1);
                      }}
                    />
                  </label>
                ))}
                {(
                  [
                    ["trimW", "Trim width (mm)"],
                    ["trimH", "Trim height (mm)"],
                    ["bleed", "Bleed (mm)"],
                    ["quantity", "Quantity"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="text-[11px] uppercase tracking-wide text-black/45">
                      {label}
                    </span>
                    <input
                      type="number"
                      min={0}
                      className={`mt-1 ${inputClass}`}
                      defaultValue={flatMeta[field]}
                      onBlur={(e) => {
                        saveMartFlatMeta(selected.id, {
                          [field]: Math.max(0, Number(e.target.value) || 0),
                        } as never);
                        setVersion((v) => v + 1);
                      }}
                    />
                  </label>
                ))}
                <label className="block sm:col-span-2 xl:col-span-3">
                  <span className="text-[11px] uppercase tracking-wide text-black/45">
                    Copy lines (one per line)
                  </span>
                  <textarea
                    rows={3}
                    className={`mt-1 ${inputClass}`}
                    defaultValue={flatMeta.copy.join("\n")}
                    onBlur={(e) => {
                      saveMartFlatMeta(selected.id, {
                        copy: e.target.value
                          .split("\n")
                          .map((l) => l.trim())
                          .filter(Boolean),
                      });
                      setVersion((v) => v + 1);
                    }}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <PillarStudio
            scope="next-mart"
            heading={`${selected.name} · live master`}
            intro="This is the sign itself, not a blank template. Edit the plate, then use “Save to this sign” above to write it back onto the mart kit — or export press-ready art straight from here."
            showDivisionGallery={false}
            configKey={selected.id}
            initialConfig={selected.config}
            onConfigChange={setDraft}
          />
        </div>
      )}
    </section>
  );
}
