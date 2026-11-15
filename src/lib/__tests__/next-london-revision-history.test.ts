import { describe, expect, it, vi } from "vitest";
import { loadLondonRevisionHistory, readLondonRevisionPage } from "../next-london-revision-history";

describe("London revision history transfer", () => {
  it("preserves large artwork exactly through JSON snapshot transfer", () => {
    const artwork = "<path d='M0 0L10 10'/>".repeat(100_000);
    const revision = { rev: 3, overrides: { placedArt: { panel: { svg: artwork } } } };
    expect(readLondonRevisionPage({ revisionsJson: JSON.stringify([revision]), nextBeforeRev: 3 }))
      .toEqual([revision]);
  });

  it("reads newest-first pages without skipping saved revisions", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ revisionsJson: '[{"rev":12}]', nextBeforeRev: 12 })
      .mockResolvedValueOnce({ revisionsJson: '[{"rev":8}]', nextBeforeRev: 8 })
      .mockResolvedValueOnce({ revisionsJson: '[]', nextBeforeRev: null });
    expect(await loadLondonRevisionHistory(fetchPage)).toEqual([{ rev: 12 }, { rev: 8 }]);
    expect(fetchPage.mock.calls).toEqual([
      [{ data: { beforeRev: undefined } }], [{ data: { beforeRev: 12 } }], [{ data: { beforeRev: 8 } }],
    ]);
  });

  it("surfaces a failed page instead of returning an incomplete history", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ revisionsJson: '[{"rev":12}]', nextBeforeRev: 12 })
      .mockRejectedValueOnce(new Error("History unavailable"));
    await expect(loadLondonRevisionHistory(fetchPage)).rejects.toThrow("History unavailable");
  });
});