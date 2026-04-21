"use client";

import type { ReactNode } from "react";

type UpgradePromptModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function UpgradePromptModal({
  open,
  onClose,
  children,
}: UpgradePromptModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Sluiten"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
        <p className="text-center text-lg font-semibold leading-relaxed text-gray-900">
          {children}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-14 w-full rounded-2xl bg-gray-900 text-lg font-bold text-white shadow-md transition-transform active:scale-[0.99]"
        >
          Begrepen
        </button>
      </div>
    </div>
  );
}
