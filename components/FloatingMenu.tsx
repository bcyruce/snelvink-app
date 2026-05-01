"use client";

import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { densePressClass } from "@/lib/uiMotion";
import {
  Menu,
  X,
  ClipboardCheck,
  ClipboardPen,
  History,
  Users,
  User,
  Store,
  Settings,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type MenuTab =
  | "registreren"
  | "vandaag"
  | "taken"
  | "geschiedenis"
  | "personeel"
  | "profiel"
  | "restaurant"
  | "instellingen";

type MenuItem = {
  id: MenuTab;
  labelKey:
    | "navRegistreren"
    | "navTaken"
    | "navGeschiedenis"
    | "navPersoneel"
    | "navProfiel"
    | "navRestaurant"
    | "navInstellingen";
  Icon: typeof ClipboardCheck;
  disabled?: boolean;
};

const menuItems: MenuItem[] = [
  { id: "registreren", labelKey: "navRegistreren", Icon: ClipboardPen },
  { id: "taken", labelKey: "navTaken", Icon: ClipboardCheck },
  { id: "geschiedenis", labelKey: "navGeschiedenis", Icon: History },
  { id: "personeel", labelKey: "navPersoneel", Icon: Users },
  { id: "profiel", labelKey: "navProfiel", Icon: User },
  { id: "restaurant", labelKey: "navRestaurant", Icon: Store },
  { id: "instellingen", labelKey: "navInstellingen", Icon: Settings },
];

type FloatingMenuProps = {
  active: MenuTab;
  onChange: (tab: MenuTab) => void;
};

export default function FloatingMenu({ active, onChange }: FloatingMenuProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (tab: MenuTab, disabled?: boolean) => {
      if (disabled) return;
      onChange(tab);
      setIsOpen(false);
    },
    [onChange]
  );

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-floating-menu]")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 print:hidden"
            style={{ backdropFilter: "blur(4px)" }}
          />
        )}
      </AnimatePresence>

      {/* Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            data-floating-menu
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 z-50 w-56 overflow-hidden rounded-2xl shadow-2xl print:hidden"
            style={{
              background: theme.cardBg,
              border: `1.5px solid ${theme.cardBorder}`,
            }}
          >
            <nav className="py-2">
              {menuItems.map(({ id, labelKey, Icon, disabled }) => {
                const isActive = active === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelect(id, disabled)}
                    disabled={disabled}
                    className={[
                      "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold",
                      densePressClass,
                    ].join(" ")}
                    style={{
                      background: isActive ? theme.primary : "transparent",
                      color: disabled
                        ? theme.muted
                        : isActive
                        ? "#fff"
                        : theme.fg,
                      opacity: disabled ? 0.5 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    <Icon
                      className="h-5 w-5 shrink-0"
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className="flex-1">{t(labelKey)}</span>
                    {disabled && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5"
                        style={{
                          background: "rgba(0,0,0,0.08)",
                          color: theme.muted,
                        }}
                      >
                        {t("comingSoon")}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <button
        data-floating-menu
        type="button"
        onClick={handleToggle}
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 print:hidden"
        style={{
          background: theme.primary,
          boxShadow: `0 4px 0 ${theme.primaryDark}, 0 8px 24px rgba(0,0,0,0.15)`,
        }}
        aria-label={isOpen ? t("menuClose") : t("menuOpen")}
        aria-expanded={isOpen}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6 text-white" strokeWidth={2.5} />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu className="h-6 w-6 text-white" strokeWidth={2.5} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </>
  );
}
