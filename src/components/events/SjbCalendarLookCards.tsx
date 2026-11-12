import { forwardRef } from "react";
import { Check } from "lucide-react";
import { Button } from "@/design-system/element";
import { useCanvaSynced } from "@/lib/use-canva-sync";
import { SJB_CALENDAR_MODES, sjbCalendarDesign, type SjbCalendarMode } from "@/lib/sjb-social-calendar";

export interface SjbCalendarLookCardsProps {
  mode: SjbCalendarMode;
  onChange: (mode: SjbCalendarMode) => void;
  className?: string;
}

export const SjbCalendarLookCards = forwardRef<HTMLDivElement, SjbCalendarLookCardsProps>(
  function SjbCalendarLookCards({ mode, onChange, className }, ref) {
    const synced = useCanvaSynced();
    return (
      <div ref={ref} className={`mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 ${className ?? ""}`} role="group" aria-label="Campaign look">
        {SJB_CALENDAR_MODES.map(({ id, label }) => {
          const d = sjbCalendarDesign("04", id, "1350");
          const preview = synced(d?.id, d?.previewUrl ?? null);
          const selected = id === mode;
          return (
            <Button key={id} variant="outline" aria-pressed={selected} onClick={() => onChange(id)}
              className={`group relative flex h-auto min-w-0 flex-col items-stretch overflow-hidden rounded-md p-0 text-left whitespace-normal transition-all duration-300 motion-reduce:transition-none hover:-translate-y-1 motion-reduce:hover:translate-y-0 ${selected ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border"}`}>
              <span className="relative block aspect-[4/3] w-full overflow-hidden bg-muted">
                {preview && <img src={preview} alt="" className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />}
                {selected && <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check size={15} aria-hidden /></span>}
              </span>
              <span className="block min-h-14 px-3 py-3 text-sm font-semibold leading-snug text-foreground">{label}</span>
            </Button>
          );
        })}
      </div>
    );
  },
);