"use client";

import { Droplet } from "lucide-react";

export default function FrituurvetCheck() {
  return (
    <div className="mt-10 flex flex-col gap-6">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        Frituurvet registratie
      </h2>

      <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
        <Droplet
          className="h-16 w-16 text-gray-400"
          strokeWidth={2}
          aria-hidden
        />
        <p className="text-xl font-bold text-gray-700">
          Binnenkort beschikbaar
        </p>
        <p className="max-w-sm text-base text-gray-500">
          Hier kun je straks de temperatuur en kwaliteit van het frituurvet
          registreren, foto&apos;s toevoegen en een waarschuwing instellen voor
          het verversen.
        </p>
      </div>
    </div>
  );
}
