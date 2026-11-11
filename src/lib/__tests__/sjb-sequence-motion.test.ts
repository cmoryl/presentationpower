import { describe, expect, it } from "vitest";
import {
  SJB_SEQUENCE_MOTION,
  easeOutCubic,
  sequenceSlotAt,
  sjbSequenceDuration,
  sjbSequenceMotion,
  transitionFrame,
} from "@/lib/sjb-sequence-motion";
import type { SjbCalendarFormat } from "@/lib/sjb-calendar-formats";

const FORMATS: SjbCalendarFormat[] = [
  "single",
  "linkedin-portrait",
  "linkedin-square",
  "instagram-carousel",
  "story-sequence",
];

describe("Bowl multi-page sequence motion", () => {
  it("gives every multi-page format its own transition, mixed per format", () => {
    expect(sjbSequenceMotion("instagram-carousel").style).toBe("push");
    expect(sjbSequenceMotion("story-sequence").style).toBe("fade-up");
    expect(sjbSequenceMotion("linkedin-portrait").style).toBe("slide-up");
    expect(sjbSequenceMotion("linkedin-square").style).toBe("slide-up");
    for (const f of FORMATS) {
      expect(SJB_SEQUENCE_MOTION[f].holdMs).toBe(1500);
      expect(SJB_SEQUENCE_MOTION[f].moveMs).toBe(650);
      expect(SJB_SEQUENCE_MOTION[f].endHoldMs).toBe(2100);
      expect(SJB_SEQUENCE_MOTION[f].fps).toBe(30);
    }
  });

  it("pushes the new page in from the right edge and takes the old one off the left", () => {
    const at0 = transitionFrame("push", 0);
    expect(at0).toMatchObject({ fromX: 0, fromAlpha: 1, toX: 1, toAlpha: 1 });
    const at1 = transitionFrame("push", 1);
    expect(at1).toMatchObject({ fromX: -1, toX: 0, toAlpha: 1 });
    const mid = transitionFrame("push", 0.5);
    expect(mid.fromX).toBeCloseTo(-0.5, 6);
    expect(mid.toX).toBeCloseTo(0.5, 6);
  });

  it("fades a Story page up from just below while the old one dissolves out", () => {
    const at0 = transitionFrame("fade-up", 0);
    expect(at0.fromAlpha).toBe(1);
    expect(at0.toAlpha).toBe(0);
    expect(at0.toY).toBeCloseTo(0.08, 6);
    const at1 = transitionFrame("fade-up", 1);
    expect(at1).toMatchObject({ fromAlpha: 0, toAlpha: 1, toY: 0 });
  });

  it("rises a LinkedIn page from further below than a Story page does", () => {
    expect(transitionFrame("slide-up", 0).toY).toBeCloseTo(0.18, 6);
    expect(transitionFrame("fade-up", 0).toY).toBeCloseTo(0.08, 6);
    expect(transitionFrame("slide-up", 1)).toMatchObject({ toY: 0, toAlpha: 1, fromAlpha: 0 });
  });

  it("keeps a page rising and fading in as the handover runs", () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map((t) => transitionFrame("slide-up", t));
    const ys = steps.map((s) => s.toY);
    const alphas = steps.map((s) => s.toAlpha);
    expect(ys.every((y, i) => i === 0 || y <= ys[i - 1] + 1e-9)).toBe(true);
    expect(alphas.every((a, i) => i === 0 || a >= alphas[i - 1] - 1e-9)).toBe(true);
  });

  it("clamps the handover so it can never overshoot the frame", () => {
    expect(transitionFrame("push", -3)).toMatchObject({ fromX: 0, toX: 1 });
    expect(transitionFrame("push", 5)).toMatchObject({ fromX: -1, toX: 0 });
    expect(transitionFrame("slide-up", -1).toAlpha).toBe(0);
    expect(transitionFrame("slide-up", 2).toAlpha).toBe(1);
  });

  it("runs the video with the same easing curve the preview animates on", () => {
    expect(SJB_SEQUENCE_MOTION["story-sequence"].easing).toBe("cubic-bezier(0.33, 1, 0.68, 1)");
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 6);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(3)).toBe(1);
  });

  it("holds each page, hands over, and rests longer on the tickets end card", () => {
    const m = sjbSequenceMotion("story-sequence");
    // 4 pages: 3 × (1500 hold + 650 move) + 2100 end hold.
    expect(sjbSequenceDuration(m, 4)).toBe(3 * 2150 + 2100);
    expect(sjbSequenceDuration(m, 1)).toBe(2100);
    expect(sjbSequenceDuration(m, 0)).toBe(0);
  });

  it("lands on the right page at the right moment through the whole clip", () => {
    const m = sjbSequenceMotion("story-sequence");
    expect(sequenceSlotAt(m, 4, 0)).toEqual({ index: 0, progress: 0 });
    // Still holding page 1 at 1400 ms of its 1500 ms hold.
    expect(sequenceSlotAt(m, 4, 1400)).toEqual({ index: 0, progress: 0 });
    // Half way through the handover to page 2.
    expect(sequenceSlotAt(m, 4, 1500 + 325).progress).toBeCloseTo(0.5, 6);
    expect(sequenceSlotAt(m, 4, 1500 + 325).index).toBe(0);
    // Page 2 has fully arrived.
    expect(sequenceSlotAt(m, 4, 2150)).toEqual({ index: 1, progress: 0 });
    // Past the end it rests on the last page rather than running off it.
    expect(sequenceSlotAt(m, 4, 999_999)).toEqual({ index: 3, progress: 0 });
    expect(sequenceSlotAt(m, 0, 500)).toEqual({ index: 0, progress: 0 });
  });
});
