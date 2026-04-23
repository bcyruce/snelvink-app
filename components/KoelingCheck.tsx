"use client";

import HaccpTemperatureModule from "@/components/HaccpTemperatureModule";

export default function KoelingCheck() {
  return (
    <HaccpTemperatureModule
      moduleType="koeling"
      title="Koeling"
      defaultTemperature={7}
      firstEquipmentName="Koelkast 1"
    />
  );
}
