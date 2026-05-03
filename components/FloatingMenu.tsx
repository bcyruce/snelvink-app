"use client";

import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import {
  listContainerVariants,
  listItemVariants,
  modalBackdropVariants,
} from "@/lib/uiMotion";
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
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
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
            initial={{ opacity: 0, scale: 0.85, y: 24, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="fixed bottom-24 right-4 z-50 w-56 overflow-hidden rounded-2xl shadow-2xl print:hidden"
            style={{
              background: theme.cardBg,
              border: `1.5px solid ${theme.cardBorder}`,
              transformOrigin: "bottom right",
            }}
          >
            <motion.nav
              className="py-2"
              variants={listContainerVariants}
              initial="initial"
              animate="animate"
            >
              {menuItems.map(({ id, labelKey, Icon, disabled }) => {
                const isActive = active === id;
                return (
                  <motion.button
                    key={id}
                    type="button"
                    variants={listItemVariants}
                    whileHover={
                      disabled
                        ? undefined
                        : { x: 4, transition: { type: "spring", stiffness: 400, damping: 22 } }
                    }
                    whileTap={disabled ? undefined : { scale: 0.97 }}
                    onClick={() => handleSelect(id, disabled)}
                    disabled={disabled}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold transition-colors"
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
                    <motion.span
                      animate={{ rotate: isActive ? [0, -8, 8, 0] : 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="inline-flex"
                    >
                      <Icon
                        className="h-5 w-5 shrink-0"
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    </motion.span>
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
                  </motion.button>
                );
              })}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        data-floating-menu
        type="button"
        onClick={handleToggle}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.92, y: 1 }}
        animate={{
          rotate: isOpen ? 180 : 0,
          boxShadow: isOpen
            ? `0 2px 0 ${theme.primaryDark}, 0 4px 12px rgba(0,0,0,0.18)`
            : `0 4px 0 ${theme.primaryDark}, 0 8px 24px rgba(0,0,0,0.15)`,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full print:hidden"
        style={{ background: theme.primary }}
        aria-label={isOpen ? t("menuClose") : t("menuOpen")}
        aria-expanded={isOpen}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
              className="inline-flex"
            >
              <X className="h-6 w-6 text-white" strokeWidth={2.5} />
            </motion.span>
          ) : (
            <motion.span
              key="menu"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
              className="inline-flex"
            >
              <Menu className="h-6 w-6 text-white" strokeWidth={2.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
