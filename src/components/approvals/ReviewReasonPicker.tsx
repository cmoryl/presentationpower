// Reviewer reason chips. A rejection has to say WHY, because free text cannot be
// separated into learnable design-fit feedback and mandatory rule fixes.
import { GROUP_LABEL, reasonsByGroup, reasonLearnability } from "@/lib/review-reasons";

export function ReviewReasonPicker({
  selected,
  onChange,
  idPrefix,
  className = "",
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  idPrefix: string;
  className?: string;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const learn = reasonLearnability(selected);

  return (
    <fieldset className={`space-y-3 ${className}`}>
      <legend className="text-xs font-medium text-foreground/60">
        Why is this going back? (required to request changes)
      </legend>
      {reasonsByGroup().map(({ group, reasons }) => (
        <div key={group}>
          <div className="text-[11px] uppercase tracking-widest text-foreground/45">
            {GROUP_LABEL[group]}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {reasons.map((r) => {
              const on = selected.includes(r.id);
              return (
                <button
                  key={r.id}
                  id={`${idPrefix}-${r.id}`}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(r.id)}
                  title={r.hint}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    on
                      ? "border-transparent bg-foreground text-background"
                      : "border-foreground/20 hover:bg-foreground/5"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {selected.length > 0 && (
        <p className="text-xs leading-relaxed text-foreground/55">
          {learn.learnable ? "Learns from this: " : "Not learned from: "}
          {learn.reason}
        </p>
      )}
    </fieldset>
  );
}
