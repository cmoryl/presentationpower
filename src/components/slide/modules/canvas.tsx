import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, s } from "../module-kit";

// Deliberately empty ground: canvas blocks supply the authored artwork.
registerSlideModule({
  id: "family:canvas", variantIds: ["MV-CANVAS-BLANK"],
  render: ({ brand, pageNumber, c }) => (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      {c.title ? <SlideTitle brand={brand} title={s(c.title, "")} /> : null}
    </SlideFrame>
  ),
});