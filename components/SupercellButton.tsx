"use client";

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import type { ReactNode } from "react";

type SupercellButtonVariant = "primary" | "danger" | "success" | "neutral";
type SupercellButtonSize = "sm" | "md" | "lg" | "icon";
type SupercellButtonTextCase = "upper" | "normal";

type SupercellButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: SupercellButtonVariant;
  size?: SupercellButtonSize;
  textCase?: SupercellButtonTextCase;
} & Omit<HTMLMotionProps<"button">, "children" | "className">;

const variantClasses: Record<SupercellButtonVariant, string> = {
  primary:
    "bg-blue-500 border-blue-700 text-white hover:bg-blue-400 active:bg-blue-600 focus-visible:ring-blue-400/50",
  danger:
    "bg-red-500 border-red-700 text-white hover:bg-red-400 active:bg-red-600 focus-visible:ring-red-400/50",
  success:
    "bg-emerald-500 border-emerald-700 text-white hover:bg-emerald-400 active:bg-emerald-600 focus-visible:ring-emerald-400/50",
  neutral:
    "bg-white border-slate-300 text-slate-800 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-300/60",
};

const sizeClasses: Record<SupercellButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-base",
  lg: "px-6 py-4 text-lg",
  icon: "h-14 w-14 px-0 py-0 text-2xl",
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
      textCase = "upper",
      type = "button",
      disabled,
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
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { y: 5, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={[
          "rounded-2xl border-2 border-b-4 font-black outline-none focus-visible:ring-4 transition-colors",
          variantClasses[variant],
          sizeClasses[size],
          textCaseClasses[textCase],
          disabled ? "cursor-not-allowed opacity-50" : "",
          className,
        ].join(" ")}
        {...rest}
      >
        {children}
      </motion.button>
    );
  },
);

SupercellButton.displayName = "SupercellButton";

export default SupercellButton;
