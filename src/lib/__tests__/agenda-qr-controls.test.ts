import { describe, expect, it } from "vitest";

import {
  agendaBlocks,
  agendaDefault,
  agendaGeometry,
  agendaQrBackground,
  agendaQrContrast,
  agendaQrForeground,
  agendaQrStyle,
  agendaQrTransparent,
  normalizeAgendaConfig,
} from "@/lib/next-agenda";

const withQr = () => ({ ...agendaDefault(), qrData: "https://example.com/agenda" });

describe("agenda QR customisation", () => {
  it("falls back to the approved ink, white plate and square modules", () => {
    const cfg = withQr();
    expect(agendaQrStyle(cfg)).toBe("block");
    expect(agendaQrForeground(cfg)).toBe("#03002C");
    expect(agendaQrBackground(cfg)).toBe("#FFFFFF");
    expect(agendaQrTransparent(cfg)).toBe(false);
    expect(agendaQrContrast(cfg).ok).toBe(true);
  });

  it("honours a typed placement and clamps it inside the safe margin", () => {
    const geo = agendaGeometry(withQr());
    const placed = agendaBlocks({ ...withQr(), qrOffsetX: -500, qrOffsetY: -500 }).qr;
    expect(placed).not.toBeNull();
    expect(placed!.placed).toBe(true);
    expect(placed!.x).toBeGreaterThanOrEqual(geo.safeInset);
    expect(placed!.y).toBeGreaterThanOrEqual(geo.safeInset);

    const far = agendaBlocks({ ...withQr(), qrOffsetX: 99999, qrOffsetY: 99999 }).qr!;
    expect(far.x + far.edge).toBeLessThanOrEqual(geo.trimW - geo.safeInset + 0.001);
    expect(far.y + far.edge).toBeLessThanOrEqual(geo.trimH - geo.safeInset + 0.001);
  });

  it("keeps saved QR settings through normalisation and rejects unknown shapes", () => {
    const saved = normalizeAgendaConfig({
      ...withQr(),
      qrStyle: "made-up",
      qrForeground: "#FFFFFF",
      qrTransparent: true,
      qrCaptionAlign: "right",
      qrCaptionSize: 6,
      qrOffsetX: 30,
      qrOffsetY: 40,
    });
    expect(saved.qrStyle).toBe("block");
    expect(saved.qrCaptionAlign).toBe("right");
    expect(saved.qrCaptionSize).toBe(6);
    expect(saved.qrOffsetX).toBe(30);
    expect(agendaQrTransparent(saved)).toBe(true);
    expect(agendaBlocks(saved).qr!.capSize).toBe(6);
  });

  it("warns when a dropped plate leaves the code unscannable", () => {
    const cfg = normalizeAgendaConfig({
      ...withQr(),
      qrForeground: "#003FC7",
      qrTransparent: true,
    });
    const contrast = agendaQrContrast(cfg);
    expect(contrast.ratio).toBeGreaterThan(0);
    expect(contrast.ok).toBe(false);
  });
});
