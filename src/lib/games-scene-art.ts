/**
 * GAMES SCENE ART — the authored Games (bm-tp-games) plate kit.
 *
 * 96 backdrops (48 light / 48 dark, 2560x1440 16:9) plus 12 transparent subject
 * cutouts, shipped as CDN pointers. Each plate carries the regions where copy
 * can sit (`quiet`) and how hard it competes with text (`activity`), so a scene
 * is matched to a plate rather than picked at random:
 *
 *   1. prefer a plate whose quiet regions cover the scene's copy area
 *   2. break ties on activity — calm plates under text-dense scenes, loud
 *      plates for covers and section breaks
 *   3. rotate variants a/b/c by take so a long deck never repeats a backdrop
 *
 * Palette: Accent #A6FA87 (Pantone 7487 C) · Base #03002C · Bridge #003FC7.
 * These are complete compositions, so they REPLACE the generated ground for the
 * Games recipe; an admin background upload for a scene still wins.
 */

import { sceneFromSeed, type SkinScene } from "./skin-backgrounds";
import { overrideFor } from "./template-registry";
import type { StylePack } from "./style-packs";

const CDN = "/__l5e/assets-v1";

export const GAMES_PALETTE = {
  accent: "#A6FA87",
  accentPantone: "7487 C",
  base: "#03002C",
  bridge: "#003FC7",
} as const;

export type GamesArtMode = "light" | "dark";
export type GamesRegion =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";
export type GamesActivity = "lowest" | "low" | "medium" | "high" | "highest";

export interface GamesPlate {
  url: string;
  mode: GamesArtMode;
  texture: "flat" | "textured";
  composition: string;
  variant: string;
  /** Free-form in the kit vocabulary ("bottom-left", "lower centre band", …). */
  energyRegion: string;
  quiet: string[];
  activity: GamesActivity;
}

export const GAMES_PLATES: GamesPlate[] = [
  {
    url: `${CDN}/74ef7fca-9e54-4032-bce1-1e24a52bfd00/games-flat-01-risea-dark.webp`,
    mode: "dark",
    texture: "flat",
    composition: "01-rise",
    variant: "a",
    energyRegion: "bottom-left",
    quiet: ["top-right", "top", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/899934e1-af69-477d-85c5-2e421fab377f/games-flat-02-falla-dark.webp`,
    mode: "dark",
    texture: "flat",
    composition: "02-fall",
    variant: "a",
    energyRegion: "top-right",
    quiet: ["bottom-left", "bottom", "left"],
    activity: "medium",
  },
  {
    url: `${CDN}/a16140b2-bab9-40e8-a8aa-8707be87ee68/games-flat-03-horizona-dark.webp`,
    mode: "dark",
    texture: "flat",
    composition: "03-horizon",
    variant: "a",
    energyRegion: "bottom",
    quiet: ["top", "top-left", "top-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/f4dc31da-841c-4477-b617-4f0518c6dd32/games-flat-04-flanka-dark.webp`,
    mode: "dark",
    texture: "flat",
    composition: "04-flank",
    variant: "a",
    energyRegion: "left+right edges",
    quiet: ["center"],
    activity: "medium",
  },
  {
    url: `${CDN}/a4bbe1b1-f77f-4161-8844-73d7a0da5b85/games-flat-05-sweepa-dark.webp`,
    mode: "dark",
    texture: "flat",
    composition: "05-sweep",
    variant: "a",
    energyRegion: "diagonal BL->C",
    quiet: ["top-left", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/5186c657-4e67-4810-a751-06770e5a809f/games-flat-06-crowna-dark.webp`,
    mode: "dark",
    texture: "flat",
    composition: "06-crown",
    variant: "a",
    energyRegion: "top",
    quiet: ["bottom", "bottom-left", "bottom-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/360f36fd-85d0-455e-80da-ea041a11f6be/games-flat-01-risea-light.webp`,
    mode: "light",
    texture: "flat",
    composition: "01-rise",
    variant: "a",
    energyRegion: "bottom-left",
    quiet: ["top-right", "top", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/82b77665-d453-401f-8c60-9a3304a9cf38/games-flat-02-falla-light.webp`,
    mode: "light",
    texture: "flat",
    composition: "02-fall",
    variant: "a",
    energyRegion: "top-right",
    quiet: ["bottom-left", "bottom", "left"],
    activity: "medium",
  },
  {
    url: `${CDN}/3bca9b41-7714-469f-89b3-c04b6a527a82/games-flat-03-horizona-light.webp`,
    mode: "light",
    texture: "flat",
    composition: "03-horizon",
    variant: "a",
    energyRegion: "bottom",
    quiet: ["top", "top-left", "top-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/a5a9e400-a22f-4101-88ae-c642fac8d043/games-flat-04-flanka-light.webp`,
    mode: "light",
    texture: "flat",
    composition: "04-flank",
    variant: "a",
    energyRegion: "left+right edges",
    quiet: ["center"],
    activity: "medium",
  },
  {
    url: `${CDN}/6037568a-eeba-4c91-a5fd-1d4ecfc8a6ae/games-flat-05-sweepa-light.webp`,
    mode: "light",
    texture: "flat",
    composition: "05-sweep",
    variant: "a",
    energyRegion: "diagonal BL->C",
    quiet: ["top-left", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/f8ff794f-d8e2-4d09-898d-aca5751111e2/games-flat-06-crowna-light.webp`,
    mode: "light",
    texture: "flat",
    composition: "06-crown",
    variant: "a",
    energyRegion: "top",
    quiet: ["bottom", "bottom-left", "bottom-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/0756716b-cff4-4724-be69-53de73f1f203/games-textured-01-risea-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "01-rise",
    variant: "a",
    energyRegion: "bottom-left",
    quiet: ["top-right", "top", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/d3c4d483-2d96-459c-92f9-ac42c7087644/games-textured-01-riseb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "01-rise",
    variant: "b",
    energyRegion: "bottom-left",
    quiet: ["top-right", "top", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/7e13b1b9-6e63-402b-9947-e14334db41e6/games-textured-01-risec-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "01-rise",
    variant: "c",
    energyRegion: "bottom-left",
    quiet: ["top-right", "top", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/9939fc2f-fe00-46f1-9845-5905c69e35cf/games-textured-02-falla-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "02-fall",
    variant: "a",
    energyRegion: "top-right",
    quiet: ["bottom-left", "bottom", "left"],
    activity: "medium",
  },
  {
    url: `${CDN}/1caa6857-8675-435c-9dbb-115c11239e34/games-textured-02-fallb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "02-fall",
    variant: "b",
    energyRegion: "top-right",
    quiet: ["bottom-left", "bottom", "left"],
    activity: "medium",
  },
  {
    url: `${CDN}/455f395e-249e-4b3b-8021-c2a59eb3b630/games-textured-02-fallc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "02-fall",
    variant: "c",
    energyRegion: "top-right",
    quiet: ["bottom-left", "bottom", "left"],
    activity: "medium",
  },
  {
    url: `${CDN}/48743fe4-a4a4-4d6a-85a2-d927a406b236/games-textured-03-horizona-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "03-horizon",
    variant: "a",
    energyRegion: "bottom",
    quiet: ["top", "top-left", "top-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/e735118d-8a16-44ae-9b10-5592a8c4f4aa/games-textured-03-horizonb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "03-horizon",
    variant: "b",
    energyRegion: "bottom",
    quiet: ["top", "top-left", "top-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/fd6144cf-22bc-4eac-98b8-7df3dff6bd61/games-textured-03-horizonc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "03-horizon",
    variant: "c",
    energyRegion: "bottom",
    quiet: ["top", "top-left", "top-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/a79135aa-4471-4140-8e7f-5f89f4bae67a/games-textured-04-flanka-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "04-flank",
    variant: "a",
    energyRegion: "left+right edges",
    quiet: ["center"],
    activity: "medium",
  },
  {
    url: `${CDN}/5db5b021-af9d-4d4d-9d20-916a2e6dd9c4/games-textured-04-flankb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "04-flank",
    variant: "b",
    energyRegion: "left+right edges",
    quiet: ["center"],
    activity: "medium",
  },
  {
    url: `${CDN}/97aa2a19-0066-49f3-b0a3-8bed5beff45f/games-textured-04-flankc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "04-flank",
    variant: "c",
    energyRegion: "left+right edges",
    quiet: ["center"],
    activity: "medium",
  },
  {
    url: `${CDN}/3f1a2b7d-1598-4aef-b6d7-4e7fa8474c5d/games-textured-05-sweepa-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "05-sweep",
    variant: "a",
    energyRegion: "diagonal BL->C",
    quiet: ["top-left", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/fce45c30-e6f7-4f3e-b27c-5d17e446a5b2/games-textured-05-sweepb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "05-sweep",
    variant: "b",
    energyRegion: "diagonal BL->C",
    quiet: ["top-left", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/2de6cb7b-119a-4597-8d56-477c8a2b7fc8/games-textured-05-sweepc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "05-sweep",
    variant: "c",
    energyRegion: "diagonal BL->C",
    quiet: ["top-left", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/20e2ada9-154c-42e4-bf96-cce97282b796/games-textured-06-crowna-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "06-crown",
    variant: "a",
    energyRegion: "top",
    quiet: ["bottom", "bottom-left", "bottom-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/c1c39ce1-656d-480f-bc80-b78cdbf9e586/games-textured-06-crownb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "06-crown",
    variant: "b",
    energyRegion: "top",
    quiet: ["bottom", "bottom-left", "bottom-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/0eba6677-7f30-476f-a556-4d9772b2c4c3/games-textured-06-crownc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "06-crown",
    variant: "c",
    energyRegion: "top",
    quiet: ["bottom", "bottom-left", "bottom-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/ccc6dda2-bd36-4e0c-b3f3-58fa2b5e61e8/games-textured-07-bloom-lefta-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "07-bloom-left",
    variant: "a",
    energyRegion: "left of centre",
    quiet: ["right", "top-right", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/b367d1cd-184e-4ee6-81fb-97ce0e73f696/games-textured-07-bloom-leftb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "07-bloom-left",
    variant: "b",
    energyRegion: "left of centre",
    quiet: ["right", "top-right", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/cfc5036e-d7aa-49c2-8e00-7dd526761724/games-textured-07-bloom-leftc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "07-bloom-left",
    variant: "c",
    energyRegion: "left of centre",
    quiet: ["right", "top-right", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/8a9639d8-2f55-4636-a408-301dc373e89f/games-textured-08-columna-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "08-column",
    variant: "a",
    energyRegion: "left third",
    quiet: ["right", "center", "top-right", "bottom-right"],
    activity: "medium",
  },
  {
    url: `${CDN}/2e881c3f-2195-4ae5-b920-86f679b663b3/games-textured-08-columnb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "08-column",
    variant: "b",
    energyRegion: "left third",
    quiet: ["right", "center", "top-right", "bottom-right"],
    activity: "medium",
  },
  {
    url: `${CDN}/15ce044f-0b17-4152-bc1a-66f2f3243cdd/games-textured-08-columnc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "08-column",
    variant: "c",
    energyRegion: "left third",
    quiet: ["right", "center", "top-right", "bottom-right"],
    activity: "medium",
  },
  {
    url: `${CDN}/78fdec21-dbdf-48b0-9862-1d0a6e88c276/games-textured-09-deptha-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "09-depth",
    variant: "a",
    energyRegion: "lower left+right",
    quiet: ["top", "center"],
    activity: "medium",
  },
  {
    url: `${CDN}/40f568b2-5d59-4482-964b-cc9cd2551d39/games-textured-09-depthb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "09-depth",
    variant: "b",
    energyRegion: "lower left+right",
    quiet: ["top", "center"],
    activity: "medium",
  },
  {
    url: `${CDN}/97e0c38c-cc94-44dc-af9e-93796d6ebb7b/games-textured-09-depthc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "09-depth",
    variant: "c",
    energyRegion: "lower left+right",
    quiet: ["top", "center"],
    activity: "medium",
  },
  {
    url: `${CDN}/3b0d434c-bdf3-4c3c-b0f9-967d1e79d29d/games-textured-10-corner-massa-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "10-corner-mass",
    variant: "a",
    energyRegion: "bottom-right",
    quiet: ["top-left", "top", "left"],
    activity: "low",
  },
  {
    url: `${CDN}/70297116-34d8-4c6b-903a-1178d600a990/games-textured-10-corner-massb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "10-corner-mass",
    variant: "b",
    energyRegion: "bottom-right",
    quiet: ["top-left", "top", "left"],
    activity: "low",
  },
  {
    url: `${CDN}/56b89b2f-4c4b-422e-92ee-77547a2950e1/games-textured-10-corner-massc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "10-corner-mass",
    variant: "c",
    energyRegion: "bottom-right",
    quiet: ["top-left", "top", "left"],
    activity: "low",
  },
  {
    url: `${CDN}/b0e1a475-66a5-48ba-8abe-a17889e2f0bd/games-textured-11-strataa-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "11-strata",
    variant: "a",
    energyRegion: "lower centre band",
    quiet: ["top", "top-left", "top-right"],
    activity: "high",
  },
  {
    url: `${CDN}/aef5699c-ae69-4970-9d60-ab8f434b0275/games-textured-11-stratab-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "11-strata",
    variant: "b",
    energyRegion: "lower centre band",
    quiet: ["top", "top-left", "top-right"],
    activity: "high",
  },
  {
    url: `${CDN}/7ee19043-c947-4857-89a3-e7bca678de0a/games-textured-11-stratac-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "11-strata",
    variant: "c",
    energyRegion: "lower centre band",
    quiet: ["top", "top-left", "top-right"],
    activity: "high",
  },
  {
    url: `${CDN}/56445c15-9326-4502-87d9-abb321037e91/games-textured-12-corea-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "12-core",
    variant: "a",
    energyRegion: "right of centre",
    quiet: ["left", "top-left", "bottom-left"],
    activity: "medium",
  },
  {
    url: `${CDN}/216d113a-5e3d-495a-9116-36e66ba2fa0c/games-textured-12-coreb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "12-core",
    variant: "b",
    energyRegion: "right of centre",
    quiet: ["left", "top-left", "bottom-left"],
    activity: "medium",
  },
  {
    url: `${CDN}/91c23ab3-891e-4670-bf99-edbe3bb2a0db/games-textured-12-corec-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "12-core",
    variant: "c",
    energyRegion: "right of centre",
    quiet: ["left", "top-left", "bottom-left"],
    activity: "medium",
  },
  {
    url: `${CDN}/c124d364-8fcc-4f26-b368-83e4bb0e2f9e/games-textured-13-fall-lefta-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "13-fall-left",
    variant: "a",
    energyRegion: "top-left",
    quiet: ["bottom-right", "bottom", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/f84d86ea-1538-4925-94d6-e1f7ed81e392/games-textured-13-fall-leftb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "13-fall-left",
    variant: "b",
    energyRegion: "top-left",
    quiet: ["bottom-right", "bottom", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/c35e7847-87a7-4d64-9482-3a439967ee81/games-textured-13-fall-leftc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "13-fall-left",
    variant: "c",
    energyRegion: "top-left",
    quiet: ["bottom-right", "bottom", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/85d61081-1093-4640-95f0-cb6a1bddea4b/games-textured-14-husha-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "14-hush",
    variant: "a",
    energyRegion: "broad, low",
    quiet: ["any"],
    activity: "lowest",
  },
  {
    url: `${CDN}/25c6e50a-83d9-448f-af22-0ef1b6ad2179/games-textured-14-hushb-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "14-hush",
    variant: "b",
    energyRegion: "broad, low",
    quiet: ["any"],
    activity: "lowest",
  },
  {
    url: `${CDN}/8062377f-29f6-4ba0-ab92-318e199af43a/games-textured-14-hushc-dark.webp`,
    mode: "dark",
    texture: "textured",
    composition: "14-hush",
    variant: "c",
    energyRegion: "broad, low",
    quiet: ["any"],
    activity: "lowest",
  },
  {
    url: `${CDN}/71e36679-0ff7-437c-90e3-02b1cdd60f09/games-textured-01-risea-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "01-rise",
    variant: "a",
    energyRegion: "bottom-left",
    quiet: ["top-right", "top", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/455c0f02-c441-4fdf-b35a-75c54169bb01/games-textured-01-riseb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "01-rise",
    variant: "b",
    energyRegion: "bottom-left",
    quiet: ["top-right", "top", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/40a12879-a172-4e29-92b6-c410d53e3be6/games-textured-01-risec-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "01-rise",
    variant: "c",
    energyRegion: "bottom-left",
    quiet: ["top-right", "top", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/8d325128-4710-445a-8dfc-dabfed493bb6/games-textured-02-falla-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "02-fall",
    variant: "a",
    energyRegion: "top-right",
    quiet: ["bottom-left", "bottom", "left"],
    activity: "medium",
  },
  {
    url: `${CDN}/04890f48-6101-4b52-815a-fe85c2d81673/games-textured-02-fallb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "02-fall",
    variant: "b",
    energyRegion: "top-right",
    quiet: ["bottom-left", "bottom", "left"],
    activity: "medium",
  },
  {
    url: `${CDN}/b61c7ec3-da28-47ca-b0b5-a49fa5d6d354/games-textured-02-fallc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "02-fall",
    variant: "c",
    energyRegion: "top-right",
    quiet: ["bottom-left", "bottom", "left"],
    activity: "medium",
  },
  {
    url: `${CDN}/1851d441-a7dc-4b37-a4e8-3941b7298562/games-textured-03-horizona-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "03-horizon",
    variant: "a",
    energyRegion: "bottom",
    quiet: ["top", "top-left", "top-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/cc00ff1e-c64e-4148-a049-ad9727b36292/games-textured-03-horizonb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "03-horizon",
    variant: "b",
    energyRegion: "bottom",
    quiet: ["top", "top-left", "top-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/36158468-c195-4588-a1d0-b728fe66551a/games-textured-03-horizonc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "03-horizon",
    variant: "c",
    energyRegion: "bottom",
    quiet: ["top", "top-left", "top-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/9cdb14b2-47db-4e71-923d-0bf8d098c30b/games-textured-04-flanka-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "04-flank",
    variant: "a",
    energyRegion: "left+right edges",
    quiet: ["center"],
    activity: "medium",
  },
  {
    url: `${CDN}/5b71a9e2-b98d-4093-b2d8-eabb9eba58aa/games-textured-04-flankb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "04-flank",
    variant: "b",
    energyRegion: "left+right edges",
    quiet: ["center"],
    activity: "medium",
  },
  {
    url: `${CDN}/5c5a92f1-60af-4d54-9d39-45c649b642ef/games-textured-04-flankc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "04-flank",
    variant: "c",
    energyRegion: "left+right edges",
    quiet: ["center"],
    activity: "medium",
  },
  {
    url: `${CDN}/63830b99-d22a-47de-901a-b6430f638196/games-textured-05-sweepa-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "05-sweep",
    variant: "a",
    energyRegion: "diagonal BL->C",
    quiet: ["top-left", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/6a2a260c-73a5-4070-84f6-bd7f7ad317f7/games-textured-05-sweepb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "05-sweep",
    variant: "b",
    energyRegion: "diagonal BL->C",
    quiet: ["top-left", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/3fe062f4-f73f-4939-9981-6be64474e6ef/games-textured-05-sweepc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "05-sweep",
    variant: "c",
    energyRegion: "diagonal BL->C",
    quiet: ["top-left", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/5453af24-bca4-415e-aa46-0e63f1aad7e5/games-textured-06-crowna-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "06-crown",
    variant: "a",
    energyRegion: "top",
    quiet: ["bottom", "bottom-left", "bottom-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/9c719789-0dbf-4ca7-8de6-467c5a8cd6d2/games-textured-06-crownb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "06-crown",
    variant: "b",
    energyRegion: "top",
    quiet: ["bottom", "bottom-left", "bottom-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/c61ca948-d289-49ae-a323-aaf7921b51bd/games-textured-06-crownc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "06-crown",
    variant: "c",
    energyRegion: "top",
    quiet: ["bottom", "bottom-left", "bottom-right", "center"],
    activity: "low",
  },
  {
    url: `${CDN}/c49961b4-5915-4cd1-9bdf-2e0361f36418/games-textured-07-bloom-lefta-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "07-bloom-left",
    variant: "a",
    energyRegion: "left of centre",
    quiet: ["right", "top-right", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/7a929c73-2e13-4e78-96f4-9d59aa73a547/games-textured-07-bloom-leftb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "07-bloom-left",
    variant: "b",
    energyRegion: "left of centre",
    quiet: ["right", "top-right", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/8abdbe61-5ae1-47f4-9adb-ac310ddfe7f2/games-textured-07-bloom-leftc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "07-bloom-left",
    variant: "c",
    energyRegion: "left of centre",
    quiet: ["right", "top-right", "bottom-right"],
    activity: "high",
  },
  {
    url: `${CDN}/46b72469-d18c-4dfe-86c9-a66830ff77ed/games-textured-08-columna-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "08-column",
    variant: "a",
    energyRegion: "left third",
    quiet: ["right", "center", "top-right", "bottom-right"],
    activity: "medium",
  },
  {
    url: `${CDN}/0bcd5c27-2fcd-4fb1-9d49-86d5c913e649/games-textured-08-columnb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "08-column",
    variant: "b",
    energyRegion: "left third",
    quiet: ["right", "center", "top-right", "bottom-right"],
    activity: "medium",
  },
  {
    url: `${CDN}/1c2869c5-5d52-454d-85bb-13ccf126947a/games-textured-08-columnc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "08-column",
    variant: "c",
    energyRegion: "left third",
    quiet: ["right", "center", "top-right", "bottom-right"],
    activity: "medium",
  },
  {
    url: `${CDN}/11e651ef-75c0-4b17-8578-0478e3ebede9/games-textured-09-deptha-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "09-depth",
    variant: "a",
    energyRegion: "lower left+right",
    quiet: ["top", "center"],
    activity: "medium",
  },
  {
    url: `${CDN}/a143625f-4f3a-4819-a3c8-933c58355fd8/games-textured-09-depthb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "09-depth",
    variant: "b",
    energyRegion: "lower left+right",
    quiet: ["top", "center"],
    activity: "medium",
  },
  {
    url: `${CDN}/f57e46c4-d016-4abd-98f1-e80938c2a4bf/games-textured-09-depthc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "09-depth",
    variant: "c",
    energyRegion: "lower left+right",
    quiet: ["top", "center"],
    activity: "medium",
  },
  {
    url: `${CDN}/18d79c60-b537-4e36-9f24-9bafc5b17129/games-textured-10-corner-massa-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "10-corner-mass",
    variant: "a",
    energyRegion: "bottom-right",
    quiet: ["top-left", "top", "left"],
    activity: "low",
  },
  {
    url: `${CDN}/daf428c3-a0d2-4946-92b1-e2286643e91c/games-textured-10-corner-massb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "10-corner-mass",
    variant: "b",
    energyRegion: "bottom-right",
    quiet: ["top-left", "top", "left"],
    activity: "low",
  },
  {
    url: `${CDN}/a9bb3d4e-641e-46df-ad8f-517b5fe00c04/games-textured-10-corner-massc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "10-corner-mass",
    variant: "c",
    energyRegion: "bottom-right",
    quiet: ["top-left", "top", "left"],
    activity: "low",
  },
  {
    url: `${CDN}/21788f0a-c570-4584-81f2-2e272eaea2ba/games-textured-11-strataa-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "11-strata",
    variant: "a",
    energyRegion: "lower centre band",
    quiet: ["top", "top-left", "top-right"],
    activity: "high",
  },
  {
    url: `${CDN}/04921fb0-066c-447a-987b-5bcbcb1dc6d5/games-textured-11-stratab-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "11-strata",
    variant: "b",
    energyRegion: "lower centre band",
    quiet: ["top", "top-left", "top-right"],
    activity: "high",
  },
  {
    url: `${CDN}/f13bdb37-b732-447d-9bbf-871c1b4ff72c/games-textured-11-stratac-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "11-strata",
    variant: "c",
    energyRegion: "lower centre band",
    quiet: ["top", "top-left", "top-right"],
    activity: "high",
  },
  {
    url: `${CDN}/1977ce5b-b460-4260-9901-a900c41314ee/games-textured-12-corea-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "12-core",
    variant: "a",
    energyRegion: "right of centre",
    quiet: ["left", "top-left", "bottom-left"],
    activity: "medium",
  },
  {
    url: `${CDN}/179293bb-6eb6-4e7d-bd07-e13592a7c130/games-textured-12-coreb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "12-core",
    variant: "b",
    energyRegion: "right of centre",
    quiet: ["left", "top-left", "bottom-left"],
    activity: "medium",
  },
  {
    url: `${CDN}/58ce4910-88b0-4e04-8d65-320366087b82/games-textured-12-corec-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "12-core",
    variant: "c",
    energyRegion: "right of centre",
    quiet: ["left", "top-left", "bottom-left"],
    activity: "medium",
  },
  {
    url: `${CDN}/d1750211-4d3c-421a-820c-d3d1bbb7467d/games-textured-13-fall-lefta-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "13-fall-left",
    variant: "a",
    energyRegion: "top-left",
    quiet: ["bottom-right", "bottom", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/273b61b2-1ed1-47a6-8a40-613b92567060/games-textured-13-fall-leftb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "13-fall-left",
    variant: "b",
    energyRegion: "top-left",
    quiet: ["bottom-right", "bottom", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/02593d8e-ccc1-4d5d-8885-4e30fc446fcf/games-textured-13-fall-leftc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "13-fall-left",
    variant: "c",
    energyRegion: "top-left",
    quiet: ["bottom-right", "bottom", "right"],
    activity: "medium",
  },
  {
    url: `${CDN}/f5c5d2bb-d532-4b32-a93a-5ef01e7e9695/games-textured-14-husha-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "14-hush",
    variant: "a",
    energyRegion: "broad, low",
    quiet: ["any"],
    activity: "lowest",
  },
  {
    url: `${CDN}/57cdb53f-2639-40b0-b339-fab1d7fdf023/games-textured-14-hushb-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "14-hush",
    variant: "b",
    energyRegion: "broad, low",
    quiet: ["any"],
    activity: "lowest",
  },
  {
    url: `${CDN}/430b951a-80c7-4e7b-a00d-079ef45edeb2/games-textured-14-hushc-light.webp`,
    mode: "light",
    texture: "textured",
    composition: "14-hush",
    variant: "c",
    energyRegion: "broad, low",
    quiet: ["any"],
    activity: "lowest",
  },
];

export const GAMES_SUBJECTS: { id: string; url: string }[] = [
  {
    id: "duo-keyboard",
    url: `${CDN}/cfa9c605-7bb3-4f6d-80b6-034d2dd2fd47/games-subject-duo-keyboard.png`,
  },
  {
    id: "friends-couch-gaming",
    url: `${CDN}/4b805436-1208-4e3e-bdd9-4120ce5ed03a/games-subject-friends-couch-gaming.png`,
  },
  {
    id: "gaming-chair",
    url: `${CDN}/e83d8d54-5f8c-4947-b7a4-1b8d4ad0c929/games-subject-gaming-chair.png`,
  },
  {
    id: "hooded-figure",
    url: `${CDN}/c23c4cdf-de5b-402c-9bf9-c96859511db5/games-subject-hooded-figure.png`,
  },
  {
    id: "man-headset-speaking",
    url: `${CDN}/d27f8a6b-d18b-4ba1-a776-05f6f16a1808/games-subject-man-headset-speaking.png`,
  },
  {
    id: "player-controller-reaching",
    url: `${CDN}/5eb5bb5e-2fdb-4ab5-8b61-caa61f127bf4/games-subject-player-controller-reaching.png`,
  },
  {
    id: "player-peace-sign",
    url: `${CDN}/1fb58a81-3142-44ed-b59f-9a41fd592728/games-subject-player-peace-sign.png`,
  },
  {
    id: "players-group-seated",
    url: `${CDN}/c857914b-aaba-4306-8931-4e6e8d3c5f6b/games-subject-players-group-seated.png`,
  },
  {
    id: "sim-rig-driver",
    url: `${CDN}/206f568c-ebf0-4703-b256-3b3d0b805054/games-subject-sim-rig-driver.png`,
  },
  {
    id: "voice-actor-mic",
    url: `${CDN}/bb46d924-24cb-4a3d-a6c4-c15a4010be78/games-subject-voice-actor-mic.png`,
  },
  {
    id: "vr-headset-player",
    url: `${CDN}/ddaa7d1b-bbb5-418f-a6c3-af010b6fd0a0/games-subject-vr-headset-player.png`,
  },
  {
    id: "woman-laptop",
    url: `${CDN}/683550a6-e1a7-4836-8003-a8974b3dd890/games-subject-woman-laptop.png`,
  },
];

const ACTIVITY_RANK: Record<GamesActivity, number> = {
  lowest: 0,
  low: 1,
  medium: 2,
  high: 3,
  highest: 4,
};

/** Where a scene's copy sits, and how loud a plate it can carry. */
const SCENE_BRIEF: Record<SkinScene, { copy: GamesRegion[]; loud: boolean }> = {
  cover: { copy: ["bottom-left", "left", "bottom"], loud: true },
  section: { copy: ["center", "left"], loud: true },
  statement: { copy: ["center", "left"], loud: true },
  agenda: { copy: ["left", "top-left", "bottom-left"], loud: false },
  stats: { copy: ["center", "bottom", "top"], loud: false },
  split: { copy: ["left", "top-left", "bottom-left"], loud: false },
  bento: { copy: ["center", "right", "left"], loud: false },
  chart: { copy: ["center", "bottom", "right"], loud: false },
  quote: { copy: ["center", "left"], loud: true },
  timeline: { copy: ["center", "bottom", "top"], loud: false },
  closing: { copy: ["center", "bottom-left"], loud: true },
};

/** Which skin/recipe codes paint from this kit, and in which tonality. */
export const GAMES_ART_MODE: Record<string, GamesArtMode> = {
  R22: "dark",
};

export function hasGamesSceneArt(code: string | null | undefined): boolean {
  return !!code && !!GAMES_ART_MODE[code.toUpperCase()];
}

/**
 * Rank the plates for one scene: quiet-region coverage first, then activity fit,
 * so the ordering is deterministic and screen matches export.
 */
export function gamesPlatesForScene(scene: SkinScene, mode: GamesArtMode): GamesPlate[] {
  const brief = SCENE_BRIEF[scene] ?? SCENE_BRIEF.statement;
  const scored = GAMES_PLATES.filter((p) => p.mode === mode).map((p) => {
    const covered = brief.copy.filter((rg) =>
      p.quiet.some((q) => q === rg || q === "any" || q.includes(rg)),
    ).length;
    // Content scenes still want a composed plate, just not a flat field: the
    // old target of "low" activity pulled the near-plain flats to the top and
    // every content slide wore a bare navy ground.
    const want = brief.loud ? 4 : 2;
    const activityGap = Math.abs(ACTIVITY_RANK[p.activity] - want);
    // Textured compositions are the visual kit; flats are the fallback ground.
    const textureBonus = p.texture === "textured" ? 4 : 0;
    return { p, score: covered * 10 + textureBonus - activityGap };
  });
  scored.sort(
    (x, y) =>
      y.score - x.score ||
      x.p.composition.localeCompare(y.p.composition) ||
      x.p.variant.localeCompare(y.p.variant),
  );
  return scored.map((s) => s.p);
}

/** Stable small hash so each scene starts at a different point in the pool. */
function sceneOffset(scene: string): number {
  let h = 0;
  for (let i = 0; i < scene.length; i += 1) h = (h * 31 + scene.charCodeAt(i)) % 9973;
  return h;
}

/** The plate for one scene, rotating variants by `take`. */
export function gamesScenePlate(scene: SkinScene, mode: GamesArtMode, take = 0): GamesPlate | null {
  const pool = gamesPlatesForScene(scene, mode);
  if (!pool.length) return null;
  // Scene ranking often produces the same top plate for several scenes, which
  // made a whole deck wear two or three images. Offsetting the index by the
  // scene name spreads the deck across the kit while staying deterministic.
  const window = Math.min(pool.length, 10);
  const idx = (Math.abs(take) + sceneOffset(scene)) % window;
  return pool[idx] ?? pool[0]!;
}

export function gamesSceneArtUrl(
  code: string | null | undefined,
  scene: SkinScene,
  take = 0,
): string | null {
  const mode = code ? GAMES_ART_MODE[code.toUpperCase()] : undefined;
  if (!mode) return null;
  return gamesScenePlate(scene, mode, take)?.url ?? null;
}

/** Wrap a pack so the authored Games plate paints as its ground. */
export function withGamesSceneArt(pack: StylePack, code: string): StylePack {
  const mode = code ? GAMES_ART_MODE[code.toUpperCase()] : undefined;
  if (!mode) return pack;
  const base = pack.ground;
  // The plates are finished compositions, so the veil only needs to hold copy
  // contrast — heavier values flattened the art back into a flat navy field.
  const veil =
    mode === "dark"
      ? "linear-gradient(0deg, rgba(3,0,44,0.20), rgba(3,0,44,0.20))"
      : "linear-gradient(0deg, rgba(255,255,255,0.26), rgba(255,255,255,0.26))";
  const scrim =
    mode === "dark"
      ? "linear-gradient(100deg, rgba(3,0,44,0.46) 0%, rgba(3,0,44,0.10) 56%, rgba(3,0,44,0) 100%)"
      : "linear-gradient(100deg, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0.12) 56%, rgba(255,255,255,0) 100%)";
  return {
    ...pack,
    ground: (seed: string) => {
      const scene = sceneFromSeed(seed);
      const custom = overrideFor(code, scene);
      if (custom?.imageUrl) return base(seed);
      const takeMatch = /take:(\d+)/i.exec(seed);
      const take = takeMatch ? parseInt(takeMatch[1]!, 10) : 0;
      const url = gamesSceneArtUrl(code, scene, take);
      if (!url) return base(seed);
      return [scrim, veil, `url("${url}") center center / cover no-repeat`];
    },
  };
}

/**
 * MEDIA POOL — the plates a slide-level MediaTile (covers, split/full-bleed
 * imagery) draws from for the Games brand mode. Slide media used to fall back
 * to the generic TP dark gradient set, which made Gaming title slides read as
 * plain navy instead of wearing the authored kit. Loud textured compositions
 * come first (a cover wants energy), calmer flats after.
 */
export function gamesMediaPool(mode: GamesArtMode = "dark"): string[] {
  const inMode = GAMES_PLATES.filter((p) => p.mode === mode);
  const textured = inMode.filter((p) => p.texture === "textured");
  const loud = textured.filter((p) => ACTIVITY_RANK[p.activity] >= ACTIVITY_RANK.medium);
  // Flat plates are near-plain grounds: correct behind dense copy, but as a
  // slide-level photograph they read as a blank navy field, which is exactly
  // what made the Gaming title slides look empty. Media uses the textured
  // compositions only.
  // Highest-energy compositions first: a cover or full-bleed wants the loudest
  // plate in the kit, not the quietest textured one.
  const ranked = [...(loud.length ? loud : textured.length ? textured : inMode)].sort(
    (a, b) => ACTIVITY_RANK[b.activity] - ACTIVITY_RANK[a.activity],
  );
  const ordered = ranked;
  return ordered.map((p) => p.url);
}
