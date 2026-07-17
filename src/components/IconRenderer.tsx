import { useEffect, useState } from "react";
import { loadPack, resolveIcon, iconViewBox, type IconPack } from "@/lib/icon-library";

interface Props {
  pack: string;
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

// Simple in-memory cache mirrors loadPack's internal cache but is used
// synchronously inside a component so grids render smoothly.
const packCache = new Map<string, IconPack>();

export function IconRenderer({ pack, name, size = 24, color, className }: Props) {
  const [p, setP] = useState<IconPack | null>(() => packCache.get(pack) ?? null);

  useEffect(() => {
    if (packCache.has(pack)) {
      setP(packCache.get(pack)!);
      return;
    }
    let cancel = false;
    loadPack(pack).then((data) => {
      packCache.set(pack, data);
      if (!cancel) setP(data);
    }).catch(() => {});
    return () => {
      cancel = true;
    };
  }, [pack]);

  if (!p) {
    return (
      <span
        className={className}
        style={{
          display: "inline-block",
          width: size,
          height: size,
          background: "rgba(0,0,0,0.05)",
          borderRadius: 4,
        }}
      />
    );
  }
  const icon = resolveIcon(p, name);
  if (!icon) {
    return (
      <span
        className={className}
        style={{
          display: "inline-block",
          width: size,
          height: size,
        }}
      />
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={iconViewBox(p, icon)}
      className={className}
      style={{ color }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}
