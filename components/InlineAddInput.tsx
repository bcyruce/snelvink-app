"use client";

import SupercellButton from "@/components/SupercellButton";
import { useTranslation } from "@/hooks/useTranslation";
import { Check, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type InlineAddInputProps = {
  /** Tekst van de "Add" knop in rust-stand. */
  label: string;
  /** Placeholder voor het inline tekstveld. */
  placeholder?: string;
  /** Wordt aangeroepen met de getrimde naam zodra de gebruiker bevestigt. */
  onAdd: (name: string) => void | Promise<void>;
  /** Vul standaard de input met deze waarde wanneer hij wordt geopend. */
  defaultValue?: string;
  /** Schakel het hele component uit. */
  disabled?: boolean;
  /** Extra Tailwind classes voor de wrapper. */
  className?: string;
};

/**
 * Vervanger voor `window.prompt`-flows. Toont een dashed "Toevoegen"-knop
 * die bij klik in-place verandert in een tekstveld met opslaan/annuleren.
 */
export default function InlineAddInput({
  label,
  placeholder,
  onAdd,
  defaultValue = "",
  disabled = false,
  className,
}: InlineAddInputProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, defaultValue]);

  const close = () => {
    setOpen(false);
    setValue("");
  };

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onAdd(trimmed);
      close();
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <SupercellButton
        size="lg"
        variant="neutral"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={[
          "flex min-h-[80px] w-full items-center justify-center gap-3 border-2 border-dashed border-slate-200 text-xl normal-case",
          className ?? "",
        ].join(" ")}
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
        {label}
      </SupercellButton>
    );
  }

  return (
    <div
      className={[
        "flex min-h-[80px] w-full items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-2",
        className ?? "",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? label}
        disabled={busy}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
        }}
        className="min-h-[64px] flex-1 rounded-xl border-2 border-b-4 border-slate-300 bg-white px-4 text-lg font-bold text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
      />
      <SupercellButton
        size="icon"
        variant="success"
        onClick={() => void submit()}
        disabled={!value.trim() || busy}
        aria-label={t("save")}
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl"
      >
        <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
      </SupercellButton>
      <SupercellButton
        size="icon"
        variant="neutral"
        onClick={close}
        disabled={busy}
        aria-label={t("cancel")}
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl"
      >
        <X className="h-6 w-6" strokeWidth={3} aria-hidden />
      </SupercellButton>
    </div>
  );
}
