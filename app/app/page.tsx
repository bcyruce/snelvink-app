import { menuTabPath } from "@/lib/menuTabPath";
import { redirect } from "next/navigation";

type AppEntryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AppEntryPage({ searchParams }: AppEntryPageProps) {
  const resolved = await searchParams;
  const tab = resolved.tab;
  const legacyTab = Array.isArray(tab) ? tab[0] : tab;

  if (legacyTab) {
    redirect(menuTabPath(legacyTab));
  }

  redirect("/app/taken");
}
