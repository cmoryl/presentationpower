import pdf from "@/assets/sf-issued/maps.pdf.asset.json";
import illustrator from "@/assets/sf-issued/maps.ai.asset.json";
import third from "@/assets/sf-issued/floor-3.png.asset.json";
import upper from "@/assets/sf-issued/floors-4-5.png.asset.json";

export const SF_ISSUED_MAPS = {
  pdf: pdf.url,
  illustrator: illustrator.url,
  pages: [
    { id: "3", title: "Third floor", src: third.url, floors: [3] },
    { id: "4-5", title: "Fourth & fifth floors", src: upper.url, floors: [4, 5] },
  ],
};