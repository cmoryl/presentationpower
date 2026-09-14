import { describe, it, expect } from "vitest";
import { agendaBlocks, normalizeAgendaConfig } from "@/lib/next-agenda";

function cfg(extra: Record<string, unknown>) {
  return normalizeAgendaConfig({
    rowStyle: "card",
    locationLine: "FLEMING 3RD FLOOR",
    title: "GlobalLink NEXT",
    qrData: "https://transperfect.com/next",
    qrCaption: "FULL AGENDA",
    ...extra,
  });
}

describe("agenda header QR clearance", () => {
  it("pulls the room / floor line clear of a top-right code", () => {
    const withQr = agendaBlocks(cfg({ qrAnchor: "top-right" }));
    const footQr = agendaBlocks(cfg({ qrAnchor: "foot-right" }));
    expect(withQr.qr).not.toBeNull();
    expect(withQr.location).not.toBeNull();
    expect(withQr.location!.right).toBeLessThan(footQr.location!.right);
    expect(withQr.location!.right).toBeLessThanOrEqual(withQr.qr!.x);
  });

  it("leaves the room line at the content edge when the code sits at the foot", () => {
    const footQr = agendaBlocks(cfg({ qrAnchor: "foot-right" }));
    const noQr = agendaBlocks(cfg({ qrData: "" }));
    expect(footQr.location!.right).toBeCloseTo(noQr.location!.right, 5);
  });
});

describe("agenda QR lockup clearance", () => {
  it("keeps a stale dragged code off the lockup", () => {
    const base = agendaDefault("globallink");
    const cfg = {
      ...base,
      sizeId: "a4-handout" as typeof base.sizeId,
      qrData: "https://presentationpower.lovable.app/events/next/london",
      qrCaption: "FULL AGENDA",
      qrAnchor: "top-right" as const,
      qrOffsetX: 20,
      qrOffsetY: 12,
    };
    const b = agendaBlocks(cfg);
    expect(b.qr).toBeTruthy();
    expect(b.lockup).toBeTruthy();
    const lock = b.lockup!;
    const qr = b.qr!;
    const clearsRight = qr.x >= lock.x + lock.w;
    const clearsBelow = qr.y >= lock.y + lock.h;
    expect(clearsRight || clearsBelow).toBe(true);
  });
});
