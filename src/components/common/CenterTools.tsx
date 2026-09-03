// The centring control every Element editor shares: centre the selected object
// horizontally, vertically, or on both axes. One component so the affordance,
// the icons and the keyboard names read the same in the signage editors, the
// pillar studio and the deck free canvas.

import { AlignCenterHorizontal, AlignCenterVertical, Crosshair } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CenterAxis } from "@/lib/center-tools";

export interface CenterToolsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Called with the axis to centre on. */
  onCenter: (axis: CenterAxis) => void;
  /** Optional lead-in label, e.g. the object being centred. */
  label?: string;
  /** Disable the whole cluster (no object selected / not placeable). */
  disabled?: boolean;
  size?: "sm" | "icon";
}

const AXES: { key: CenterAxis; title: string; Icon: typeof Crosshair }[] = [
  { key: "h", title: "Centre horizontally", Icon: AlignCenterVertical },
  { key: "v", title: "Centre vertically", Icon: AlignCenterHorizontal },
  { key: "both", title: "Centre on the artboard", Icon: Crosshair },
];

export function CenterTools({
  onCenter,
  label,
  disabled = false,
  size = "sm",
  className,
  ...rest
}: CenterToolsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} {...rest}>
      {label ? <span className="text-[11px] text-muted-foreground">{label}</span> : null}
      {AXES.map(({ key, title, Icon }) => (
        <Button
          key={key}
          type="button"
          variant="outline"
          size={size === "icon" ? "icon" : "sm"}
          disabled={disabled}
          title={title}
          aria-label={title}
          className={size === "icon" ? "h-8 w-8" : "h-8 gap-1.5 px-2"}
          onClick={() => onCenter(key)}
        >
          <Icon className="h-3.5 w-3.5" />
          {size === "icon" ? null : (
            <span className="text-[11px]">
              {key === "h" ? "H" : key === "v" ? "V" : "Auto"}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
