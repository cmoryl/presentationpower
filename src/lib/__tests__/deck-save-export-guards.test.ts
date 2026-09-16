/**
 * DECK REGRESSION GUARDS — save, snapshot visibility, export and publish.
 *
 * These four behaviours were each a real bug at some point:
 *  - saving a deck could empty it (slides were deleted before the write);
 *  - snapshots and share tokens were readable by any signed-in colleague;
 *  - an empty deck could be exported, presented, printed and published,
 *    producing a blank file while reporting success;
 *  - deleting a deck reported success when nothing was removed.
 *
 * The persistence and share cores are exercised against a fake client; the
 * surface guards are asserted against the source of the routes/components that
 * own them, because those live in React render paths.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { saveDeckToCloudCore, toUuid } from "@/lib/cloud-decks.core";
import { enableDeckSharingCore, randomShareToken, shareUrlFor } from "@/lib/deck-sharing.core";

const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");

// ---------------------------------------------------------------- fake client

type Row = Record<string, unknown>;
type Op = { table: string; op: string; rows?: unknown };

interface FakeOptions {
  /** Rows returned by `deck_slides.select('id')`. */
  existingSlideIds?: string[];
  /** Row returned by `decks.select(...).maybeSingle()` for the share core. */
  deckRow?: Row | null;
  /** has_role('admin') answer. */
  admin?: boolean;
  /** Tables whose ids resolve as existing FK targets. */
  refTables?: string[];
}

function fakeSupabase(opts: FakeOptions = {}) {
  const ops: Op[] = [];
  const updates: Row[] = [];

  function builder(table: string) {
    const state: { op: string; rows?: unknown; eq: Row } = { op: "select", eq: {} };
    const result = () => {
      if (table === "deck_slides" && state.op === "select") {
        return { data: (opts.existingSlideIds ?? []).map((id) => ({ id })), error: null };
      }
      if (state.op === "select" && (opts.refTables ?? []).includes(table)) {
        return { data: [{ id: state.eq.id }], error: null };
      }
      return { data: [], error: null };
    };
    const api: Record<string, unknown> = {
      upsert(rows: unknown) {
        state.op = "upsert";
        ops.push({ table, op: "upsert", rows });
        return api;
      },
      insert(rows: unknown) {
        state.op = "insert";
        ops.push({ table, op: "insert", rows });
        return api;
      },
      update(patch: Row) {
        state.op = "update";
        updates.push(patch);
        ops.push({ table, op: "update", rows: patch });
        return api;
      },
      delete() {
        state.op = "delete";
        ops.push({ table, op: "delete" });
        return api;
      },
      select() {
        return api;
      },
      eq(col: string, val: unknown) {
        state.eq[col] = val;
        if (state.op === "delete") {
          // Record which slide row the prune removed.
          ops[ops.length - 1] = { table, op: "delete", rows: val };
        }
        return api;
      },
      maybeSingle: async () => ({ data: opts.deckRow ?? null, error: null }),
      then: (resolve: (r: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return api;
  }

  return {
    sb: {
      from: (t: string) => builder(t) as never,
      rpc: async () => ({ data: opts.admin === true, error: null }),
    },
    ops,
    updates,
  };
}

const brief = { id: "b1", prospect: "Acme", brandModeId: "bm-enterprise" };
const deckWith = (slideIds: string[]) => ({
  id: "d1",
  title: "Quarterly review",
  briefId: "b1",
  brandModeId: "bm-enterprise",
  archetypeId: "arch-business-review",
  slides: slideIds.map((id, i) => ({
    id,
    position: i,
    sectionId: "SF-01",
    variantId: "MV-COVER-BASIC",
    layoutId: "LF-01",
    content: {},
    changes: [],
  })),
});

// ------------------------------------------------------------------- 1. SAVE

describe("deck save never destroys work", () => {
  it("writes the new slides before pruning the removed ones", async () => {
    const { sb, ops } = fakeSupabase({ existingSlideIds: ["stale-slide-id"] });
    await saveDeckToCloudCore(sb, "user-1", { brief, deck: deckWith(["s1", "s2"]) });

    const slideOps = ops.filter((o) => o.table === "deck_slides");
    const upsertAt = slideOps.findIndex((o) => o.op === "upsert");
    const firstDelete = slideOps.findIndex((o) => o.op === "delete");
    expect(upsertAt).toBeGreaterThanOrEqual(0);
    expect(firstDelete).toBeGreaterThan(upsertAt);
  });

  it("prunes only slides the user actually removed", async () => {
    const keptId = toUuid("slide:user-1:d1:s1");
    const { sb, ops } = fakeSupabase({ existingSlideIds: [keptId, "stale-slide-id"] });
    await saveDeckToCloudCore(sb, "user-1", { brief, deck: deckWith(["s1"]) });

    const deleted = ops.filter((o) => o.table === "deck_slides" && o.op === "delete");
    expect(deleted.map((d) => d.rows)).toEqual(["stale-slide-id"]);
  });

  it("refuses to overwrite saved slides with an empty local copy", async () => {
    const { sb, ops } = fakeSupabase({ existingSlideIds: ["a", "b", "c"] });
    await expect(
      saveDeckToCloudCore(sb, "user-1", { brief, deck: deckWith([]) }),
    ).rejects.toThrow(/no slides.*3 slide\(s\) are saved/i);
    expect(ops.some((o) => o.table === "deck_slides" && o.op === "delete")).toBe(false);
  });

  it("accepts an empty deck when nothing is saved yet, without deleting anything", async () => {
    const { sb, ops } = fakeSupabase({ existingSlideIds: [] });
    const out = await saveDeckToCloudCore(sb, "user-1", { brief, deck: deckWith([]) });
    expect(out.deckUuid).toBe(toUuid("deck:user-1:d1"));
    expect(ops.some((o) => o.op === "delete")).toBe(false);
  });

  it("maps ids deterministically and per user, so re-saving updates in place", () => {
    expect(toUuid("deck:user-1:d1")).toBe(toUuid("deck:user-1:d1"));
    expect(toUuid("deck:user-1:d1")).not.toBe(toUuid("deck:user-2:d1"));
    expect(toUuid("deck:user-1:d1")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

// ------------------------------------------------------- 2. SNAPSHOT / SHARE

describe("snapshot and share-token visibility", () => {
  it("mints a share token for the deck's owner", async () => {
    const { sb, updates } = fakeSupabase({
      deckRow: { id: "d-uuid", owner_id: "user-1", share_token: null, share_expires_at: null },
    });
    const out = await enableDeckSharingCore(sb, "user-1", {
      deckId: "11111111-1111-4111-8111-111111111111",
    });
    expect(out.regenerated).toBe(true);
    expect(out.token.length).toBeGreaterThanOrEqual(16);
    expect(updates[0]?.share_token).toBe(out.token);
  });

  it("refuses a colleague who neither owns the deck nor administers the platform", async () => {
    const { sb, updates } = fakeSupabase({
      deckRow: { id: "d-uuid", owner_id: "someone-else", share_token: null, share_expires_at: null },
      admin: false,
    });
    await expect(
      enableDeckSharingCore(sb, "user-1", { deckId: "11111111-1111-4111-8111-111111111111" }),
    ).rejects.toThrow(/forbidden/i);
    expect(updates).toHaveLength(0);
  });

  it("lets an admin share on behalf of the owner", async () => {
    const { sb } = fakeSupabase({
      deckRow: { id: "d-uuid", owner_id: "someone-else", share_token: null, share_expires_at: null },
      admin: true,
    });
    const out = await enableDeckSharingCore(sb, "admin-1", {
      deckId: "11111111-1111-4111-8111-111111111111",
    });
    expect(out.token.length).toBeGreaterThanOrEqual(16);
  });

  it("reuses an existing token unless regeneration is asked for", async () => {
    const existing = "existing-token-value-0000";
    const base = {
      deckRow: { id: "d-uuid", owner_id: "user-1", share_token: existing, share_expires_at: null },
    };
    const reuse = await enableDeckSharingCore(fakeSupabase(base).sb, "user-1", {
      deckId: "11111111-1111-4111-8111-111111111111",
    });
    expect(reuse).toMatchObject({ token: existing, regenerated: false });

    const rolled = await enableDeckSharingCore(fakeSupabase(base).sb, "user-1", {
      deckId: "11111111-1111-4111-8111-111111111111",
      regenerate: true,
    });
    expect(rolled.token).not.toBe(existing);
    expect(rolled.regenerated).toBe(true);
  });

  it("mints URL-safe tokens long enough to be unguessable", () => {
    const token = randomShareToken(24);
    expect(token).toMatch(/^[A-Za-z0-9_-]{16,}$/);
    expect(shareUrlFor(token)).toMatch(new RegExp(`^https://.+/share/${token}$`));
  });

  it("keeps the share token owner-gated on the read path too", () => {
    const fns = src("lib/deck-sharing.functions.ts");
    const status = fns.slice(fns.indexOf("export const getDeckShareStatus"));
    const body = status.slice(0, status.indexOf("export const getSharedDeck"));
    // assertShareable must run before the token is selected.
    expect(body.indexOf("assertShareable")).toBeLessThan(body.indexOf("share_token"));
    for (const fn of ["setDeckShareExpiry", "disableDeckSharing"]) {
      const seg = fns.slice(fns.indexOf(`export const ${fn}`), fns.indexOf(`export const ${fn}`) + 900);
      expect(seg).toContain("assertShareable");
      expect(seg).toContain("NO_CHANGE");
    }
  });

  it("only claims a deck was deleted when a row actually changed", () => {
    const fns = src("lib/cloud-decks.functions.ts");
    expect(fns).toContain("assertCanManageRecord");
    expect(fns).toMatch(/you may not have permission/i);
  });
});

// --------------------------------------------------- 3. EXPORT / PUBLISH GATES

describe("empty decks cannot be exported, presented or published", () => {
  const routes = [
    ["routes/decks.$deckId.present.tsx", "PresenterView"],
    ["routes/decks.$deckId.document.tsx", "DocumentView"],
    ["routes/decks.$deckId.print.tsx", "PrintView"],
  ] as const;

  it.each(routes)("%s shows the empty notice instead of a blank stage", (file) => {
    const code = src(file);
    expect(code).toContain("DeckEmptyNotice");
    expect(code).toMatch(/slides\.length \?\? 0/);
    // The gate must return before the view mounts (print auto-opens the dialog).
    expect(code.indexOf("if (slideCount === 0) return <DeckEmptyNotice")).toBeGreaterThan(0);
  });

  it.each(routes)("%s pulls in a cloud-only deck rather than 404ing a deep link", (file) => {
    expect(src(file)).toContain("useCloudDeckGate");
  });

  it("holds PowerPoint, PDF and GlobalLink on the export screen", () => {
    const code = src("routes/decks.$deckId.export.tsx");
    expect(code).toMatch(/const empty = deck\.slides\.length === 0/);
    // Every export trigger consults `empty`.
    expect((code.match(/empty/g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect(code).toMatch(/no slides yet/i);
  });

  it("holds both phone export buttons", () => {
    const code = src("components/export/MobileDeckExport.tsx");
    expect(code).toMatch(/const empty = deck\.slides\.length === 0/);
    expect(code).toMatch(/if \(busy \|\| empty\) return/);
    expect((code.match(/disabled=\{busy !== null \|\| empty\}/g) ?? []).length).toBe(2);
  });

  it("refuses to publish a share link for a deck with nothing in it", () => {
    const code = src("components/ShareMenu.tsx");
    const enable = code.slice(code.indexOf("if (deck.slides.length === 0)"));
    expect(enable.slice(0, 200)).toMatch(/Nothing to share yet/);
  });
});
