/**
 * INTENT BRIEF — the OnDeck selection order made explicit in the UI.
 *
 * intent → audience/context → story architecture → style. The user answers a
 * few structured questions; the deterministic recommender ranks the approved 28
 * and explains why. Search/filter is deliberately NOT part of this panel.
 */
import {
  AUDIENCE_LABELS,
  OBJECTIVE_LABELS,
  OUTPUT_LABELS,
  SLIDE_JOB_LABELS,
  type StyleIntentBrief,
} from "@/lib/style-intent";

const selectCls =
  "rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[11px] text-[#03002C] outline-none transition focus:border-[#003FC7] dark:border-white/10 dark:bg-white/[0.04] dark:text-white";

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-[#03002C]/45 dark:text-white/45">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={selectCls}
      >
        <option value="">Any</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

const entries = <T extends string>(m: Record<T, string>) => Object.entries(m) as [string, string][];

export function StyleBriefPanel({
  brief,
  onChange,
}: {
  brief: StyleIntentBrief;
  onChange: (next: StyleIntentBrief) => void;
}) {
  const set = (patch: Partial<StyleIntentBrief>) => onChange({ ...brief, ...patch });
  const pick = <K extends keyof StyleIntentBrief>(key: K) => (v: string) =>
    set({ [key]: (v || undefined) as StyleIntentBrief[K] } as Partial<StyleIntentBrief>);

  return (
    <div className="rounded-lg border border-black/10 bg-[#F2F2F2]/60 p-2 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="mb-2 text-[10px] text-[#03002C]/50 dark:text-white/50">
        Answer the brief and the catalog ranks itself — intent, then audience, then story, then style.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Objective" value={brief.objective ?? ""} onChange={pick("objective")} options={entries(OBJECTIVE_LABELS)} />
        <Field label="Audience" value={brief.audience ?? ""} onChange={pick("audience")} options={entries(AUDIENCE_LABELS)} />
        <Field label="Slide job" value={brief.slideJob ?? ""} onChange={pick("slideJob")} options={entries(SLIDE_JOB_LABELS)} />
        <Field
          label="Content density"
          value={brief.density ?? ""}
          onChange={pick("density")}
          options={[["low", "Low"], ["medium", "Medium"], ["high", "High"]]}
        />
        <Field
          label="Data intensity"
          value={brief.data ?? ""}
          onChange={pick("data")}
          options={[["none", "None"], ["some", "Some"], ["heavy", "Heavy"]]}
        />
        <Field
          label="Imagery"
          value={brief.imagery ?? ""}
          onChange={pick("imagery")}
          options={[["none", "None available"], ["available", "Available"], ["led", "Imagery-led"]]}
        />
        <Field
          label="Energy"
          value={brief.energy ?? ""}
          onChange={pick("energy")}
          options={[["calm", "Calm"], ["confident", "Confident"], ["bold", "Bold"]]}
        />
        <Field
          label="Complexity"
          value={brief.complexity ?? ""}
          onChange={pick("complexity")}
          options={[["simple", "Simple"], ["moderate", "Moderate"], ["complex", "Complex"]]}
        />
        <Field
          label="Mode"
          value={brief.mode && brief.mode !== "any" ? brief.mode : ""}
          onChange={(v) => set({ mode: (v || "any") as StyleIntentBrief["mode"] })}
          options={[["light", "Light"], ["dark", "Dark"]]}
        />
        <Field label="Output" value={brief.output ?? ""} onChange={pick("output")} options={entries(OUTPUT_LABELS)} />
        <label className="flex items-end gap-1.5 pb-1.5 text-[10px] text-[#03002C]/60 dark:text-white/60">
          <input
            type="checkbox"
            checked={Boolean(brief.highContrast)}
            onChange={(e) => set({ highContrast: e.target.checked || undefined })}
            className="accent-[#003FC7]"
          />
          High contrast required
        </label>
      </div>
    </div>
  );
}
