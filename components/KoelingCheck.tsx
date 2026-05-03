"use client";

import HaccpTemperatureModule from "@/components/HaccpTemperatureModule";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  mode?: "manage" | "record";
  initialItemId?: string;
};

export default function KoelingCheck({ mode = "record", initialItemId }: Props) {
  const { t } = useTranslation();
  return (
    <HaccpTemperatureModule
      moduleType="koeling"
      title={t("koeling")}
      defaultTemperature={7}
      firstEquipmentName={t("koelingOne")}
      mode={mode}
      initialItemId={initialItemId}
    />
  );
}
