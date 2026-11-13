import { forwardRef, type SVGProps } from "react";

export interface SjbSectionIconProps extends SVGProps<SVGSVGElement> {
  section: string;
}

/** Original navigation pictograms, not replacement Bowl logo artwork. */
export const SjbSectionIcon = forwardRef<SVGSVGElement, SjbSectionIconProps>(
  function SjbSectionIcon({ section, ...props }, ref) {
    const drawings: Record<string, React.ReactNode> = {
      "": <><path d="M3 18C3 9 9 3 21 6c0 10-8 16-18 12Z" /><path d="m8 15 8-7m-7 3 3 3m0-6 3 3" /></>,
      "brand-kit": <><path d="m12 2 9 7-9 13L3 9Z" /><path d="M6 9h12M8 13h8m-6 3h4" /></>,
      social: <><path d="m4 10 13-5v14L4 14Zm0 0H2v4h2m3 1 2 6h3l-2-5m10-8 2-2m-2 10 2 2" /></>,
      "social-calendar": <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 2v6m10-6v6M3 10h18m-14 4h2m3 0h2m3 0h1M7 17h2m3 0h2" /></>,
      billboards: <><rect x="2" y="3" width="20" height="13" rx="1" /><path d="M7 16v6m10-6v6M5 7h14M5 11h9" /></>,
      badges: <><path d="m8 3 4 5 4-5M12 8v3" /><rect x="5" y="10" width="14" height="12" rx="2" /><circle cx="12" cy="14" r="1.5" /><path d="M9 19h6" /></>,
      tshirts: <><path d="m8 3-6 4 3 5 3-2v12h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z" /><path d="M10 12h4m-4 3h4" /></>,
      stadium: <><ellipse cx="12" cy="12" rx="10" ry="5" /><path d="M2 12v6c3 6 17 6 20 0v-6M6 9V3m12 6V3M4 3h4m8 0h4M7 14v-4h10v4M6 17v4m6-3v5m6-6v4" /></>,
      "stadium-policies": <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z" /><path d="m8 12 3 3 5-6" /></>,
    };
    return <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{drawings[section] ?? drawings["brand-kit"]}</svg>;
  },
);