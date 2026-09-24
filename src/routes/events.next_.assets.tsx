// /events/next/assets — the NEXT master template registry (11 divisions × 56
// formats). Search-first: the search box leads, division and format filters
// sit beneath it, and the active filters are always spelled out above results.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, ExternalLink, Search, X } from "lucide-react";
import {
  NEXT_DIVISIONS,
  NEXT_FORMAT_GROUPS,
  deckPagesFor,
  loadNextRegistry,
  type NextFormatGroupId,
  type NextRegistryRow,
} from "@/lib/next-event";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CityBadge } from "@/components/next/CityBadge";
import { CITY_BADGE_DEFAULT, cityBadgeDivision } from "@/lib/next-city-badge";
import { DeckPages, FilterChip, LivePillars, RegistryCard } from "@/components/next/NextRegistry";

const searchSchema = z.object({
  division: z.string().optional(),
  group: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/events/next_/assets")({
  validateSearch: (input: Record<string, unknown>) => searchSchema.parse(input),
  head: () => ({
    meta: [
      { title: "NEXT 2026 master templates · Search 600+ division designs" },
      {
        name: "description",
        content:
          "Search every NEXT 2026 master template — 11 divisions × 56 formats — by format, code or size, and filter by division and format family.",
      },
      { property: "og:title", content: "NEXT 2026 master templates" },
      {
        property: "og:description",
        content: "Search-first registry of every NEXT 2026 division master design.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <AssetsPage />
    </AppShell>
  ),
});

function AssetsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/events/next/assets" });
  const divisionId = NEXT_DIVISIONS.some((d) => d.id === search.division)
    ? (search.division as string)
    : "all";
  const group = (NEXT_FORMAT_GROUPS.some((g) => g.id === search.group) ? search.group : "all") as
    | NextFormatGroupId
    | "all";
  const [query, setQuery] = useState(search.q ?? "");
  const [rows, setRows] = useState<NextRegistryRow[] | null>(null);
  const [preview, setPreview] = useState<NextRegistryRow | null>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    loadNextRegistry().then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, []);

  // Arriving from a hub jump (filter in the URL): move focus to the results so
  // keyboard and screen-reader users land where the page scrolled to.
  useEffect(() => {
    if (search.group || search.division) resultsRef.current?.focus();
    else searchRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFilter = (next: { division?: string; group?: string }) =>
    navigate({
      search: (prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(next).map(([k, v]) => [k, v === "all" ? undefined : v]),
        ),
      }),
      replace: true,
    });

  const division = NEXT_DIVISIONS.find((d) => d.id === divisionId) ?? null;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (divisionId === "all" || r.divisionId === divisionId) &&
        (group === "all" || r.group === group) &&
        (!q ||
          r.format.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.category ?? "").toLowerCase().includes(q) ||
          r.size.toLowerCase().includes(q)),
    );
  }, [rows, divisionId, group, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, NextRegistryRow[]>();
    for (const r of visible) {
      const key = `${r.group}::${r.category ?? ""}`;
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    const order = NEXT_FORMAT_GROUPS.map((g) => g.id);
    return [...map.entries()].sort(
      (a, b) =>
        order.indexOf(a[0].split("::")[0] as NextFormatGroupId) -
        order.indexOf(b[0].split("::")[0] as NextFormatGroupId),
    );
  }, [visible]);

  const groupLabel = NEXT_FORMAT_GROUPS.find((g) => g.id === group)?.label;
  const activeFilters = [
    division ? { k: "division", label: division.eventName } : null,
    groupLabel ? { k: "group", label: groupLabel } : null,
  ].filter(Boolean) as { k: "division" | "group"; label: string }[];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-8">
      <Link
        to="/events/next"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> NEXT 2026
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Master templates</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Every division master design for NEXT 2026. Search first, then narrow by division or format
        family. For on-site assets for a specific city, open that edition from the NEXT page.
      </p>

      <div className="relative mt-6">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-icon-muted"
        />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${rows?.length ?? "600+"} templates by format, code or size…`}
          aria-label="Search NEXT master templates"
          type="search"
          className="h-12 w-full rounded-md border border-border bg-background pl-11 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Division
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <FilterChip active={divisionId === "all"} onClick={() => setFilter({ division: "all" })}>
            All divisions
          </FilterChip>
          {NEXT_DIVISIONS.map((d) => (
            <FilterChip
              key={d.id}
              active={divisionId === d.id}
              onClick={() => setFilter({ division: d.id })}
            >
              {d.eventName}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Format family
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <FilterChip active={group === "all"} onClick={() => setFilter({ group: "all" })}>
            All formats
          </FilterChip>
          {NEXT_FORMAT_GROUPS.map((g) => (
            <FilterChip
              key={g.id}
              active={group === g.id}
              onClick={() => setFilter({ group: g.id })}
            >
              {g.label}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <h2
          ref={resultsRef}
          tabIndex={-1}
          aria-live="polite"
          className="text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {rows === null ? "Loading templates…" : `${visible.length} templates`}
        </h2>
        {activeFilters.length ? (
          <span className="text-sm text-muted-foreground">filtered by</span>
        ) : null}
        {activeFilters.map((f) => (
          <button
            key={f.k}
            type="button"
            onClick={() => setFilter({ [f.k]: "all" })}
            aria-label={`Remove filter ${f.label}`}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium hover:bg-muted/70"
          >
            {f.label} <X size={12} />
          </button>
        ))}
      </div>

      {rows !== null && visible.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No templates match these filters.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {grouped.map(([key, list]) => {
            const [gid, cat] = key.split("::");
            const meta = NEXT_FORMAT_GROUPS.find((g) => g.id === gid);
            return (
              <section key={key}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-sm font-semibold tracking-tight">
                    {cat || meta?.label || gid}
                  </h3>
                  <span className="text-xs text-muted-foreground">{list.length} designs</span>
                </div>
                {gid === "pillar-signage" && division && <LivePillars division={division} />}
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((r) => (
                    <RegistryCard
                      key={`${r.divisionId}-${r.group}-${r.code}-${r.format}`}
                      row={r}
                      accent={
                        NEXT_DIVISIONS.find((d) => d.id === r.divisionId)?.accent ??
                        NEXT_DIVISIONS[0].accent
                      }
                      onPreview={() => setPreview(r)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogTitle className="text-sm font-semibold">
            {preview ? `${preview.code} — ${preview.format}` : ""}
          </DialogTitle>
          {preview && deckPagesFor(preview) ? (
            <DeckPages pages={deckPagesFor(preview)!} label={preview.format} />
          ) : preview?.badgeSide ? (
            <div className="flex justify-center rounded-lg border border-border bg-[#03002C] p-4">
              <CityBadge
                config={{
                  ...CITY_BADGE_DEFAULT,
                  divisionId: cityBadgeDivision(preview.divisionId).id,
                }}
                side={preview.badgeSide}
                ppi={72}
                guides
                style={{ borderRadius: 6 }}
              />
            </div>
          ) : preview?.exampleUrl ? (
            <img
              src={preview.exampleUrl}
              alt={`${preview.code} ${preview.format} example render`}
              className="max-h-[64vh] w-full rounded-lg border border-border bg-muted object-contain"
              loading="lazy"
            />
          ) : (
            <p className="text-sm text-muted-foreground">No example render available yet.</p>
          )}
          {preview?.internalUrl && (
            <Link
              to={preview.internalUrl}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open badge template <ArrowRight size={14} />
            </Link>
          )}
          {preview?.canvaUrl && (
            <a
              href={preview.canvaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open in Canva <ExternalLink size={14} />
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
