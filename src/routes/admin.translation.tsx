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
      {
        name: "description",
        content:
          "Manage translation engines, protected glossary terms, and target languages for deck localization.",
      },
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

  const [engines, setEngines] = useState<
    Array<{ id: string; label: string; configured: boolean; note?: string }>
  >([]);
  const [languages, setLanguages] = useState<
    Array<{ id: string; label: string; native: string; rtl: boolean }>
  >([]);
  const [glossary, setGlossary] = useState<
    Array<{
      id: string;
      term: string;
      do_not_translate: boolean;
      scope: string;
      scope_id: string | null;
      notes: string | null;
    }>
  >([]);
  const [scopeFilter, setScopeFilter] = useState<"all" | "global" | "division" | "deck">("all");
  const [newTerm, setNewTerm] = useState("");
  const [newScope, setNewScope] = useState<"global" | "division">("global");
  const [newScopeId, setNewScopeId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    try {
      const [e, l, g] = await Promise.all([enginesFn(), langsFn(), glossFn({ data: {} })]);
      setEngines(e as never);
      setLanguages(l as never);
      setGlossary(g as never);
      setStatus(null);
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      setStatus(
        /unauthorized|authorization header/i.test(msg)
          ? "Sign in to manage translation settings."
          : msg,
      );
    }
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
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.35em] text-black/50">
            Admin · Localization
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-[#03002C] sm:text-3xl">
            Translation
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-black/65">
            Configure GlobalLink, review the protected term glossary, and toggle target languages
            available to authors.
          </p>
        </div>
        <Languages size={24} className="shrink-0 text-[#003FC7]" />
      </header>

      {/* Engine status */}
      <section className="mb-8 rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-black/60">
          Engines
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {engines.map((e) => (
            <div
              key={e.id}
              className={`rounded-xl border p-4 ${
                e.configured
                  ? "border-emerald-500/40 bg-emerald-50"
                  : "border-amber-500/40 bg-amber-50"
              }`}
            >
              <div className="flex items-center gap-2 text-[#03002C]">
                {e.configured ? (
                  <Check size={14} className="text-accent-foreground" />
                ) : (
                  <AlertTriangle size={14} className="text-accent-foreground" />
                )}
                <span className="font-semibold">{e.label}</span>
              </div>
              <div className="mt-1 text-xs text-black/70">
                {e.note ?? (e.configured ? "Ready" : "")}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Glossary */}
      <section className="mb-8 rounded-2xl border border-black/10 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-black/60">
            <ShieldCheck size={14} /> Protected glossary
          </h2>
          <div className="text-xs text-black/50">{glossary.length} terms</div>
        </div>

        {/* Add row */}
        <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_140px_160px_auto]">
          <input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Term (e.g. GlobalLink)"
            className="min-w-0 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] placeholder:text-black/40 outline-none focus:border-[#003FC7]"
          />
          <select
            aria-label="New Scope"
            value={newScope}
            onChange={(e) => setNewScope(e.target.value as "global" | "division")}
            className="min-w-0 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C]"
          >
            <option value="global">Global</option>
            <option value="division">Division</option>
          </select>
          <input
            value={newScopeId}
            onChange={(e) => setNewScopeId(e.target.value)}
            placeholder={newScope === "division" ? "Division id" : "(n/a)"}
            disabled={newScope !== "division"}
            className="min-w-0 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] placeholder:text-black/40 outline-none focus:border-[#003FC7] disabled:opacity-40"
          />
          <button
            onClick={addTerm}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#003FC7] px-4 py-2 text-sm font-medium text-white hover:bg-[#003FC7]/90"
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
                scopeFilter === s
                  ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                  : "border-black/15 text-black/60 hover:text-black"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-black/10">
          <table className="w-full min-w-[560px] text-sm text-black/80">
            <thead className="bg-black/[0.03] text-xs uppercase tracking-widest text-black/50">
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
                <tr key={g.id} className="border-t border-black/5 align-top">
                  <td className="px-3 py-2 font-medium text-[#03002C]">
                    <div className="max-w-[220px] truncate" title={g.term}>
                      {g.term}
                    </div>
                  </td>
                  <td className="px-3 py-2">{g.scope}</td>
                  <td className="px-3 py-2 font-mono text-xs text-black/50">
                    <div className="max-w-[160px] truncate" title={g.scope_id ?? ""}>
                      {g.scope_id ?? "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2">{g.do_not_translate ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeTerm(g.id)}
                      className="rounded-full p-1.5 text-icon-muted hover:bg-red-500/10 hover:text-red-600"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-black/40">
                    No terms in this scope yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Languages */}
      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-black/60">
          Active languages ({languages.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {languages.map((l) => (
            <div
              key={l.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/80"
              title={l.native}
            >
              <span className="truncate font-medium text-[#03002C]">{l.label}</span>
              <span className="truncate text-black/50">· {l.native}</span>
              {l.rtl && (
                <span className="shrink-0 rounded bg-[#003FC7]/10 px-1.5 text-[10px] text-[#003FC7]">
                  RTL
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {status && <div className="mt-6 text-xs text-black/60">{status}</div>}
    </div>
  );
}
