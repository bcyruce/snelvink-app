"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { pageVariants } from "@/lib/uiMotion";

export default function Template({ children }: { children: ReactNode }) {
  // Re-keying on the pathname makes Next.js' default per-route template
  // instance re-mount, so framer-motion plays the enter animation again on
  // every navigation — including browser back / forward.
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ willChange: "transform, opacity, filter" }}
    >
      {children}
    </motion.div>
  );
}
