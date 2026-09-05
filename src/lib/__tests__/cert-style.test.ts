import { describe, expect, it } from "vitest";
import {
  DEFAULT_CERT_STYLE,
  isDefaultCertStyle,
  patchCertStyle,
  resetCertStyle,
  resolveCertStyle,
} from "@/lib/cert-style";

describe("cert module customisation", () => {
  it("falls back to the shipped design for missing or junk input", () => {
    expect(resolveCertStyle(undefined)).toEqual(DEFAULT_CERT_STYLE);
    expect(resolveCertStyle("nope")).toEqual(DEFAULT_CERT_STYLE);
    expect(resolveCertStyle({ cardsSide: "sideways", split: "x" })).toEqual(DEFAULT_CERT_STYLE);
  });

  it("keeps valid values and clamps numbers into range", () => {
    const st = resolveCertStyle({
      cardsSide: "left",
      cardLook: "outline",
      accentBar: 99,
      stagger: -20,
      cardRadius: 8,
      band: false,
      showIndex: false,
      numberedPoints: false,
      statTile: "rule",
      badge: "round",
      density: "compact",
      coversLabel: "Scope",
      split: 5,
    });
    expect(st.cardsSide).toBe("left");
    expect(st.cardLook).toBe("outline");
    expect(st.accentBar).toBe(14);
    expect(st.stagger).toBe(0);
    expect(st.cardRadius).toBe(8);
    expect(st.band).toBe(false);
    expect(st.showIndex).toBe(false);
    expect(st.numberedPoints).toBe(false);
    expect(st.statTile).toBe("rule");
    expect(st.badge).toBe("round");
    expect(st.density).toBe("compact");
    expect(st.coversLabel).toBe("Scope");
    expect(st.split).toBe(1.6);
  });

  it("patches one field without disturbing the rest, and resets", () => {
    const patched = patchCertStyle({ stagger: 40 }, { showArcs: false });
    expect(patched.stagger).toBe(40);
    expect(patched.showArcs).toBe(false);
    expect(patched.cardsSide).toBe(DEFAULT_CERT_STYLE.cardsSide);
    expect(isDefaultCertStyle(patched)).toBe(false);
    expect(isDefaultCertStyle(resetCertStyle())).toBe(true);
  });

  it("accepts the presentation knobs and clamps the badge scale", () => {
    const st = resolveCertStyle({
      pointMarker: "dash",
      logoTone: "mono",
      accentRole: "quiet",
      headerAlign: "center",
      badgeScale: 9,
    });
    expect(st.pointMarker).toBe("dash");
    expect(st.logoTone).toBe("mono");
    expect(st.accentRole).toBe("quiet");
    expect(st.headerAlign).toBe("center");
    expect(st.badgeScale).toBe(1.4);
  });

  it("rejects unknown presentation values", () => {
    const st = resolveCertStyle({ pointMarker: "star", accentRole: "loud", logoTone: "neon" });
    expect(st.pointMarker).toBe(DEFAULT_CERT_STYLE.pointMarker);
    expect(st.accentRole).toBe(DEFAULT_CERT_STYLE.accentRole);
    expect(st.logoTone).toBe(DEFAULT_CERT_STYLE.logoTone);
  });
});
