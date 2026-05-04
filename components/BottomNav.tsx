"use client";

import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { ClipboardCheck, History, Settings } from "lucide-react";

export type BottomNavTab = "tasks" | "history" | "settings";

type BottomNavProps = {
  active: BottomNavTab;
  onChange: (tab: BottomNavTab) => void;
};

const tabs: {
  id: BottomNavTab;
  labelKey: "navTaken" | "navGeschiedenis" | "navInstellingen";
  Icon: typeof ClipboardCheck;
}[] = [
  { id: "tasks", labelKey: "navTaken", Icon: ClipboardCheck },
  { id: "history", labelKey: "navGeschiedenis", Icon: History },
  { id: "settings", labelKey: "navInstellingen", Icon: Settings },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t print:hidden"
      style={{
        background: theme.navBg,
        borderColor: theme.navBorder,
        backdropFilter: "blur(12px)",
      }}
      aria-label={t("mainNavigation")}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around gap-1 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {tabs.map(({ id, labelKey, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1.5 min-h-12 text-[11px] font-medium rounded-lg transition-all duration-200"
              style={isActive ? {
                background: theme.primary,
                color: "#fff",
              } : {
                background: "transparent",
                color: theme.muted,
              }}
            >
              <Icon
                className="h-5 w-5 shrink-0"
                strokeWidth={isActive ? 2 : 1.75}
                aria-hidden
              />
              <span className="max-w-full truncate">
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
