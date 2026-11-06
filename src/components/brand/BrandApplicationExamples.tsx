import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import { BRAND } from "@/lib/brand-colors";

export type BrandApplicationSurface = "social" | "signage" | "motion" | "documents";
export interface BrandApplicationArtwork {
  name: string;
  color: string;
  white?: string;
  stacked?: string;
  stackedWhite?: string;
  reverse?: string;
  dark: string;
  accent: string;
  cityLogo?: string;
  endorsement?: string;
}
export interface BrandApplicationExamplesProps extends HTMLAttributes<HTMLDivElement> {
  artwork: BrandApplicationArtwork;
  surface: BrandApplicationSurface;
}

const SURFACES: { id: BrandApplicationSurface; title: string }[] = [
  { id: "social", title: "Social" },
  { id: "signage", title: "Signage & fabrication" },
  { id: "motion", title: "AV & motion" },
  { id: "documents", title: "Presentations & documents" },
];

/** Layout studies made from issued artwork, never presented as production masters. */
export const BrandApplicationExamples = forwardRef<HTMLDivElement, BrandApplicationExamplesProps>(
  function BrandApplicationExamples({ artwork: a, surface, className = "", style, ...props }, ref) {
    const darkSrc = a.white ?? a.color;
    const stacked = a.stacked ?? a.color;
    const stackedDark = a.stackedWhite ?? a.white ?? a.stacked ?? a.color;
    // Without an approved reversed mark, keep its logo zone light rather than recolouring it.
    const darkLogoClass = a.white ? "" : "bg-[var(--example-white)] p-2";
    const vars = {
      "--example-dark": a.dark,
      "--example-accent": a.accent,
      "--example-white": BRAND.white,
      "--example-ink": BRAND.ink,
      "--example-paper": BRAND.surface,
      ...style,
    } as CSSProperties;
    const logo = (src: string, classes = "") => (
      <img src={src} alt={`${a.name} approved logo`} loading="lazy" className={`max-h-full max-w-full object-contain ${classes}`} />
    );
    const lines = <div aria-hidden className="space-y-2"><div className="h-1 w-full bg-current opacity-20" /><div className="h-1 w-4/5 bg-current opacity-20" /><div className="h-1 w-3/5 bg-current opacity-20" /></div>;
    return (
      <div ref={ref} {...props} style={vars} className={`my-4 min-w-0 ${className}`} data-brand-application={surface}>
        <div className="grid grid-cols-2 gap-3">
          {surface === "social" && <>
            <figure className="min-w-0">
              <div className="relative flex aspect-square flex-col overflow-hidden bg-[var(--example-dark)] p-5 text-[var(--example-white)]">
                <div className="h-1 w-10 bg-[var(--example-accent)]" />
                <p className="mt-4 text-sm font-semibold leading-tight">{a.name}</p>
                <div className="mt-3 max-w-28">{lines}</div>
                <div className={`mt-auto h-9 w-3/5 ${darkLogoClass}`}>{logo(darkSrc)}</div>
              </div>
              <figcaption className="mt-2 text-xs text-muted-foreground">Feed · quiet logo zone</figcaption>
            </figure>
            <figure className="min-w-0">
              <div className="flex aspect-square items-center justify-center bg-[var(--example-paper)] p-3">
                <div className="relative flex aspect-[9/16] h-full flex-col bg-[var(--example-dark)] p-3 text-[var(--example-white)]">
                  <div className="h-1 w-6 bg-[var(--example-accent)]" />
                  {a.cityLogo ? <div className="mt-4 h-12">{logo(a.cityLogo)}</div> : <p className="mt-4 text-xs font-semibold">{a.name}</p>}
                  {a.cityLogo && <p className="mt-2 text-center text-[10px]">City name</p>}
                  <div className={`mb-3 mt-auto h-7 ${darkLogoClass}`}>{logo(darkSrc)}</div>
                </div>
              </div>
              <figcaption className="mt-2 text-xs text-muted-foreground">{a.cityLogo ? "City Series · city outside lockup" : "Story · clear top and bottom margins"}</figcaption>
            </figure>
          </>}
          {surface === "signage" && <>
            <figure className="min-w-0">
              <div className="flex aspect-square items-center justify-center bg-[var(--example-paper)] p-4">
                <div className="flex h-4/5 w-3/5 flex-col bg-[var(--example-dark)] p-4">
                  <div className={`h-1/2 ${darkLogoClass}`}>{logo(stackedDark)}</div>
                  <div className="mt-auto h-1 w-1/3 bg-[var(--example-accent)]" />
                </div>
              </div>
              <figcaption className="mt-2 text-xs text-muted-foreground">Sign face · proportional artwork</figcaption>
            </figure>
            <figure className="min-w-0">
              <div className="flex aspect-square flex-col justify-center gap-4 bg-[var(--example-paper)] p-4">
                <div className={`flex h-20 items-center justify-center bg-[var(--example-dark)] p-4 ${darkLogoClass}`}>{logo(darkSrc)}</div>
                <div className="flex items-center gap-2 text-[var(--example-ink)]">
                  <span className="size-7 bg-[var(--example-accent)]" aria-hidden />
                  <span className="text-[10px] leading-snug">Substrate / ink proof<br />Approve physical sample</span>
                </div>
              </div>
              <figcaption className="mt-2 text-xs text-muted-foreground">Backlit / vinyl · approved dark-ground mark</figcaption>
            </figure>
          </>}
          {surface === "motion" && <>
            <figure className="min-w-0">
              <div className="flex aspect-square items-center bg-[var(--example-paper)] p-2">
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-[var(--example-dark)] p-5">
                  <div className="absolute left-3 top-3 h-1 w-8 bg-[var(--example-accent)]" />
                  <div className={`h-14 w-1/2 ${darkLogoClass}`}>{logo(a.reverse ?? stackedDark)}</div>
                </div>
              </div>
              <figcaption className="mt-2 text-xs text-muted-foreground">Holding frame · intact lockup</figcaption>
            </figure>
            <figure className="min-w-0">
              <div className="flex aspect-square items-center bg-[var(--example-paper)] p-2">
                <div className="flex aspect-video w-full flex-col justify-end bg-[var(--example-white)]">
                  <div aria-hidden className="mx-auto mb-auto mt-4 h-5 w-5 rounded-full bg-[var(--example-paper)]" />
                  <div className="flex h-1/3 items-center gap-2 border-t-2 border-[var(--example-accent)] bg-[var(--example-dark)] px-3 text-[var(--example-white)]">
                    <div className={`h-5 w-2/5 ${darkLogoClass}`}>{logo(a.reverse ?? darkSrc)}</div>
                    <div className="border-l border-current/30 pl-2 text-[8px]">Speaker name<br />Role / organisation</div>
                  </div>
                </div>
              </div>
              <figcaption className="mt-2 text-xs text-muted-foreground">Lower third · name separate from mark</figcaption>
            </figure>
          </>}
          {surface === "documents" && <>
            <figure className="min-w-0">
              <div className="flex aspect-square items-center bg-[var(--example-paper)] p-2">
                <div className="flex aspect-video w-full items-center gap-3 bg-[var(--example-white)] p-4 text-[var(--example-ink)]">
                  <div className="h-14 w-2/5">{logo(stacked)}</div>
                  <div className="flex-1 border-l-2 border-[var(--example-accent)] pl-3"><p className="text-[10px] font-semibold">Presentation title</p><div className="mt-2">{lines}</div></div>
                </div>
              </div>
              <figcaption className="mt-2 text-xs text-muted-foreground">Cover · primary / stacked lockup</figcaption>
            </figure>
            <figure className="min-w-0">
              <div className="flex aspect-square items-center justify-center bg-[var(--example-paper)] p-3">
                <div className="flex aspect-[3/4] h-full flex-col bg-[var(--example-white)] p-3 text-[var(--example-ink)]">
                  <div className="h-4 w-3/5 self-end">{logo(a.color)}</div>
                  <p className="mt-4 text-[9px] font-semibold">Document heading</p><div className="mt-3">{lines}</div>
                  {a.endorsement && <div className="mt-auto h-3 w-1/2">{logo(a.endorsement)}</div>}
                </div>
              </div>
              <figcaption className="mt-2 text-xs text-muted-foreground">{a.endorsement ? "Interior · separate corporate endorsement" : "Interior · corner lockup"}</figcaption>
            </figure>
          </>}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Illustrative layout studies · supplied logo artwork · not production files</p>
      </div>
    );
  },
);

export interface BrandApplicationGalleryProps extends HTMLAttributes<HTMLElement> { artwork: BrandApplicationArtwork }
export const BrandApplicationGallery = forwardRef<HTMLElement, BrandApplicationGalleryProps>(function BrandApplicationGallery({ artwork, className = "", ...props }, ref) {
  return <section ref={ref} {...props} className={`mt-12 scroll-mt-24 ${className}`}>
    <h2 className="text-2xl font-semibold">Applications</h2>
    <div className="mt-6 grid gap-8 md:grid-cols-2">{SURFACES.map((s) => <div key={s.id} className="min-w-0 border-t border-border pt-4"><h3 className="text-lg font-semibold">{s.title}</h3><BrandApplicationExamples artwork={artwork} surface={s.id} /></div>)}</div>
  </section>;
});