"use client";

import HaccpTemperatureModule from "@/components/HaccpTemperatureModule";

type Props = {
  mode?: "manage" | "record";
};

export default function KerntemperatuurCheck({ mode = "record" }: Props) {
  return (
    <HaccpTemperatureModule
      moduleType="kerntemperatuur"
      title="Kerntemperatuur"
      defaultTemperature={75}
      firstEquipmentName="Kernsonde 1"
      mode={mode}
    />
  );
}
