import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Plus, Trash2, Check, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  listLanguages,
  listTranslationEngines,
  listGlossary,
  upsertGlossaryTerm,
  deleteGlossaryTerm,
} from "@/lib/translation.functions";

export const Route = createFileRoute("/admin/translation")({
  head: () => ({
    meta: [
      { title: "Translation · Admin · TransPerfect Modular" },
      { name: "description", content: "Manage translation engines, protected glossary terms, and target languages for deck localization." },
    ],
  }),
  component: TranslationAdminPage,
});

function TranslationAdminPage() {
  const langsFn = useServerFn(listLanguages);
  const enginesFn = useServerFn(listTranslationEngines);
  const glossFn = useServerFn(listGlossary);
  const upsertFn = useServerFn(upsertGlossaryTerm);
  const deleteFn = useServerFn(deleteGlossaryTerm);

  const [engines, setEngines] = useState<Array<{ id: string; label: string; configured: boolean; note?: string }>>([]);
  const [languages, setLanguages] = useState<Array<{ id: string; label: string; native: string; rtl: boolean }>>([]);
  const [glossary, setGlossary] = useState<Array<{ id: string; term: string; do_not_translate: boolean; scope: string; scope_id: string | null; notes: string | null }>>([]);
  const [scopeFilter, setScopeFilter] = useState<"all" | "global" | "division" | "deck">("all");
  const [newTerm, setNewTerm] = useState("");
  const [newScope, setNewScope] = useState<"global" | "division">("global");
  const [newScopeId, setNewScopeId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    const [e, l, g] = await Promise.all([enginesFn(), langsFn(), glossFn({ data: {} })]);
    setEngines(e as never);
    setLanguages(l as never);
    setGlossary(g as never);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (scopeFilter === "all" ? glossary : glossary.filter((g) => g.scope === scopeFilter)),
    [glossary, scopeFilter],
  );

  async function addTerm() {
    if (!newTerm.trim()) return;
    try {
      await upsertFn({
        data: {
          term: newTerm.trim(),
          do_not_translate: true,
          translations: {},
          scope: newScope,
          scope_id: newScope === "division" ? newScopeId || null : null,
          notes: null,
        },
      });
      setNewTerm("");
      setNewScopeId("");
      setStatus("Term added.");
      await refresh();
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  async function removeTerm(id: string) {
    if (!confirm("Delete this glossary term?")) return;
    try {
      await deleteFn({ data: { id } });
      await refresh();
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">Admin · Localization</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Translation</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Configure GlobalLink, review the protected term glossary, and toggle target languages available to authors.
          </p>
        </div>
        <Languages size={28} className="text-[#A1FBF9]" />
      </div>

      {/* Engine status */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/70">Engines</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {engines.map((e) => (
            <div key={e.id} className={`rounded-xl border p-4 ${e.configured ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
              <div className="flex items-center gap-2 text-white">
                {e.configured ? <Check size={14} className="text-emerald-400" /> : <AlertTriangle size={14} className="text-amber-400" />}
                <span className="font-semibold">{e.label}</span>
              </div>
              <div className="mt-1 text-xs text-white/60">{e.note ?? (e.configured ? "Ready" : "")}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Glossary */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70 flex items-center gap-2">
            <ShieldCheck size={14} /> Protected glossary
          </h2>
          <div className="text-xs text-white/60">{glossary.length} terms</div>
        </div>

        {/* Add row */}
        <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-[1fr_140px_140px_auto]">
          <input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Term (e.g. GlobalLink)"
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#A1FBF9]"
          />
          <select
            value={newScope}
            onChange={(e) => setNewScope(e.target.value as "global" | "division")}
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="global">Global</option>
            <option value="division">Division</option>
          </select>
          <input
            value={newScopeId}
            onChange={(e) => setNewScopeId(e.target.value)}
            placeholder={newScope === "division" ? "Division id" : "(n/a)"}
            disabled={newScope !== "division"}
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#A1FBF9] disabled:opacity-40"
          />
          <button
            onClick={addTerm}
            className="inline-flex items-center gap-2 rounded-lg bg-[#003FC7] px-4 py-2 text-sm font-medium text-white hover:bg-[#003FC7]/90"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Filter */}
        <div className="mb-3 flex items-center gap-2 text-xs">
          {(["all", "global", "division", "deck"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScopeFilter(s)}
              className={`rounded-full border px-3 py-1 ${
                scopeFilter === s ? "border-[#A1FBF9] bg-[#A1FBF9]/10 text-[#A1FBF9]" : "border-white/15 text-white/60 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm text-white/80">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-widest text-white/50">
              <tr>
                <th className="px-3 py-2 text-left">Term</th>
                <th className="px-3 py-2 text-left">Scope</th>
                <th className="px-3 py-2 text-left">Scope ID</th>
                <th className="px-3 py-2 text-left">DNT</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-medium text-white">{g.term}</td>
                  <td className="px-3 py-2">{g.scope}</td>
                  <td className="px-3 py-2 font-mono text-xs text-white/50">{g.scope_id ?? "—"}</td>
                  <td className="px-3 py-2">{g.do_not_translate ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeTerm(g.id)}
                      className="rounded-full p-1.5 text-white/50 hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-white/40">No terms in this scope yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Languages */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/70">Active languages ({languages.length})</h2>
        <div className="flex flex-wrap gap-2">
          {languages.map((l) => (
            <div
              key={l.id}
              className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80"
              title={l.native}
            >
              <span className="font-medium text-white">{l.label}</span>{" "}
              <span className="text-white/50">· {l.native}</span>
              {l.rtl && <span className="ml-2 rounded bg-[#A1FBF9]/10 px-1.5 text-[10px] text-[#A1FBF9]">RTL</span>}
            </div>
          ))}
        </div>
      </section>

      {status && <div className="mt-6 text-xs text-white/60">{status}</div>}
    </div>
  );
}
