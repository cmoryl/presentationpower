type Ptr = { url: string };
const all = import.meta.glob<Ptr>("@/assets/sjb-shirts/*.asset.json", { eager: true, import: "default" });
const items = Object.entries(all).map(([p, v]) => ({ name: (p.split("/").pop() ?? p).replace(/\.jpg\.asset\.json$/, ""), url: v.url })).sort((a, b) => a.name.localeCompare(b.name));
const studioAssets = import.meta.glob<Ptr>("@/assets/sjb-shirt-studio/studio-*.asset.json", { eager: true, import: "default" });
const studioBySet = new Map(Object.entries(studioAssets).map(([path, value]) => [
  (path.split("/").pop() ?? path).replace(/^studio-/, "").replace(/\.jpg\.asset\.json$/, ""), value.url,
]));
const label = (n: string) =>
  n
    .replace(/^(role|distressed|colour|set|design)-/, "")
    .replace(/^(\d\d)-/, "Design $1 · ")
    .replace(/-front-/, " front · ")
    .replace(/-v7$/, "")
    .replace(/-back$/, " back")
    .replace(/-/g, " ");

function Grid({ list, cols }: { list: typeof items; cols: string }) {
  return (
    <div className={`mt-4 grid gap-4 ${cols}`}>
      {list.map((i) => (
        <figure key={i.name}>
          <a href={i.url} target="_blank" rel="noreferrer"><img src={i.url} alt={label(i.name)} loading="lazy" className="w-full rounded-md bg-muted" /></a>
          <figcaption className="mt-1 text-xs capitalize text-muted-foreground">{label(i.name)}</figcaption>
        </figure>
      ))}
    </div>
  );
}

// "Worn at the game" photos are hidden on the page for now (assets and grouping
// stay in place so the section can be switched back on).
const SHOW_PEOPLE = false;

export function SjbShirtPhotos() {
  const people = items.filter((i) => /^(man|woman|kid|pair|dad)-/.test(i.name));
  const distressed = items.filter((i) => i.name.startsWith("distressed-"));
  const colours = items.filter((i) => i.name.startsWith("colour-"));
  const roles = items.filter((i) => i.name.startsWith("role-"));
  const sets = items.filter((i) => i.name.startsWith("set-"));
  const flats = items.filter((i) => i.name.startsWith("design-"));
  return (
    <div className="mt-8 space-y-12">
      {SHOW_PEOPLE && (
        <section aria-labelledby="sjb-on-people">
          <h2 id="sjb-on-people" className="text-xl font-semibold text-foreground">Worn at the game</h2>
          <p className="text-sm text-muted-foreground">Example scenes: the shirt artwork is the exact Canva design and official logo files, printed onto the fabric with its folds, lighting and texture; the people and stadium are AI-made, not event photos.</p>
          <Grid list={people} cols="sm:grid-cols-2 lg:grid-cols-4" />
        </section>
      )}
      <section aria-labelledby="sjb-front-back">
        <h2 id="sjb-front-back" className="text-xl font-semibold text-foreground">Front and back sets — men, women and kids</h2>
        <p className="text-sm text-muted-foreground">Fronts mix the full-colour shield, the distressed colour shield, the white shield and the wordmark, at centre chest or left chest; the larger designs go on the back.</p>
        <div className="mt-4 space-y-8">
          {sets.map((set) => {
            const studio = studioBySet.get(set.name);
            return (
              <section key={set.name} aria-label={label(set.name)} className="border-b border-border pb-8">
                <h3 className="mb-3 text-sm font-medium capitalize text-foreground">{label(set.name)}</h3>
                <div className="grid items-start gap-4 lg:grid-cols-2">
                  <figure>
                    <a href={set.url} target="_blank" rel="noreferrer"><img src={set.url} alt={`${label(set.name)} — flat front and back`} loading="lazy" className="w-full rounded-md bg-muted" /></a>
                    <figcaption className="mt-1 text-xs text-muted-foreground">Front and back artwork</figcaption>
                  </figure>
                  {studio && <figure>
                    <a href={studio} target="_blank" rel="noreferrer"><img src={studio} alt={`${label(set.name)} — man, woman and child; fronts above, backs below`} loading="lazy" width={1920} height={1280} className="w-full rounded-md bg-muted" /></a>
                    <figcaption className="mt-1 text-xs text-muted-foreground">Studio comp · Man / woman / child · Fronts above, backs below · AI-made models</figcaption>
                  </figure>}
                </div>
              </section>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="sjb-colours">
        <h2 id="sjb-colours" className="text-xl font-semibold text-foreground">More shirt colours — royal blue, gold, heather grey, sky blue</h2>
        <p className="text-sm text-muted-foreground">Light shirts carry the full-colour or one-colour navy shield; dark shirts carry the white-outline colour shield.</p>
        <Grid list={colours} cols="md:grid-cols-2" />
      </section>
      <section aria-labelledby="sjb-distressed">
        <h2 id="sjb-distressed" className="text-xl font-semibold text-foreground">Distressed full-colour logo — football jersey and tees</h2>
        <p className="text-sm text-muted-foreground">Page 11 of the Canva shirt file, unchanged. Puerto Rico–style replica game jersey in Bowl Navy, Banner Gold and Caribbean Sky (striped sleeves, gold collar, lone-star sleeve flag) with the Bowl patch on the chest, large raised number 26, SAN JUAN nameplate and ACC / Sun Belt sleeve marks (example number and name, not an issued jersey), plus men's, women's and kids' tees.</p>
        <Grid list={distressed} cols="md:grid-cols-2" />
      </section>
      <section aria-labelledby="sjb-role-tees">
        <h2 id="sjb-role-tees" className="text-xl font-semibold text-foreground">Basic team shirts — staff, volunteer, crew, media, VIP</h2>
        <p className="text-sm text-muted-foreground">Small one-colour shield on the left chest; role word and SANJUANBOWL.COM on the back; Media carries MEDIA on the chest, and VIP carries the colour shield front with the distressed shield on the back.</p>
        <Grid list={roles} cols="md:grid-cols-2" />
      </section>
      <section aria-labelledby="sjb-flat-fronts">
        <h2 id="sjb-flat-fronts" className="text-xl font-semibold text-foreground">Every design on a shirt front</h2>
        <Grid list={flats} cols="sm:grid-cols-3 lg:grid-cols-5" />
      </section>
    </div>
  );
}
