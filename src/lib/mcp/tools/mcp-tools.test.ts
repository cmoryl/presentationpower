// Unit tests for the MCP authoring tools. The Supabase client is replaced with
// an in-memory fake that mimics the PostgREST builder chain the tools use, so
// these run offline and assert real tool behaviour rather than mocks of it.

import { describe, expect, it, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;

class FakeDb {
  decks: Row[] = [];
  deck_slides: Row[] = [];
}

let db = new FakeDb();

/** Minimal PostgREST-shaped query builder over FakeDb. */
function fakeClient() {
  const from = (table: "decks" | "deck_slides") => {
    const rows = () => db[table];
    const state: { filters: [string, unknown][]; order?: string } = { filters: [] };
    const match = (r: Row) => state.filters.every(([k, v]) => r[k] === v);

    const selectApi = () => ({
      eq(col: string, val: unknown) {
        state.filters.push([col, val]);
        return selectApi();
      },
      order(col: string) {
        state.order = col;
        return selectApi();
      },
      async maybeSingle() {
        const hit = rows().filter(match)[0];
        return { data: hit ? { ...hit } : null, error: null };
      },
      async single() {
        const hit = rows().filter(match)[0];
        return hit
          ? { data: { ...hit }, error: null }
          : { data: null, error: { message: "no rows" } };
      },
      then(resolve: (v: { data: Row[]; error: null }) => unknown) {
        let out = rows().filter(match).map((r) => ({ ...r }));
        if (state.order) {
          const col = state.order;
          out = out.sort((a, b) => Number(a[col]) - Number(b[col]));
        }
        return Promise.resolve(resolve({ data: out, error: null }));
      },
    });

    return {
      select: () => selectApi(),
      insert(values: Row) {
        const row = { id: `row-${rows().length + 1}`, ...values };
        rows().push(row);
        return {
          select: () => ({
            async single() {
              return { data: { ...row }, error: null };
            },
          }),
        };
      },
      update(values: Row) {
        return {
          async eq(col: string, val: unknown) {
            for (const r of rows()) if (r[col] === val) Object.assign(r, values);
            return { error: null };
          },
        };
      },
      delete() {
        return {
          async eq(col: string, val: unknown) {
            db[table] = rows().filter((r) => r[col] !== val) as Row[];
            return { error: null };
          },
        };
      },
    };
  };
  return { from };
}

vi.mock("../supabase", async () => {
  const actual = await vi.importActual<typeof import("../supabase")>("../supabase");
  return { ...actual, supabaseForUser: () => fakeClient() };
});

const authed = { isAuthenticated: () => true, getUserId: () => "user-1", getToken: () => "tok" };
const anon = { isAuthenticated: () => false, getUserId: () => null, getToken: () => null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = { handler: (input: any, ctx: any) => any };
const call = async (tool: unknown, input: Row, ctx: unknown = authed) =>
  await (tool as AnyTool).handler(input, ctx);

const payload = (res: { content: { text: string }[] }) => JSON.parse(res.content[0]!.text);
const message = (res: { content: { text: string }[] }) => res.content[0]!.text;

import getDeck from "./get-deck";
import listVariants from "./list-variants";
import getTaxonomy from "./get-taxonomy";
import updateSlideContent from "./update-slide-content";
import updateSlideNotes from "./update-slide-notes";
import setSlideIcon from "./set-slide-icon";
import changeSlideVariant from "./change-slide-variant";
import insertSlide from "./insert-slide";
import deleteSlide from "./delete-slide";
import reorderSlides from "./reorder-slides";
import listSectionVariants from "./list-section-variants";
import searchIcons from "./search-icons";
import createShareLink from "./create-share-link";
import generateDeck from "./generate-deck";
import { MODULE_VARIANTS, SECTION_FRAMEWORKS, variantsForSection } from "@/lib/taxonomy";

// A section with at least two permitted variants, for the swap tests.
const swapSection = SECTION_FRAMEWORKS.map((s) => ({
  s,
  vs: variantsForSection(s.id),
})).find((x) => x.vs.length >= 2)!;

function seed() {
  db = new FakeDb();
  db.decks.push({
    id: "deck-1",
    owner_id: "user-1",
    title: "Acme deck",
    brand_mode_id: "bm-enterprise",
    archetype_id: "arch-problem-solution",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    is_template: false,
    status: "draft",
    review_status: null,
    context: { stylePackId: "sp-01", accent: "aqua" },
  });
  for (let i = 0; i < 3; i++) {
    db.deck_slides.push({
      id: `slide-${i}`,
      deck_id: "deck-1",
      position: i,
      section_id: swapSection.s.id,
      variant_id: swapSection.vs[0]!.id,
      layout_id: swapSection.vs[0]!.permittedLayoutIds[0]!,
      notes: null,
      content: { title: `Slide ${i}`, subtitle: "Sub", stat: "42%", items: [{ label: "A" }] },
    });
  }
}

beforeEach(seed);

describe("get_deck", () => {
  it("returns slides with full content and style fields", async () => {
    const out = payload(await call(getDeck, { deck_id: "deck-1" }));
    expect(out.slideCount).toBe(3);
    expect(out.style.stylePackId).toBe("sp-01");
    expect(out.slides[0].content.title).toBe("Slide 0");
    expect(out.slides.map((s: Row) => s.position)).toEqual([0, 1, 2]);
  });

  it("omits content when include_content is false", async () => {
    const out = payload(await call(getDeck, { deck_id: "deck-1", include_content: false }));
    expect(out.slides[0].content).toBeUndefined();
  });

  it("errors for an unknown deck", async () => {
    const res = await call(getDeck, { deck_id: "nope" });
    expect(res.isError).toBe(true);
  });

  it("requires authentication", async () => {
    const res = await call(getDeck, { deck_id: "deck-1" }, anon);
    expect(res.isError).toBe(true);
    expect(message(res)).toBe("Not authenticated");
  });
});

describe("list_variants", () => {
  it("lists variants with renderer flags and usage hints", async () => {
    const out = payload(await call(listVariants, {}));
    expect(out.total).toBe(MODULE_VARIANTS.length);
    expect(out.returned).toBeLessThanOrEqual(60);
    expect(typeof out.variants[0].hasNativePptxRenderer).toBe("boolean");
    expect(out.variants[0].useThisWhen.length).toBeGreaterThan(10);
  });

  it("filters by section and by query", async () => {
    const bySection = payload(await call(listVariants, { section_id: swapSection.s.id, limit: 400 }));
    expect(bySection.total).toBe(swapSection.vs.length);
    const byQuery = payload(
      await call(listVariants, { query: swapSection.vs[0]!.name, limit: 400 }),
    );
    expect(byQuery.variants.some((v: Row) => v.id === swapSection.vs[0]!.id)).toBe(true);
  });

  it("rejects an unknown section", async () => {
    const res = await call(listVariants, { section_id: "SF-nope" });
    expect(res.isError).toBe(true);
  });
});

describe("get_taxonomy", () => {
  it("returns ids, names and counts", async () => {
    const out = payload(await call(getTaxonomy, {}));
    expect(Array.isArray(out.brandModes)).toBe(true);
    expect(out.brandModes.length).toBeGreaterThan(0);
    expect(out.brandModes[0].id).toBeTruthy();
  });
});

describe("update_slide_content", () => {
  it("deep-merges a text patch", async () => {
    const out = payload(
      await call(updateSlideContent, {
        deck_id: "deck-1",
        position: 1,
        patch: { title: "New title" },
      }),
    );
    expect(out.content.title).toBe("New title");
    expect(out.content.subtitle).toBe("Sub");
    expect(db.deck_slides[1]!.content).toMatchObject({ title: "New title" });
  });

  it("rejects numeric edits unless explicitly allowed", async () => {
    const res = await call(updateSlideContent, {
      deck_id: "deck-1",
      position: 0,
      patch: { stat: "51%" },
    });
    expect(res.isError).toBe(true);
    expect(message(res).toLowerCase()).toContain("numeric");
  });

  it("permits numeric edits with allow_numeric_edits", async () => {
    const out = payload(
      await call(updateSlideContent, {
        deck_id: "deck-1",
        position: 0,
        patch: { stat: "51%" },
        allow_numeric_edits: true,
      }),
    );
    expect(out.content.stat).toBe("51%");
  });

  it("requires authentication", async () => {
    const res = await call(
      updateSlideContent,
      { deck_id: "deck-1", position: 0, patch: {} },
      anon,
    );
    expect(message(res)).toBe("Not authenticated");
  });
});

describe("change_slide_variant", () => {
  it("swaps to a permitted variant and fixes the layout", async () => {
    const target = swapSection.vs[1]!;
    const out = payload(
      await call(changeSlideVariant, { deck_id: "deck-1", position: 0, variant_id: target.id }),
    );
    expect(out.variantId).toBe(target.id);
    expect(target.permittedLayoutIds).toContain(out.layoutId);
  });

  it("rejects a variant that is not permitted for the section", async () => {
    const outsider = MODULE_VARIANTS.find(
      (v) => !swapSection.vs.some((p) => p.id === v.id),
    )!;
    const res = await call(changeSlideVariant, {
      deck_id: "deck-1",
      position: 0,
      variant_id: outsider.id,
    });
    expect(res.isError).toBe(true);
  });

  it("requires authentication", async () => {
    const res = await call(
      changeSlideVariant,
      { deck_id: "deck-1", position: 0, variant_id: swapSection.vs[1]!.id },
      anon,
    );
    expect(message(res)).toBe("Not authenticated");
  });
});

describe("set_slide_icon / update_slide_notes", () => {
  it("sets a slide-level icon", async () => {
    const res = await call(setSlideIcon, {
      deck_id: "deck-1",
      position: 0,
      icon_ref: "shield",
    });
    expect(res.isError).toBeUndefined();
  });

  it("writes speaker notes", async () => {
    const out = payload(
      await call(updateSlideNotes, { deck_id: "deck-1", position: 2, notes: "Open warm." }),
    );
    expect(out.ok).toBe(true);
    expect(db.deck_slides[2]!.notes).toBe("Open warm.");
  });

  it("both require authentication", async () => {
    expect(message(await call(setSlideIcon, { deck_id: "deck-1", position: 0, icon_ref: "x" }, anon))).toBe(
      "Not authenticated",
    );
    expect(
      message(await call(updateSlideNotes, { deck_id: "deck-1", position: 0, notes: "x" }, anon)),
    ).toBe("Not authenticated");
  });
});

describe("insert_slide / delete_slide", () => {
  it("inserts at a position and shifts later slides", async () => {
    const out = payload(
      await call(insertSlide, {
        deck_id: "deck-1",
        section_id: swapSection.s.id,
        variant_id: swapSection.vs[0]!.id,
        position: 1,
        content: { title: "Inserted" },
      }),
    );
    expect(out.slide.position).toBe(1);
    const positions = db.deck_slides.map((s) => s.position).sort((a, b) => Number(a) - Number(b));
    expect(positions).toEqual([0, 1, 2, 3]);
  });

  it("rejects a variant not permitted for the section", async () => {
    const outsider = MODULE_VARIANTS.find((v) => !swapSection.vs.some((p) => p.id === v.id))!;
    const res = await call(insertSlide, {
      deck_id: "deck-1",
      section_id: swapSection.s.id,
      variant_id: outsider.id,
    });
    expect(res.isError).toBe(true);
  });

  it("deletes a slide and closes the gap", async () => {
    const out = payload(await call(deleteSlide, { deck_id: "deck-1", position: 1 }));
    expect(out.remaining).toBe(2);
    expect(db.deck_slides.map((s) => s.position).sort()).toEqual([0, 1]);
  });

  it("errors when no slide sits at the position", async () => {
    const res = await call(deleteSlide, { deck_id: "deck-1", position: 9 });
    expect(res.isError).toBe(true);
  });

  it("both require authentication", async () => {
    expect(
      message(
        await call(
          insertSlide,
          { deck_id: "deck-1", section_id: swapSection.s.id, variant_id: swapSection.vs[0]!.id },
          anon,
        ),
      ),
    ).toBe("Not authenticated");
    expect(message(await call(deleteSlide, { deck_id: "deck-1", position: 0 }, anon))).toBe(
      "Not authenticated",
    );
  });
});

describe("reorder_slides", () => {
  it("applies a valid permutation", async () => {
    const out = payload(await call(reorderSlides, { deck_id: "deck-1", order: [2, 0, 1] }));
    expect(out.ok).toBe(true);
    const byId = Object.fromEntries(db.deck_slides.map((s) => [s.id, s.position]));
    expect(byId["slide-2"]).toBe(0);
    expect(byId["slide-0"]).toBe(1);
    expect(byId["slide-1"]).toBe(2);
  });

  it("rejects a non-permutation", async () => {
    const res = await call(reorderSlides, { deck_id: "deck-1", order: [0, 0, 1] });
    expect(res.isError).toBe(true);
    expect(message(res)).toContain("permutation");
  });

  it("rejects an out-of-range position", async () => {
    const res = await call(reorderSlides, { deck_id: "deck-1", order: [0, 1, 7] });
    expect(res.isError).toBe(true);
  });

  it("requires authentication", async () => {
    expect(message(await call(reorderSlides, { deck_id: "deck-1", order: [0] }, anon))).toBe(
      "Not authenticated",
    );
  });
});

describe("list_section_variants / search_icons", () => {
  it("lists variants for a section", async () => {
    const out = payload(await call(listSectionVariants, { section_id: swapSection.s.id }));
    expect(JSON.stringify(out)).toContain(swapSection.vs[0]!.id);
  });

  it("searches icons", async () => {
    const out = payload(await call(searchIcons, { query: "shield" }));
    expect(JSON.stringify(out).toLowerCase()).toContain("shield");
  });
});

describe("create_share_link", () => {
  it("mints a token and returns an absolute URL", async () => {
    const res = await call(createShareLink, { deck_id: "deck-1" });
    if (res.isError) throw new Error(`share failed: ${message(res)}`);
    const out = payload(res);
    expect(out.token).toBeTruthy();
    expect(out.path).toBe(`/share/${out.token}`);
    expect(out.url).toMatch(/^https?:\/\/.+\/share\//);
  });

  it("errors for an unknown deck", async () => {
    const res = await call(createShareLink, { deck_id: "nope" });
    expect(res.isError).toBe(true);
  });

  it("requires authentication", async () => {
    expect(message(await call(createShareLink, { deck_id: "deck-1" }, anon))).toBe(
      "Not authenticated",
    );
  });
});

describe("generate_deck", () => {
  it("returns a setup error naming ANTHROPIC_API_KEY when the secret is absent", async () => {
    // Any provider key would make the pipeline proceed to real AI calls.
    const keys = [
      "ANTHROPIC_API_KEY",
      "LOVABLE_API_KEY",
      "GEMINI_API_KEY",
      "GOOGLE_API_KEY",
      "OPENAI_API_KEY",
    ];
    const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    for (const k of keys) delete process.env[k];
    try {
      const res = await call(generateDeck, { prospect: "Acme", industry: "Legal" });
      expect(res.isError).toBe(true);
      expect(message(res)).toContain("ANTHROPIC_API_KEY");
      expect(message(res)).toContain("Secrets");
    } finally {
      for (const k of keys) if (prev[k] !== undefined) process.env[k] = prev[k]!;
    }
  });

  it("requires authentication", async () => {
    expect(message(await call(generateDeck, { prospect: "Acme" }, anon))).toBe("Not authenticated");
  });
});
