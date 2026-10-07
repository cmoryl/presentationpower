import { Box } from "lucide-react";
import { sign3dUrl } from "@/lib/sf-kiosk-3d";

/** "View in 3D" for a pillar or elevator wrap BoothHub models; renders nothing otherwise. */
export function Sign3dLink({ sign, label, className = "" }: { sign: string | null | undefined; label: string; className?: string }) {
  const url = sign3dUrl(sign);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`View ${label} in 3D (opens BoothHub)`}
      className={`inline-flex items-center gap-1 rounded-md border border-[#03002C]/15 bg-white px-2 py-1 text-[12px] font-medium text-[#003FC7] hover:border-[#003FC7] focus-visible:outline-2 focus-visible:outline-[#003FC7] ${className}`}>
      <Box className="h-3.5 w-3.5" aria-hidden /> View in 3D
    </a>
  );
}
