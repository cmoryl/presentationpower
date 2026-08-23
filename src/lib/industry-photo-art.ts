/**
 * INDUSTRY PHOTO ART — the authored PHOTOREAL plate kit for the industry
 * recipes (R01–R30, minus R22 which is served by the Games kit).
 *
 * The vector scene engine in `industry-scene-art.ts` read as illustration, so
 * every industry now paints from four hyper-realistic 2560x1440 plates:
 *
 *   HERO     cinematic establishing shot, mass low-left, open upper-right
 *   CONTENT  calm mid-range environment, quiet left two thirds
 *   DATA     macro abstraction with a soft, quiet centre
 *   FLOW     one-point perspective with leading lines and open upper third
 *
 * Selection is pure and seeded (scene + take), so screen, PPTX, PDF and PNG
 * exports all resolve the same plate. An admin background upload for a scene
 * still wins, and the Games authored kit still wins for R22.
 */

import { sceneFromSeed, type SkinScene } from "./skin-backgrounds";
import { overrideFor } from "./template-registry";
import type { StylePack } from "./style-packs";

export type PhotoFamily = "hero" | "content" | "data" | "flow";
export type PhotoMode = "light" | "dark";

export interface IndustryPhotoSet {
  mode: PhotoMode;
  hero: string;
  content: string;
  data: string;
  flow: string;
}

export const INDUSTRY_PHOTO: Record<string, IndustryPhotoSet> = {
  R01: {
    mode: "light",
    hero: "/__l5e/assets-v1/6bc40a1b-bbae-407a-ba26-9f526b046fba/ind-R01-hero.webp",
    content: "/__l5e/assets-v1/1386091a-411b-4e22-afa7-f48105bd2e50/ind-R01-content.webp",
    data: "/__l5e/assets-v1/1d76ceb4-3ce3-45a0-882d-599974f756c9/ind-R01-data.webp",
    flow: "/__l5e/assets-v1/2787d9b8-e5df-49e3-8db2-9be83ae6e631/ind-R01-flow.webp",
  },
  R02: {
    mode: "dark",
    hero: "/__l5e/assets-v1/69480767-cb69-4b29-b749-f3b9a7f7f867/ind-R02-hero.webp",
    content: "/__l5e/assets-v1/229eac51-1c4c-49cc-a24d-b199d438f9e6/ind-R02-content.webp",
    data: "/__l5e/assets-v1/ede21e91-b7b2-4326-8959-6cd254074094/ind-R02-data.webp",
    flow: "/__l5e/assets-v1/0eb986b3-995c-40b6-8b46-cbb9631326e5/ind-R02-flow.webp",
  },
  R03: {
    mode: "dark",
    hero: "/__l5e/assets-v1/ad8d1c24-5c79-4a9a-83c8-8311a71e89f6/ind-R03-hero.webp",
    content: "/__l5e/assets-v1/607efc82-8cd5-4d3c-8443-1d012bc4e850/ind-R03-content.webp",
    data: "/__l5e/assets-v1/e85d840d-9d25-4bd9-8fa3-8fdea6971437/ind-R03-data.webp",
    flow: "/__l5e/assets-v1/bb8f85c2-b17d-4943-9c5a-afd39b077970/ind-R03-flow.webp",
  },
  R04: {
    mode: "dark",
    hero: "/__l5e/assets-v1/0f07fee7-5df6-4d4b-bf39-82edcf694314/ind-R04-hero.webp",
    content: "/__l5e/assets-v1/242eaf15-9676-44ef-9a5d-b402892e64ac/ind-R04-content.webp",
    data: "/__l5e/assets-v1/8c4b6e97-6210-4d80-85d5-cbfcc92a15ed/ind-R04-data.webp",
    flow: "/__l5e/assets-v1/41755453-e900-42be-9456-57980e09f58b/ind-R04-flow.webp",
  },
  R05: {
    mode: "dark",
    hero: "/__l5e/assets-v1/fe5552bd-d3c9-431d-84c9-1071368ab2c2/ind-R05-hero.webp",
    content: "/__l5e/assets-v1/915d4e68-5894-45a2-ad33-c6e92cd0c8ff/ind-R05-content.webp",
    data: "/__l5e/assets-v1/612fa893-9341-4cd7-b643-d740c2dc7d53/ind-R05-data.webp",
    flow: "/__l5e/assets-v1/c9291d67-e000-48ff-84f1-4679b9635eff/ind-R05-flow.webp",
  },
  R06: {
    mode: "light",
    hero: "/__l5e/assets-v1/097bac3b-261e-4aba-a80b-090d4cf9287b/ind-R06-hero.webp",
    content: "/__l5e/assets-v1/1f9d86ac-9477-4f59-a915-929857bc6f0a/ind-R06-content.webp",
    data: "/__l5e/assets-v1/c631a8a9-b846-4124-8501-a6655489bd39/ind-R06-data.webp",
    flow: "/__l5e/assets-v1/b6735cc8-db64-4e19-8773-bd1ac2c91af4/ind-R06-flow.webp",
  },
  R07: {
    mode: "dark",
    hero: "/__l5e/assets-v1/0b85ee90-9623-4b15-8354-2675f0e8cc5d/ind-R07-hero.webp",
    content: "/__l5e/assets-v1/592ba988-f21c-4365-b0f4-7cfba7e80f12/ind-R07-content.webp",
    data: "/__l5e/assets-v1/9c1b5d42-2a18-440d-803d-ee925e957dca/ind-R07-data.webp",
    flow: "/__l5e/assets-v1/3cf995b9-4ecf-459f-abcf-3e299ae66072/ind-R07-flow.webp",
  },
  R08: {
    mode: "light",
    hero: "/__l5e/assets-v1/7f737650-dcea-44e1-ae30-1c556ebf7db6/ind-R08-hero.webp",
    content: "/__l5e/assets-v1/98004cb1-56e9-4c84-9668-f912f549e562/ind-R08-content.webp",
    data: "/__l5e/assets-v1/36dc07b9-5e7e-4a4a-b10d-72256f080552/ind-R08-data.webp",
    flow: "/__l5e/assets-v1/21843456-1310-4988-9688-c1267188be5e/ind-R08-flow.webp",
  },
  R09: {
    mode: "light",
    hero: "/__l5e/assets-v1/0ec78ae1-addf-4909-a821-6c99f758ea58/ind-R09-hero.webp",
    content: "/__l5e/assets-v1/c9ddf2c1-04e3-4f91-8aa5-4bf1110d8828/ind-R09-content.webp",
    data: "/__l5e/assets-v1/3a3e2bcf-75de-4f46-80ba-6f371f1d0a0b/ind-R09-data.webp",
    flow: "/__l5e/assets-v1/30458056-5d66-4a09-86b1-1b9c82d5eea1/ind-R09-flow.webp",
  },
  R10: {
    mode: "light",
    hero: "/__l5e/assets-v1/efb557c0-da28-42f4-b76d-b8c12041f3fd/ind-R10-hero.webp",
    content: "/__l5e/assets-v1/67d0a230-2a8c-4b5c-94bf-0d4f8a9cc9a6/ind-R10-content.webp",
    data: "/__l5e/assets-v1/2eef1abb-4ab6-4b5a-867a-229772a559bb/ind-R10-data.webp",
    flow: "/__l5e/assets-v1/34fa7a7e-800a-4c7e-993b-979936e56e29/ind-R10-flow.webp",
  },
  R11: {
    mode: "light",
    hero: "/__l5e/assets-v1/d6cbceb2-3bf9-4c4a-bf94-ecef4812cf18/ind-R11-hero.webp",
    content: "/__l5e/assets-v1/ff35f805-4c5d-45f1-a929-90f9956bbe4d/ind-R11-content.webp",
    data: "/__l5e/assets-v1/f95b2a9d-480d-4537-a159-13f258693b00/ind-R11-data.webp",
    flow: "/__l5e/assets-v1/07882557-a6aa-462b-a079-249d4ed58286/ind-R11-flow.webp",
  },
  R12: {
    mode: "light",
    hero: "/__l5e/assets-v1/eb0d9e10-a8db-414f-84d2-7824e631c409/ind-R12-hero.webp",
    content: "/__l5e/assets-v1/640ad4ff-15d7-44dd-8a8a-7197d751d5ca/ind-R12-content.webp",
    data: "/__l5e/assets-v1/69b03e18-5c7e-414f-98c1-47a1194325e5/ind-R12-data.webp",
    flow: "/__l5e/assets-v1/5129a586-0e0e-49ce-a0a0-ee49ac43f938/ind-R12-flow.webp",
  },
  R13: {
    mode: "dark",
    hero: "/__l5e/assets-v1/50d6b338-f00a-4a5c-81f0-7fe13efa74de/ind-R13-hero.webp",
    content: "/__l5e/assets-v1/69c46172-aafc-4da3-999a-74cd0954a219/ind-R13-content.webp",
    data: "/__l5e/assets-v1/c5c06e31-8e16-4c82-8c97-52229455dfff/ind-R13-data.webp",
    flow: "/__l5e/assets-v1/284d3bf0-901c-471d-bc5e-35cc9c6c9a5d/ind-R13-flow.webp",
  },
  R14: {
    mode: "dark",
    hero: "/__l5e/assets-v1/080b7b91-7936-4631-a3b9-5894515113c8/ind-R14-hero.webp",
    content: "/__l5e/assets-v1/ff9dbf5a-2330-49ac-8bb9-d7f4369e9e01/ind-R14-content.webp",
    data: "/__l5e/assets-v1/ce5136b8-5e1f-47c2-b9c7-d37e61c5e970/ind-R14-data.webp",
    flow: "/__l5e/assets-v1/f0a5b670-9c55-48ef-bff5-005440da64ae/ind-R14-flow.webp",
  },
  R15: {
    mode: "dark",
    hero: "/__l5e/assets-v1/21535d43-eda5-47ee-bc93-901af7be104e/ind-R15-hero.webp",
    content: "/__l5e/assets-v1/cac9ea99-5415-4704-a54f-9f421103bd69/ind-R15-content.webp",
    data: "/__l5e/assets-v1/e5d04ce6-dfa5-4bc2-aefd-adcd6f09bc58/ind-R15-data.webp",
    flow: "/__l5e/assets-v1/2f9ec073-7b85-4ef7-afcf-ba286de2da25/ind-R15-flow.webp",
  },
  R16: {
    mode: "dark",
    hero: "/__l5e/assets-v1/a1331c68-a555-47c2-9261-94fb4af7302a/ind-R16-hero.webp",
    content: "/__l5e/assets-v1/fda9c3e6-134f-4a8e-a507-734eb8960435/ind-R16-content.webp",
    data: "/__l5e/assets-v1/0a0f3564-8995-45d5-9c20-6f0df71f5179/ind-R16-data.webp",
    flow: "/__l5e/assets-v1/7d666dfb-a0bc-4d96-a04c-be16b06d54a2/ind-R16-flow.webp",
  },
  R17: {
    mode: "dark",
    hero: "/__l5e/assets-v1/1fa49d2c-d704-41b2-aa06-83e615b71c4e/ind-R17-hero.webp",
    content: "/__l5e/assets-v1/cddeb928-570f-4aa4-a979-ba6823c8926a/ind-R17-content.webp",
    data: "/__l5e/assets-v1/bbc932a4-d931-45f3-99d7-bd658d00aef2/ind-R17-data.webp",
    flow: "/__l5e/assets-v1/164d4045-685f-4ce2-89d8-7df924df7295/ind-R17-flow.webp",
  },
  R18: {
    mode: "light",
    hero: "/__l5e/assets-v1/cb011e93-ff6f-4c0a-9be5-329435ee8fc8/ind-R18-hero.webp",
    content: "/__l5e/assets-v1/62decc1b-22f6-4ae0-be60-054ba11f6e4b/ind-R18-content.webp",
    data: "/__l5e/assets-v1/85bd3698-c7a3-4755-a8d5-bc6f8abe90da/ind-R18-data.webp",
    flow: "/__l5e/assets-v1/82b2133f-0520-46a2-b2e7-05cff3867397/ind-R18-flow.webp",
  },
  R19: {
    mode: "light",
    hero: "/__l5e/assets-v1/86ae141b-fef8-4712-ae7b-9fa9abf8df10/ind-R19-hero.webp",
    content: "/__l5e/assets-v1/e7af013b-71a2-4565-a122-535a0a89887c/ind-R19-content.webp",
    data: "/__l5e/assets-v1/254b3f73-1bbe-467d-bdcb-4148c249a334/ind-R19-data.webp",
    flow: "/__l5e/assets-v1/9fc158ef-2b0e-46a1-87cb-f14d2f05866a/ind-R19-flow.webp",
  },
  R20: {
    mode: "light",
    hero: "/__l5e/assets-v1/5a2154f9-9fb6-4077-ac5a-2450f033d664/ind-R20-hero.webp",
    content: "/__l5e/assets-v1/4397b015-f4bc-4ce9-884d-74499b321623/ind-R20-content.webp",
    data: "/__l5e/assets-v1/b8e5e718-745c-4a26-9761-821feebd43b6/ind-R20-data.webp",
    flow: "/__l5e/assets-v1/dc6cc944-ab12-42ea-86c5-6b5c7cfc91a5/ind-R20-flow.webp",
  },
  R21: {
    mode: "dark",
    hero: "/__l5e/assets-v1/f61db12d-eea3-4b7f-bb03-f0ec85859059/ind-R21-hero.webp",
    content: "/__l5e/assets-v1/df2db114-81ac-43c0-ad85-74b3c4b3f50e/ind-R21-content.webp",
    data: "/__l5e/assets-v1/2791ddd7-55a8-4481-9845-7792d81d5c77/ind-R21-data.webp",
    flow: "/__l5e/assets-v1/f15b3eda-0b2a-44be-8039-c562596aa67b/ind-R21-flow.webp",
  },
  R23: {
    mode: "dark",
    hero: "/__l5e/assets-v1/39954b2b-fe32-4814-8046-041dc129d102/ind-R23-hero.webp",
    content: "/__l5e/assets-v1/5e873b0c-2011-4e6e-9718-81f157a300fa/ind-R23-content.webp",
    data: "/__l5e/assets-v1/20d5b01f-4ca7-4efa-80d3-34d0767c8ea6/ind-R23-data.webp",
    flow: "/__l5e/assets-v1/fe8c4a11-6981-4d5d-81a5-cc631344230c/ind-R23-flow.webp",
  },
  R24: {
    mode: "light",
    hero: "/__l5e/assets-v1/e2464a85-4d08-4984-9fc9-504c93546d4e/ind-R24-hero.webp",
    content: "/__l5e/assets-v1/953a8500-b97e-4222-b8e4-477f78253aad/ind-R24-content.webp",
    data: "/__l5e/assets-v1/c17db72b-0119-413d-ada3-2584bff97227/ind-R24-data.webp",
    flow: "/__l5e/assets-v1/bbc65fa8-31a3-4474-bf64-0f3ca140c9a4/ind-R24-flow.webp",
  },
  R25: {
    mode: "light",
    hero: "/__l5e/assets-v1/bccc7dd9-2a5a-4347-85db-780b99469d5e/ind-R25-hero.webp",
    content: "/__l5e/assets-v1/e331ed5e-582f-435c-97c8-5b67050ea0b1/ind-R25-content.webp",
    data: "/__l5e/assets-v1/b8ce623d-cbef-4fb6-8c6f-de43219ef903/ind-R25-data.webp",
    flow: "/__l5e/assets-v1/58dbcd3c-1d19-498d-9ec3-2f9059f0329c/ind-R25-flow.webp",
  },
  R26: {
    mode: "light",
    hero: "/__l5e/assets-v1/ccb60e01-98b1-4a5b-9e1f-8c7c60bae024/ind-R26-hero.webp",
    content: "/__l5e/assets-v1/d0cde04d-38aa-417a-a6b6-123ff6c1a23b/ind-R26-content.webp",
    data: "/__l5e/assets-v1/81eaac5f-06a6-403c-99d3-c3159fc7c910/ind-R26-data.webp",
    flow: "/__l5e/assets-v1/404ec266-e14e-4f52-8d4a-128c60cdc01f/ind-R26-flow.webp",
  },
  R27: {
    mode: "light",
    hero: "/__l5e/assets-v1/76212cce-241d-4ee8-9438-bccbce00092a/ind-R27-hero.webp",
    content: "/__l5e/assets-v1/8d2ce7ca-6bec-4a26-a724-224c6d013d6b/ind-R27-content.webp",
    data: "/__l5e/assets-v1/1cc71931-f279-40d8-8bc1-28d866fcc25a/ind-R27-data.webp",
    flow: "/__l5e/assets-v1/897210a1-b71b-435d-9a2d-54abb35732fb/ind-R27-flow.webp",
  },
  R28: {
    mode: "light",
    hero: "/__l5e/assets-v1/fd6abfc9-6433-4462-92cf-84f1d81e6864/ind-R28-hero.webp",
    content: "/__l5e/assets-v1/93fc9312-0d78-454a-825a-caab3f8d8f44/ind-R28-content.webp",
    data: "/__l5e/assets-v1/2f12ba63-00c4-4548-9874-fce11d3aba2a/ind-R28-data.webp",
    flow: "/__l5e/assets-v1/632e5bec-fbae-4dd3-9f07-79beac8f430a/ind-R28-flow.webp",
  },
  R29: {
    mode: "light",
    hero: "/__l5e/assets-v1/5374eebc-4445-465a-a1f9-967f88416a4a/ind-R29-hero.webp",
    content: "/__l5e/assets-v1/a48f33eb-3701-4489-8b55-01ebee2d54b4/ind-R29-content.webp",
    data: "/__l5e/assets-v1/73ad9b04-e52c-40d3-8d11-4505f70b8ab9/ind-R29-data.webp",
    flow: "/__l5e/assets-v1/946ce966-8154-4377-8ead-3ba27ed5155b/ind-R29-flow.webp",
  },
  R30: {
    mode: "dark",
    hero: "/__l5e/assets-v1/a916e6cd-407c-44c5-8980-feeafbadde31/ind-R30-hero.webp",
    content: "/__l5e/assets-v1/4950bdd5-b712-4efa-a58f-917cd4fc5332/ind-R30-content.webp",
    data: "/__l5e/assets-v1/ff7e6934-6826-48b8-be37-1ecce20137f9/ind-R30-data.webp",
    flow: "/__l5e/assets-v1/c31a9772-9c63-4617-8776-f6abebe678ee/ind-R30-flow.webp",
  },
};

/** Scene → family order; the take rotates through the pair. */
const SCENE_FAMILIES: Record<SkinScene, PhotoFamily[]> = {
  cover: ["hero", "flow"],
  section: ["hero", "data"],
  statement: ["hero", "content"],
  agenda: ["content", "flow"],
  stats: ["data", "content"],
  split: ["content", "hero"],
  bento: ["content", "data"],
  chart: ["data", "flow"],
  quote: ["flow", "hero"],
  timeline: ["flow", "content"],
  closing: ["hero", "flow"],
};

export function hasIndustryPhotoArt(code: string | null | undefined): boolean {
  return !!code && !!INDUSTRY_PHOTO[code.toUpperCase()];
}

export function industryPhotoUrl(
  code: string | null | undefined,
  scene: SkinScene,
  take = 0,
): string | null {
  const set = code ? INDUSTRY_PHOTO[code.toUpperCase()] : undefined;
  if (!set) return null;
  const order = SCENE_FAMILIES[scene] ?? SCENE_FAMILIES.statement;
  const fam = order[Math.abs(take) % order.length] ?? order[0]!;
  return set[fam];
}

/**
 * OnDeck core / approved language packs (S01–S28) carry no industry of their
 * own, so they used to fall back to generated CSS grounds while the industry
 * recipes ran photoreal plates — two visibly different production standards in
 * one library. Each core skin now borrows a plate set deterministically from
 * the photoreal kit, filtered to plates that match the pack's own light/dark
 * mode so ink contrast is preserved. Element skins (S29/S30) keep their own
 * authored KO Power plates and are never remapped here.
 */
const CORE_SKIN = /^S(?:0[1-9]|1\d|2[0-8])$/;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** The plate-kit code a pack should paint from ("S07" → a mode-matched R code). */
export function photoCodeForPack(code: string | null | undefined, mode: PhotoMode): string | null {
  const up = (code ?? "").toUpperCase();
  if (!up) return null;
  if (INDUSTRY_PHOTO[up]) return up;
  if (!CORE_SKIN.test(up)) return null;
  const pool = Object.keys(INDUSTRY_PHOTO)
    .filter((k) => INDUSTRY_PHOTO[k]!.mode === mode)
    .sort();
  if (!pool.length) return null;
  return pool[hash(up) % pool.length]!;
}

/** Wrap a pack so its industry photo plate paints as the ground. */
export function withIndustryPhotoArt(pack: StylePack, code: string): StylePack {
  const plateCode = photoCodeForPack(code, pack.mode === "dark" ? "dark" : "light");
  const set = plateCode ? INDUSTRY_PHOTO[plateCode] : undefined;
  if (!set || !plateCode) return pack;
  const base = pack.ground;

  // Finished photographs: the veil only carries copy contrast, never hides art.
  const veil =
    set.mode === "dark"
      ? "linear-gradient(0deg, rgba(4,8,22,0.34), rgba(4,8,22,0.34))"
      : "linear-gradient(0deg, rgba(255,255,255,0.30), rgba(255,255,255,0.30))";
  const scrim =
    set.mode === "dark"
      ? "linear-gradient(100deg, rgba(4,8,22,0.62) 0%, rgba(4,8,22,0.18) 58%, rgba(4,8,22,0) 100%)"
      : "linear-gradient(100deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.20) 58%, rgba(255,255,255,0) 100%)";
  return {
    ...pack,
    ground: (seed: string) => {
      const scene = sceneFromSeed(seed);
      const custom = overrideFor(code, scene);
      if (custom?.imageUrl) return base(seed);
      // FIT BEFORE VARIETY. Each scene names its plate families in preference
      // order, and the FIRST one is the fitted plate for that content type
      // (hero for covers, data for stats/charts, flow for process/timeline,
      // content for agenda/bento/split). Rotating that choice with a per-pack
      // hash — as this used to — collapsed eleven scenes onto whichever pair
      // member the hash landed on, so a stats module could be grounded with a
      // process plate. Only an explicit `take:` (the backdrop studio asking for
      // an alternate) rotates within the pair.
      const takeMatch = /take:(\d+)/i.exec(seed);
      const take = takeMatch ? parseInt(takeMatch[1]!, 10) : 0;
      const url = industryPhotoUrl(plateCode, scene, take);

      if (!url) return base(seed);
      // Every take must READ as a different backdrop. The family pair only
      // yields two plates, so takes beyond the pair re-frame the plate
      // (different crop anchor + mirrored scrim) instead of repeating take 0 —
      // otherwise the studio's four alternates collapse into two.
      const frame = TAKE_FRAMES[Math.abs(take) % TAKE_FRAMES.length]!;
      return [
        frame.mirror ? mirror(scrim) : scrim,
        veil,
        `url("${url}") ${frame.position} / cover no-repeat`,
      ];
    },
  };
}

/** Crop anchor + scrim direction per take, so all four takes stay distinct. */
const TAKE_FRAMES: Array<{ position: string; mirror: boolean }> = [
  { position: "center center", mirror: false },
  { position: "center center", mirror: false },
  { position: "30% center", mirror: true },
  { position: "70% 40%", mirror: true },
];

/** Flip a linear-gradient scrim to the opposite side of the plate. */
function mirror(layer: string): string {
  return layer.replace("100deg", "280deg");
}
