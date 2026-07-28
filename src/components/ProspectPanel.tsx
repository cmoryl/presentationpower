import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Building2, Loader2, Sparkles, FileText, Layers, BookOpen } from "lucide-react";
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

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-[#003FC7]">
          Step 2 · Who it&rsquo;s for
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

        {/* Backend relevance */}
        <aside className="rounded-xl border border-black/10 bg-[#F2F2F2]/60 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#003FC7]" strokeWidth={1.75} aria-hidden />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/55">
              What we can reuse
            </span>
            {loading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-icon-muted" aria-hidden />
            )}
          </div>

          {!signedIn ? (
            <p className="mt-3 text-xs text-black/55">
              Sign in to see existing briefs, decks and knowledge for this account.
            </p>
          ) : name.length < 2 ? (
            <p className="mt-3 text-xs text-black/55">
              Type a company name — we&rsquo;ll scan existing briefs, decks, client logos and the
              knowledgebase for anything reusable.
            </p>
          ) : !relevance ? (
            <p className="mt-3 text-xs text-black/55">Scanning…</p>
          ) : hitCount === 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-black/55">
                Nothing on file for <strong className="text-[#03002C]">{relevance.prospect}</strong>
                . We&rsquo;ll generate from brand + industry ground truth.
              </p>
              {relevance.industrySignals.length > 0 && (
                <ul className="space-y-1">
                  {relevance.industrySignals.map((t) => (
                    <li key={t} className="truncate text-[11px] text-black/60">
                      · {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3 text-xs">
              {relevance.logo && (
                <div className="flex items-center gap-2 text-black/70">
                  <Building2 className="h-3.5 w-3.5 text-icon-muted" strokeWidth={1.75} aria-hidden />
                  <span className="truncate">
                    Approved logo on file · {relevance.logo.clientName}
                  </span>
                </div>
              )}
              {relevance.decks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-black/45">
                    <Layers className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Existing decks
                  </div>
                  <ul className="mt-1 space-y-1">
                    {relevance.decks.map((d) => (
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
                  </ul>
                </div>
              )}
              {relevance.briefs.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-black/45">
                    <FileText className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Prior briefs
                  </div>
                  <ul className="mt-1 space-y-1 text-black/70">
                    {relevance.briefs.map((b) => (
                      <li key={b.id} className="truncate">
                        {b.title}
                        {b.industry ? ` · ${b.industry}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {relevance.knowledge.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-black/45">
                    <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Knowledge
                  </div>
                  <ul className="mt-1 space-y-1 text-black/70">
                    {relevance.knowledge.map((k) => (
                      <li key={k.id} className="truncate" title={k.snippet}>
                        {k.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {relevance.briefs[0]?.industry && !industry && (
                <button
                  type="button"
                  onClick={() => set("industry", relevance.briefs[0].industry as string)}
                  className="text-[11px] text-[#003FC7] underline decoration-dotted underline-offset-4"
                >
                  Use “{relevance.briefs[0].industry}” as the industry
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
