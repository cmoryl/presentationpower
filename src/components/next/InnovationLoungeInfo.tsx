// The Innovation Lounge product write-ups, printed under the stage schedule.
//
// Reference copy: every word here is the issued write-up, so nothing is
// shortened or rephrased on screen. A product on the schedule with no approved
// write-up is named honestly rather than filled with invented copy.

import {
  INNOVATION_LOUNGE_DAY_ONE,
  INNOVATION_LOUNGE_DAY_TWO,
  INNOVATION_LOUNGE_PRODUCTS,
  innovationLoungeProduct,
} from "@/lib/next-innovation-lounge";

/** Products on the schedule with no write-up issued yet. */
function missingWriteUps(): string[] {
  const scheduled = [...INNOVATION_LOUNGE_DAY_ONE, ...INNOVATION_LOUNGE_DAY_TWO]
    .filter((s) => !s.muted)
    .map((s) => s.title.trim());
  const unique = Array.from(new Set(scheduled));
  return unique.filter((title) => !innovationLoungeProduct(title));
}

export function InnovationLoungeInfo() {
  const missing = missingWriteUps();

  return (
    <section className="mt-10 rounded-xl border border-black/10 bg-white/70 p-6">
      <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
        On the Innovation Lounge stage
      </h2>
      <p className="mt-1 max-w-[70ch] text-sm text-black/60">
        The demonstrations running in the lounge across both days, with the approved description and
        presenters for each. This is the reference copy for the schedule above — use it word for word
        in signage, programmes and listings.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {INNOVATION_LOUNGE_PRODUCTS.map((p) => (
          <article key={p.product} className="rounded-lg border border-black/10 bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#003FC7]">
              {p.product}
            </h3>
            <p className="mt-1 text-base font-medium leading-snug text-[#03002C]">{p.tagline}</p>
            <p className="mt-2 text-sm leading-[1.5] text-black/70">{p.body}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.06em] text-black/55">
              Presenters: <span className="normal-case text-black/75">{p.presenters}</span>
            </p>
          </article>
        ))}
      </div>

      {missing.length ? (
        <p className="mt-4 text-xs text-black/60">
          No description has been issued yet for {missing.join(", ")} — the schedule keeps the slot,
          and the write-up goes in once it is supplied.
        </p>
      ) : null}
    </section>
  );
}
