import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Fade/slide wrapper for route content. Designed to be used as the direct
 * child of an `AnimatePresence` in the app shell so route changes animate
 * in/out. Falls back to an instant, transform-free render when the user
 * prefers reduced motion.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
