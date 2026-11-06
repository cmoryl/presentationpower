import type { BrandMode } from "@/lib/taxonomy";
import type { ModuleRenderArgs } from "./module-registry";
import { SlideFrame, s } from "./module-kit";
import { MediaTile } from "./module-primitives";
import { Kicker, DisplayTitle, SupportingText, MetaRow, StatFigure } from "./primitives";

export interface SpectrumPhotoLayoutProps {
  brand: BrandMode;
  pageNumber: number;
  content: ModuleRenderArgs["c"];
}

/** Approved framed-photo layout for legacy full-bleed variants in Spectrum. */
export function SpectrumPhotoLayout({ brand, pageNumber, content: c }: SpectrumPhotoLayoutProps) {
  const body = s(c.body) || s(c.subtitle) || s(c.quote);
  return (
    <SlideFrame brand={brand} pageNumber={pageNumber}>
      <div className="grid h-full min-h-0 grid-cols-2 items-center gap-12">
        <div className="flex min-w-0 flex-col gap-8">
          <Kicker brand={brand}>{s(c.kicker) || s(c.clientName)}</Kicker>
          <DisplayTitle size="title">{s(c.title) || s(c.headline)}</DisplayTitle>
          {s(c.value) && <StatFigure brand={brand} value={s(c.value)} unit={s(c.unit)} label={s(c.label)} />}
          {body && <SupportingText>{body}</SupportingText>}
          {(s(c.caption) || s(c.attribution) || s(c.date)) && (
            <MetaRow>{s(c.caption) || s(c.attribution) || s(c.date)}</MetaRow>
          )}
        </div>
        <MediaTile
          brand={brand}
          seed={s(c.mediaSeed) || s(c.title)}
          overrideUrl={s(c.mediaUrl)}
          mediaPath={s(c.mediaPath)}
          fit={s(c.mediaFit) || undefined}
          focus={s(c.mediaFocus) || undefined}
          zoom={Number(c.mediaZoom) || undefined}
          videoUrl={s(c.videoUrl)}
          videoPath={s(c.videoPath)}
          videoPosterUrl={s(c.videoPosterUrl)}
          videoPosterPath={s(c.videoPosterPath)}
          className="h-full max-h-[680px] w-full"
        />
      </div>
    </SlideFrame>
  );
}