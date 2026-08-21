// Dev-only visual QA harness for the multi-page Solution Proposal port.
// Renders the first multi-page master at a fixed width so a headless browser
// can screenshot each page against the source deck references.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { MultiProposalLayout } from "@/components/print/MultiProposalLayout";
import { MULTI_SOLUTION_PROPOSALS } from "@/lib/print-library/solution-proposals-multi";
import { BRAND_MODES } from "@/lib/taxonomy";

export const Route = createFileRoute("/dev/proposal-qa")({
  component: ProposalQa,
  head: () => ({
    meta: [
      { title: "Proposal QA harness | TransPerfect Element" },
      { name: "description", content: "Internal visual QA harness for the multi-page solution proposal layout." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ProposalQa() {
  const seed = MULTI_SOLUTION_PROPOSALS[0];
  const [override, setOverride] = useState<string | null>(null);
  useEffect(() => {
    setOverride(new URLSearchParams(window.location.search).get("title"));
  }, []);
  if (!seed) return <div>No multi-page proposal masters found.</div>;
  return (
    <main style={{ background: "#DADDE5", padding: 24 }}>
      <div style={{ width: 816, margin: "0 auto", display: "grid", gap: 24 }}>
        <MultiProposalLayout content={override ? { ...seed.content, pages: seed.content.pages.map((pg, i) => (i === 1 ? { ...pg, title: override } : pg)) } : seed.content} brand={BRAND_MODES[0]!} mode="light" pageSize="Letter" />
      </div>
    </main>
  );
}
