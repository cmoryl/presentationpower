import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

const SCROLL_THRESHOLD = 320;

function useScrolledPast(threshold: number) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const y = window.scrollY ?? window.pageYOffset ?? 0;
      setVisible(y > threshold);
    };

    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [threshold]);

  return visible;
}

export function BackToTop() {
  const visible = useScrolledPast(SCROLL_THRESHOLD);

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
