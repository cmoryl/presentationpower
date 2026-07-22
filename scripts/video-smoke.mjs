// Headless smoke test for demo video assets.
//
// Verifies that every clip referenced by src/lib/video-slide-examples.ts
// resolves (200/206) over the network, and that /library loads without
// throwing. Run against a dev/preview server:
//
//   BASE_URL=http://localhost:8080 node scripts/video-smoke.mjs
//
// Exits non-zero on any failed asset.

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

const W3 = "https://media.w3.org/2010/05";
const CLIPS = [
  { v: `${W3}/sintel/trailer.mp4`, p: `${W3}/sintel/poster.png` },
  { v: `${W3}/bunny/trailer.mp4`, p: `${W3}/bunny/poster.png` },
  { v: `${W3}/bunny/movie.mp4`, p: `${W3}/bunny/poster.png` },
  { v: `${W3}/video/movie_300.mp4`, p: `${W3}/video/poster.png` },
];

const failures = [];

async function head(url) {
  const res = await fetch(url, { headers: { Range: "bytes=0-1024" } });
  const ok = res.status === 200 || res.status === 206;
  console.log(`${ok ? "OK  " : "FAIL"} ${res.status} ${url}`);
  if (!ok) failures.push({ url, status: res.status });
}

for (const { v, p } of CLIPS) {
  await head(v);
  await head(p);
}

// Sanity-check the library route renders without a 5xx
try {
  const res = await fetch(`${BASE_URL}/library`);
  const ok = res.status < 500;
  console.log(`${ok ? "OK  " : "FAIL"} ${res.status} ${BASE_URL}/library`);
  if (!ok) failures.push({ url: `${BASE_URL}/library`, status: res.status });
} catch (e) {
  console.log(`FAIL ${BASE_URL}/library — ${e instanceof Error ? e.message : e}`);
  failures.push({ url: `${BASE_URL}/library`, status: 0 });
}

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`, failures);
  process.exit(1);
}
console.log("\nAll demo video/poster assets return 200/206.");
