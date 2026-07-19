// Fine film-grain overlay shared by imagery layers (MediaTile / HeroScrim)
// and by non-photo backdrops (SlideChrome default grounds). One data-URI SVG
// turbulence tile, cached once by the browser and reused everywhere so the
// abstract and photographic grammars share the same tactile finish.
export const GRAIN_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
