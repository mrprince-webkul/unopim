"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Re-mounts on every route change → subtle page-entrance transition.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
