// /admin/needs-source — read-only scan of stored decks, print pieces and
// social kits for unsourced figures and banned words. Lists only; never edits.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { RequireAdmin } from "@/components/AdminShell";
import { lintContent, type ComplianceViolation } from "@/lib/compliance-check";

export const Route = createFileRoute("/admin/needs-source")({
  head: () => ({
    meta: [
      { title: "Needs source · Admin · TransPerfect Element" },
      { name: "description", content: "Stored decks, print pieces and social kits whose figures have no source, or that use banned words." },
      { property: "og:title", content: "Needs source · Admin · TransPerfect Element" },
      { property: "og:description", content: "Figures without a source and banned words across stored assets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <NeedsSource />
    </RequireAdmin>
  ),
});

type Hit = { surface: "Deck" | "Print" | "Social kit"; id: string; title: string; link: { to: string; params: Record<string, string> } | null; issues: ComplianceViolation[] };

async function scan(): Promise<Hit[]> {
  const hits: Hit[] = [];
  const [decks, prints, kits] = await Promise.all([
    supabase.from("decks").select("id,title,context").limit(2000),
    supabase.from("print_assets").select("id,title,content").limit(2000),
    supabase.from("campaign_kits").select("id,name,copy,event_facts").limit(2000),
  ]);
  const deckRows = decks.data ?? [];
  for (let i = 0; i < deckRows.length; i += 100) {
    const ids = deckRows.slice(i, i + 100).map((d) => d.id);
    const { data } = await supabase.from("deck_slides").select("deck_id,position,content,notes").in("deck_id", ids);
    const by = new Map<string, unknown[]>();
    for (const s of data ?? []) by.set(s.deck_id, [...(by.get(s.deck_id) ?? []), { [`slide ${s.position + 1}`]: s.content }]);
    for (const d of deckRows.slice(i, i + 100)) {
      const ctx = (d.context ?? {}) as Record<string, unknown>;
      const extra = Array.isArray(ctx["risksToAvoid"]) ? (ctx["risksToAvoid"] as unknown[]).filter((x): x is string => typeof x === "string" && x.length < 40) : [];
      const issues = lintContent(by.get(d.id) ?? [], extra);
      if (issues.length) hits.push({ surface: "Deck", id: d.id, title: d.title ?? "Untitled deck", link: { to: "/decks/$deckId", params: { deckId: d.id } }, issues });
    }
  }
  for (const p of prints.data ?? []) {
    const issues = lintContent(p.content);
    if (issues.length) hits.push({ surface: "Print", id: p.id, title: p.title ?? "Untitled print piece", link: { to: "/asset/$assetId", params: { assetId: p.id } }, issues });
  }
  for (const k of kits.data ?? []) {
    const issues = lintContent({ copy: k.copy, facts: k.event_facts });
    if (issues.length) hits.push({ surface: "Social kit", id: k.id, title: k.name ?? "Untitled kit", link: null, issues });
  }
  return hits.sort((a, b) => b.issues.length - a.issues.length);
}

function NeedsSource() {
  const q = useQuery({ queryKey: ["needs-source"], queryFn: scan, staleTime: 60_000 });
  const [kind, setKind] = useState<"all" | ComplianceViolation["kind"]>("all");
  const rows = useMemo(() => (q.data ?? []).map((h) => ({ ...h, shown: kind === "all" ? h.issues : h.issues.filter((i) => i.kind === kind) })).filter((h) => h.shown.length), [q.data, kind]);
  const total = (k: ComplianceViolation["kind"]) => (q.data ?? []).reduce((n, h) => n + h.issues.filter((i) => i.kind === k).length, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-[#03002C]">
      <h1 className="text-2xl font-semibold">Needs source</h1>
      <p className="mt-1 max-w-3xl text-[14px] text-[#666666]">
        Every stored figure written with %, x, × or + is listed until it has a source, plus banned words (seamless, revolutionize, unlock, leverage and each deck's own words to avoid). Nothing here is changed or deleted; open an item to fix it.
      </p>
      {q.isLoading && <p className="mt-6 text-[14px]">Scanning stored assets…</p>}
      {q.error && <p className="mt-6 text-[14px] text-[#E53D2E]">The scan didn't finish: {(q.error as Error).message}</p>}
      {q.data && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-[13px]">
            {([["all", `All (${q.data.length} items)`], ["needs-source", `Figures needing a source (${total("needs-source")})`], ["banned-word", `Banned words (${total("banned-word")})`]] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
                className={`rounded-md border px-3 py-1.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] ${kind === k ? "border-[#03002C] bg-[#03002C] text-white" : "border-[#03002C]/20 hover:bg-[#F2F2F2]"}`}>
                {label}
              </button>
            ))}
          </div>
          <table className="mt-4 w-full text-left text-[13px]">
            <thead className="border-b border-[#03002C]/15 text-[12px] text-[#666666]">
              <tr><th scope="col" className="py-2 pr-3">Item</th><th scope="col" className="pr-3">Type</th><th scope="col">Found</th></tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.surface + h.id} className="border-b border-[#03002C]/5 align-top">
                  <td className="py-2 pr-3 font-medium">
                    {h.link ? <Link to={h.link.to as never} params={h.link.params as never} className="text-[#003FC7] hover:underline">{h.title}</Link> : h.title}
                  </td>
                  <td className="py-2 pr-3 text-[#666666]">{h.surface}</td>
                  <td className="py-2">
                    {h.shown.slice(0, 8).map((i, n) => (
                      <span key={n} className="mr-1.5 inline-block rounded-sm bg-[#F2F2F2] px-1.5 py-0.5" title={i.path}>
                        {i.kind === "banned-word" ? "word: " : ""}{i.match}
                      </span>
                    ))}
                    {h.shown.length > 8 && <span className="text-[#666666]">+{h.shown.length - 8} more</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="mt-4 text-[14px]">Nothing found.</p>}
        </>
      )}
    </main>
  );
}
