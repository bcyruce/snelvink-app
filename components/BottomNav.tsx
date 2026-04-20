"use client";

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
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      aria-label="Hoofdnavigatie"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around gap-1 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex min-h-[3.5rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 transition-colors duration-150 active:scale-[0.98]",
                isActive
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-800",
              ].join(" ")}
            >
              <Icon
                className="h-7 w-7 shrink-0"
                strokeWidth={isActive ? 2.25 : 2}
                aria-hidden
              />
              <span className="max-w-full truncate text-xs font-semibold sm:text-sm">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
