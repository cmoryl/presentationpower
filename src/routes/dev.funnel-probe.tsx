import { createFileRoute } from "@tanstack/react-router";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";

export const Route = createFileRoute("/dev/funnel-probe")({
  head: () => ({ meta: [{ title: "Funnel probe" }] }),
  component: Probe,
});

const CONTENT = {
  title: "Where content is lost between HQ and Global bank's markets",
  items: [
    { label: "Content produced at HQ", note: "Original creative in source language", value: "100", unit: "%" },
    { label: "Translated on time", note: "Rest slips a full cycle", value: "68", unit: "%" },
    { label: "Reviewed in-market", note: "Local voice check", value: "44", unit: "%" },
    { label: "Published on brand", note: "Meeting compliance + tone", value: "31", unit: "%" },
  ],
};

function Probe() {
  const variant = MODULE_VARIANTS.find((v) => v.id === "MV-FUNNEL")!;
  const brand = BRAND_MODES[0];
  return (
    <div style={{ width: 1920, height: 1080, transform: "scale(0.66)", transformOrigin: "top left" }}>
      <VariantRenderer
        slide={{ id: "p1", variantId: "MV-FUNNEL", layoutId: "LF-32", content: CONTENT } as never}
        variant={variant}
        brand={brand}
        pageNumber={1}
        mode="light"
      />
    </div>
  );
}
