import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export interface AnimatedNumberProps {
  value: string; // e.g. "20+", "600K+", "8.4"
  className?: string;
}

// Counts up from 0 to the leading number when scrolled into view, keeping any
// suffix (e.g. "+", "K+"). Reduced-motion renders the final value immediately.
export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();

  const match = value.match(/^([\d.]+)(.*)$/);
  const target = match ? parseFloat(match[1]) : 0;
  const suffix = match ? match[2] : value;
  const decimals = match && match[1].includes(".") ? 1 : 0;

  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(target);
      return;
    }
    const controls = animate(0, target, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, target, reduced]);

  return (
    <span ref={ref} className={className}>
      {match ? display.toFixed(decimals) : ""}
      {suffix}
    </span>
  );
}
