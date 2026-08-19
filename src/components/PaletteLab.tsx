// Palette Lab — inline A/B palette testing inside the brief creation flow.
// Lists active running experiments matching the current brand and lets the
// author attach one to this deck, or auto-propose 3 palette variants via AI
// (grounded in the seed brand palette + audience/objective).

import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listActiveExperiments, proposeAbPalettes } from "@/lib/admin.functions";

type Palette = { primary: string; accent: string; ink: string; surface: string } & Record<
  string,
  string
>;
type ExpVariant = {
  id: string;
  name: string;
  palette: Palette;
  is_control: boolean;
  weight: number;
};
type Experiment = {
  id: string;
  name: string;
  hypothesis: string | null;
  primary_metric: string;
  brand_id: string | null;
  variants: ExpVariant[];
};
type Proposal = { name: string; rationale: string; palette: Palette };

export type PaletteSelection = {
  experimentId: string | null;
  variantId: string | null;
  paletteOverride: Palette | null;
  proposalName?: string;
};

export function PaletteLab({
  brandId,
  brandName,
  brandRole,
  seedPalette,
  audience,
  objective,
  onChange,
  accent,
}: {
  brandId: string;
  brandName: string;
  brandRole?: string | null;
  seedPalette: Palette;
  audience: string;
  objective: string;
  onChange: (s: PaletteSelection) => void;
  accent: string;
}) {
  const listFn = useServerFn(listActiveExperiments);
  const proposeFn = useServerFn(proposeAbPalettes);

  const q = useQuery({
    queryKey: ["ab", "active", brandId],
    queryFn: () => listFn({ data: { brandId } }),
    retry: false,
  });

  const [selection, setSelection] = useState<PaletteSelection>({
    experimentId: null,
    variantId: null,
    paletteOverride: null,
  });
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [vibe, setVibe] = useState<"trust" | "bold" | "warm" | "">("");

  const propose = useMutation({
    mutationFn: () =>
      proposeFn({
        data: {
          brandName,
          brandRole: brandRole ?? null,
          seedPalette,
          audience,
          objective,
          vibe:
            vibe === "trust"
              ? "trust-forward, calm, cool"
              : vibe === "bold"
                ? "bolder, higher contrast"
                : vibe === "warm"
                  ? "warmer, human, approachable"
                  : "",
        },
      }),
    onSuccess: (res) => {
      if (res.variants?.length) setProposals(res.variants);
    },
  });

  const commit = (patch: PaletteSelection) => {
    setSelection(patch);
    onChange(patch);
  };

  const attachVariant = (exp: Experiment, v: ExpVariant) => {
    commit({ experimentId: exp.id, variantId: v.id, paletteOverride: v.palette });
  };
  const attachProposal = (p: Proposal) => {
    commit({
      experimentId: null,
      variantId: null,
      paletteOverride: p.palette,
      proposalName: p.name,
    });
  };
  const clear = () => commit({ experimentId: null, variantId: null, paletteOverride: null });

  const experiments = useMemo(() => (q.data ?? []) as Experiment[], [q.data]);

  return (
    <div className="space-y-5">
      {/* Running experiments */}
      <div className="rounded-xl border border-[#D1DBE5] bg-[#F8FAFC] p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E3A5F]/70">
            Running experiments {brandName ? `· ${brandName}` : ""}
          </span>
          <span className="font-mono text-[10px] text-[#1E3A5F]/40">{experiments.length} live</span>
        </div>
        {q.isLoading && <div className="mt-2 text-xs text-[#1E3A5F]/60">Loading…</div>}
        {!q.isLoading && experiments.length === 0 && (
          <div className="mt-2 text-xs text-[#1E3A5F]/60">
            No live experiments for this brand. Auto-propose palettes below.
          </div>
        )}
        <div className="mt-3 space-y-3">
          {experiments.map((exp) => (
            <div key={exp.id} className="rounded-lg border border-[#D1DBE5] bg-white p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#0F1B3D]">{exp.name}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-[#1E3A5F]/50">
                    primary: {exp.primary_metric}
                    {exp.hypothesis ? ` · ${exp.hypothesis.slice(0, 80)}` : ""}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {exp.variants.map((v) => {
                  const active = selection.experimentId === exp.id && selection.variantId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => attachVariant(exp, v)}
                      className="flex items-center gap-3 rounded-md border-2 p-2 text-left transition-all"
                      style={{
                        borderColor: active ? accent : "#D1DBE5",
                        backgroundColor: active ? `${accent}0d` : "#fff",
                      }}
                    >
                      <div className="flex gap-1">
                        {(["primary", "accent", "ink", "surface"] as const).map((k) => (
                          <div
                            key={k}
                            className="h-5 w-5 rounded border border-black/10"
                            title={`${k}: ${v.palette[k]}`}
                            style={{ background: v.palette[k] }}
                          />
                        ))}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#0F1B3D]">
                          {v.name}{" "}
                          {v.is_control && <span className="text-[#1E3A5F]/40">· control</span>}
                        </div>
                        <div className="text-[10px] text-[#1E3A5F]/50">weight {v.weight}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-propose */}
      <div className="rounded-xl border border-dashed border-[#D1DBE5] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E3A5F]/70">
              AI-propose palettes
            </div>
            <div className="mt-0.5 text-[11px] text-[#1E3A5F]/60">
              3 variants grounded in {brandName}'s seed tokens + your audience + objective.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Vibe"
              value={vibe}
              onChange={(e) => setVibe(e.target.value as typeof vibe)}
              className="rounded-md border border-[#D1DBE5] bg-[#F8FAFC] px-2 py-1 text-[11px] text-[#0F1B3D]"
            >
              <option value="">Any vibe</option>
              <option value="trust">Trust-forward</option>
              <option value="bold">Bolder / higher contrast</option>
              <option value="warm">Warmer / human</option>
            </select>
            <button
              type="button"
              disabled={propose.isPending}
              onClick={() => propose.mutate()}
              className="rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {propose.isPending ? "Proposing…" : "Propose"}
            </button>
          </div>
        </div>
        {propose.data?.error && (
          <div className="mt-2 text-xs text-red-600">Propose failed: {propose.data.error}</div>
        )}
        {proposals.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {proposals.map((p, i) => {
              const active =
                !selection.experimentId &&
                selection.paletteOverride &&
                selection.proposalName === p.name;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => attachProposal(p)}
                  className="rounded-md border-2 p-3 text-left transition-all"
                  style={{
                    borderColor: active ? accent : "#D1DBE5",
                    backgroundColor: active ? `${accent}0d` : "#fff",
                  }}
                >
                  <div className="flex gap-1">
                    {(["primary", "accent", "ink", "surface"] as const).map((k) => (
                      <div
                        key={k}
                        className="h-6 w-6 rounded border border-black/10"
                        title={`${k}: ${p.palette[k]}`}
                        style={{ background: p.palette[k] }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-[#0F1B3D]">{p.name}</div>
                  <div className="mt-0.5 text-[10px] leading-snug text-[#1E3A5F]/70">
                    {p.rationale}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Current selection */}
      {(selection.experimentId || selection.paletteOverride) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D1DBE5] bg-white p-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F]/60">
              Attached
            </span>
            {selection.paletteOverride && (
              <div className="flex gap-1">
                {(["primary", "accent", "ink", "surface"] as const).map((k) => (
                  <div
                    key={k}
                    className="h-5 w-5 rounded border border-black/10"
                    style={{ background: selection.paletteOverride![k] }}
                  />
                ))}
              </div>
            )}
            <span className="text-xs text-[#0F1B3D]">
              {selection.experimentId
                ? `A/B experiment → variant ${selection.variantId?.slice(0, 6)}`
                : selection.proposalName
                  ? `AI proposal · ${selection.proposalName}`
                  : "custom palette"}
            </span>
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F]/60 hover:text-[#0F1B3D]"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
