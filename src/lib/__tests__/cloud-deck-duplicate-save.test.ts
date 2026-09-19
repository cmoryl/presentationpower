import { describe, expect, it } from "vitest";

import { DUPLICATE_SAVE_WINDOW_MS, findRecentDuplicateDeck } from "../cloud-decks.core";

type Row = { id: string; title: string; status: string | null; created_at: string | null };

function fakeSb(rows: Row[]) {
  const filters: Record<string, unknown> = {};
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filters[col] = val;
      return builder;
    },
    then: (resolve: (r: { data: unknown; error: null }) => unknown) =>
      resolve({
        data: rows.filter((r) => (filters["title"] ? r.title === filters["title"] : true)),
        error: null,
      }),
  } as unknown as { select: () => unknown };
  return { from: () => builder } as never;
}

const NOW = Date.parse("2026-09-19T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("repeat saves do not stack up duplicate deck records", () => {
  it("lands on a recent untouched draft of the same title", async () => {
    const sb = fakeSb([
      { id: "draft-1", title: "Meridian Legal Group", status: "draft", created_at: ago(60_000) },
    ]);
    expect(await findRecentDuplicateDeck(sb, "u1", "Meridian Legal Group", "new-id", NOW)).toBe(
      "draft-1",
    );
  });

  it("leaves a deck alone once it is in review or approved", async () => {
    const sb = fakeSb([
      { id: "d1", title: "Meridian Legal Group", status: "in_review", created_at: ago(60_000) },
      { id: "d2", title: "Meridian Legal Group", status: "approved", created_at: ago(60_000) },
    ]);
    expect(
      await findRecentDuplicateDeck(sb, "u1", "Meridian Legal Group", "new-id", NOW),
    ).toBeNull();
  });

  it("leaves an older deck of the same name alone", async () => {
    const sb = fakeSb([
      {
        id: "old",
        title: "Meridian Legal Group",
        status: "draft",
        created_at: ago(DUPLICATE_SAVE_WINDOW_MS + 60_000),
      },
    ]);
    expect(
      await findRecentDuplicateDeck(sb, "u1", "Meridian Legal Group", "new-id", NOW),
    ).toBeNull();
  });

  it("never matches the deck being saved, or an untitled one", async () => {
    const sb = fakeSb([
      { id: "same", title: "Meridian Legal Group", status: "draft", created_at: ago(1000) },
    ]);
    expect(await findRecentDuplicateDeck(sb, "u1", "Meridian Legal Group", "same", NOW)).toBeNull();
    expect(await findRecentDuplicateDeck(sb, "u1", "   ", "new-id", NOW)).toBeNull();
  });
});
