// SavedKitsSection — signed-in user's saved kits (social or event surface).
//
// Renders a grid of kit cards with "Open" (rehydrates the wizard via
// ?kit=<id>) and "Delete" actions. Hidden entirely when the user has no
// saved kits for the surface, so signed-out visitors never see an empty
// state noise-band.

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bookmark, Trash2, Pencil, Layers } from "lucide-react";
import { deleteKit, listMyKits, type SavedKit } from "@/lib/kits.functions";
import { BRAND_MODES } from "@/lib/taxonomy";

export function SavedKitsSection({ surface }: { surface: "social" | "event" }) {
  const listFn = useServerFn(listMyKits);
  const deleteFn = useServerFn(deleteKit);
  const [kits, setKits] = useState<SavedKit[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listFn({ data: { surface } })
      .then((rows) => {
        if (!cancelled) setKits(rows);
      })
      .catch(() => {
        // Signed-out or transient — silently hide.
        if (!cancelled) setKits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [listFn, surface]);

  if (!kits || kits.length === 0) return null;

  const newHref = surface === "event" ? "/events/new" : "/social/new";

  async function handleDelete(kit: SavedKit) {
    if (!confirm(`Delete "${kit.name}"? This can't be undone.`)) return;
    setBusyId(kit.id);
    try {
      await deleteFn({ data: { id: kit.id } });
      setKits((prev) => (prev ? prev.filter((k) => k.id !== kit.id) : prev));
      toast.success(`Deleted "${kit.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete kit");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
            <Bookmark size={11} /> Your saved kits
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#03002C]">
            {kits.length} saved {surface === "event" ? "event" : "social"} kit
            {kits.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-1 text-sm text-black/55">
            Reopen the wizard to keep tweaking, or spin up a fresh kit from a blank canvas.
          </p>
        </div>
        <Link
          to={newHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-medium text-[#03002C] hover:border-[#003FC7]/50"
        >
          + New blank kit
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kits.map((kit) => {
          const brand = BRAND_MODES.find((b) => b.id === kit.brandId) ?? BRAND_MODES[0];
          const updated = new Date(kit.updatedAt);
          return (
            <li
              key={kit.id}
              className="group flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/80 p-4 transition hover:border-[#003FC7]/40 hover:shadow-[0_10px_30px_rgba(3,0,44,0.08)]"
            >
              <div className="flex items-start gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-black/10"
                  style={{ background: brand.tokens.primary }}
                  aria-hidden
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-white/80"
                    style={{ background: brand.tokens.accent }}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-semibold uppercase tracking-widest text-black/50">
                    {brand.name}
                  </div>
                  <div className="truncate text-sm font-semibold text-[#03002C]">{kit.name}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-widest text-black/50">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5">
                  <Layers size={10} /> {kit.formatIds.length} format
                  {kit.formatIds.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-black/[0.04] px-2 py-0.5 normal-case tracking-normal text-black/55">
                  {kit.mode}
                </span>
                <span className="rounded-full bg-black/[0.04] px-2 py-0.5 normal-case tracking-normal text-black/55">
                  Updated {updated.toLocaleDateString()}
                </span>
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/5 pt-3">
                <Link
                  to={newHref}
                  search={{ kit: kit.id } as any}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#03002C] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#003FC7]"
                >
                  <Pencil size={11} /> Open
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(kit)}
                  disabled={busyId === kit.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-medium text-black/60 hover:border-red-400/50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={11} /> {busyId === kit.id ? "…" : "Delete"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
