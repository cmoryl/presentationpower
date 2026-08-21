import { createFileRoute } from "@tanstack/react-router";
import { MultiProposalLayout } from "@/components/print/MultiProposalLayout";
import { MULTI_SOLUTION_PROPOSALS } from "@/lib/print-library/solution-proposals-multi";
import type { SolutionProposalContent } from "@/lib/print-assets.types";

export const Route = createFileRoute("/dev/hdr-check")({ component: Page });

function Page() {
  const seed = MULTI_SOLUTION_PROPOSALS[0]!;
  const content = seed.content as SolutionProposalContent;
  const idx = (content.pages ?? []).findIndex((p) => p.kind === "locations");
  const idxRegion = (content.pages ?? []).findIndex((p) => p.kind === "scope");
  return (
    <div style={{ width: 900 }}>
      <MultiProposalLayout content={content} brand="transperfect" mode="dark" pageIndex={idx} />
      <MultiProposalLayout
        content={content}
        brand="transperfect"
        mode="dark"
        pageIndex={idxRegion}
      />
    </div>
  );
}
