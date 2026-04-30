"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import SupercellButton from "@/components/SupercellButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { getModuleIcon } from "@/lib/taskModules";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Camera, Check, ChevronRight, Plus, X, Wrench } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_BUCKET = "haccp_photos";
const MAX_PHOTOS = 5;

type NumberInputConfig = { id: string; name: string; step: number; defaultValue: number; unit: string; hasRemark: boolean };
type BooleanInputConfig = { id: string; name: string; hasRemark: boolean; acceptedReasons?: string[]; rejectedReasons?: string[] };
type ListItemConfig = { id: string; name: string };
type ListSettings = { items: ListItemConfig[]; hasRemark: boolean; hasPhoto: boolean };
type ModuleType = "temperature" | "boolean" | "list";
type BooleanValue = "goedgekeurd" | "afgekeurd";

type Module = { id: string; name: string; icon: string; moduleType: ModuleType; hasPhoto: boolean; settings: NumberInputConfig[] | BooleanInputConfig[] | ListSettings };

type SelectedItem = { id: string; name: string; kind: ModuleType };

function normalizeType(value: unknown): ModuleType { if (value === "boolean") return "boolean"; if (value === "list") return "list"; return "temperature"; }
function parseNumber(settings: unknown): NumberInputConfig[] { if (Array.isArray(settings)) return settings as NumberInputConfig[]; if (settings && typeof settings === "object") { const inputs = (settings as { inputs?: unknown }).inputs; if (Array.isArray(inputs)) return inputs as NumberInputConfig[]; } return []; }
function parseBoolean(settings: unknown): BooleanInputConfig[] { if (Array.isArray(settings)) return settings as BooleanInputConfig[]; if (settings && typeof settings === "object") { const inputs = (settings as { inputs?: unknown }).inputs; if (Array.isArray(inputs)) return inputs as BooleanInputConfig[]; } return []; }
function parseList(settings: unknown): ListSettings { if (!settings || typeof settings !== "object" || Array.isArray(settings)) return { items: [], hasRemark: false, hasPhoto: true }; const src = settings as Partial<ListSettings>; return { items: Array.isArray(src.items) ? src.items : [], hasRemark: src.hasRemark === true, hasPhoto: src.hasPhoto !== false }; }
function hasPhoto(settings: unknown): boolean { if (!settings || typeof settings !== "object" || Array.isArray(settings)) return true; const v = (settings as { hasPhoto?: unknown }).hasPhoto; return v === undefined ? true : v === true; }
function pad2(v: number): string { return String(v).padStart(2, "0"); }
function nowLocal(): string { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function toIso(local: string): string { const d = new Date(local); return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(); }

function CustomRecordContent() {
  const router = useRouter();
  const params = useParams<{ customId: string }>();
  const customId = params?.customId ?? "";
  const { user, profile, isLoading, isFreePlan } = useUser();

  const [module, setModule] = useState<Module | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [recordedAtLocal, setRecordedAtLocal] = useState(nowLocal());
  const [temperature, setTemperature] = useState(0);
  const [status, setStatus] = useState<BooleanValue | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [listChecked, setListChecked] = useState(false);
  const [remark, setRemark] = useState("");

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!user || !customId) return;
    let ignore = false;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("custom_modules")
        .select("id, name, icon, module_type, settings")
        .eq("id", customId)
        .maybeSingle();

      if (ignore) return;
      if (error || !data) {
        setErrorMessage("Onderdeel niet gevonden.");
        setLoading(false);
        return;
      }

      const moduleType = normalizeType(data.module_type);
      const settings = moduleType === "boolean" ? parseBoolean(data.settings) : moduleType === "list" ? parseList(data.settings) : parseNumber(data.settings);
      setModule({ id: String(data.id), name: data.name ?? "Aangepast", icon: data.icon ?? "thermometer", moduleType, hasPhoto: hasPhoto(data.settings), settings });
      setLoading(false);
    };

    void load();
    return () => { ignore = true; };
  }, [customId, user]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  const openItem = useCallback((item: SelectedItem, initialTemp?: number) => {
    setSelectedItem(item);
    setRecordedAtLocal(nowLocal());
    setTemperature(initialTemp ?? 0);
    setStatus(null);
    setSelectedReasons([]);
    setCustomReason("");
    setListChecked(false);
    setRemark("");
    setPhotoFiles([]);
    setPhotoPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  }, []);

  const pickPhotos = () => {
    if (photoFiles.length >= MAX_PHOTOS) return;
    photoInputRef.current?.click();
  };

  const onPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const room = MAX_PHOTOS - photoFiles.length;
    const accepted = files.slice(0, room);
    const urls = accepted.map((f) => URL.createObjectURL(f));
    setPhotoFiles((prev) => [...prev, ...accepted]);
    setPhotoPreviews((prev) => [...prev, ...urls]);
    event.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return next;
    });
  };

  const canSave = useMemo(() => {
    if (!selectedItem || saving) return false;
    if (selectedItem.kind === "boolean") {
      return !!status && selectedReasons.length > 0;
    }
    if (selectedItem.kind === "list") {
      return listChecked;
    }
    return true;
  }, [listChecked, saving, selectedItem, selectedReasons.length, status]);

  const saveLog = useCallback(async () => {
    if (!module || !selectedItem || !user || !profile?.restaurant_id || !canSave) return;

    setSaving(true);
    setErrorMessage(null);

    const uploadedPhotoUrls: string[] = [];
    if (module.hasPhoto && !isFreePlan && photoFiles.length > 0) {
      for (const file of photoFiles) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `custom/${profile.restaurant_id}/${module.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) {
          setErrorMessage("Foto upload mislukt.");
          setSaving(false);
          return;
        }
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        if (data.publicUrl) uploadedPhotoUrls.push(data.publicUrl);
      }
    }

    const valueEntry = (() => {
      if (selectedItem.kind === "temperature") {
        const row = (module.settings as NumberInputConfig[]).find((item) => item.id === selectedItem.id);
        return {
          field_id: selectedItem.id,
          name: selectedItem.name,
          value: temperature,
          unit: row?.unit ?? "",
          remark,
        };
      }
      if (selectedItem.kind === "boolean") {
        const reasons = [...selectedReasons];
        if ((reasons.includes("??") || reasons.includes("Anders")) && customReason.trim()) reasons.push(customReason.trim());
        return {
          field_id: selectedItem.id,
          name: selectedItem.name,
          value: `${status === "goedgekeurd" ? "Goedgekeurd" : "Afgekeurd"} (${reasons.join(", ")})`,
          unit: "",
          remark,
        };
      }
      return {
        field_id: selectedItem.id,
        name: selectedItem.name,
        value: listChecked ? "Afgevinkt" : "Niet afgevinkt",
        unit: "",
        remark,
      };
    })();

    const recordedAt = toIso(recordedAtLocal);
    const logData = { module_name: module.name, module_type: module.moduleType, recorded_at: recordedAt, values: [valueEntry], photo_urls: uploadedPhotoUrls };

    const { error } = await supabase.from("custom_module_logs").insert({
      restaurant_id: profile.restaurant_id,
      user_id: user.id,
      module_id: module.id,
      custom_module_id: module.id,
      log_data: logData,
      logged_at: recordedAt,
      created_at: recordedAt,
    });

    setSaving(false);
    if (error) {
      setErrorMessage(`Opslaan mislukt: ${error.message}`);
      return;
    }

    router.push("/registreren");
  }, [canSave, customReason, isFreePlan, listChecked, module, photoFiles, profile?.restaurant_id, recordedAtLocal, remark, router, selectedItem, selectedReasons, status, temperature, user]);

  if (isLoading || !user || loading) return <div className="flex min-h-screen items-center justify-center px-6"><p className="text-center text-lg font-semibold text-slate-500">SnelVink laden...</p></div>;

  const numberItems = module && module.moduleType === "temperature" ? (module.settings as NumberInputConfig[]) : [];
  const booleanItems = module && module.moduleType === "boolean" ? (module.settings as BooleanInputConfig[]) : [];
  const listItems = module && module.moduleType === "list" ? (module.settings as ListSettings).items : [];

  const handleMenuNav = (tab: MenuTab) => {
    if (tab === "registreren") router.push("/registreren");
    else if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  const reasonOptions = (() => {
    if (!module || !selectedItem || selectedItem.kind !== "boolean") return [] as string[];
    const row = (module.settings as BooleanInputConfig[]).find((item) => item.id === selectedItem.id);
    if (status === "goedgekeurd") return row?.acceptedReasons ?? ["Goedgekeurd", "??"];
    if (status === "afgekeurd") return row?.rejectedReasons ?? ["Afgekeurd", "??"];
    return [];
  })();

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-6 pb-36 pt-8 sm:px-10 sm:pb-40 sm:pt-12">
        <SupercellButton variant="neutral" onClick={() => router.push("/registreren")} size="lg" className="mb-6 flex min-h-[72px] w-full items-center justify-center gap-3 text-2xl"><ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />Terug</SupercellButton>

        {module ? (
          <div className="mt-4 flex flex-col gap-6">
            <div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-100">{createElement(getModuleIcon(module.icon), { className: "h-8 w-8", strokeWidth: 2.5, "aria-hidden": true })}</div><div className="min-w-0"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">Aangepast onderdeel</p><h1 className="truncate text-3xl font-black tracking-tight text-slate-900">{module.name}</h1></div></div>

            {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-base font-bold text-red-700">{errorMessage}</p> : null}

            {!selectedItem ? (
              <div className="flex flex-col gap-3">
                {module.moduleType === "temperature" ? numberItems.map((item) => (
                  <SupercellButton key={item.id} size="lg" variant="neutral" onClick={() => openItem({ id: item.id, name: item.name, kind: "temperature" }, item.defaultValue)} className="flex min-h-[88px] w-full items-center justify-between gap-3 py-6 text-left text-2xl normal-case"><span className="flex-1 truncate">{item.name}</span><ChevronRight className="h-7 w-7 text-slate-500" strokeWidth={2.5} aria-hidden /></SupercellButton>
                )) : null}
                {module.moduleType === "boolean" ? booleanItems.map((item) => (
                  <SupercellButton key={item.id} size="lg" variant="neutral" onClick={() => openItem({ id: item.id, name: item.name, kind: "boolean" })} className="flex min-h-[88px] w-full items-center justify-between gap-3 py-6 text-left text-2xl normal-case"><span className="flex-1 truncate">{item.name}</span><ChevronRight className="h-7 w-7 text-slate-500" strokeWidth={2.5} aria-hidden /></SupercellButton>
                )) : null}
                {module.moduleType === "list" ? listItems.map((item) => (
                  <SupercellButton key={item.id} size="lg" variant="neutral" onClick={() => openItem({ id: item.id, name: item.name, kind: "list" })} className="flex min-h-[88px] w-full items-center justify-between gap-3 py-6 text-left text-2xl normal-case"><span className="flex-1 truncate">{item.name}</span><ChevronRight className="h-7 w-7 text-slate-500" strokeWidth={2.5} aria-hidden /></SupercellButton>
                )) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-black text-slate-900">{selectedItem.name}</h2>

                <label className="flex flex-col gap-2"><span className="text-sm font-bold uppercase tracking-wide text-slate-500">Datum &amp; tijd</span><input type="datetime-local" value={recordedAtLocal} onChange={(e) => setRecordedAtLocal(e.target.value)} className="min-h-[72px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-black tabular-nums text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10" /></label>

                {selectedItem.kind === "temperature" ? (
                  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3"><SupercellButton size="icon" variant="neutral" onClick={() => setTemperature((v) => Math.round((v - 1) * 10) / 10)} className="h-14 w-14">-</SupercellButton><div className="flex-1 text-center"><p className="text-5xl font-black text-slate-900">{temperature.toFixed(1)}</p></div><SupercellButton size="icon" variant="primary" onClick={() => setTemperature((v) => Math.round((v + 1) * 10) / 10)} className="h-14 w-14">+</SupercellButton></div>
                  </div>
                ) : null}

                {selectedItem.kind === "boolean" ? (
                  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="grid grid-cols-2 gap-3"><SupercellButton size="lg" variant={status === "goedgekeurd" ? "success" : "neutral"} onClick={() => { setStatus("goedgekeurd"); setSelectedReasons([]); setCustomReason(""); }} className="min-h-[88px] text-xl">Goedgekeurd</SupercellButton><SupercellButton size="lg" variant={status === "afgekeurd" ? "danger" : "neutral"} onClick={() => { setStatus("afgekeurd"); setSelectedReasons([]); setCustomReason(""); }} className="min-h-[88px] text-xl">Afgekeurd</SupercellButton></div>
                    {status ? <div className="mt-4 flex flex-wrap gap-2">{reasonOptions.map((reason) => { const active = selectedReasons.includes(reason); return <SupercellButton key={reason} size="sm" variant={active ? "primary" : "neutral"} onClick={() => setSelectedReasons((cur) => { const next = new Set(cur); if (next.has(reason)) next.delete(reason); else next.add(reason); return Array.from(next); })} className="normal-case">{reason}</SupercellButton>; })}</div> : null}
                    {selectedReasons.includes("??") || selectedReasons.includes("Anders") ? <input type="text" value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Eigen reden..." className="mt-3 min-h-[56px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10" /> : null}
                  </div>
                ) : null}

                {selectedItem.kind === "list" ? (
                  <SupercellButton size="lg" variant={listChecked ? "success" : "neutral"} onClick={() => setListChecked((v) => !v)} className="flex min-h-[88px] w-full items-center justify-between gap-3 text-left text-2xl normal-case"><span className="flex-1">Afgevinkt</span><span className={["flex h-10 w-10 items-center justify-center rounded-full", listChecked ? "bg-white text-green-600" : "border-2 border-slate-300 bg-white text-slate-300"].join(" ")}><Check className="h-6 w-6" strokeWidth={3} /></span></SupercellButton>
                ) : null}

                {module.hasPhoto ? (
                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPhotoChange} />
                    <SupercellButton variant="neutral" size="lg" onClick={pickPhotos} disabled={saving || photoFiles.length >= MAX_PHOTOS} className="flex min-h-[80px] w-full items-center justify-center gap-3 border border-slate-200 text-xl normal-case"><Camera className="h-7 w-7" />{photoFiles.length > 0 ? `Foto toevoegen (${photoFiles.length}/${MAX_PHOTOS})` : "Foto maken of kiezen"}</SupercellButton>
                    {photoPreviews.length > 0 ? <div className="mt-4 grid grid-cols-3 gap-3">{photoPreviews.map((url, i) => <div key={url} className="relative"><img src={url} alt={`Foto ${i + 1}`} className="h-28 w-full rounded-xl border border-slate-100 object-cover" /><SupercellButton size="icon" variant="danger" onClick={() => removePhoto(i)} className="absolute -right-2 -top-2 h-9 w-9 rounded-full border-b-[4px] ring-4 ring-white"><X className="h-4 w-4" /></SupercellButton></div>)}</div> : null}
                  </section>
                ) : null}

                <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Opmerking toevoegen..." rows={3} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10" />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center gap-5 rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm"><Wrench className="h-16 w-16 text-slate-400" strokeWidth={2} aria-hidden /><p className="text-xl font-bold text-slate-900">Onderdeel niet gevonden</p></div>
        )}
      </section>

      {module && selectedItem ? (
        <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-6">
          <SupercellButton variant="primary" size="lg" onClick={() => void saveLog()} disabled={!canSave} className="h-14 w-full text-xl">{saving ? "Opslaan..." : "Opslaan"}</SupercellButton>
        </div>
      ) : null}

      <FloatingMenu active="registreren" onChange={handleMenuNav} />
    </>
  );
}

export default function CustomModuleRecordPage() {
  return (
    <UserProvider>
      <CustomRecordContent />
    </UserProvider>
  );
}
