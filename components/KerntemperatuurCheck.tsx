"use client";

import HaccpTemperatureModule from "@/components/HaccpTemperatureModule";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  mode?: "manage" | "record";
};

export default function KerntemperatuurCheck({ mode = "record" }: Props) {
  const { t } = useTranslation();
  return (
    <HaccpTemperatureModule
      moduleType="kerntemperatuur"
      title={t("kerntemperatuur")}
      defaultTemperature={75}
      firstEquipmentName={t("kerntemperatuur")}
      mode={mode}
    />
  );
}
