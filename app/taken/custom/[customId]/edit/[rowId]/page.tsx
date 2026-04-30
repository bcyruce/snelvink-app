"use client";

import SupercellButton from "@/components/SupercellButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ModuleType = "temperature" | "boolean" | "list";
type NumberInputConfig = { id: string; name: string; step: number; defaultValue: number; unit: string; hasRemark: boolean };
type BooleanInputConfig = { id: string; name: string; hasRemark: boolean; acceptedReasons?: string[]; rejectedReasons?: string[] };
type ListItemConfig = { id: string; name: string };
type ListSettings = { items: ListItemConfig[]; hasRemark: boolean; hasPhoto: boolean };

type CustomModule = {
  id: string;
  name: string;
  moduleType: ModuleType;
  settings: NumberInputConfig[] | BooleanInputConfig[] | ListSettings;
};

function normalizeModuleType(value: unknown): ModuleType {
  if (value === "boolean") return "boolean";
  if (value === "list") return "list";
  return "temperature";
}

function parseNumber(settings: unknown): NumberInputConfig[] {
  if (Array.isArray(settings)) return settings as NumberInputConfig[];
  if (settings && typeof settings === "object") {
    const inputs = (settings as { inputs?: unknown }).inputs;
    if (Array.isArray(inputs)) return inputs as NumberInputConfig[];
  }
  return [];
}

function parseBoolean(settings: unknown): BooleanInputConfig[] {
  if (Array.isArray(settings)) return settings as BooleanInputConfig[];
  if (settings && typeof settings === "object") {
    const inputs = (settings as { inputs?: unknown }).inputs;
    if (Array.isArray(inputs)) return inputs as BooleanInputConfig[];
  }
  return [];
}

function parseList(settings: unknown): ListSettings {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { items: [], hasRemark: false, hasPhoto: false };
  }
  const src = settings as Partial<ListSettings>;
  return { items: Array.isArray(src.items) ? src.items : [], hasRemark: src.hasRemark === true, hasPhoto: src.hasPhoto === true };
}

function EditContent() {
  const router = useRouter();
  const params = useParams<{ customId: string; rowId: string }>();
  const { user, isLoading } = useUser();
  const customId = params?.customId ?? "";
  const rowId = params?.rowId ?? "";

  const [module, setModule] = useState<CustomModule | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [defaultValue, setDefaultValue] = useState("0");
  const [unit, setUnit] = useState("C");
  const [step, setStep] = useState("1");
  const [accepted, setAccepted] = useState("Goedgekeurd, ??");
  const [rejected, setRejected] = useState("Afgekeurd, ??");

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!user || !customId) return;
    let ignore = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("custom_modules")
        .select("id, name, module_type, settings")
        .eq("id", customId)
        .maybeSingle();

      if (ignore) return;
      if (error || !data) {
        setErrorMessage("Onderdeel niet gevonden.");
        return;
      }

      const moduleType = normalizeModuleType(data.module_type);
      const settings = moduleType === "boolean" ? parseBoolean(data.settings) : moduleType === "list" ? parseList(data.settings) : parseNumber(data.settings);
      const loaded: CustomModule = { id: String(data.id), name: data.name ?? "Aangepast", moduleType, settings };
      setModule(loaded);

      if (moduleType === "temperature") {
        const row = (settings as NumberInputConfig[]).find((item) => item.id === rowId);
        if (!row) return;
        setName(row.name);
        setDefaultValue(String(row.defaultValue));
        setUnit(row.unit);
        setStep(String(row.step));
      } else if (moduleType === "boolean") {
        const row = (settings as BooleanInputConfig[]).find((item) => item.id === rowId);
        if (!row) return;
        setName(row.name);
        setAccepted((row.acceptedReasons ?? ["Goedgekeurd", "??"]).join(", "));
        setRejected((row.rejectedReasons ?? ["Afgekeurd", "??"]).join(", "));
      } else {
        const row = (settings as ListSettings).items.find((item) => item.id === rowId);
        if (!row) return;
        setName(row.name);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [customId, rowId, user]);

  const isReady = useMemo(() => !!module && name.trim().length > 0, [module, name]);

  const parseReasons = (raw: string, fallback: string[]) => {
    const values = raw.split(",").map((v) => v.trim()).filter(Boolean);
    const withOther = values.includes("??") || values.includes("Anders") ? values : [...values, "??"];
    return withOther.length > 0 ? withOther : fallback;
  };

  const handleSave = useCallback(async () => {
    if (!module || !isReady) return;
    setSaving(true);
    setErrorMessage(null);

    let payload: NumberInputConfig[] | BooleanInputConfig[] | ListSettings;

    if (module.moduleType === "temperature") {
      const current = module.settings as NumberInputConfig[];
      const dv = Number.parseFloat(defaultValue);
      const st = Number.parseFloat(step);
      payload = current.map((item) =>
        item.id === rowId
          ? {
              ...item,
              name: name.trim(),
              defaultValue: Number.isFinite(dv) ? dv : item.defaultValue,
              unit: unit.trim() || item.unit,
              step: Number.isFinite(st) && st > 0 ? st : item.step,
            }
          : item,
      );
    } else if (module.moduleType === "boolean") {
      const current = module.settings as BooleanInputConfig[];
      payload = current.map((item) =>
        item.id === rowId
          ? {
              ...item,
              name: name.trim(),
              acceptedReasons: parseReasons(accepted, ["Goedgekeurd", "??"]),
              rejectedReasons: parseReasons(rejected, ["Afgekeurd", "??"]),
            }
          : item,
      );
    } else {
      const current = module.settings as ListSettings;
      payload = {
        ...current,
        items: current.items.map((item) =>
          item.id === rowId ? { ...item, name: name.trim() } : item,
        ),
      };
    }

    const settingsPayload = module.moduleType === "list" ? payload : { inputs: payload };
    const { error } = await supabase.from("custom_modules").update({ settings: settingsPayload }).eq("id", module.id);

    setSaving(false);
    if (error) {
      setErrorMessage("Opslaan mislukt.");
      return;
    }

    router.push(`/taken/custom/${module.id}`);
  }, [accepted, defaultValue, isReady, module, name, rejected, rowId, router, step, unit]);

  if (isLoading || !user || !module) {
    return <div className="flex min-h-screen items-center justify-center px-6"><p className="text-center text-lg font-semibold text-slate-500">SnelVink laden...</p></div>;
  }

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-6 pb-24 pt-20 sm:px-10 sm:pb-28 sm:pt-28">
        <SupercellButton type="button" size="lg" variant="neutral" onClick={() => router.push(`/taken/custom/${customId}`)} className="mb-8 flex h-20 w-full items-center justify-center gap-3 text-2xl">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />Terug
        </SupercellButton>

        <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Subtaak bewerken</h1>
          {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">{errorMessage}</p> : null}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-500">Naam</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="min-h-[56px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10" />
          </label>

          {module.moduleType === "temperature" ? (
            <>
              <label className="flex flex-col gap-2"><span className="text-sm font-bold text-slate-500">Standaardwaarde</span><input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} className="min-h-[56px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold text-slate-900 outline-none" /></label>
              <label className="flex flex-col gap-2"><span className="text-sm font-bold text-slate-500">Eenheid</span><input value={unit} onChange={(e) => setUnit(e.target.value)} className="min-h-[56px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold text-slate-900 outline-none" /></label>
              <label className="flex flex-col gap-2"><span className="text-sm font-bold text-slate-500">Stap (+/-)</span><input value={step} onChange={(e) => setStep(e.target.value)} className="min-h-[56px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold text-slate-900 outline-none" /></label>
            </>
          ) : null}

          {module.moduleType === "boolean" ? (
            <>
              <label className="flex flex-col gap-2"><span className="text-sm font-bold text-slate-500">Acceptatie-redenen (komma)</span><input value={accepted} onChange={(e) => setAccepted(e.target.value)} className="min-h-[56px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none" /></label>
              <label className="flex flex-col gap-2"><span className="text-sm font-bold text-slate-500">Afkeur-redenen (komma)</span><input value={rejected} onChange={(e) => setRejected(e.target.value)} className="min-h-[56px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none" /></label>
            </>
          ) : null}

          <SupercellButton size="lg" variant="success" disabled={!isReady || saving} onClick={() => void handleSave()} className="mt-2 h-14 w-full text-xl normal-case">
            {saving ? "Opslaan..." : "Opslaan"}
          </SupercellButton>
        </div>
      </section>
    </>
  );
}

export default function CustomRowEditPage() {
  return (
    <UserProvider>
      <EditContent />
    </UserProvider>
  );
}
