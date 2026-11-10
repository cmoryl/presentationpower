import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
import { createFileRoute } from '@tanstack/react-router';
import { SjbSet5Assets } from '@/components/events/sjb-pages/Set5AssetsPage';
import { set5RemovalsOptions } from '@/lib/sjb-set5-availability';

export const Route = createFileRoute('/events/san-juan-bowl_/set-5-assets')({
  loader: ({ context }) => context.queryClient.ensureQueryData(set5RemovalsOptions),
  head: () => ({ meta: [
    { title: 'San Juan Bowl Design Set 5 asset library · TransPerfect Element' },
    { name: 'description', content: 'Browse reusable Design Set 5 artwork: backgrounds, transparent objects, vector effects and layered download packs.' },
    { property: 'og:title', content: 'San Juan Bowl Design Set 5 asset library · TransPerfect Element' },
    { property: 'og:description', content: 'Design Set 5 reusable backgrounds, footballs, cinematic ribbons and downloadable layers.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: withSjbTrail(SjbSet5Assets),
});