/** Card pictures for the NEXT demo booths: left side, front and right side together (proofs from the live editor). */
const CARDS = import.meta.glob<{ url: string }>("../assets/next-demo-booth/cards/*.jpg.asset.json", { eager: true, import: "default" });

export function demoBoothCardUrl(signId: string): string | undefined {
  return CARDS[`../assets/next-demo-booth/cards/${signId}.jpg.asset.json`]?.url;
}
