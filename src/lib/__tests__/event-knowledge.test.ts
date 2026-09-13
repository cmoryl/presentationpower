import { describe, expect, it } from "vitest";

import {
  EVENT_KNOWLEDGE_DIMS,
  EVENT_KNOWLEDGE_EMBEDDING_MODEL,
  eventKnowledgeFingerprint,
  eventKnowledgeText,
  groupEventKnowledge,
  harvestPanelSpecs,
  outcomeRecord,
  parseEventLessons,
  type EventKnowledgeHit,
  type HarvestPanel,
  type HarvestVenue,
} from "@/lib/event-knowledge";

const venue: HarvestVenue = {
  eventId: "next-2026",
  city: "London, UK",
  venue: "Queen Elizabeth II Centre",
};

const panel: HarvestPanel = {
  id: "p-01",
  name: "Room door vinyl — Gielgud",
  room: "Gielgud",
  floor: "Fourth floor",
  ground: "supplied",
  style: "01-dawn",
  trimW: 900,
  trimH: 2100,
  bleedEdge: 5,
};

describe("event knowledge store", () => {
  it("embeds with the 3072-dim multimodal model the column is sized for", () => {
    expect(EVENT_KNOWLEDGE_EMBEDDING_MODEL).toBe("google/gemini-embedding-2");
    expect(EVENT_KNOWLEDGE_DIMS).toBe(3072);
  });

  it("keeps one fingerprint per fact, so a revision updates instead of duplicating", () => {
    const a = harvestPanelSpecs(venue, [panel], () => null)[0];
    const b = harvestPanelSpecs(
      venue,
      [{ ...panel, trimH: 2200 }],
      () => null,
    )[0];
    // Same sign, revised measurement — the row must be replaced, not twinned.
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.body).not.toBe(b.body);
  });

  it("distinguishes different subjects", () => {
    expect(
      eventKnowledgeFingerprint({
        eventId: "next-2026",
        kind: "spec",
        panelId: "p-01",
        title: "Room door vinyl",
      }),
    ).not.toBe(
      eventKnowledgeFingerprint({
        eventId: "next-2026",
        kind: "spec",
        panelId: "p-02",
        title: "Room door vinyl",
      }),
    );
  });

  it("puts the measured facts into the embedded text", () => {
    const text = eventKnowledgeText(harvestPanelSpecs(venue, [panel], () => null)[0]);
    expect(text).toContain("Queen Elizabeth II Centre");
    expect(text).toContain("900");
    expect(text.length).toBeLessThanOrEqual(6000);
  });

  it("carries sizes forward as precedent, never as the new venue's truth", () => {
    const spec = harvestPanelSpecs(venue, [panel], () => null)[0];
    expect(spec.facts.trimW).toBe(900);
    expect(spec.city).toBe("London, UK");
  });

  it("reads lesson entries and keeps superseded ones", () => {
    const lessons = parseEventLessons(
      [
        "# Lessons",
        "",
        "### 2026-01-04 — QR codes are print-critical",
        "**Context:** London press wall.",
        "**What happened:** an export dropped a quiet zone.",
        "**Rule now:** every QR is decoded before the file is written.",
        "**Enforced by:** qr-scan tests.",
        "",
        "### 2026-01-05 — SUPERSEDED: old colour rule",
        "**Rule now:** kept for the record.",
        "",
        "```",
        "### 2026-01-06 — not a lesson, this is a code sample",
        "```",
      ].join("\n"),
    );
    expect(lessons.length).toBe(2);
    expect(lessons.some((l) => l.title.includes("code sample"))).toBe(false);
  });

  it("records what actually shipped as an outcome", () => {
    const record = outcomeRecord({
      venue,
      panelId: "p-01",
      panelName: panel.name,
      templateFamilyId: "vt-door-vinyl",
      version: 3,
      filename: "r012-gielgud-door.ai",
    });
    expect(record.kind).toBe("outcome");
    expect(record.source).toBe("publish");
    expect(record.body).toContain("r012-gielgud-door.ai");
  });

  it("drops matches below the similarity floor", () => {
    const base: EventKnowledgeHit = {
      ...harvestPanelSpecs(venue, [panel], () => null)[0],
      id: "1",
      similarity: 0.9,
    };
    const brief = groupEventKnowledge([base, { ...base, id: "2", similarity: 0.05 }]);
    expect(brief.specs).toHaveLength(1);
  });
});
