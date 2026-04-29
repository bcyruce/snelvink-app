"use client";

import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/hooks/useTheme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}
