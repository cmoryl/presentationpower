import asset from "../src/assets/next-london-signage-artwork.json.asset.json";
const res = await fetch("http://localhost:8080" + asset.url);
console.log(res.status, res.headers.get("content-type"));
const t = await res.text();
console.log(t.length, t.slice(0,120));
