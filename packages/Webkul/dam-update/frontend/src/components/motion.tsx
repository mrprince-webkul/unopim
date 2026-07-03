"use client";

/**
 * Shared motion primitives for the DevAnnounce design system.
 *
 * Scroll reveals PRE-TRIGGER via a generous positive rootMargin so content is
 * already visible by the time it scrolls into view — never gate visibility
 * behind late `whileInView` thresholds (that caused blank bands / pop-in at
 * the viewport edges while scrolling).
 */

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/** Fires ~25% of a viewport BEFORE the element enters, in both directions. */
export const SAFE_VIEWPORT = { once: true, margin: "25% 0px 25% 0px" } as const;

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={SAFE_VIEWPORT}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export function RevealStagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={SAFE_VIEWPORT}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/** Mount-time entrance (hero content) — independent of scroll. */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 14,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Count-up number that starts when scrolled near view. */
export function AnimatedCounter({
  value,
  className,
  duration = 1.4,
  suffix = "",
}: {
  value: number;
  className?: string;
  duration?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px 15% 0px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString()),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display}
      {suffix}
    </span>
  );
}

/** Pointer-tracking 3D tilt wrapper (GPU transforms only). */
export function TiltCard({
  children,
  className,
  maxTilt = 8,
  style,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  style?: CSSProperties;
}) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), {
    stiffness: 180,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), {
    stiffness: 180,
    damping: 20,
  });

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }

  function onPointerLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Slow vertical float for decorative layers. */
export function Floating({
  children,
  className,
  duration = 7,
  delay = 0,
  distance = 10,
}: {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  distance?: number;
}) {
  return (
    <motion.div
      animate={{ y: [-distance / 2, distance / 2] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
