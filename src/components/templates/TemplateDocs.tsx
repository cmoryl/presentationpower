// Written documentation for the Template Studio: the runbook admins follow, a
// field reference, and the QA/testing checklist.

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "1 · Pick a geometry base",
    body: "Every template inherits card shapes, motif family and page layout from one catalog code (S01–S28 or an industry signature R01–R30). Choose the base whose structure is closest to what you want; you will change colour, type and surface next, not the bones.",
  },
  {
    title: "2 · Set the five-stop palette",
    body: "Field is the page colour, Ink is the reading colour, Accent drives rules, figures and kickers, Accent alt is second-order marks and grounds, Support is the quiet plate colour. Hex only — exports need a flat field to write a native slide background.",
  },
  {
    title: "3 · Describe type, surface and imagery",
    body: "Typography character sets display weight, case and tracking. Surface treatment accepts glass, flat, paper, outline, raised or slab and picks the card recipe. Imagery direction and density tune crops and how busy the ground is allowed to be.",
  },
  {
    title: "4 · Read the live preview",
    body: "Cover, stats and chart sections render with real slide furniture. If the kicker disappears or the headline fights the ground, adjust the accent or drop the density before going further.",
  },
  {
    title: "5 · Run the readiness suite",
    body: "The suite is always live under the form. Warnings are judgement calls; failures block publishing. Fix failures, then Save draft to keep working or Publish to release.",
  },
  {
    title: "6 · Publish",
    body: "Publishing makes the template selectable everywhere a look can be chosen — module library, the presentation agent, deck editor, present and share links, and PowerPoint export. Drafts stay admin-only.",
  },
  {
    title: "7 · Tune backgrounds (any template)",
    body: "The Backgrounds tab edits the section backgrounds of your templates and of all catalog looks. Pick the template and the section, then adjust intensity, tint, swap in another section's composition, or point at a backdrop image. Save writes one override; Revert to authored deletes it.",
  },
];

const FIELDS: Array<[string, string]> = [
  ["Code", "2–12 characters, letters, numbers and dashes. Becomes the pack id (tpl-<code>) and must be unique."],
  ["Name / Reference", "Shown in every picker. Reference names what the look is drawn from so reviewers can name what they like."],
  ["Description", "One line. The presentation agent reads it when it recommends looks, so write it in terms of the story it suits."],
  ["Best fit", "Industries and objectives, separated by middots."],
  ["Mode", "Light or dark. Must agree with the page field's luminance — the suite checks this."],
  ["Density", "Low, Medium or High. Drives corner radius and how much ground pattern survives."],
  ["Notes", "Internal usage rules. Never rendered on a slide."],
];

const OVERRIDES: Array<[string, string]> = [
  ["Intensity", "0 flattens the ground toward the page field, 1 is exactly as authored, 2 double-strikes the same geometry for a punchier read. Geometry never changes, so readability zones stay intact."],
  ["Tint / strength", "A colour veil over the ground — use for brand passes and warm/cool shifts. Keep strength under 0.25 on text-heavy sections."],
  ["Section swap", "Paints another section's composition on this one, e.g. give a stats page the cover's mass."],
  ["Backdrop image", "Painted behind the CSS layers, cover-fitted. Use the generated backdrop library paths or any absolute URL."],
];

const QA: string[] = [
  "Body contrast at or above 4.5:1 and accent at or above 3:1 on the page field.",
  "Every one of the 11 sections paints background layers — the suite fails if any come back empty.",
  "Cover, stats and chart previews keep kicker, headline and figures legible.",
  "After publishing, open the module library, switch to the new template and scan a dozen modules for collisions.",
  "Export one deck to PowerPoint and confirm the page field arrives as a native background and text stays editable.",
  "For background overrides, compare the Authored and With your edits panes side by side before saving.",
  "Revert to authored is always available — an override can never permanently alter a catalog look.",
];

export function TemplateDocs() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-white/5">
        <h2 className="text-lg font-semibold">Step-by-step runbook</h2>
        <ol className="mt-4 space-y-4">
          {STEPS.map((s) => (
            <li key={s.title}>
              <h3 className="text-sm font-medium">{s.title}</h3>
              <p className="mt-1 text-sm text-black/65 dark:text-white/65">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="space-y-6">
        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-white/5">
          <h2 className="text-lg font-semibold">Field reference</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {FIELDS.map(([k, v]) => (
              <div key={k}>
                <dt className="font-medium">{k}</dt>
                <dd className="text-black/65 dark:text-white/65">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-white/5">
          <h2 className="text-lg font-semibold">Background controls</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {OVERRIDES.map(([k, v]) => (
              <div key={k}>
                <dt className="font-medium">{k}</dt>
                <dd className="text-black/65 dark:text-white/65">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-white/5">
          <h2 className="text-lg font-semibold">Testing checklist</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-black/70 dark:text-white/70">
            {QA.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
