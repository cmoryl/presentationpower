// Shared "render a print piece from content + kind" surface. Used by the admin
// master item editor so its live preview is the same engine the library and the
// asset editor render with.

import { SpotlightLayout } from "@/components/print/SpotlightLayout";
import { EBrochureLayout } from "@/components/print/EBrochureLayout";
import { AdaptorBriefLayout } from "@/components/print/AdaptorBriefLayout";
import { MsaPartnershipLayout } from "@/components/print/MsaPartnershipLayout";
import { SolutionProposalLayout } from "@/components/print/SolutionProposalLayout";
import { MultiProposalLayout, isMultiProposal } from "@/components/print/MultiProposalLayout";
import { CaseStudyLayout } from "@/components/print/CaseStudyLayout";
import type {
  AdaptorBriefContent,
  CaseStudyContent,
  EBrochureContent,
  MsaPartnershipContent,
  PrintAssetKind,
  PrintDensity,
  PrintMode,
  PrintPageSize,
  SolutionProposalContent,
  SpotlightContent,
} from "@/lib/print-assets.types";
import type { BrandMode } from "@/lib/taxonomy";

export function PrintKindPreview({
  kind,
  content,
  brand,
  mode = "light",
  pageSize = "Letter",
  density = "standard",
}: {
  kind: PrintAssetKind;
  content: unknown;
  brand: BrandMode;
  mode?: PrintMode;
  pageSize?: PrintPageSize;
  density?: PrintDensity;
}) {
  const shared = { brand, mode, pageSize, density } as const;
  if (!content) return null;
  if (kind === "spotlight")
    return <SpotlightLayout content={content as SpotlightContent} {...shared} />;
  if (kind === "ebrochure")
    return <EBrochureLayout content={content as EBrochureContent} {...shared} />;
  if (kind === "msa-partnership")
    return <MsaPartnershipLayout content={content as MsaPartnershipContent} {...shared} />;
  if (kind === "solution-proposal") {
    const proposal = content as SolutionProposalContent;
    // Multi-page masters carry a `pages` array — render the stacked document
    // instead of collapsing them into the single-page layout.
    if (isMultiProposal(proposal))
      return <MultiProposalLayout content={proposal} {...shared} />;
    return <SolutionProposalLayout content={proposal} {...shared} />;
  }
  if (kind === "adaptor-brief")
    return <AdaptorBriefLayout content={content as AdaptorBriefContent} {...shared} />;
  if (kind === "case-study")
    return <CaseStudyLayout content={content as CaseStudyContent} {...shared} />;
  return null;
}
