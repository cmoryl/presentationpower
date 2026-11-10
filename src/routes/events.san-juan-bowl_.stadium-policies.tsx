import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
// /events/san-juan-bowl/stadium-policies — public stadium policy poster (EN + ES),
// refreshed manually from the live Canva design with AI export metadata stripped.
import { createFileRoute } from "@tanstack/react-router";
import pdf from "@/assets/san-juan-bowl/policies/policies-en-es.pdf.asset.json";
import en from "@/assets/san-juan-bowl/policies/policies-en.png.asset.json";
import es from "@/assets/san-juan-bowl/policies/policies-es.png.asset.json";
import { Button } from "@/design-system/element";

export const Route = createFileRoute("/events/san-juan-bowl_/stadium-policies")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl stadium policies · TransPerfect Element" },
      { name: "description", content: "Stadium policies for the TransPerfect San Juan Bowl in English and Spanish, with poster downloads." },
      { property: "og:title", content: "San Juan Bowl stadium policies" },
      { property: "og:description", content: "Prohibited items, bag and smoking policies for the San Juan Bowl, in English and Spanish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withSjbTrail(PoliciesPage),
});

const PAGES = [
  { label: "English", img: en, file: "sjb-stadium-policies-en.png" },
  { label: "Español", img: es, file: "sjb-stadium-policies-es.png" },
];

function PoliciesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-foreground">San Juan Bowl stadium policies</h1>
      <p className="mt-2 text-muted-foreground">Latest poster from the live Canva design, in English and Spanish.</p>
      <div className="mt-4">
        <Button asChild>
          <a href={pdf.url} download="sjb-stadium-policies-en-es.pdf">Download PDF (both languages)</a>
        </Button>
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {PAGES.map((p) => (
          <figure key={p.label} className="space-y-3">
            <a href={p.img.url} target="_blank" rel="noreferrer">
              <img src={p.img.url} alt={`Stadium policies poster, ${p.label}`} className="w-full rounded border border-border" />
            </a>
            <figcaption className="flex items-center justify-between">
              <span className="font-medium">{p.label}</span>
              <Button variant="outline" size="sm" asChild>
                <a href={p.img.url} download={p.file}>Download PNG</a>
              </Button>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
