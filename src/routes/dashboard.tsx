import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Megaphone,
  Briefcase,
  RotateCcw,
  Clock,
  AlertTriangle,
  Presentation,
  FileText,
  LayoutGrid,
  BookOpen,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import { useWorkspacePersona } from "@/hooks/use-workspace-persona";
import { PERSONAS, personaById, type PersonaId, type WorkKind } from "@/lib/workspace-persona";
import { listMyCloudDecks } from "@/lib/cloud-decks.functions";
import { listMyPrintAssets } from "@/lib/print-assets.functions";
import { listMyKits } from "@/lib/kits.functions";
import { taxonomyQueryOptions } from "@/hooks/use-taxonomy";
import { QuickCreate } from "@/components/dashboard/QuickCreate";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your workspace · TransPerfect Element" },
      {
        name: "description",
        content:
          "Role-based dashboards for admins and designers, marketing, and sales enablement — each with its own workflow, recent work and task shortcuts.",
      },
      { property: "og:title", content: "Your workspace · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Pick your role and get the workflow that fits: system ownership, campaign production, or client-ready decks in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://transperfectelement.lovable.app/dashboard" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: RoleDashboard,
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="p-10 text-sm text-red-600">Dashboard failed to load: {error.message}</div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="p-10 text-sm">Not found.</div>
    </AppShell>
  ),
});

const PERSONA_ICON: Record<PersonaId, typeof ShieldCheck> = {
  admin: ShieldCheck,
  marketing: Megaphone,
  sales: Briefcase,
};

const KIND_ICON: Record<WorkKind, typeof Presentation> = {
  decks: Presentation,
  print: FileText,
  kits: LayoutGrid,
};

const CARD =
  "rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-white/5";
const CARD_LINK = `${CARD} transition-colors hover:border-black/30 dark:hover:border-white/35`;

type RecentItem = {
  key: string;
  kind: WorkKind;
  title: string;
  meta: string;
  updatedAt: number;
  to: string;
  params?: Record<string, string>;
};

type AttentionItem = {
  key: string;
  title: string;
  reason: string;
  to: string;
  params?: Record<string, string>;
};

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return "just now";
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function RoleDashboard() {
  const userId = useSessionUser();
  const signedIn = !!userId;
  const {
    persona: personaId,
    defaultPersona,
    isOverridden,
    roles,
    choose,
    reset,
  } = useWorkspacePersona();
  const persona = personaById(personaId);

  const decksFn = useServerFn(listMyCloudDecks);
  const printFn = useServerFn(listMyPrintAssets);
  const kitsFn = useServerFn(listMyKits);

  const decks = useQuery({
    queryKey: ["dash-decks", userId],
    enabled: signedIn,
    queryFn: () => decksFn(),
  });
  const printAssets = useQuery({
    queryKey: ["dash-print", userId],
    enabled: signedIn,
    queryFn: () => printFn(),
  });
  const kits = useQuery({
    queryKey: ["dash-kits", userId],
    enabled: signedIn,
    queryFn: () => kitsFn({ data: {} }),
  });

  const deckRows = Array.isArray(decks.data) ? decks.data : [];
  const printRows = Array.isArray(printAssets.data) ? printAssets.data : [];
  const kitRows = Array.isArray(kits.data) ? kits.data : [];

  const loading = decks.isLoading || printAssets.isLoading || kits.isLoading;

  const counters: Record<WorkKind, { label: string; count: number | null; to: string }> = {
    decks: {
      label: "Saved decks",
      count: Array.isArray(decks.data) ? deckRows.length : null,
      to: "/decks",
    },
    print: {
      label: "Print assets",
      count: Array.isArray(printAssets.data) ? printRows.length : null,
      to: "/library/print",
    },
    kits: {
      label: "Campaign kits",
      count: Array.isArray(kits.data) ? kitRows.length : null,
      to: "/social/presets",
    },
  };

  // ── Pick up where you left off ────────────────────────────────────────────
  const recent = useMemo<RecentItem[]>(() => {
    const wanted = new Set<WorkKind>(persona.resume);
    const items: RecentItem[] = [];

    if (wanted.has("decks")) {
      for (const d of deckRows) {
        const row = d as {
          id: string;
          title?: string | null;
          updated_at?: string | null;
          is_template?: boolean | null;
        };
        items.push({
          key: `deck-${row.id}`,
          kind: "decks",
          title: row.title?.trim() || "Untitled deck",
          meta: row.is_template ? "Team template" : "Deck",
          updatedAt: Date.parse(row.updated_at ?? "") || 0,
          to: "/decks/$deckId",
          params: { deckId: row.id },
        });
      }
    }
    if (wanted.has("print")) {
      for (const p of printRows) {
        const row = p as {
          id: string;
          title?: string | null;
          kind?: string | null;
          updated_at?: string | null;
        };
        items.push({
          key: `print-${row.id}`,
          kind: "print",
          title: row.title?.trim() || "Untitled print asset",
          meta: row.kind ? titleCase(row.kind) : "Print",
          updatedAt: Date.parse(row.updated_at ?? "") || 0,
          to: "/asset/$assetId",
          params: { assetId: row.id },
        });
      }
    }
    if (wanted.has("kits")) {
      for (const k of kitRows) {
        items.push({
          key: `kit-${k.id}`,
          kind: "kits",
          title: k.name?.trim() || "Untitled kit",
          meta: `${k.surface === "event" ? "Event" : "Social"} kit · ${k.formatIds?.length ?? 0} formats`,
          updatedAt: Date.parse(k.updatedAt ?? "") || 0,
          to: "/social/presets",
        });
      }
    }
    return items.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);
  }, [deckRows, printRows, kitRows, persona.resume]);

  // ── Needs attention ───────────────────────────────────────────────────────
  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    for (const d of deckRows) {
      const row = d as {
        id: string;
        title?: string | null;
        review_status?: string | null;
      };
      const status = (row.review_status ?? "").toLowerCase();
      if (status === "pending" || status === "in_review" || status === "changes_requested") {
        items.push({
          key: `deck-${row.id}`,
          title: row.title?.trim() || "Untitled deck",
          reason:
            status === "changes_requested" ? "Changes requested by review" : "Waiting on brand review",
          to: "/decks/$deckId",
          params: { deckId: row.id },
        });
      }
    }
    for (const p of printRows) {
      const row = p as { id: string; title?: string | null; status?: string | null };
      const status = (row.status ?? "").toLowerCase();
      if (status === "draft" || status === "in_review") {
        items.push({
          key: `print-${row.id}`,
          title: row.title?.trim() || "Untitled print asset",
          reason: status === "draft" ? "Still a draft — not approved yet" : "In brand review",
          to: "/asset/$assetId",
          params: { assetId: row.id },
        });
      }
    }
    return items.slice(0, 5);
  }, [deckRows, printRows]);

  const Primary = persona.primary;
  const Secondary = persona.secondary;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/50 dark:text-white/50">
            Your workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {persona.label} dashboard
          </h1>
          <p className="mt-3 text-base leading-relaxed text-black/65 dark:text-white/65">
            {persona.tagline}
          </p>
        </header>

        {/* Persona switcher */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {PERSONAS.map((p) => {
            const Icon = PERSONA_ICON[p.id];
            const active = p.id === personaId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => choose(p.id)}
                aria-pressed={active}
                className={
                  active
                    ? "inline-flex min-h-11 items-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white dark:bg-white dark:text-black"
                    : "inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/12 px-4 text-sm font-medium text-black/70 hover:border-black/30 dark:border-white/18 dark:text-white/70 dark:hover:border-white/40"
                }
              >
                <Icon className="size-4" aria-hidden />
                {p.label}
              </button>
            );
          })}
          {isOverridden ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm text-black/55 underline-offset-4 hover:underline dark:text-white/55"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Back to my role ({personaById(defaultPersona).label})
            </button>
          ) : null}
        </div>

        {signedIn ? (
          <p className="mt-2 text-xs text-black/50 dark:text-white/50">
            {roles.length
              ? `Signed in with access: ${roles.join(", ")}.`
              : "No extra access assigned — showing the sales enablement view by default."}
          </p>
        ) : (
          <p className="mt-2 text-xs text-black/50 dark:text-white/50">
            <Link to="/auth" className="underline underline-offset-4">
              Sign in
            </Link>{" "}
            to see your own work and the shortcuts your role unlocks.
          </p>
        )}

        {/* Persona primary action */}
        <section className="mt-8 grid gap-3 md:grid-cols-3">
          <Link
            to={Primary.to}
            search={Primary.search}
            className="group rounded-2xl bg-black p-6 text-white transition-opacity hover:opacity-90 md:col-span-2 dark:bg-white dark:text-black"
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] opacity-60">
              Start here
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{Primary.label}</h2>
            <p className="mt-2 text-sm opacity-75">{Primary.hint}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
              Go
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
          <Link to={Secondary.to} search={Secondary.search} className={`${CARD_LINK} flex flex-col justify-between`}>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                Or
              </p>
              <h3 className="mt-2 text-lg font-medium">{Secondary.label}</h3>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">{Secondary.hint}</p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 group-hover:underline">
              Open
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
        </section>

        {/* Live work counters */}
        {signedIn ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {persona.counters.map((key) => {
              const c = counters[key];
              const Icon = KIND_ICON[key];
              return (
                <Link key={key} to={c.to} className={CARD_LINK}>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-semibold tabular-nums">
                      {c.count === null ? (
                        <span className="inline-block h-8 w-10 animate-pulse rounded bg-black/10 align-middle dark:bg-white/10" />
                      ) : (
                        c.count
                      )}
                    </div>
                    <Icon className="size-5 text-black/35 dark:text-white/35" aria-hidden />
                  </div>
                  <div className="mt-1 text-sm text-black/60 dark:text-white/60">{c.label}</div>
                </Link>
              );
            })}
          </div>
        ) : null}

        {/* Quick create — one click into the right template set */}
        <QuickCreate personaId={personaId} signedIn={signedIn} />

        {/* Needs attention */}
        {signedIn && attention.length > 0 ? (
          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="size-4 text-amber-500" aria-hidden />
              Needs attention
            </h2>
            <ul className="mt-4 divide-y divide-black/8 overflow-hidden rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/15">
              {attention.map((a) => (
                <li key={a.key}>
                  <Link
                    to={a.to}
                    params={a.params}
                    className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{a.title}</span>
                      <span className="block text-xs text-black/55 dark:text-white/55">
                        {a.reason}
                      </span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-black/35 dark:text-white/35"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Pick up where you left off */}
        {signedIn ? (
          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="size-4 text-black/40 dark:text-white/40" aria-hidden />
              Pick up where you left off
            </h2>
            {loading ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`${CARD} animate-pulse`}>
                    <div className="h-4 w-2/3 rounded bg-black/10 dark:bg-white/10" />
                    <div className="mt-3 h-3 w-1/3 rounded bg-black/10 dark:bg-white/10" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className={`${CARD} mt-4`}>
                <p className="text-sm text-black/65 dark:text-white/65">
                  Nothing saved yet. {Primary.label} to create your first piece — it will show up
                  here so you can jump straight back in.
                </p>
                <Link
                  to={Primary.to}
                  search={Primary.search}
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                >
                  {Primary.label}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recent.map((r) => {
                  const Icon = KIND_ICON[r.kind];
                  return (
                    <Link key={r.key} to={r.to} params={r.params} className={CARD_LINK}>
                      <div className="flex items-start gap-3">
                        <Icon
                          className="mt-0.5 size-4 shrink-0 text-black/40 dark:text-white/40"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{r.title}</div>
                          <div className="mt-1 text-xs text-black/55 dark:text-white/55">
                            {r.meta}
                            {r.updatedAt ? ` · ${relativeTime(r.updatedAt)}` : ""}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {/* Workflow */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Your workflow</h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-2">
            {persona.steps.map((step, i) => (
              <li key={step.title} className={CARD}>
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-semibold tabular-nums text-black/40 dark:text-white/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-medium">{step.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-black/65 dark:text-white/65">
                  {step.body}
                </p>
                <Link
                  to={step.to}
                  search={step.search}
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                >
                  {step.cta}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* Task shortcuts */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Task shortcuts</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {persona.shortcuts.map((s) => (
              <Link
                key={`${s.label}-${s.to}`}
                to={s.to}
                search={s.search}
                className={`${CARD_LINK} flex min-h-24 flex-col justify-between`}
              >
                <span className="text-sm font-medium">{s.label}</span>
                <span className="mt-2 text-xs text-black/55 dark:text-white/55">{s.hint}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Guides */}
        <section className="mt-10 mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="size-4 text-black/40 dark:text-white/40" aria-hidden />
            Learn the workflow
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {persona.guides.map((g) => (
              <Link key={`${g.label}-${g.to}`} to={g.to} search={g.search} className={CARD_LINK}>
                <span className="block text-sm font-medium">{g.label}</span>
                <span className="mt-1 block text-xs text-black/55 dark:text-white/55">
                  {g.hint}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
