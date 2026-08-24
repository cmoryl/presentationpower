// QUICK CREATE — one-click starts for Sales and Marketing dashboards.
//
// Every button here creates the real artifact in the correct template set and
// drops the user straight into its editor: decks are assembled locally with a
// validated look, print pieces are seeded through the print-asset server fn,
// and campaign kits are saved with an approved format profile then opened in
// the kit wizard.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Loader2, Presentation, FileText, LayoutGrid, Zap } from "lucide-react";

import { useTaxonomy } from "@/hooks/use-taxonomy";
import { useDeckStore } from "@/lib/deck-store";
import { createPrintAssetWithBrief } from "@/lib/print-assets.functions";
import { saveKit } from "@/lib/kits.functions";
import { normalizeLook } from "@/lib/look-validate";
import { KIT_PROFILES_BY_ID } from "@/lib/social-formats";
import {
  quickCreatePresets,
  type QuickCreateKind,
  type QuickCreatePreset,
} from "@/lib/quick-create";
import { personaTheme } from "@/lib/persona-theme";
import type { PersonaId } from "@/lib/workspace-persona";

const KIND_ICON: Record<QuickCreateKind, typeof Presentation> = {
  deck: Presentation,
  print: FileText,
  kit: LayoutGrid,
};

const KIND_LABEL: Record<QuickCreateKind, string> = {
  deck: "Deck",
  print: "Print",
  kit: "Kit",
};

export function QuickCreate({ personaId, signedIn }: { personaId: PersonaId; signedIn: boolean }) {
  const presets = useMemo(() => quickCreatePresets(personaId), [personaId]);
  const theme = personaTheme(personaId);
  const { brandModes } = useTaxonomy();
  const navigate = useNavigate();

  const createDeck = useDeckStore((s) => s.createBriefAndAssemble);
  const setDeckContext = useDeckStore((s) => s.setDeckContext);
  const createPrint = useServerFn(createPrintAssetWithBrief);
  const createKit = useServerFn(saveKit);

  const defaultBrandId =
    brandModes.find((b) => b.id === "bm-enterprise")?.id ?? brandModes[0]?.id ?? "bm-enterprise";
  const [brandId, setBrandId] = useState<string>(defaultBrandId);
  const [busy, setBusy] = useState<string | null>(null);

  if (presets.length === 0) return null;

  const brand = brandModes.find((b) => b.id === brandId);
  const brandLabel = brand?.name ?? "TransPerfect";

  async function run(preset: QuickCreatePreset) {
    if (busy) return;
    setBusy(preset.id);
    try {
      if (preset.kind === "deck") {
        const { deckId } = createDeck({
          prospect: `${brandLabel} · ${preset.label}`,
          industry: preset.industry ?? "",
          meetingObjective: preset.hint,
          audience: "",
          brandModeId: brandId as never,
          archetypeId: preset.archetypeId ?? "arch-problem-solution",
          lengthTarget: preset.lengthTarget ?? 12,
          clientFacts: "",
        });
        const look = normalizeLook({
          stylePackId: preset.stylePackId ?? null,
          designRecipeId: preset.designRecipeId ?? null,
          industry: preset.industry ?? null,
        });
        setDeckContext(deckId, {
          stylePackId: look.stylePackId,
          designRecipeId: look.designRecipeId,
        });
        toast.success(`New deck started · ${preset.templateSet}`);
        void navigate({ to: "/decks/$deckId", params: { deckId } });
        return;
      }

      if (!signedIn) {
        toast.error("Sign in to create this — it saves to your files.");
        void navigate({ to: "/auth" });
        return;
      }

      if (preset.kind === "print") {
        const row = await createPrint({
          data: {
            kind: preset.printKind ?? "case-study",
            title: `${brandLabel} · ${preset.label}`,
            brandModeId: brandId,
            prospect: "",
            industry: preset.industry ?? "",
            meetingObjective: preset.hint,
          },
        });
        if (!row?.id) throw new Error("The print asset was not created.");
        toast.success(`New print piece · ${preset.templateSet}`);
        void navigate({ to: "/asset/$assetId", params: { assetId: row.id } });
        return;
      }

      const profile = KIT_PROFILES_BY_ID[preset.kitProfileId ?? "social-essentials"];
      const kit = await createKit({
        data: {
          name: `${brandLabel} · ${preset.label}`,
          surface: "social",
          brandId,
          mode: preset.kitMode ?? "both",
          profileId: profile?.id ?? "social-essentials",
          formatIds: profile?.formatIds ?? [],
          copy: {
            title: preset.kitCopy?.title ?? `${brandLabel} campaign`,
            summary: preset.kitCopy?.summary ?? "",
            cta: preset.kitCopy?.cta ?? "",
          },
          eventFacts: {},
          attachEvent: false,
          nextDesign: false,
          nextTrackId: "city-series",
        },
      });
      if (!kit?.id) throw new Error("The campaign kit was not created.");
      toast.success(`New campaign kit · ${preset.templateSet}`);
      void navigate({ to: "/social/new", search: { kit: kit.id } });
    } catch (e) {
      toast.error(`Could not create that: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="relative mt-10 overflow-hidden rounded-[28px] border border-black/10 bg-white p-5 sm:p-7 dark:border-white/15 dark:bg-white/[0.04]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 size-[22rem] rounded-full blur-3xl"
        style={{ background: `${theme.accent}26` }}
      />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ background: `${theme.accent2}1A`, color: theme.accent2 }}
          >
            <Zap className="size-3.5" aria-hidden />
            Quick create
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Start the real thing in one click
          </h2>
          <p className="mt-1 max-w-xl text-sm text-black/60 dark:text-white/60">
            Every card seeds the correct template set, applies a validated look and drops you into
            the editor — no blank canvas.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-black/55 dark:text-white/55">Division</span>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="min-h-11 rounded-xl border border-black/12 bg-white px-3 text-sm dark:border-white/18 dark:bg-white/5"
          >
            {brandModes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset, i) => {
          const Icon = KIND_ICON[preset.kind];
          const running = busy === preset.id;
          const brick = theme.bricks[i % theme.bricks.length];
          return (
            <button
              key={preset.id}
              type="button"
              disabled={!!busy}
              onClick={() => void run(preset)}
              className="group relative flex min-h-[8.5rem] flex-col items-start overflow-hidden rounded-2xl border border-black/10 bg-white p-5 pl-6 text-left transition-[transform,border-color] hover:-translate-y-0.5 hover:border-black/30 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:hover:border-white/35"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ background: brick }}
              />
              <span className="flex w-full items-center justify-between gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ background: `${theme.accent2}14`, color: theme.accent2 }}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {KIND_LABEL[preset.kind]}
                </span>
                {running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              </span>
              <span className="mt-3 text-base font-semibold tracking-tight">{preset.label}</span>
              <span className="mt-1 text-sm text-black/60 dark:text-white/60">{preset.hint}</span>
              <span className="mt-auto flex w-full items-center justify-between gap-2 pt-3">
                <span className="min-w-0 truncate text-xs text-black/45 dark:text-white/45">
                  {preset.templateSet}
                </span>
                <ArrowRight
                  className="size-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              </span>
            </button>
          );
        })}
      </div>

      {!signedIn ? (
        <p className="relative mt-4 text-xs text-black/50 dark:text-white/50">
          Decks start locally right away.{" "}
          <Link to="/auth" className="underline underline-offset-4">
            Sign in
          </Link>{" "}
          to save print pieces and campaign kits to your files.
        </p>
      ) : null}
    </section>
  );
}
