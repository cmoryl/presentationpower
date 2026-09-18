// On-screen proof of one guide page. It follows the same fractions the press PDF
// uses, so what the operator types here is what the printed page does — but it
// is a screen proof, not the press artwork.

import type { GuideBlock, GuideConfig } from "@/lib/next-guide";

const INK = "#03002C";
const ACCENT = "#003FC7";
const SURFACE = "#EEF1F7";

export function GuidePage({
  block,
  config,
  trim,
  pageNo,
}: {
  block: GuideBlock;
  config: GuideConfig;
  trim: { w: number; h: number };
  pageNo: number;
}) {
  const aspect = { aspectRatio: `${trim.w} / ${trim.h}` };
  const head = [config.location.city, config.location.dates].filter(Boolean).join(" · ");

  if (block.kind === "cover") {
    return (
      <div
        className="relative w-full overflow-hidden rounded-md px-[10%] py-[9%] text-white"
        style={{ ...aspect, background: INK, containerType: "inline-size" }}
      >
        <div className="flex gap-[1.1%]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="block"
              style={{
                width: "4.2%",
                aspectRatio: "1 / 1",
                background: i % 2 === 0 ? ACCENT : "#FFFFFF",
              }}
            />
          ))}
        </div>
        <div className="absolute inset-x-[10%] top-[34%]">
          {block.eyebrow ? (
            <p
              className="text-[2.4cqw] font-bold uppercase tracking-[0.14em]"
              style={{ color: ACCENT }}
            >
              {block.eyebrow}
            </p>
          ) : null}
          <p className="text-[11.5cqw] font-bold leading-[1.02]">{block.title || "YOUR GUIDE"}</p>
          {block.theme ? (
            <p className="mt-[2%] text-[3.8cqw] font-bold uppercase tracking-[0.06em]">{block.theme}</p>
          ) : null}
          {block.strapline ? (
            <p className="mt-[1.5%] text-[1.9cqw] uppercase tracking-[0.12em]" style={{ color: SURFACE }}>
              {block.strapline}
            </p>
          ) : null}
        </div>
        <div className="absolute inset-x-[10%] bottom-[9%]">
          <p className="text-[2cqw] font-bold">
            {[config.location.venue, config.location.city, config.location.dates]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {block.footnote ? (
            <p className="text-[1.8cqw]" style={{ color: ACCENT }}>
              {block.footnote}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const title =
    block.kind === "keynote" ? block.talkTitle || block.name : "title" in block ? block.title : "";
  const standfirst = "standfirst" in block ? block.standfirst : "";

  return (
    <div
      className="relative w-full overflow-hidden rounded-md border border-black/10 bg-white px-[8.5%] py-[7%]"
      style={{ ...aspect, color: INK, containerType: "inline-size" }}
    >
      {head ? (
        <p className="text-[1.65cqw] font-bold uppercase tracking-[0.12em]" style={{ color: ACCENT }}>
          {head}
        </p>
      ) : null}
      <div className="mt-[1%] h-[1px] w-full" style={{ background: ACCENT }} />
      {block.kind === "keynote" && block.eyebrow ? (
        <p className="mt-[3%] text-[1.9cqw] font-bold uppercase tracking-[0.12em]" style={{ color: ACCENT }}>
          {block.eyebrow}
        </p>
      ) : null}
      {title ? <p className="mt-[3%] text-[5.6cqw] font-bold leading-[1.08]">{title}</p> : null}
      {standfirst ? (
        <p className="mt-[2.5%] text-[2.4cqw] leading-[1.35]" style={{ color: ACCENT }}>
          {standfirst}
        </p>
      ) : null}

      <div className="mt-[3%] space-y-[2.4%] text-[2.15cqw] leading-[1.45]">
        {block.kind === "welcome" ? (
          <>
            <p className="text-[2.5cqw] leading-[1.45]">{block.body}</p>
            {block.byline ? (
              <p className="font-bold" style={{ color: ACCENT }}>
                {block.byline}
              </p>
            ) : null}
            {block.note ? (
              <p className="px-[2.5%] py-[2%]" style={{ background: SURFACE }}>
                {block.note}
              </p>
            ) : null}
          </>
        ) : null}

        {block.kind === "info" || block.kind === "list"
          ? block.items.map((it) => (
              <div key={it.id}>
                <p className="text-[2.6cqw] font-bold">{it.label}</p>
                <p>{it.body}</p>
              </div>
            ))
          : null}

        {block.kind === "schedule"
          ? block.days.map((day) => (
              <div key={day.id}>
                <p className="text-[2.8cqw] font-bold" style={{ color: ACCENT }}>
                  {day.name}
                </p>
                {day.rows.map((r) => (
                  <div
                    key={r.id}
                    className="flex gap-[4%] border-b py-[1%]"
                    style={{ borderColor: "rgba(0,63,199,0.35)" }}
                  >
                    <span className="w-[24%] font-bold">{r.time}</span>
                    <span className="flex-1">{r.item}</span>
                  </div>
                ))}
              </div>
            ))
          : null}

        {block.kind === "keynote" ? (
          <>
            <p className="text-[3.4cqw] font-bold" style={{ color: ACCENT }}>
              {block.name}
            </p>
            {block.when ? <p className="font-bold">{block.when}</p> : null}
            <p className="text-[2.2cqw] leading-[1.5]">{block.body}</p>
          </>
        ) : null}

        {block.kind === "floors"
          ? block.floors.map((floor) => (
              <div key={floor.id}>
                <p className="text-[2.6cqw] font-bold" style={{ color: ACCENT }}>
                  {floor.name}
                </p>
                {floor.room ? <p className="font-bold">{floor.room}</p> : null}
                {floor.lines.map((line, i) => (
                  <p key={i} className="pl-[2%]">
                    · {line}
                  </p>
                ))}
              </div>
            ))
          : null}

        {block.kind === "links"
          ? block.links.map((link) => (
              <div key={link.id}>
                <p className="text-[2.6cqw] font-bold">{link.label}</p>
                <p style={{ color: ACCENT }}>{link.url}</p>
              </div>
            ))
          : null}
      </div>

      <span className="absolute bottom-[4%] right-[8.5%] text-[1.8cqw] font-bold" style={{ color: ACCENT }}>
        {pageNo}
      </span>
    </div>
  );
}
