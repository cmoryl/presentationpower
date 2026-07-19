import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mount `children` only once the wrapper enters (or nears) the viewport.
 * Before mounting, renders `placeholder` (which must reserve the correct
 * layout size). After mounting, keeps children in the tree.
 *
 * Eager escape hatches for headless tools / regression scripts:
 *   - `window.__EAGER_PREVIEWS__ = true` before load
 *   - URL contains `?eager=1`
 *   - prop `eager` true
 */
export function LazyMount({
  children,
  placeholder,
  rootMargin = "600px 0px",
  className,
  eager: eagerProp = false,
  onMount,
}: {
  children: ReactNode;
  placeholder: ReactNode;
  rootMargin?: string;
  className?: string;
  eager?: boolean;
  onMount?: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(() => {
    if (eagerProp) return true;
    if (typeof window === "undefined") return false;
    try {
      if ((window as any).__EAGER_PREVIEWS__) return true;
      if (window.location.search.includes("eager=1")) return true;
    } catch { /* ignore */ }
    return false;
  });

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className} data-lazy-mount={visible ? "on" : "off"}>
      {visible ? children : placeholder}
    </div>
  );
}
