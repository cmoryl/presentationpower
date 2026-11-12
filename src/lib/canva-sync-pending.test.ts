import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
import { pendingIds, BG_SYNC_PER_RUN } from "@/lib/canva-sync.server";

describe("background sync pending list", () => {
  it("counts a design edited after its last saved picture", () => {
    expect(pendingIds([{ design_id: "a", canva_updated_at: "2026-11-11T00:00:00Z", synced_at: "2026-11-10T00:00:00Z" }], {})).toEqual(["a"]);
  });
  it("skips a design whose saved picture is newer than the Canva edit", () => {
    expect(pendingIds([{ design_id: "a", canva_updated_at: "2026-11-09T00:00:00Z", synced_at: "2026-11-10T00:00:00Z" }], {})).toEqual([]);
  });
  it("falls back to the bundled picture date when never synced", () => {
    expect(pendingIds([{ design_id: "a", canva_updated_at: "2026-11-09T00:00:00Z", synced_at: null }], { a: "2026-11-10T00:00:00Z" })).toEqual([]);
  });
  it("caps each daily run at 25 updates", () => { expect(BG_SYNC_PER_RUN).toBe(25); });
});
