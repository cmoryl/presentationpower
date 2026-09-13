// Door artwork rendered leaf by leaf.
//
// A double door is not one flat rectangle. When the supplied artboard is a
// single leaf, the print appears once per leaf at its own true ratio; when the
// artboard spans the pair, it appears once and the shut line falls inside it.
// Either way the leaves keep their measured widths, so an unequal pair (a wide
// leading leaf with a narrow secondary leaf) reads correctly.

import { doorLeafColumns, doorShutLines, type LondonDoorSpec } from "@/lib/next-london-doors";

export interface SceneDoorLeavesProps {
  spec: LondonDoorSpec;
  /** Artwork URL — the panel proof or the finished live file. */
  art: string;
  /** Accessible description of the installed item. */
  alt: string;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(4)}%`;
}

export function SceneDoorLeaves({ spec, art, alt }: SceneDoorLeavesProps) {
  const columns = doorLeafColumns(spec);
  const shutLines = doorShutLines(spec);

  return (
    <div className="absolute inset-0">
      {spec.scope === "spanning" ? (
        <img
          src={art}
          alt={alt}
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: "cover" }}
        />
      ) : (
        columns.map((col) => (
          <img
            key={col.index}
            src={art}
            alt={col.index === 0 ? alt : ""}
            aria-hidden={col.index === 0 ? undefined : true}
            className="absolute top-0 h-full"
            style={{
              left: pct(col.x),
              width: pct(col.w),
              objectFit: "cover",
              // A narrow secondary leaf shows the middle of the sheet, which is
              // how a leaf sheet trims on site.
              objectPosition: "center",
            }}
          />
        ))
      )}
      {/* Shut line and leaf edges: a hairline, never heavy enough to read as
          part of the artwork. */}
      {shutLines.map((x) => (
        <span
          key={x}
          aria-hidden="true"
          className="absolute top-0 h-full"
          style={{
            left: pct(x),
            width: "0.6%",
            transform: "translateX(-50%)",
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.32), rgba(255,255,255,0.16), rgba(0,0,0,0.32))",
            mixBlendMode: "multiply",
          }}
        />
      ))}
    </div>
  );
}
