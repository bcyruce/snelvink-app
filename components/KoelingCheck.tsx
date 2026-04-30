"use client";

import HaccpTemperatureModule from "@/components/HaccpTemperatureModule";

type Props = {
  mode?: "manage" | "record";
};

export default function KoelingCheck({ mode = "record" }: Props) {
  return (
    <HaccpTemperatureModule
      moduleType="koeling"
      title="Koeling"
      defaultTemperature={7}
      firstEquipmentName="Koelkast 1"
      mode={mode}
    />
  );
}
