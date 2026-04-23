"use client";

import HaccpTemperatureModule from "@/components/HaccpTemperatureModule";

export default function KerntemperatuurCheck() {
  return (
    <HaccpTemperatureModule
      moduleType="kerntemperatuur"
      title="Kerntemperatuur"
      defaultTemperature={75}
      firstEquipmentName="Kernsonde 1"
    />
  );
}
