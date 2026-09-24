import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/CloudDeckControls", () => ({ useSignedIn: () => false }));
vi.mock("@/lib/next-agenda.functions", () => ({ listAgendaFiles: vi.fn() }));
vi.mock("@/lib/event-pillar.functions", () => ({ listPillarFiles: vi.fn() }));

import {
  pickAgendaFile,
  pickPillarFile,
  sameEdition,
  type AgendaFileRecord,
  type PillarFileRecord,
} from "./use-next-live-masters";
import { agendaDefault } from "@/lib/next-agenda";
import { pillarDefault } from "@/lib/next-pillar-masters";

const PILLAR = { ...pillarDefault("welcome", "tp-games"), face: "light" as const };
const DIV = PILLAR.divisionId;

const pillar = (id: string, edition: string | null, updated: string): PillarFileRecord => ({
  id,
  name: id,
  division_id: DIV,
  edition_id: edition,
  config: PILLAR,
  updated_at: updated,
});

const agenda = (id: string, edition: string | null, updated: string): AgendaFileRecord => ({
  id,
  name: id,
  division_id: "city-series",
  edition_id: edition,
  config: agendaDefault("city-series"),
  updated_at: updated,
});

describe("city-scoped saved masters", () => {
  it("treats a missing edition as the shared default", () => {
    expect(sameEdition({}, null)).toBe(true);
    expect(sameEdition({ edition_id: "london" }, null)).toBe(false);
    expect(sameEdition({ edition_id: "london" }, "london")).toBe(true);
  });

  it("serves a city only its own saved pillar", () => {
    const rows = [pillar("ldn", "london", "2026-09-02"), pillar("shared", null, "2026-09-01")];
    expect(pickPillarFile(rows, DIV, "welcome", "light", "london")?.id).toBe("ldn");
    expect(pickPillarFile(rows, DIV, "welcome", "light", null)?.id).toBe("shared");
    expect(pickPillarFile(rows, DIV, "welcome", "light", "san-francisco")).toBeUndefined();
  });

  it("never shows London's agenda on San Francisco or the shared view", () => {
    const rows = [agenda("ldn", "london", "2026-09-02")];
    expect(pickAgendaFile(rows, "city-series", "london")?.id).toBe("ldn");
    expect(pickAgendaFile(rows, "city-series", "san-francisco")).toBeUndefined();
    expect(pickAgendaFile(rows, "city-series")).toBeUndefined();
  });

  it("picks the newest file within a city", () => {
    const rows = [agenda("old", "london", "2026-09-01"), agenda("new", "london", "2026-09-03")];
    expect(pickAgendaFile(rows, "city-series", "london")?.id).toBe("new");
  });
});
