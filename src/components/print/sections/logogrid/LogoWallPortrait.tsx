// Dense 4-col wall — up to 12 logos, compact hairline tiles.
import type { PrintLogoGridSection } from "@/lib/print-assets.types";
import { LogoGridPortrait } from "./LogoGridPortrait";

export function LogoWallPortrait(props: {
  section: PrintLogoGridSection;
  mode: "light" | "dark";
  accent: string;
}) {
  return <LogoGridPortrait {...props} cols={4} />;
}
