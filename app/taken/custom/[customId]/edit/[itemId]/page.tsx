"use client";

import FrequencySelector from "@/components/FrequencySelector";
import InlineAddInput from "@/components/InlineAddInput";
import SupercellButton from "@/components/SupercellButton";
import { UserProvider, useUser } from "@/hooks/useUser";
import {
  normalizeSchedule,
  scheduleToJson,
  validateSchedule,
  type FrequencySchedule,
} from "@/lib/schedules";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Check, Pencil, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CustomModuleType = "number" | "boolean" | "list";

type CustomModuleHeader = {
  id: string;
  name: string;
  moduleType: CustomModuleType;
};

function normalizeModuleType(value: unknown): CustomModuleType {
  if (value === "boolean") return "boolean";
  if (value === "list") return "list";
  return "number";
}

function CustomItemEditContent() {
  const router = useRouter();
  const params = useParams<{ customId: string; itemId: string }>();
  const customId = params?.customId ?? "";
  const itemId = params?.itemId ?? "";
  const { profile } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;

  const [customModule, setCustomModule] = useState<CustomModuleHeader | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shared
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState<FrequencySchedule | null>(null);

  // Getal
  const [hasDefault, setHasDefault] = useState(false);
  const [defaultValueText, setDefaultValueText] = useState("0");
  const [limitText, setLimitText] = useState("0");
  const [stepText, setStepText] = useState("0.1");
  const [unit, setUnit] = useState("");

  // Ja/Nee
  const [acceptReasons, setAcceptReasons] = useState<string[]>(["Anders"]);
  const [rejectReasons, setRejectReasons] = useState<string[]>(["Anders"]);
  const [reasonsTab, setReasonsTab] = useState<"accept" | "reject">("accept");

  // Lijst
  type CleaningTask = { id: string; name: string };
  const [tasks, setTasks] = useState<CleaningTask[]>([]);

  // Load module + item
  useEffect(() => {
    if (!customId || !itemId) return;

    let ignore = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      const { data: m, error: mError } = await supabase
        .from("custom_modules")
        .select("id, name, module_type")
        .eq("id", customId)
        .maybeSingle();

      if (ignore) return;

      if (mError || !m) {
        setErrorMessage("Onderdeel niet gevonden.");
        setLoading(false);
        return;
      }

      const moduleType = normalizeModuleType(m.module_type);
      const header: CustomModuleHeader = {
        id: String(m.id),
        name: m.name ?? "Aangepast onderdeel",
        moduleType,
      };
      setCustomModule(header);

      if (moduleType === "number") {
        const { data, error } = await supabase
          .from("haccp_equipments")
          .select(
            "id, name, default_temp, limit_temp, step, unit, last_temp, schedule",
          )
          .eq("id", itemId)
          .maybeSingle();
        if (ignore) return;
        if (error || !data) {
          setErrorMessage("Item niet gevonden.");
          setLoading(false);
          return;
        }
        setName(data.name ?? "");
        const def = data.default_temp;
        setHasDefault(def !== null && def !== undefined);
        setDefaultValueText(
          typeof def === "number"
            ? String(def)
            : typeof data.last_temp === "number"
              ? String(data.last_temp)
              : "0",
        );
        setLimitText(
          typeof data.limit_temp === "number" ? String(data.limit_temp) : "0",
        );
        setStepText(
          typeof data.step === "number" && data.step > 0
            ? String(data.step)
            : "0.1",
        );
        setUnit(typeof data.unit === "string" ? data.unit : "");
        setSchedule(normalizeSchedule(data.schedule));
      } else if (moduleType === "boolean") {
        const { data, error } = await supabase
          .from("haccp_products")
          .select("id, name, accept_reasons, reject_reasons, schedule")
          .eq("id", itemId)
          .maybeSingle();
        if (ignore) return;
        if (error || !data) {
          setErrorMessage("Item niet gevonden.");
          setLoading(false);
          return;
        }
        setName(data.name ?? "");
        setAcceptReasons(
          Array.isArray(data.accept_reasons) && data.accept_reasons.length > 0
            ? data.accept_reasons
            : ["Anders"],
        );
        setRejectReasons(
          Array.isArray(data.reject_reasons) && data.reject_reasons.length > 0
            ? data.reject_reasons
            : ["Anders"],
        );
        setSchedule(normalizeSchedule(data.schedule));
      } else {
        const { data, error } = await supabase
          .from("haccp_locations")
          .select("id, name, schedule")
          .eq("id", itemId)
          .maybeSingle();
        if (ignore) return;
        if (error || !data) {
          setErrorMessage("Item niet gevonden.");
          setLoading(false);
          return;
        }
        setName(data.name ?? "");
        setSchedule(normalizeSchedule(data.schedule));

        const { data: ts } = await supabase
          .from("haccp_cleaning_tasks")
          .select("id, name")
          .eq("location_id", itemId)
          .order("created_at", { ascending: true });
        if (ignore) return;
        setTasks((ts ?? []) as CleaningTask[]);
      }

      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [customId, itemId]);

  const backToManage = `/taken/custom/${customId}`;

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage("Vul een naam in.");
      return;
    }
    if (!customModule) return;

    setSaving(true);
    setErrorMessage(null);

    const scheduleError = validateSchedule(schedule);
    if (scheduleError) {
      setErrorMessage(scheduleError);
      setSaving(false);
      return;
    }

    if (customModule.moduleType === "number") {
      const parsedDefault = Number.parseFloat(
        defaultValueText.replace(",", "."),
      );
      const parsedLimit = Number.parseFloat(limitText.replace(",", "."));
      const parsedStep = Number.parseFloat(stepText.replace(",", "."));

      const { error } = await supabase
        .from("haccp_equipments")
        .update({
          name: trimmed,
          default_temp: hasDefault && Number.isFinite(parsedDefault)
            ? parsedDefault
            : null,
          limit_temp: Number.isFinite(parsedLimit) ? parsedLimit : null,
          step:
            Number.isFinite(parsedStep) && parsedStep > 0 ? parsedStep : 0.1,
          unit: unit.trim() || null,
          schedule: scheduleToJson(schedule),
        })
        .eq("id", itemId);

      if (error) {
        console.error("Save failed:", error);
        setErrorMessage("Opslaan mislukt.");
        setSaving(false);
        return;
      }
    } else if (customModule.moduleType === "boolean") {
      const finalAccept = acceptReasons.includes("Anders")
        ? acceptReasons
        : [...acceptReasons, "Anders"];
      const finalReject = rejectReasons.includes("Anders")
        ? rejectReasons
        : [...rejectReasons, "Anders"];
      const { error } = await supabase
        .from("haccp_products")
        .update({
          name: trimmed,
          accept_reasons: finalAccept,
          reject_reasons: finalReject,
          schedule: scheduleToJson(schedule),
        })
        .eq("id", itemId);

      if (error) {
        console.error("Save failed:", error);
        setErrorMessage("Opslaan mislukt.");
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("haccp_locations")
        .update({ name: trimmed, schedule: scheduleToJson(schedule) })
        .eq("id", itemId);

      if (error) {
        console.error("Save failed:", error);
        setErrorMessage("Opslaan mislukt.");
        setSaving(false);
        return;
      }
    }

    router.push(backToManage);
  }, [
    name,
    customModule,
    defaultValueText,
    limitText,
    stepText,
    unit,
    hasDefault,
    acceptReasons,
    rejectReasons,
    schedule,
    itemId,
    router,
    backToManage,
  ]);

  const handleAddTask = useCallback(
    async (taskName: string) => {
      if (!restaurantId) {
        setErrorMessage("Geen restaurant gekoppeld.");
        return;
      }
      const { data, error } = await supabase
        .from("haccp_cleaning_tasks")
        .insert({
          restaurant_id: restaurantId,
          location_id: itemId,
          name: taskName,
        })
        .select("id, name")
        .single();
      if (error) {
        setErrorMessage("Item toevoegen mislukt.");
        return;
      }
      if (data) setTasks((prev) => [...prev, data as { id: string; name: string }]);
    },
    [restaurantId, itemId],
  );

  const handleRenameTask = useCallback(
    async (task: { id: string; name: string }) => {
      const next = window.prompt("Nieuwe naam", task.name);
      if (!next?.trim() || next.trim() === task.name) return;
      const { error } = await supabase
        .from("haccp_cleaning_tasks")
        .update({ name: next.trim() })
        .eq("id", task.id);
      if (error) {
        setErrorMessage("Hernoemen mislukt.");
        return;
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, name: next.trim() } : t)),
      );
    },
    [],
  );

  const handleDeleteTask = useCallback(
    async (task: { id: string; name: string }) => {
      const ok = window.confirm(`"${task.name}" verwijderen?`);
      if (!ok) return;
      const { error } = await supabase
        .from("haccp_cleaning_tasks")
        .delete()
        .eq("id", task.id);
      if (error) {
        setErrorMessage("Verwijderen mislukt.");
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-gray-600">
          Laden...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-32 pt-8 sm:px-6">
      <div className="mx-auto max-w-md">
        <SupercellButton
          type="button"
          size="lg"
          variant="neutral"
          onClick={() => router.push(backToManage)}
          className="mb-8 flex h-20 w-full items-center justify-center gap-3 text-2xl"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </SupercellButton>

        <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-slate-900">
          Item bewerken
        </h1>

        {errorMessage ? (
          <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {!customModule ? null : (
          <div className="flex flex-col gap-6">
            {/* Name */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Naam
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[72px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 text-2xl font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
              />
            </label>

            {customModule.moduleType === "number" ? (
              <NumberItemFields
                hasDefault={hasDefault}
                onToggleHasDefault={setHasDefault}
                defaultValueText={defaultValueText}
                onChangeDefaultValueText={setDefaultValueText}
                limitText={limitText}
                onChangeLimitText={setLimitText}
                stepText={stepText}
                onChangeStepText={setStepText}
                unit={unit}
                onChangeUnit={setUnit}
              />
            ) : null}

            {customModule.moduleType === "boolean" ? (
              <BooleanItemFields
                tab={reasonsTab}
                onChangeTab={setReasonsTab}
                acceptReasons={acceptReasons}
                onChangeAcceptReasons={setAcceptReasons}
                rejectReasons={rejectReasons}
                onChangeRejectReasons={setRejectReasons}
              />
            ) : null}

            {customModule.moduleType === "list" ? (
              <ListItemFields
                tasks={tasks}
                onAdd={handleAddTask}
                onRename={handleRenameTask}
                onDelete={handleDeleteTask}
              />
            ) : null}

            <FrequencySelector value={schedule} onChange={setSchedule} />

            <SupercellButton
              type="button"
              size="lg"
              variant="success"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="min-h-[72px] w-full text-2xl"
            >
              {saving ? "Opslaan..." : "Opslaan"}
            </SupercellButton>
          </div>
        )}
      </div>
    </main>
  );
}

// =========================================================================
// Number (Getal) item fields
// =========================================================================
type NumberItemFieldsProps = {
  hasDefault: boolean;
  onToggleHasDefault: (next: boolean) => void;
  defaultValueText: string;
  onChangeDefaultValueText: (next: string) => void;
  limitText: string;
  onChangeLimitText: (next: string) => void;
  stepText: string;
  onChangeStepText: (next: string) => void;
  unit: string;
  onChangeUnit: (next: string) => void;
};

function NumberItemFields({
  hasDefault,
  onToggleHasDefault,
  defaultValueText,
  onChangeDefaultValueText,
  limitText,
  onChangeLimitText,
  stepText,
  onChangeStepText,
  unit,
  onChangeUnit,
}: NumberItemFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-slate-800">
            Standaardwaarde instellen
          </span>
          <button
            type="button"
            onClick={() => onToggleHasDefault(!hasDefault)}
            className={[
              "relative flex h-8 w-14 shrink-0 items-center rounded-full border-2 transition-colors",
              hasDefault
                ? "border-blue-700 bg-blue-500"
                : "border-slate-400 bg-slate-200",
            ].join(" ")}
            aria-pressed={hasDefault}
          >
            <span
              className={[
                "absolute top-0.5 h-5 w-5 rounded-full border-2 border-slate-300 bg-white transition-transform",
                hasDefault ? "translate-x-7" : "translate-x-1",
              ].join(" ")}
            />
          </button>
        </div>

        <p className="text-sm text-slate-500">
          {hasDefault
            ? "Bij elke nieuwe registratie start de waarde op deze standaardwaarde."
            : "Bij elke nieuwe registratie start de waarde op de laatste meting."}
        </p>

        {hasDefault ? (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Standaardwaarde {unit ? `(${unit})` : ""}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={defaultValueText}
              onChange={(e) => onChangeDefaultValueText(e.target.value)}
              className="min-h-[72px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 text-center text-3xl font-black tabular-nums text-blue-600 outline-none focus:border-blue-500 focus:border-b-blue-700"
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="text-lg font-bold text-slate-800">
          Limiet
        </span>
        <p className="text-sm text-slate-500">
          Boven deze waarde moet een corrigerende maatregel worden ingevuld.
        </p>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Limietwaarde {unit ? `(${unit})` : ""}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={limitText}
            onChange={(e) => onChangeLimitText(e.target.value)}
            className="min-h-[72px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 text-center text-3xl font-black tabular-nums text-blue-600 outline-none focus:border-blue-500 focus:border-b-blue-700"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Stapgrootte
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={stepText}
            onChange={(e) => onChangeStepText(e.target.value)}
            className="min-h-[64px] rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-3 text-center text-xl font-black tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Eenheid
          </span>
          <input
            type="text"
            value={unit}
            onChange={(e) => onChangeUnit(e.target.value)}
            placeholder="bv. °C, kg, %"
            className="min-h-[64px] rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-3 text-center text-xl font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
          />
        </label>
      </div>
    </>
  );
}

// =========================================================================
// Boolean (Ja/Nee) item fields
// =========================================================================
type BooleanItemFieldsProps = {
  tab: "accept" | "reject";
  onChangeTab: (next: "accept" | "reject") => void;
  acceptReasons: string[];
  onChangeAcceptReasons: (next: string[]) => void;
  rejectReasons: string[];
  onChangeRejectReasons: (next: string[]) => void;
};

function BooleanItemFields({
  tab,
  onChangeTab,
  acceptReasons,
  onChangeAcceptReasons,
  rejectReasons,
  onChangeRejectReasons,
}: BooleanItemFieldsProps) {
  const removeReason = (target: "accept" | "reject", reason: string) => {
    if (reason === "Anders") return;
    if (target === "accept") {
      onChangeAcceptReasons(acceptReasons.filter((r) => r !== reason));
    } else {
      onChangeRejectReasons(rejectReasons.filter((r) => r !== reason));
    }
  };

  const addReason = (target: "accept" | "reject", name: string) => {
    if (target === "accept") {
      if (acceptReasons.includes(name)) return;
      onChangeAcceptReasons([
        ...acceptReasons.filter((r) => r !== "Anders"),
        name,
        "Anders",
      ]);
    } else {
      if (rejectReasons.includes(name)) return;
      onChangeRejectReasons([
        ...rejectReasons.filter((r) => r !== "Anders"),
        name,
        "Anders",
      ]);
    }
  };

  const list = tab === "accept" ? acceptReasons : rejectReasons;
  const accentClass =
    tab === "accept"
      ? "border-emerald-200 bg-emerald-50"
      : "border-red-200 bg-red-50";
  const headingColor = tab === "accept" ? "text-emerald-800" : "text-red-800";

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
        Redenen per status
      </span>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChangeTab("accept")}
          aria-pressed={tab === "accept"}
          className={[
            "flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-b-4 transition-all",
            tab === "accept"
              ? "border-emerald-700 bg-emerald-500 text-white"
              : "border-emerald-300 bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          <Check className="h-8 w-8" strokeWidth={3} />
          <span className="text-sm font-black">Goedgekeurd</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("reject")}
          aria-pressed={tab === "reject"}
          className={[
            "flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-b-4 transition-all",
            tab === "reject"
              ? "border-red-700 bg-red-500 text-white"
              : "border-red-300 bg-red-50 text-red-700",
          ].join(" ")}
        >
          <X className="h-8 w-8" strokeWidth={3} />
          <span className="text-sm font-black">Afgekeurd</span>
        </button>
      </div>

      <div className={["rounded-2xl border-2 p-4", accentClass].join(" ")}>
        <h3 className={["mb-3 text-lg font-bold", headingColor].join(" ")}>
          {tab === "accept"
            ? "Redenen voor goedkeuring"
            : "Redenen voor afkeuring"}
        </h3>
        <ul className="mb-4 flex flex-col gap-2">
          {list.map((reason) => (
            <li
              key={reason}
              className="flex items-center justify-between gap-2 rounded-xl bg-white px-4 py-3"
            >
              <span className="font-semibold text-slate-800">{reason}</span>
              {reason !== "Anders" ? (
                <button
                  type="button"
                  onClick={() => removeReason(tab, reason)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                  aria-label={`Verwijder ${reason}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <span className="text-xs text-slate-400">Standaard</span>
              )}
            </li>
          ))}
        </ul>

        <InlineAddInput
          label="Reden toevoegen"
          placeholder="Nieuwe reden..."
          onAdd={(value) => addReason(tab, value)}
        />
      </div>
    </div>
  );
}

// =========================================================================
// List (Lijst) item fields — a "groep" with child items/tasks
// =========================================================================
type ListItemFieldsProps = {
  tasks: { id: string; name: string }[];
  onAdd: (name: string) => Promise<void> | void;
  onRename: (task: { id: string; name: string }) => void;
  onDelete: (task: { id: string; name: string }) => void;
};

function ListItemFields({
  tasks,
  onAdd,
  onRename,
  onDelete,
}: ListItemFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
        Items
      </span>
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <span className="flex-1 truncate font-semibold text-slate-800">
              {task.name}
            </span>
            <button
              type="button"
              onClick={() => onRename(task)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label={`Hernoem ${task.name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
              aria-label={`Verwijder ${task.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <InlineAddInput
        label="Item toevoegen"
        placeholder="Naam van het item"
        onAdd={onAdd}
      />
    </div>
  );
}

export default function CustomItemEditPage() {
  return (
    <UserProvider>
      <CustomItemEditContent />
    </UserProvider>
  );
}
