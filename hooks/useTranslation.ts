import { useLanguageContext } from "@/context/LanguageContext";

export function useTranslation() {
  const { t, language, setLanguage, translateHaccpText } = useLanguageContext();
  return { t, language, setLanguage, translateHaccpText };
}
