// Collapsible side accordion for the Open Canvas Studio right rail.
// Thin wrapper over the shared UnifiedEditorShell rail so the studio and the
// deck editor collapse, size and label their tool panels identically.

import { Layers, SlidersHorizontal } from "lucide-react";
import { EditorSideRail } from "@/components/editor/UnifiedEditorShell";

type Panel = "layers" | "inspector" | null;

type Props = {
  layers: React.ReactNode;
  inspector: React.ReactNode;
  /** Initial panel. Default is collapsed (null) to maximise the canvas. */
  defaultOpen?: Panel;
};

export function StudioSideAccordion({ layers, inspector, defaultOpen = null }: Props) {
  return (
    <EditorSideRail
      defaultOpenId={defaultOpen}
      width={280}
      tabs={[
        { id: "layers", label: "Layers", icon: <Layers className="h-4 w-4" />, content: layers },
        {
          id: "inspector",
          label: "Inspect",
          icon: <SlidersHorizontal className="h-4 w-4" />,
          content: inspector,
        },
      ]}
    />
  );
}
