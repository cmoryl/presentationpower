import { describe, it, expect } from "vitest";
import { londonPanelFileBase } from "@/lib/next-london-revise";
import { LONDON_PANELS } from "@/lib/next-london-signage";

// A pack must never stamp a revision number nobody published. Before this,
// nothing published read as "r001" / "r000" on a draft file.
describe("london file stamping", () => {
  const panel = LONDON_PANELS[0]!;

  it("stamps rdraft when nothing is published", () => {
    expect(londonPanelFileBase(panel, "draft", "rgb").startsWith("rdraft-")).toBe(true);
  });

  it("stamps the published revision, zero padded", () => {
    expect(londonPanelFileBase(panel, 7, "rgb").startsWith("r007-")).toBe(true);
  });

  it("marks cmyk masters in the filename", () => {
    expect(londonPanelFileBase(panel, 7, "cmyk")).toContain("cmyk");
  });
});
