import { createFileRoute } from '@tanstack/react-router';
import { SjbSet5Assets } from '@/components/events/sjb-pages/Set5AssetsPage';
import { SjbShareProvider } from '@/components/events/SjbShare';

export const Route = createFileRoute('/share/san-juan-bowl/set-5-assets')({
  head: () => ({ meta: [
    { title: 'San Juan Bowl shared Design Set 5 assets · TransPerfect Element' },
    { name: 'description', content: 'View and download Design Set 5 backgrounds, transparent footballs, cinematic effects and portable layered artwork.' },
    { property: 'og:title', content: 'San Juan Bowl shared Design Set 5 assets · TransPerfect Element' },
    { property: 'og:description', content: 'Reusable Bowl artwork with transparent pieces, motion effects and original download packs.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => <SjbShareProvider><SjbSet5Assets /></SjbShareProvider>,
});