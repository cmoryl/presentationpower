import { forwardRef, useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { Map, Paintbrush, CalendarDays, Box } from "lucide-react";
import { Button } from "@/design-system/element";

const groups = [
  { label: "Maps", icon: Map, items: [{ id: "stadium-pregame", label: "Pre-game areas" }, { id: "stadium-area", label: "Area map" }] },
  { label: "Field", icon: Paintbrush, items: [{ id: "stadium-field", label: "Paint reference" }] },
  { label: "Schedules", icon: CalendarDays, items: [{ id: "stadium-timelines", label: "Timelines" }, { id: "stadium-demos", label: "Design demos" }, { id: "stadium-canva", label: "Canva options" }] },
  { label: "Stadium", icon: Box, items: [{ id: "stadium-3d", label: "3D view" }] },
] as const;
const items = groups.flatMap((group) => [...group.items]);

export interface SjbStadiumNavProps extends ComponentPropsWithoutRef<"nav"> {}

/** In-page destinations shared by the app and public Stadium page. */
export const SjbStadiumNav = forwardRef<HTMLElement, SjbStadiumNavProps>(function SjbStadiumNav({ className = "", ...props }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>(items[0].id);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const host = container.current;
      if (!host) return;
      const pageHeader = document.querySelector<HTMLElement>("[data-app-shell] > header")
        ?? document.querySelector<HTMLElement>("[data-sjb-share-header]");
      const siteNavBottoms = [...document.querySelectorAll<HTMLElement>(".sjb-site-nav")]
        .filter((nav) => getComputedStyle(nav).position === "fixed" && nav.getBoundingClientRect().height > 0)
        .map((nav) => nav.getBoundingClientRect().bottom);
      const top = Math.max(0, pageHeader?.getBoundingClientRect().bottom ?? 0, ...siteNavBottoms);
      host.style.setProperty("--stadium-nav-top", `${top}px`);
      const boundary = top + host.getBoundingClientRect().height + 32;
      let current: string = items[0].id;
      for (const item of items) {
        const target = document.getElementById(item.id);
        if (target && target.getBoundingClientRect().top <= boundary) current = item.id;
      }
      setActive(current);
    };
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  const jump = (id: string) => {
    const target = document.getElementById(id);
    const host = container.current;
    if (!target || !host) return;
    window.history.replaceState(window.history.state, "", `#${id}`);
    target.scrollIntoView({ block: "start", behavior: "instant" });
    const align = () => {
      const top = Number.parseFloat(host.style.getPropertyValue("--stadium-nav-top")) || 0;
      window.scrollBy({ top: target.getBoundingClientRect().top - top - host.getBoundingClientRect().height - 16, behavior: "instant" });
      target.focus({ preventScroll: true });
    };
    window.setTimeout(align, 150);
    window.setTimeout(align, 500);
    setActive(id);
  };

  return <div ref={container} className="sticky top-[var(--stadium-nav-top,0px)] z-10 border-y bg-background shadow-sm">
    <nav ref={ref} aria-label="Stadium subsections" className={`overflow-x-auto ${className}`} {...props}>
      <ul className="flex w-max min-w-full gap-5 px-3 py-3 sm:gap-6">
        {groups.map((group) => <li key={group.label} className="space-y-2 border-r pr-5 last:border-0 last:pr-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><group.icon aria-hidden className="size-4" />{group.label}</p>
          <div className="flex gap-1">{group.items.map((item) => <Button key={item.id} asChild size="sm" variant={active === item.id ? "default" : "ghost"}>
            <a href={`#${item.id}`} aria-current={active === item.id ? "location" : undefined} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); jump(item.id); }}>{item.label}</a>
          </Button>)}</div>
        </li>)}
      </ul>
    </nav>
  </div>;
});