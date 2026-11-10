// Horizontal carousel of the latest Bowl creations and refreshes.
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/design-system/element";
import { SJB_RECENT_UPDATES } from "@/lib/sjb-recent-updates";

const CARD =
  "group w-72 shrink-0 snap-start overflow-hidden rounded-lg border border-border bg-card focus-visible:outline-2 focus-visible:outline-primary";

export function SjbRecentUpdates() {
  const track = useRef<HTMLDivElement>(null);
  const move = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section aria-labelledby="bowl-recent" className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="bowl-recent" className="text-lg font-semibold text-foreground">Recent updates</h2>
          <p className="text-sm text-muted-foreground">The newest Bowl creations and refreshes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" aria-label="Previous updates" onClick={() => move(-1)}><ChevronLeft aria-hidden /></Button>
          <Button variant="outline" size="icon" aria-label="Next updates" onClick={() => move(1)}><ChevronRight aria-hidden /></Button>
        </div>
      </div>
      <div ref={track} className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 motion-reduce:scroll-auto">
        {SJB_RECENT_UPDATES.map((u) => {
          const body = (
            <>
              <div className="flex h-44 items-center justify-center bg-muted">
                <img src={u.image} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="p-4">
                {u.date && <p className="text-xs font-semibold text-primary">{u.date}</p>}
                <p className="mt-1 flex items-center gap-1.5 font-semibold text-foreground group-hover:text-primary">
                  {u.file && <Download aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  {u.title}
                </p>
                <p className="text-[13px] text-muted-foreground">{u.detail}</p>
              </div>
            </>
          );
          return u.file ? (
            <a key={u.title} href={u.file.href} download={u.file.download} className={CARD}>
              {body}
            </a>
          ) : (
            <Link key={u.title} {...u.link} className={CARD}>
              {body}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
