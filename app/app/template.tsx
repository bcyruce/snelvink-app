"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { slideInLeft, slideInRight } from "@/lib/uiMotion";

// Helper to determine route depth for direction detection
function getRouteDepth(path: string): number {
  return path.split("/").filter(Boolean).length;
}

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);
  const directionRef = useRef<"forward" | "back">("forward");

  // Determine navigation direction based on route depth
  useEffect(() => {
    if (prevPathnameRef.current !== null) {
      const prevDepth = getRouteDepth(prevPathnameRef.current);
      const currentDepth = getRouteDepth(pathname);
      
      // Going deeper = forward, going shallower = back
      // Same depth = check if going to a "parent" path
      if (currentDepth > prevDepth) {
        directionRef.current = "forward";
      } else if (currentDepth < prevDepth) {
        directionRef.current = "back";
      } else {
        // Same depth - default to forward unless going to root or registreren from detail
        const isGoingBack = 
          pathname === "/" || 
          pathname === "/registreren" || 
          pathname === "/taken" ||
          (prevPathnameRef.current.includes("/edit/") && !pathname.includes("/edit/"));
        directionRef.current = isGoingBack ? "back" : "forward";
      }
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  const variants = directionRef.current === "back" ? slideInLeft : slideInRight;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ willChange: "transform, opacity, filter" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
