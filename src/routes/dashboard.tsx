import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Megaphone, Briefcase, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import { useWorkspacePersona } from "@/hooks/use-workspace-persona";
import { PERSONAS, personaById, type PersonaId } from "@/lib/workspace-persona";
import { listMyCloudDecks } from "@/lib/cloud-decks.functions";
import { listMyPrintAssets } from "@/lib/print-assets.functions";
import { listMyKits } from "@/lib/kits.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your workspace · TransPerfect Element" },
      {
        name: "description",
        content:
          "Role-based dashboards for admins and designers, marketing, and sales enablement — each with its own workflow and task shortcuts.",
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
  component: RoleDashboard,
});

const PERSONA_ICON: Record<PersonaId, typeof ShieldCheck> = {
  admin: ShieldCheck,
  marketing: Megaphone,
  sales: Briefcase,
};

const CARD =
  "rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-white/5";

function RoleDashboard() {
  const userId = useSessionUser();
  const signedIn = !!userId;
  const { persona: personaId, defaultPersona, isOverridden, roles, choose, reset } =
    useWorkspacePersona();
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

  const counters: Record<
    "decks" | "print" | "kits",
    { label: string; count: number | null; to: string }
  > = {
    decks: {
      label: "Saved decks",
      count: Array.isArray(decks.data) ? decks.data.length : null,
      to: "/decks",
    },
    print: {
      label: "Print assets",
      count: Array.isArray(printAssets.data) ? printAssets.data.length : null,
      to: "/library/print",
    },
    kits: {
      label: "Campaign kits",
      count: Array.isArray(kits.data) ? kits.data.length : null,
      to: "/social/presets",
    },
  };

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

        {/* Live work counters */}
        {signedIn ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {persona.counters.map((key) => {
              const c = counters[key];
              return (
                <Link
                  key={key}
                  to={c.to}
                  className={`${CARD} transition-colors hover:border-black/30 dark:hover:border-white/35`}
                >
                  <div className="text-3xl font-semibold tabular-nums">
                    {c.count === null ? "—" : c.count}
                  </div>
                  <div className="mt-1 text-sm text-black/60 dark:text-white/60">{c.label}</div>
                </Link>
              );
            })}
          </div>
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
                className={`${CARD} flex min-h-24 flex-col justify-between transition-colors hover:border-black/30 dark:hover:border-white/35`}
              >
                <span className="text-sm font-medium">{s.label}</span>
                <span className="mt-2 text-xs text-black/55 dark:text-white/55">{s.hint}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
