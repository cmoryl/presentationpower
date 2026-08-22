import { useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";

const TOP_SENTINEL_ID = "back-to-top-sentinel";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById(TOP_SENTINEL_ID);
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const handleClick = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Back to top"
      className={`
        fixed bottom-5 right-5 z-[100]
        flex h-12 w-12 items-center justify-center rounded-full
        bg-primary text-primary-foreground shadow-lg
        transition-all duration-300 ease-out
        hover:scale-110 hover:bg-primary/90 hover:shadow-xl
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        active:scale-95
        ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}
      `}
    >
      <ChevronUp className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}

export function BackToTopSentinel() {
  return (
    <div
      id={TOP_SENTINEL_ID}
      className="relative top-[320px] h-1 w-1"
      aria-hidden="true"
    />
  );
}
