"use client";

import SupercellButton from "@/components/SupercellButton";
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
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t-2 border-slate-300 bg-white print:hidden"
      aria-label="Hoofdnavigatie"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <SupercellButton
              key={id}
              type="button"
              size="sm"
              variant={isActive ? "primary" : "neutral"}
              onClick={() => onChange(id)}
              aria-current={isActive ? "page" : undefined}
              textCase="normal"
              className="flex min-h-[64px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 py-3"
            >
              <Icon
                className="h-6 w-6 shrink-0"
                strokeWidth={isActive ? 2.5 : 2.25}
                aria-hidden
              />
              <span
                className={[
                  "max-w-full truncate text-xs font-black",
                  isActive ? "text-white" : "text-slate-700",
                ].join(" ")}
              >
                {label}
              </span>
            </SupercellButton>
          );
        })}
      </div>
    </nav>
  );
}
