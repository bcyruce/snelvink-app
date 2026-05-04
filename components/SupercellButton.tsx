"use client";

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import type { ReactNode, CSSProperties } from "react";

type SupercellButtonVariant = "primary" | "danger" | "success" | "neutral" | "ghost" | "outline";
type SupercellButtonSize = "sm" | "md" | "lg" | "icon" | "iconSm";
type SupercellButtonTextCase = "upper" | "normal";

type SupercellButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: SupercellButtonVariant;
  size?: SupercellButtonSize;
  textCase?: SupercellButtonTextCase;
  style?: CSSProperties;
} & Omit<HTMLMotionProps<"button">, "children" | "className" | "style">;

// Landing page 风格：简洁、现代、圆润
const variantClasses: Record<SupercellButtonVariant, string> = {
  primary:
    "bg-[var(--theme-primary)] text-white shadow-sm hover:shadow-md",
  danger:
    "bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md",
  success:
    "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 hover:shadow-md",
  neutral:
    "bg-white text-neutral-900 shadow-sm border border-neutral-200 hover:bg-neutral-50 hover:shadow-md",
  ghost:
    "bg-transparent text-[var(--theme-fg)] hover:bg-neutral-100",
  outline:
    "bg-transparent text-[var(--theme-primary)] border border-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-white",
};

const sizeClasses: Record<SupercellButtonSize, string> = {
  sm: "px-4 py-2 text-sm gap-1.5",
  md: "px-5 py-2.5 text-base gap-2",
  lg: "px-6 py-3 text-lg gap-2",
  icon: "h-12 w-12 p-0 text-xl",
  iconSm: "h-9 w-9 p-0 text-base",
};

const textCaseClasses: Record<SupercellButtonTextCase, string> = {
  upper: "uppercase tracking-wide",
  normal: "normal-case tracking-normal",
};

const SupercellButton = forwardRef<HTMLButtonElement, SupercellButtonProps>(
  (
    {
      onClick,
      children,
      className = "",
      variant = "primary",
      size = "md",
      textCase = "normal",
      type = "button",
      disabled,
      style,
      ...rest
    },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.01 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={[
          "inline-flex items-center justify-center rounded-full font-semibold outline-none",
          "transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2",
          variantClasses[variant],
          sizeClasses[size],
          textCaseClasses[textCase],
          disabled ? "cursor-not-allowed opacity-50" : "",
          className,
        ].join(" ")}
        style={style}
        {...rest}
      >
        {children}
      </motion.button>
    );
  },
);

SupercellButton.displayName = "SupercellButton";

export default SupercellButton;
