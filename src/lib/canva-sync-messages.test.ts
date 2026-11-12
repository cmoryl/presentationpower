import { describe, expect, it } from "vitest";
import { describeCheckResult, describeLastRun, describePictureStamp, explainSyncError, type CanvaLastRun, type PublicCheckResult } from "./canva-sync-messages";

const run = (over: Partial<CanvaLastRun["run"]> = {}) => ({
  startedAt: "2026-11-12T14:40:00.000Z", finishedAt: "2026-11-12T14:45:00.000Z", trigger: "daily",
  checked: 120, synced: 25, failed: 0, remaining: 188, stoppedReason: null, ...over,
});

describe("describeLastRun", () => {
  it("says nothing when nothing has run", () => expect(describeLastRun({ lastCheckedAt: null, run: null })).toBeNull());
  it("shows the last check date alone", () => {
    const line = describeLastRun({ lastCheckedAt: "2026-11-12T15:58:00.000Z", run: null })!;
    expect(line).toMatch(/^Last check: /);
    expect(line).not.toMatch(/Last update run/);
  });
  it("names the run, its counts and what is still waiting", () => {
    const line = describeLastRun({ lastCheckedAt: "2026-11-12T15:58:00.000Z", run: run() })!;
    expect(line).toMatch(/Last check: /);
    expect(line).toMatch(/Last update run: .*\(automatic\) — 25 updated, 120 checked, 188 still waiting/);
    expect(line).not.toMatch(/problems/);
  });
  it("calls a manual run manual and reports problems", () => {
    const line = describeLastRun({ lastCheckedAt: null, run: run({ trigger: "manual", failed: 3 }) })!;
    expect(line).toMatch(/\(manual\) — 25 updated, 120 checked, 3 with problems/);
  });
  it("says why a run stopped early", () => {
    const line = describeLastRun({ lastCheckedAt: null, run: run({ stoppedReason: "Canva's daily download allowance ran out; the rest continue tomorrow." }) })!;
    expect(line).toMatch(/Stopped early: Canva's daily download allowance ran out/);
  });
});

describe("describePictureStamp", () => {
  it("says nothing until a picture date exists", () =>
    expect(describePictureStamp({ picturesUpdated: null, source: null, lastCheckedAt: null })).toBeNull());
  it("names the date and that it came from Canva", () => {
    const line = describePictureStamp({ picturesUpdated: "2026-11-12T20:14:00.000Z", source: "canva", lastCheckedAt: null })!;
    expect(line).toMatch(/^Pictures last updated from Canva /);
    expect(line).not.toMatch(/checked with Canva/);
  });
  it("says original set when nothing has been synced yet", () => {
    const line = describePictureStamp({ picturesUpdated: "2026-11-01T10:00:00.000Z", source: "original", lastCheckedAt: "2026-11-12T20:14:00.000Z" })!;
    expect(line).toMatch(/Pictures are the original calendar set, saved /);
    expect(line).toMatch(/· checked with Canva /);
  });
});

describe("describeCheckResult", () => {
  it("says everything matches when nothing is newer", () =>
    expect(describeCheckResult({ ok: true, needsUpdate: 0, checked: 358, lastCheckedAt: null })).toBe(
      "All 358 pictures match Canva. The site picks them up automatically."));
  it("counts the pictures that are newer in Canva", () =>
    expect(describeCheckResult({ ok: true, needsUpdate: 3, checked: 358, lastCheckedAt: null })).toContain("3 of 358 pictures are newer in Canva"));
  it("tells a visitor how long to wait when someone just checked", () =>
    expect(describeCheckResult({ ok: false, reason: "throttled", waitSeconds: 240 })).toContain("try again in about 4 minutes"));
  it("uses one minute for a short wait", () =>
    expect(describeCheckResult({ ok: false, reason: "throttled", waitSeconds: 20 })).toContain("try again in about 1 minute"));
  it("explains a broken Canva connection in plain words", () => {
    const r: PublicCheckResult = { ok: false, reason: "error", message: "The shared Canva account isn't connected." };
    expect(describeCheckResult(r)).toContain("shared Canva account isn't connected");
  });
});

describe("explainSyncError", () => {  it("403 asks to reconnect", () => expect(explainSyncError("Canva refused the export [403]: x").next).toMatch(/reconnect/i));
  it("429 says daily allowance", () => expect(explainSyncError("Canva export failed [429]: too many").what).toMatch(/daily download allowance/));
  it("AI labels keep old picture", () => expect(explainSyncError("Hidden AI labels could not be removed; picture not published").what).toMatch(/wasn't published/));
  it("missing design", () => expect(explainSyncError("Not found in the shared Canva account").what).toMatch(/isn't in the shared/));
});
