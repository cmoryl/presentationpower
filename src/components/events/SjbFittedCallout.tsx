import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

export interface SjbFittedCalloutProps {
  lines: readonly string[];
  width: number;
  height: number;
  maxSize: number;
  italic?: boolean;
  style?: CSSProperties;
}

/** Measure the actual campaign face, not character counts; never stretch lettering. */
export function SjbFittedCallout({ lines, width, height, maxSize, italic = false, style }: SjbFittedCalloutProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    const fit = () => {
      const node = ref.current;
      if (!node || cancelled) return;
      let low = 1;
      let high = maxSize;
      for (let i = 0; i < 14; i++) {
        const candidate = (low + high) / 2;
        node.style.fontSize = `${candidate}px`;
        const fits = node.scrollWidth <= width && node.scrollHeight <= height;
        if (fits) low = candidate;
        else high = candidate;
      }
      node.style.fontSize = `${Math.floor(low)}px`;
    };
    fit();
    void document.fonts.ready.then(fit);
    return () => { cancelled = true; };
  }, [lines.join('\n'), width, height, maxSize, italic]);
  return <div ref={ref} data-bowl-callout style={{ ...style, width, maxHeight: height, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontStyle: italic ? 'italic' : 'normal', fontSize: maxSize, lineHeight: 1, letterSpacing: 0 }}>
    {lines.map((line, index) => <div key={index} style={{ whiteSpace: 'nowrap' }}>{line}</div>)}
  </div>;
}