import { forwardRef, useEffect, useState, type ComponentPropsWithoutRef } from "react";
import { ArrowDownRight, Image, Shapes, Palette, Type, Scan, ShieldCheck, PanelsTopLeft, FileDown, Grid2X2, Flag, Globe, Layers, MapPin, Compass, type LucideIcon } from "lucide-react";
import { Button, cn } from "@/design-system/element";

export interface BrandKitSectionNavProps extends ComponentPropsWithoutRef<"nav"> {
  sections: readonly (readonly [string, string])[];
  variant?: "grid" | "rail";
}

function sectionVisual(id: string, label: string): { icon: LucideIcon; detail: string } {
  const key = `${id} ${label}`.toLowerCase();
  if (/clear|siz|safe/.test(key)) return { icon: Scan, detail: "Spacing & minimum sizes" };
  if (/misuse|rule|usage/.test(key)) return { icon: ShieldCheck, detail: "Correct use & common mistakes" };
  if (/icon/.test(key)) return { icon: Grid2X2, detail: "Symbols & approved sets" };
  if (/colour|color|palette/.test(key)) return { icon: Palette, detail: /type/.test(key) ? "Palette & typography" : "Values & approved combinations" };
  if (/type|typo|font/.test(key)) return { icon: Type, detail: "Typefaces & hierarchy" };
  if (/social|digital|motion/.test(key)) return { icon: Globe, detail: "Screen & digital artwork" };
  if (/imag|visual|photo/.test(key)) return { icon: Image, detail: "Photography & visual references" };
  if (/file|download|format/.test(key)) return { icon: FileDown, detail: "Artwork & production files" };
  if (/logo|lockup/.test(key)) return { icon: Shapes, detail: "Original artwork & variants" };
  if (/mark|motif|background/.test(key)) return { icon: Layers, detail: "Graphic elements & backgrounds" };
  if (/city|venue|map|area/.test(key)) return { icon: MapPin, detail: "Location & placement guidance" };
  if (/digital|social|motion/.test(key)) return { icon: Globe, detail: "Screen & digital artwork" };
  if (/value|identity|position|intelligence/.test(key)) return { icon: Compass, detail: "Brand principles & positioning" };
  if (/sign|pillar/.test(key)) return { icon: Flag, detail: "Signage & production guidance" };
  return { icon: PanelsTopLeft, detail: "Examples & specifications" };
}

export const BrandKitSectionNav = forwardRef<HTMLElement, BrandKitSectionNavProps>(
  ({ sections, variant = "grid", className, ...props }, ref) => {
    const [active, setActive] = useState("");
    useEffect(() => {
      const syncHash = () => setActive(window.location.hash.slice(1));
      syncHash();
      window.addEventListener("hashchange", syncHash);
      return () => window.removeEventListener("hashchange", syncHash);
    }, []);

    return (
      <nav ref={ref} aria-label="Guide sections" className={cn("mt-8", className)} {...props}>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Explore the guide</h2>
        <div className={cn("grid grid-cols-1 gap-x-6 sm:grid-cols-2", variant === "grid" ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-1")}>
          {sections.map(([id, label]) => {
            const { icon: Icon, detail } = sectionVisual(id, label);
            return (
              <Button key={id} asChild variant="ghost" className={cn("group h-auto min-h-24 justify-start gap-3 whitespace-normal rounded-none border-t border-border px-2 py-4 text-left", active === id && "bg-accent")}>
                <a href={`#${id}`} aria-current={active === id ? "location" : undefined} onClick={() => setActive(id)}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground"><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-snug">{label}</span><span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{detail}</span></span>
                  <ArrowDownRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </a>
              </Button>
            );
          })}
        </div>
      </nav>
    );
  },
);
BrandKitSectionNav.displayName = "BrandKitSectionNav";