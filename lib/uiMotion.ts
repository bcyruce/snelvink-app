import type { Transition, Variants } from "framer-motion";

/**
 * Tailwind helper used on regular, non-motion buttons / links.
 * Landing page 风格：更柔和的交互反馈
 */
export const densePressClass =
  "transition-all duration-200 ease-out hover:opacity-90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2";

/**
 * Landing page 风格的卡片交互：微妙的阴影和位移
 */
export const cardPressClass =
  "transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md";

// ---------------------------------------------------------------------------
// Framer-motion variants — reused everywhere so the whole app feels coherent.
// ---------------------------------------------------------------------------

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 26,
};

/** Landing page 风格：更柔和的悬停/点击反馈 */
export const pressMotionProps = {
  whileHover: { scale: 1.01, opacity: 0.95 },
  whileTap: { scale: 0.98 },
  transition: springSnappy,
} as const;

/** 卡片交互：微妙的浮起效果 */
export const cardPressMotionProps = {
  whileHover: { y: -2, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" },
  whileTap: { y: 0, scale: 0.995 },
  transition: springSoft,
} as const;

/** 图标按钮：简洁的缩放反馈 */
export const iconPressMotionProps = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.92 },
  transition: springSnappy,
} as const;

/** Landing page fadeInUp 变体 */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/** Landing page scaleIn 变体 */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/** Landing page stagger container */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/** Page-level transition used by {@link app/template.tsx}. */
export const pageVariants: Variants = {
  initial: { opacity: 0, x: 40, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    x: -30,
    filter: "blur(2px)",
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

/** Slide-in from right for forward navigation. */
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 60, filter: "blur(3px)" },
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 28,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    x: -40,
    filter: "blur(2px)",
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

/** Slide-in from left for backward navigation. */
export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -60, filter: "blur(3px)" },
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 28,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    x: 40,
    filter: "blur(2px)",
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
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
