"use client";

import { useTheme } from "@/hooks/useTheme";
import { ClipboardCheck, History, Settings } from "lucide-react";

export type BottomNavTab = "tasks" | "history" | "settings";

type BottomNavProps = {
  active: BottomNavTab;
  onChange: (tab: BottomNavTab) => void;
};

const tabs: {
  id: BottomNavTab;
  label: string;
  Icon: typeof ClipboardCheck;
}[] = [
  { id: "tasks", label: "Taken", Icon: ClipboardCheck },
  { id: "history", label: "Geschiedenis", Icon: History },
  { id: "settings", label: "Instellingen", Icon: Settings },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const { theme } = useTheme();

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t print:hidden"
      style={{
        background: theme.navBg,
        borderColor: theme.navBorder,
        backdropFilter: "blur(16px)",
      }}
      aria-label="Hoofdnavigatie"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1 min-h-14 text-[10px] font-black rounded-xl transition-all"
              style={isActive ? {
                background: theme.primary,
                border: `2px solid ${theme.primaryDark}`,
                color: "#fff",
                boxShadow: `0 2px 0 ${theme.primaryDark}`,
              } : {
                background: "transparent",
                border: "2px solid transparent",
                color: theme.muted,
              }}
            >
              <Icon
                className="h-5 w-5 shrink-0"
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden
              />
              <span className="max-w-full truncate">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
