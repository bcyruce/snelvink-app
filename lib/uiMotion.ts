import type { Transition, Variants } from "framer-motion";

/**
 * Tailwind helper used on regular, non-motion buttons / links.  Provides a
 * snappy "press" feeling (slight scale + smooth color transitions) so every
 * tappable element has at least *some* feedback even when we cannot reach for
 * a full <motion.button>.
 */
export const densePressClass =
  "transition-[transform,colors,opacity,background-color,border-color,box-shadow] duration-150 ease-out hover:-translate-y-[1px] active:translate-y-[1px] active:scale-[0.97] focus-visible:scale-[1.02]";

/**
 * A slightly softer press affordance for full-width cards / list rows where a
 * large scale change would feel jarring.  Still gives visible feedback on tap.
 */
export const cardPressClass =
  "transition-[transform,box-shadow,colors,background-color,border-color] duration-200 ease-out hover:-translate-y-[1px] hover:shadow-md active:translate-y-[1px] active:scale-[0.985]";

// ---------------------------------------------------------------------------
// Framer-motion variants — reused everywhere so the whole app feels coherent.
// ---------------------------------------------------------------------------

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 24,
  mass: 0.6,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 22,
};

/** Hover/tap props you can spread onto any motion.* component. */
export const pressMotionProps = {
  whileHover: { scale: 1.02, y: -1 },
  whileTap: { scale: 0.96, y: 1 },
  transition: springSnappy,
} as const;

/** Subtler version of {@link pressMotionProps} for big card surfaces. */
export const cardPressMotionProps = {
  whileHover: { scale: 1.01, y: -2 },
  whileTap: { scale: 0.985, y: 1 },
  transition: springSoft,
} as const;

/** Drop-in props for icon-only buttons (back arrows, close X, FAB, etc.). */
export const iconPressMotionProps = {
  whileHover: { scale: 1.08, rotate: -2 },
  whileTap: { scale: 0.9, rotate: 0 },
  transition: springSnappy,
} as const;

/** Page-level transition used by {@link app/template.tsx}. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(2px)",
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

/** Generic stagger-children container variant. */
export const listContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.04,
    },
  },
};

/** Item used inside a {@link listContainerVariants} list. */
export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 24 },
  },
  exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15 } },
};

/** Modal backdrop fade. */
export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Modal sheet (slides up from bottom on mobile, scales in on desktop). */
export const modalSheetVariants: Variants = {
  initial: { opacity: 0, y: "12%", scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 28, mass: 0.7 },
  },
  exit: {
    opacity: 0,
    y: "8%",
    scale: 0.97,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

/** Popover that scales in from a corner. */
export const popoverVariants: Variants = {
  initial: { opacity: 0, scale: 0.92, y: -6 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 26 },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -4,
    transition: { duration: 0.12 },
  },
};
