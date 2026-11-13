type Ptr = { url: string };
const all = import.meta.glob<Ptr>("@/assets/sjb-shirts/*.asset.json", { eager: true, import: "default" });
const items = Object.entries(all).map(([p, v]) => ({ name: p.split("/").pop()!.replace(/\.jpg\.asset\.json$/, ""), url: v.url })).sort((a, b) => a.name.localeCompare(b.name));
const label = (n: string) => n.replace(/^role-/, "").replace(/^sjb-shirt-/, "Shirt ").replace(/-pair$/, "").replace(/-/g, " ");

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

export function SjbShirtPhotos() {
  const people = items.filter((i) => /^(man|woman|kid)-/.test(i.name) && !i.name.endsWith("-pair"));
  const roles = items.filter((i) => i.name.startsWith("role-"));
  const pairs = items.filter((i) => i.name.endsWith("-pair") && !i.name.startsWith("role-"));
  const flats = items.filter((i) => i.name.startsWith("sjb-shirt-"));
  return (
    <div className="mt-8 space-y-12">
      <section aria-labelledby="sjb-on-people">
        <h2 id="sjb-on-people" className="text-xl font-semibold text-foreground">Worn at the game</h2>
        <p className="text-sm text-muted-foreground">Example scenes: the shirt artwork is the exact Canva design; the people and stadium are AI-made, not event photos.</p>
        <Grid list={people} cols="sm:grid-cols-2 lg:grid-cols-4" />
      </section>
      <section aria-labelledby="sjb-role-tees">
        <h2 id="sjb-role-tees" className="text-xl font-semibold text-foreground">Basic team shirts — staff, volunteer, crew, media, VIP</h2>
        <p className="text-sm text-muted-foreground">Small one-colour shield on the chest; role word and SANJUANBOWL.COM on the back; Media carries MEDIA on the chest (VIP carries the large shield instead).</p>
        <Grid list={roles} cols="md:grid-cols-2" />
      </section>
      <section aria-labelledby="sjb-front-back">
        <h2 id="sjb-front-back" className="text-xl font-semibold text-foreground">Front and back sets — men, women and kids</h2>
        <p className="text-sm text-muted-foreground">One-colour chest logo on the front, the larger full-colour design on the back.</p>
        <Grid list={pairs} cols="md:grid-cols-2" />
      </section>
      <section aria-labelledby="sjb-flat-fronts">
        <h2 id="sjb-flat-fronts" className="text-xl font-semibold text-foreground">All ten designs</h2>
        <Grid list={flats} cols="sm:grid-cols-3 lg:grid-cols-5" />
      </section>
    </div>
  );
}
