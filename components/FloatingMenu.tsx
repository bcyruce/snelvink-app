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
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setPortalEl(document.body);
  }, []);

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

  const shell = (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-[100] bg-black/20 print:hidden"
            style={{ backdropFilter: "blur(8px)" }}
          />
        )}
      </AnimatePresence>

      {/* Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[110] mx-auto flex max-w-md justify-end print:hidden">
            <motion.div
              data-floating-menu
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="pointer-events-auto mr-4 w-60 overflow-hidden rounded-2xl shadow-xl"
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                border: "1px solid rgba(0, 0, 0, 0.08)",
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
                          : { backgroundColor: "rgba(0, 0, 0, 0.04)" }
                      }
                      whileTap={disabled ? undefined : { scale: 0.98 }}
                      onClick={() => handleSelect(id, disabled)}
                      disabled={disabled}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors"
                      style={{
                        background: isActive ? `${theme.primary}10` : "transparent",
                        color: disabled
                          ? theme.muted
                          : isActive
                          ? theme.primary
                          : theme.fg,
                        opacity: disabled ? 0.5 : 1,
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      <Icon
                        className="h-5 w-5 shrink-0"
                        strokeWidth={isActive ? 2.5 : 1.75}
                        style={{ color: isActive ? theme.primary : theme.muted }}
                      />
                      <span className="flex-1">{t(labelKey)}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: theme.primary }}
                        />
                      )}
                      {disabled && (
                        <span
                          className="text-[10px] font-medium uppercase tracking-wider rounded-full px-2 py-0.5"
                          style={{
                            background: "rgba(0,0,0,0.05)",
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
          </div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] mx-auto flex max-w-md justify-end print:hidden"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <motion.button
          data-floating-menu
          type="button"
          onClick={handleToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            rotate: isOpen ? 180 : 0,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="pointer-events-auto mb-6 mr-4 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
          style={{ 
            background: theme.primary,
            boxShadow: `0 4px 14px ${theme.primary}40`,
          }}
          aria-label={isOpen ? t("menuClose") : t("menuOpen")}
          aria-expanded={isOpen}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="inline-flex"
              >
                <X className="h-6 w-6 text-white" strokeWidth={2} />
              </motion.span>
            ) : (
              <motion.span
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="inline-flex"
              >
                <Menu className="h-6 w-6 text-white" strokeWidth={2} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );

  if (!portalEl) return null;
  return createPortal(shell, portalEl);
}
