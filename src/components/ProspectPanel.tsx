import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Loader2,
  Sparkles,
  FileText,
  Layers,
  BookOpen,
  Check,
  Circle,
  Palette,
  Image as ImageIcon,
  Minus,
  PlugZap,

} from "lucide-react";
import { lookupProspectContext, type ProspectRelevance } from "@/lib/prospect-context.functions";

export type ProspectDetails = {
  prospect: string;
  industry: string;
  audience: string;
  relationship: string;
  meetingObjective: string;
  knownFacts: string;
};

const RELATIONSHIPS = [
  { id: "new", label: "Net-new prospect", hint: "No history — lead with credibility + proof" },
  { id: "warm", label: "Warm / referred", hint: "Some awareness — lead with fit" },
  { id: "existing", label: "Existing client", hint: "Expand — lead with results to date" },
  { id: "renewal", label: "Renewal / at risk", hint: "Defend — lead with value delivered" },
  { id: "rfp", label: "RFP / formal bid", hint: "Compliance-first, scored answers" },
];

const AUDIENCES = [
  "Decision makers",
  "Procurement",
  "Marketing leadership",
  "Legal / compliance",
  "Localization team",
  "Technical evaluators",
  "C-suite",
];

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#03002C] placeholder:text-black/35 focus:border-[#003FC7]/60 focus:outline-none";
const labelClass = "text-[11px] font-medium uppercase tracking-[0.16em] text-black/50";

export function ProspectPanel({
  value,
  onChange,
  industryOptions,
  signedIn,
}: {
  value: ProspectDetails;
  onChange: (next: ProspectDetails) => void;
  industryOptions: string[];
  signedIn: boolean;
}) {
  const lookup = useServerFn(lookupProspectContext);
  const [relevance, setRelevance] = useState<ProspectRelevance | null>(null);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);

  const set = <K extends keyof ProspectDetails>(key: K, v: ProspectDetails[K]) =>
    onChange({ ...value, [key]: v });

  const name = value.prospect.trim();
  const industry = value.industry.trim();

  // Debounced backend relevance lookup.
  useEffect(() => {
    if (!signedIn || name.length < 2) {
      setRelevance(null);
      return;
    }
    const ticket = ++reqRef.current;
    setLoading(true);
    const t = setTimeout(() => {
      lookup({ data: { prospect: name, industry } })
        .then((res) => {
          if (reqRef.current === ticket) setRelevance(res as ProspectRelevance);
        })
        .catch(() => {
          if (reqRef.current === ticket) setRelevance(null);
        })
        .finally(() => {
          if (reqRef.current === ticket) setLoading(false);
        });
    }, 600);
    return () => {
      clearTimeout(t);
      setLoading(false);
    };
  }, [name, industry, signedIn, lookup]);

  const hitCount = useMemo(() => {
    if (!relevance) return 0;
    return (
      relevance.briefs.length +
      relevance.decks.length +
      relevance.knowledge.length +
      (relevance.logo ? 1 : 0)
    );
  }, [relevance]);

  const relationship = RELATIONSHIPS.find((r) => r.id === value.relationship);

  // Simple "how much context did you give us" meter — the panel always has
  // something concrete to show, even before a company name is typed.
  const checklist = [
    { id: "prospect", label: "Company name", done: name.length >= 2 },
    { id: "industry", label: "Industry", done: industry.length > 1 },
    { id: "relationship", label: "Relationship", done: Boolean(value.relationship) },
    { id: "audience", label: "Audience in the room", done: value.audience.trim().length > 1 },
    { id: "objective", label: "Meeting objective", done: value.meetingObjective.trim().length > 3 },
    { id: "known", label: "What we already know", done: value.knownFacts.trim().length > 12 },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const strengthPct = Math.round((doneCount / checklist.length) * 100);
  const strengthLabel =
    doneCount <= 2 ? "Generic" : doneCount <= 4 ? "Tailored" : "Highly specific";


  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-[#003FC7]">
          Step 3 · Who it&rsquo;s for
        </div>
        <div className="text-[11px] text-black/45">
          The more you give us, the less generic the output.
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Prospect / client</span>
              <input
                value={value.prospect}
                onChange={(e) => set("prospect", e.target.value)}
                placeholder="Company name"
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Industry</span>
              <input
                list="prospect-industries"
                value={value.industry}
                onChange={(e) => set("industry", e.target.value)}
                placeholder="e.g. Life sciences"
                className={fieldClass}
              />
              <datalist id="prospect-industries">
                {industryOptions.map((i) => (
                  <option key={i} value={i} />
                ))}
              </datalist>
            </label>
          </div>

          <div>
            <span className={labelClass}>Relationship</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {RELATIONSHIPS.map((r) => {
                const on = r.id === value.relationship;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => set("relationship", r.id)}
                    aria-pressed={on}
                    className={`rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition ${
                      on
                        ? "border-[#03002C] bg-[#03002C] text-white"
                        : "border-black/10 bg-white text-black/60 hover:border-black/30 hover:text-black"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            {relationship && (
              <p className="mt-1.5 text-[11px] text-black/45">{relationship.hint}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Audience in the room</span>
              <input
                list="prospect-audiences"
                value={value.audience}
                onChange={(e) => set("audience", e.target.value)}
                placeholder="Decision makers"
                className={fieldClass}
              />
              <datalist id="prospect-audiences">
                {AUDIENCES.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className={labelClass}>Meeting objective</span>
              <input
                value={value.meetingObjective}
                onChange={(e) => set("meetingObjective", e.target.value)}
                placeholder="Win a pilot across 12 markets"
                className={fieldClass}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>What we already know</span>
            <textarea
              value={value.knownFacts}
              onChange={(e) => set("knownFacts", e.target.value)}
              rows={3}
              placeholder="Incumbent vendor, budget cycle, pain points, named stakeholders, prior conversations…"
              className={`${fieldClass} resize-none`}
            />
          </label>
        </div>

        {/* Context strength + what the generator will actually reuse */}
        <aside className="flex flex-col gap-4 self-start rounded-xl border border-black/10 bg-[#F2F2F2]/60 p-4">
          {/* 1 — Always-visible progress, so the panel is never blank */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/55">
                Context strength
              </span>
              <span className="text-[11px] font-semibold text-[#003FC7]">{strengthLabel}</span>
            </div>
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10"
              role="progressbar"
              aria-valuenow={strengthPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Context strength"
            >
              <div
                className="h-full rounded-full bg-[#003FC7] transition-all duration-300"
                style={{ width: `${Math.max(strengthPct, 4)}%` }}
              />
            </div>
            <ul className="mt-3 grid gap-1.5">
              {checklist.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-center gap-2 text-[11px] ${
                    c.done ? "text-black/70" : "text-black/40"
                  }`}
                >
                  {c.done ? (
                    <Check className="h-3.5 w-3.5 text-[#003FC7]" strokeWidth={2} aria-hidden />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-black/25" strokeWidth={1.75} aria-hidden />
                  )}
                  <span className="truncate">{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="h-px w-full bg-black/10" />

          {/* 2 — What we can reuse */}
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#003FC7]" strokeWidth={1.75} aria-hidden />
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/55">
                What we&rsquo;ll reuse
              </span>
              {loading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-icon-muted" aria-hidden />
              )}
            </div>

            {/* Baseline — true on every generation, so this list is never empty */}
            <ul className="mt-3 space-y-1.5">
              <ReuseRow icon={Palette} label="Brand system + division palette" state="always" />
              <ReuseRow icon={ImageIcon} label="Division imagery library" state="always" />
              <ReuseRow
                icon={Building2}
                label={
                  relevance?.logo
                    ? `Approved client logo · ${relevance.logo.clientName}`
                    : "Approved client logos"
                }
                state={relevance?.logo ? "found" : signedIn ? "searching" : "signin"}
              />
              <ReuseRow
                icon={Layers}
                label={
                  relevance && relevance.decks.length > 0
                    ? `${relevance.decks.length} existing deck${relevance.decks.length === 1 ? "" : "s"}`
                    : "Existing decks for this account"
                }
                state={
                  !signedIn
                    ? "signin"
                    : name.length < 2
                      ? "waiting"
                      : relevance
                        ? relevance.decks.length > 0
                          ? "found"
                          : "none"
                        : "searching"
                }
              />
              <ReuseRow
                icon={FileText}
                label={
                  relevance && relevance.briefs.length > 0
                    ? `${relevance.briefs.length} prior brief${relevance.briefs.length === 1 ? "" : "s"}`
                    : "Prior briefs"
                }
                state={
                  !signedIn
                    ? "signin"
                    : name.length < 2
                      ? "waiting"
                      : relevance
                        ? relevance.briefs.length > 0
                          ? "found"
                          : "none"
                        : "searching"
                }
              />
              <ReuseRow
                icon={BookOpen}
                label={
                  relevance && relevance.knowledge.length > 0
                    ? `${relevance.knowledge.length} knowledge entr${relevance.knowledge.length === 1 ? "y" : "ies"}`
                    : "Knowledgebase"
                }
                state={
                  !signedIn
                    ? "signin"
                    : name.length < 2
                      ? "waiting"
                      : relevance
                        ? relevance.knowledge.length > 0
                          ? "found"
                          : "none"
                        : "searching"
                }
              />
            </ul>

            {!signedIn && (
              <EmptyState
                title="Not connected to your account"
                body="Brand system and imagery always apply. Sign in to also pull your client logos, prior briefs, decks and knowledgebase entries."
                actions={[{ to: "/auth", label: "Sign in" }]}
              />
            )}
            {signedIn && name.length < 2 && (
              <EmptyState
                title="Waiting on a company name"
                body="Type the prospect or client name above and we'll scan Logo Hub, past briefs, decks and the knowledgebase for anything reusable."
              />
            )}
            {signedIn && name.length >= 2 && relevance && hitCount === 0 && !relevance.logo && (
              <EmptyState
                title={`Nothing on file for “${relevance.prospect}” yet`}
                body="We'll still generate on-brand output using the division brand system, imagery library and industry ground truth. Connect a source to make future briefs smarter:"
                actions={[
                  { to: "/logohub", label: "Add client logo" },
                  { to: "/knowledge/new", label: "Add knowledge entry" },
                  { to: "/admin/imagery", label: "Manage imagery" },
                ]}
              />
            )}
          </div>


          {/* 3 — Named hits, only when there are any */}
          {relevance && hitCount > 0 && (
            <>
              <div className="h-px w-full bg-black/10" />
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-black/45">
                  Found for {relevance.prospect}
                </div>
                <ul className="space-y-1 text-xs">
                  {relevance.decks.slice(0, 3).map((d) => (
                    <li key={d.id} className="truncate">
                      <Link
                        to="/decks/$deckId"
                        params={{ deckId: d.id }}
                        className="text-[#003FC7] hover:underline"
                      >
                        {d.title}
                      </Link>
                    </li>
                  ))}
                  {relevance.briefs.slice(0, 3).map((b) => (
                    <li key={b.id} className="truncate text-black/70">
                      {b.title}
                      {b.industry ? ` · ${b.industry}` : ""}
                    </li>
                  ))}
                  {relevance.knowledge.slice(0, 3).map((k) => (
                    <li key={k.id} className="truncate text-black/70" title={k.snippet}>
                      {k.title}
                    </li>
                  ))}
                </ul>
                {relevance.briefs[0]?.industry && !industry && (
                  <button
                    type="button"
                    onClick={() => set("industry", relevance.briefs[0].industry as string)}
                    className="text-[11px] text-[#003FC7] underline decoration-dotted underline-offset-4"
                  >
                    Use &ldquo;{relevance.briefs[0].industry}&rdquo; as the industry
                  </button>
                )}
              </div>
            </>
          )}

          {/* 4 — Industry fallback signals */}
          {relevance && hitCount === 0 && relevance.industrySignals.length > 0 && (
            <>
              <div className="h-px w-full bg-black/10" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-black/45">
                  Industry ground truth we&rsquo;ll lean on
                </div>
                <ul className="mt-1.5 space-y-1">
                  {relevance.industrySignals.slice(0, 4).map((t) => (
                    <li key={t} className="truncate text-[11px] text-black/60">
                      · {t}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Explicit empty state: what's missing and how to connect a source. */
function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: { to: string; label: string }[];
}) {
  return (
    <div className="mt-3 rounded-lg border border-dashed border-black/15 bg-white/70 p-3">
      <div className="flex items-start gap-2">
        <PlugZap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black/35" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#03002C]">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-black/55">{body}</p>
          {actions && actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {actions.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="rounded-full border border-[#003FC7]/25 bg-[#003FC7]/[0.06] px-2.5 py-1 text-[10px] font-semibold text-[#003FC7] transition-colors hover:bg-[#003FC7]/12"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ReuseState = "always" | "found" | "searching" | "none" | "waiting" | "signin";


/** One compact row in the "What we'll reuse" list with an honest status. */
function ReuseRow({
  icon: Icon,
  label,
  state,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  state: ReuseState;
}) {
  const on = state === "always" || state === "found";
  const status =
    state === "always"
      ? "Always"
      : state === "found"
        ? "Found"
        : state === "searching"
          ? "Scanning…"
          : state === "signin"
            ? "Sign in"
            : state === "waiting"
              ? "—"
              : "None";

  return (
    <li className="flex items-center gap-2">
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${on ? "text-[#003FC7]" : "text-black/25"}`}
        strokeWidth={1.75}
      />
      <span className={`min-w-0 flex-1 truncate text-[11px] ${on ? "text-black/75" : "text-black/45"}`}>
        {label}
      </span>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
          on ? "bg-[#003FC7]/10 text-[#003FC7]" : "bg-black/[0.06] text-black/40"
        }`}
      >
        {status === "—" ? <Minus className="h-2.5 w-2.5" strokeWidth={2} aria-hidden /> : status}
      </span>
    </li>
  );
}
