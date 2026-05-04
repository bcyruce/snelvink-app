const MENU_TAB_PATHS = {
  registreren: "/app/registreren",
  vandaag: "/app/taken",
  taken: "/app/taken",
  geschiedenis: "/app/geschiedenis",
  personeel: "/app/personeel",
  profiel: "/app/profiel",
  restaurant: "/app/restaurant",
  instellingen: "/app/instellingen",
} as const;

export type PrimaryMenuTab = keyof typeof MENU_TAB_PATHS;

export function isPrimaryMenuTab(value: string): value is PrimaryMenuTab {
  return value in MENU_TAB_PATHS;
}

export function menuTabPath(tab: string): string {
  if (isPrimaryMenuTab(tab)) return MENU_TAB_PATHS[tab];
  return MENU_TAB_PATHS.taken;
}
