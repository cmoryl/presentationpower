import g09 from "@/assets/sjb-holiday-grounds/bithorn-09.jpg.asset.json";
import g10 from "@/assets/sjb-holiday-grounds/bithorn-10.jpg.asset.json";
import g11 from "@/assets/sjb-holiday-grounds/bithorn-11.jpg.asset.json";
import g13 from "@/assets/sjb-holiday-grounds/bithorn-13.jpg.asset.json";
import { SJB_CALENDAR_POSTS } from "@/lib/sjb-social-calendar";

/** Proposed Hiram Bithorn holiday backgrounds — previews awaiting approval, not yet in Canva. */
export const SJB_HOLIDAY_GROUNDS: { post: string; theme: string; url: string }[] = [
  { post: "09", theme: "Zigzag roof and railings strung with holiday lights", url: g09.url },
  { post: "10", theme: "Front of the stadium at sunset", url: g10.url },
  { post: "11", theme: "Under the roof, floodlight beams", url: g11.url },
  { post: "13", theme: "Front washed in electric blue, lit trees", url: g13.url },
];

export function SjbHolidayGrounds() {
  return (
    <section className="mt-8" aria-labelledby="sjb-holiday-grounds">
      <h2 id="sjb-holiday-grounds" className="text-xl font-semibold text-foreground">Holiday backgrounds · Hiram Bithorn at night (proposed)</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        New backgrounds for the holiday posts, shown with each post's headline. These are previews for approval — they are not in Canva or the downloads yet. Each starts from a real public-domain photo of Hiram Bithorn Stadium (Wikimedia Commons), edited to night with holiday lighting — the lights and sky are added, not real. Hidden tags have been removed from the files.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SJB_HOLIDAY_GROUNDS.map((g) => {
          const p = SJB_CALENDAR_POSTS.find((x) => x.n === g.post);
          return (
            <figure key={g.post} className="overflow-hidden rounded-md border border-border bg-card">
              <div className="relative aspect-[4/5]">
                <img src={g.url} alt={`${p?.title ?? "Holiday"} background`} loading="lazy" width={1088} height={1360} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-x-0 top-[9%] px-3 text-center" style={{ color: "#FFFFFF", textShadow: "0 2px 8px rgba(0,0,0,.5)" }}>
                  <div className="text-[clamp(14px,2.4vw,26px)] font-extrabold italic leading-none">{p?.headline[0]}</div>
                  <div className="mt-1 text-[clamp(10px,1.4vw,15px)] font-semibold italic leading-tight">{p?.headline[1]}</div>
                  <div className="mt-2 text-[10px] font-bold tracking-wide">SANJUANBOWL.COM</div>
                </div>
              </div>
              <figcaption className="p-2 text-xs">
                <div className="font-medium text-foreground">#{g.post} · {p?.title}</div>
                <div className="text-muted-foreground">{g.theme}</div>
                <a className="text-primary underline" href={g.url} download>Download background</a>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
