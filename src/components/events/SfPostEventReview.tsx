import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Download, ExternalLink, X, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/design-system/element";
import { supabase } from "@/integrations/supabase/client";
import { logOutcome } from "@/lib/learning.functions";
import { SF_REVIEW, SF_REVIEW_LEARNING } from "@/lib/next-sf-review";
import report from "@/assets/next-sf-review/report-v1.pdf.asset.json";

export interface SfPostEventReviewProps { full?: boolean }

export function SfPostEventReview({ full = false }: SfPostEventReviewProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useServerFn(logOutcome);
  const [submitted, setSubmitted] = useState(false);
  const send = useMutation({
    mutationFn: () => log({ data: { subjectType: "event", eventId: SF_REVIEW.eventId, city: "San Francisco", phase: "post-event", ...SF_REVIEW_LEARNING } }),
    onSuccess: () => { setSubmitted(true); toast.success("Submitted for learning review. Approval is still required."); },
    onError: (error) => toast.error(error.message),
  });
  const images = useQuery({
    queryKey: ["sf-review-private-photos", SF_REVIEW.version],
    queryFn: async () => {
      const paths = SF_REVIEW.photos.flatMap(p => [p.path, p.thumbPath]);
      const { data, error } = await supabase.storage.from("event-photos").createSignedUrls(paths, 3600);
      if (error) throw error;
      const urls: Record<string, string> = {};
      for (const item of data ?? []) if (item.path && item.signedUrl && !item.error) urls[item.path] = item.signedUrl;
      return urls;
    },
    staleTime: 45 * 60 * 1000,
    retry: false,
  });
  const photo = selected === null ? null : SF_REVIEW.photos[selected];
  return <section id="sf-post-event" className="mt-10 scroll-mt-24 border-y border-border py-8" aria-labelledby="sf-review-heading">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-medium text-muted-foreground">RESEARCH REVIEW · V{SF_REVIEW.version} · NOVEMBER 2, 2026</p>
        <h2 id="sf-review-heading" className="mt-2 text-2xl font-semibold">After NEXT San Francisco</h2></div>
      <div className="flex flex-wrap gap-2">
        {!full && <Button asChild variant="outline"><Link to="/events/next/san-francisco/review">Full review <ArrowRight /></Link></Button>}
        <Button asChild><a href={report.url} download="next-sf-2026-post-event-review-v1.pdf">Report PDF <Download /></a></Button>
      </div>
    </div>
    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">Two directly retrieved reflections and five attendee photographs support specific on-site activity. Attendance, satisfaction, commercial results and awards remain unverified—not zero. This is not an organiser-approved whole-event audit.</p>
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <article><h3 className="font-semibold">Human experience alongside AI</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Jessica Wanamaker’s October 28 account describes Will Guidara’s hospitality keynote and thoughtful customer touchpoints. Her photographs connect arrival branding, the agenda, a digital-health panel and keepsakes.</p><a className="mt-2 inline-flex items-center gap-1 text-sm underline" href={SF_REVIEW.sources[6].url} target="_blank" rel="noreferrer">Attendee reflection · S7 <ExternalLink size={13} /></a></article>
      <article><h3 className="font-semibold">Workflows before tools</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Verndale’s October 29 retrospective attributes a Beyond the Hype contribution to Robert Balmaseda: define outcomes and redesign valuable work. This is a partner viewpoint, not measured event ROI.</p><a className="mt-2 inline-flex items-center gap-1 text-sm underline" href={SF_REVIEW.sources[7].url} target="_blank" rel="noreferrer">Partner retrospective · S8 <ExternalLink size={13} /></a></article>
    </div>
    <h3 className="mt-8 font-semibold">Real event imagery · private research references</h3>
    <p className="mt-2 text-sm text-muted-foreground">Jessica Wanamaker’s October 28 post. Photographer, reuse rights and attendee releases unconfirmed. Not cleared for marketing; no generated or historical substitute images.</p>
    {images.isError && <p role="alert" className="mt-4 text-sm text-destructive">Private photographs could not load. Your report and source links remain available.</p>}
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {SF_REVIEW.photos.map((p, i) => <figure key={p.id}>
        <Button variant="ghost" className="h-auto w-full p-0" disabled={!images.data?.[p.path]} aria-label={`View ${p.title}`} onClick={() => { setSelected(i); dialog.current?.showModal(); }}>
          <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md bg-muted">{images.data?.[p.thumbPath] ? <img className="h-full w-full object-contain" src={images.data[p.thumbPath]} alt={p.title} loading="lazy" /> : <span className="text-xs text-muted-foreground">{images.isLoading ? "Loading…" : "Private photo unavailable"}</span>}</div>
        </Button><figcaption className="mt-2 text-xs"><strong>{p.id} · {p.title}</strong><span className="mt-1 block text-muted-foreground">{p.width} × {p.height} · rights pending</span></figcaption>
      </figure>)}
    </div>
    {full && <div className="mt-8 border-t border-border pt-6">
      <h3 className="font-semibold">Evidence register</h3><ul className="mt-3 grid gap-3 sm:grid-cols-2">{SF_REVIEW.sources.map(s => <li key={s.id} className="text-sm"><a className="inline-flex items-center gap-1 underline" href={s.url} target="_blank" rel="noreferrer">{s.id} · {s.title}<ExternalLink size={12}/></a><p className="text-xs text-muted-foreground">{s.date}</p></li>)}</ul>
      <div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={() => send.mutate()} disabled={send.isPending || submitted}><Send />{submitted ? "Submitted for review" : send.isPending ? "Submitting…" : "Submit research to learning review"}</Button><span className="text-xs text-muted-foreground">Only approved suggestions become event knowledge.</span></div>
    </div>}
    <dialog ref={dialog} onClose={() => setSelected(null)} className="m-auto max-h-[90vh] w-[min(92vw,70rem)] overflow-auto rounded-md border border-border bg-background p-5 text-foreground backdrop:bg-foreground/70">
      <div className="flex items-center justify-between gap-4"><h3 className="font-semibold">{photo?.id} · {photo?.title}</h3><Button variant="ghost" size="icon" aria-label="Close photograph" onClick={() => dialog.current?.close()}><X /></Button></div>
      {photo && images.data?.[photo.path] && <img src={images.data[photo.path]} alt={photo.title} className="mx-auto mt-4 max-h-[65vh] max-w-full object-contain" />}
      <p className="mt-4 text-sm text-muted-foreground">Private reference · posted October 28 by Jessica Wanamaker. Photographer and reuse permission unconfirmed. No measured print or colour claims.</p>
      {photo && <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm underline">Original post <ExternalLink size={13} /></a>}
    </dialog>
  </section>;
}