"use client";

import SupercellButton from "@/components/SupercellButton";
import UpgradePromptModal from "@/components/UpgradePromptModal";
import { useTranslation } from "@/hooks/useTranslation";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { Camera, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_PHOTOS = 5;
const STORAGE_BUCKET = "haccp_photos";

const DEFAULT_ACCEPT_REASONS: readonly string[] = ["Anders"];
const DEFAULT_REJECT_REASONS: readonly string[] = [
  "Temperatuur te hoog",
  "Verpakking beschadigd",
  "THT/TGT verstreken",
  "Verkeerd product",
  "Kwaliteit onvoldoende",
  "Anders",
];

type Product = {
  id: string;
  name: string;
  accept_reasons: string[] | null;
  reject_reasons: string[] | null;
};

type Status = "goedgekeurd" | "afgekeurd";

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}
function formatLocalDateTime(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}
function buildRecordedAt(local: string): string {
  const parsed = new Date(local);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

type Props = {
  mode?: "manage" | "record";
};

export default function OntvangstCheck({ mode = "record" }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, profile, isFreePlan } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;

  // ---------- form state ----------
  const [recordedAtLocal, setRecordedAtLocal] = useState<string>(() =>
    formatLocalDateTime(new Date()),
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [opmerking, setOpmerking] = useState("");

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  // ---------- load products ----------
  const loadProducts = useCallback(async () => {
    if (!restaurantId) return;
    setLoadingProducts(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("haccp_products")
      .select("id, name, accept_reasons, reject_reasons")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("haccp_products laden mislukt:", error);
      setErrorMessage("Producten laden mislukt. Probeer opnieuw.");
    } else {
      setProducts((data ?? []) as Product[]);
    }
    setLoadingProducts(false);
  }, [restaurantId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts, restaurantId]);

  // ---------- product CRUD ----------
  const handleAddProduct = useCallback(async () => {
    if (!restaurantId) return;
    const input = window.prompt("Naam van het nieuwe product");
    if (!input) return;
    const name = input.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from("haccp_products")
      .insert({ restaurant_id: restaurantId, name })
      .select("id, name, accept_reasons, reject_reasons")
      .single();

    if (error) {
      console.error("Product toevoegen mislukt:", error);
      setErrorMessage("Product toevoegen mislukt.");
      return;
    }
    if (data) {
      const next = data as Product;
      setProducts((prev) => [...prev, next]);
      if (mode === "record") {
        setSelectedProduct(next);
      }
    }
  }, [restaurantId, mode]);

  const handleDeleteProduct = useCallback(
    async (product: Product) => {
      const ok = window.confirm(
        `"${product.name}" verwijderen? De historie blijft bewaard.`,
      );
      if (!ok) return;

      const { error } = await supabase
        .from("haccp_products")
        .delete()
        .eq("id", product.id);

      if (error) {
        console.error("Verwijderen mislukt:", error);
        setErrorMessage("Verwijderen mislukt.");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    },
    [],
  );

  // ---------- photo handling ----------
  useEffect(() => {
    return () => {
      photoPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickPhotos = () => {
    if (isFreePlan) {
      setShowUpgradeModal(true);
      return;
    }
    if (photoFiles.length >= MAX_PHOTOS) return;
    photoInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const room = MAX_PHOTOS - photoFiles.length;
    const accepted = files.slice(0, room);
    const newPreviews = accepted.map((f) => URL.createObjectURL(f));
    setPhotoFiles((prev) => [...prev, ...accepted]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
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

  // ---------- reset helpers ----------
  const resetProduct = () => {
    setSelectedProduct(null);
    setStatus(null);
    setSelectedReasons([]);
    setOpmerking("");
  };

  const isAndersOption = (reason: string) => reason.trim() === "Anders";
  const isAndersEntry = (entry: string) =>
    entry === "Anders" || entry.startsWith("Anders:") || entry.startsWith("Anders ");

  const toggleReason = (reason: string) => {
    if (isAndersOption(reason)) {
      setSelectedReasons((prev) => {
        const existing = prev.find(isAndersEntry);
        if (existing) {
          return prev.filter((r) => !isAndersEntry(r));
        }
        const input = window.prompt("Beschrijf de reden (optioneel)") ?? "";
        const trimmed = input.trim();
        const entry = trimmed.length > 0 ? `Anders: ${trimmed}` : "Anders";
        return [...prev, entry];
      });
      return;
    }
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    );
  };

  // Wanneer de status wisselt, oude selectie van redenen wissen.
  const handleSetStatus = (next: Status) => {
    if (next !== status) setSelectedReasons([]);
    setStatus(next);
  };

  // ---------- step derivation ----------
  const currentStep: "product" | "beoordeling" =
    !selectedProduct ? "product" : "beoordeling";

  const reasonsForStatus =
    status === "goedgekeurd"
      ? selectedProduct?.accept_reasons &&
        selectedProduct.accept_reasons.length > 0
        ? selectedProduct.accept_reasons
        : DEFAULT_ACCEPT_REASONS
      : status === "afgekeurd"
        ? selectedProduct?.reject_reasons &&
          selectedProduct.reject_reasons.length > 0
          ? selectedProduct.reject_reasons
          : DEFAULT_REJECT_REASONS
        : [];

  const canSave =
    !!selectedProduct && !!status && !!restaurantId && !isSaving;

  // ---------- save ----------
  const handleSave = async () => {
    if (!canSave || !restaurantId || !selectedProduct || !status) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const uploadedUrls: string[] = [];
      if (!isFreePlan && photoFiles.length > 0) {
        for (const file of photoFiles) {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `ontvangst/${restaurantId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, { cacheControl: "3600", upsert: false });
          if (uploadError) {
            console.error("Foto upload mislukt:", uploadError);
            setErrorMessage("Foto upload mislukt. Probeer opnieuw.");
            return;
          }
          const { data } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);
          if (data.publicUrl) uploadedUrls.push(data.publicUrl);
        }
      }

      const reasonsArray = selectedReasons.filter((r) => r.trim().length > 0);

      const { error: insertError } = await supabase
        .from("haccp_records")
        .insert({
          restaurant_id: restaurantId,
          user_id: user?.id ?? null,
          module_type: "ontvangst",
          equipment_id: null,
          product_name: selectedProduct.name,
          status,
          reason: reasonsArray.length > 0 ? reasonsArray.join(", ") : null,
          reasons: reasonsArray,
          temperature: null,
          recorded_at: buildRecordedAt(recordedAtLocal),
          image_urls: uploadedUrls,
          opmerking: opmerking.trim() || null,
        });

      if (insertError) {
        console.error("Registratie opslaan mislukt:", insertError);
        setErrorMessage("Opslaan mislukt. Probeer opnieuw.");
        return;
      }

      router.push("/registreren");
    } catch (err) {
      console.error("Onverwachte fout bij opslaan:", err);
      setErrorMessage("Onverwachte fout. Probeer opnieuw.");
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================
  const photoSlotsLeft = MAX_PHOTOS - photoFiles.length;

  // =========================================================================
  // MANAGE MODE: Only show product list with edit/delete buttons
  // =========================================================================
  if (mode === "manage") {
    return (
      <div className="mt-2 flex flex-col gap-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Ontvangst
        </h2>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {!restaurantId ? (
          <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-slate-500 shadow-sm">
            Geen restaurant gekoppeld aan je account.
          </p>
        ) : null}

        {loadingProducts ? (
          <p className="text-center text-slate-500">Producten laden…</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {products.map((p) => (
              <li key={p.id}>
                <div className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xl font-bold text-slate-900 truncate">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
                    <a
                      href={`/taken/ontvangst/edit/${p.id}`}
                      aria-label={`Bewerk ${p.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 active:bg-slate-200"
                    >
                      <Pencil className="h-5 w-5" aria-hidden />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p)}
                      aria-label={`Verwijder ${p.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-red-500 transition-colors hover:bg-red-50 active:bg-red-100"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <SupercellButton
          size="lg"
          variant="neutral"
          onClick={handleAddProduct}
          disabled={!restaurantId}
          className="flex min-h-[80px] w-full items-center justify-center gap-3 border-2 border-dashed border-slate-200 text-xl normal-case"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Product toevoegen
        </SupercellButton>
      </div>
    );
  }

  // =========================================================================
  // RECORD MODE: Full recording flow
  // =========================================================================
  return (
    <div className="mt-2 flex flex-col gap-6">
      <UpgradePromptModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      >
        {t("basicPlanPhotoMessage")}
      </UpgradePromptModal>

      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
        Ontvangst
      </h2>

      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {!restaurantId ? (
        <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-slate-500 shadow-sm">
          Geen restaurant gekoppeld aan je account.
        </p>
      ) : null}

      {/* ===== Product sectie ===== */}
      <Section
        title="Product"
        summary={selectedProduct?.name ?? null}
        onEdit={selectedProduct ? resetProduct : null}
        collapsed={currentStep !== "product"}
      >
        {loadingProducts ? (
          <p className="text-center text-slate-500">Producten laden…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {products.map((p) => (
              <SupercellButton
                key={p.id}
                size="lg"
                variant="neutral"
                onClick={() => setSelectedProduct(p)}
                className="flex min-h-[80px] w-full items-center justify-between text-left text-2xl normal-case"
              >
                <span className="flex-1 truncate">{p.name}</span>
              </SupercellButton>
            ))}

            <SupercellButton
              size="lg"
              variant="neutral"
              onClick={handleAddProduct}
              className="flex min-h-[80px] w-full items-center justify-center gap-3 border-2 border-dashed border-slate-200 text-xl normal-case"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
              Product toevoegen
            </SupercellButton>
          </div>
        )}
      </Section>

      {/* ===== Datum/tijd (alleen na product selectie) ===== */}
      {selectedProduct ? (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Datum &amp; tijd van ontvangst
          </span>
          <input
            type="datetime-local"
            value={recordedAtLocal}
            onChange={(e) => setRecordedAtLocal(e.target.value)}
            className="min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white px-5 text-center text-2xl font-black tabular-nums text-slate-900 shadow-sm outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 sm:text-3xl"
          />
        </label>
      ) : null}

      {/* ===== Beoordeling – knoppen blijven altijd zichtbaar ===== */}
      {selectedProduct ? (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Beoordeling
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSetStatus("goedgekeurd")}
              aria-pressed={status === "goedgekeurd"}
              className={[
                "flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-b-4 transition-all",
                status === "goedgekeurd"
                  ? "border-emerald-700 bg-emerald-500 text-white"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700 active:bg-emerald-100",
              ].join(" ")}
            >
              <Check className="h-9 w-9" strokeWidth={3} aria-hidden />
              <span className="text-lg font-black">Goedgekeurd</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetStatus("afgekeurd")}
              aria-pressed={status === "afgekeurd"}
              className={[
                "flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-b-4 transition-all",
                status === "afgekeurd"
                  ? "border-red-700 bg-red-500 text-white"
                  : "border-red-300 bg-red-50 text-red-700 active:bg-red-100",
              ].join(" ")}
            >
              <X className="h-9 w-9" strokeWidth={3} aria-hidden />
              <span className="text-lg font-black">Afgekeurd</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* ===== Redenen – multi-select panel onder de beoordelingsknoppen ===== */}
      {selectedProduct && status ? (
        <div
          className={[
            "rounded-2xl border-2 p-4",
            status === "goedgekeurd"
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50",
          ].join(" ")}
        >
          <h3
            className={[
              "mb-3 text-lg font-black",
              status === "goedgekeurd" ? "text-emerald-800" : "text-red-800",
            ].join(" ")}
          >
            {status === "goedgekeurd"
              ? "Redenen voor goedkeuring"
              : "Redenen voor afkeuring"}
          </h3>

          {reasonsForStatus.length === 0 ? (
            <p className="rounded-xl bg-white px-4 py-4 text-center text-sm font-semibold text-slate-500">
              Geen redenen geconfigureerd voor dit product.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {reasonsForStatus.map((r) => {
                const andersEntry = isAndersOption(r)
                  ? selectedReasons.find(isAndersEntry) ?? null
                  : null;
                const isSelected = isAndersOption(r)
                  ? andersEntry !== null
                  : selectedReasons.includes(r);
                const customAndersText =
                  andersEntry && andersEntry.startsWith("Anders:")
                    ? andersEntry.slice("Anders:".length).trim()
                    : "";
                const accent =
                  status === "goedgekeurd"
                    ? isSelected
                      ? "border-emerald-700 bg-emerald-500 text-white"
                      : "border-emerald-200 bg-white text-slate-800 active:bg-emerald-50"
                    : isSelected
                      ? "border-red-700 bg-red-500 text-white"
                      : "border-red-200 bg-white text-slate-800 active:bg-red-50";
                return (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => toggleReason(r)}
                      aria-pressed={isSelected}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-xl border-2 border-b-4 px-4 py-4 text-left text-lg font-bold transition-all",
                        accent,
                      ].join(" ")}
                    >
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                        <span className="truncate">{r}</span>
                        {isAndersOption(r) && customAndersText ? (
                          <span
                            className={[
                              "truncate text-sm font-semibold",
                              isSelected
                                ? "text-white/90"
                                : status === "goedgekeurd"
                                  ? "text-emerald-700"
                                  : "text-red-700",
                            ].join(" ")}
                          >
                            “{customAndersText}”
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? (
                        <Check
                          className="h-6 w-6 shrink-0"
                          strokeWidth={3}
                          aria-hidden
                        />
                      ) : (
                        <span className="h-6 w-6 shrink-0 rounded-full border-2 border-current opacity-30" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedReasons.length > 0 ? (
            <p
              className={[
                "mt-4 text-sm font-bold",
                status === "goedgekeurd" ? "text-emerald-800" : "text-red-800",
              ].join(" ")}
            >
              {selectedReasons.length} reden
              {selectedReasons.length === 1 ? "" : "en"} geselecteerd
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ===== Opmerking + Foto + opslaan ===== */}
      {selectedProduct && status ? (
        <div className="flex flex-col gap-4">
          {/* Opmerking */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Opmerking (optioneel)
            </span>
            <textarea
              value={opmerking}
              onChange={(e) => setOpmerking(e.target.value)}
              placeholder="Voeg een opmerking toe..."
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-semibold text-slate-900 shadow-sm outline-none resize-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
            />
          </label>

          <h3 className="text-xl font-black uppercase tracking-wide text-slate-500">
            Foto&apos;s (optioneel)
          </h3>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoChange}
          />

          <SupercellButton
            size="lg"
            variant="neutral"
            onClick={handlePickPhotos}
            disabled={isSaving || photoSlotsLeft <= 0}
            className="flex min-h-[80px] w-full items-center justify-center gap-3 border border-slate-200 text-xl normal-case"
          >
            <Camera className="h-7 w-7" aria-hidden />
            {photoSlotsLeft <= 0
              ? `Maximaal ${MAX_PHOTOS} foto's`
              : photoFiles.length > 0
                ? `Foto toevoegen (${photoFiles.length}/${MAX_PHOTOS})`
                : "Foto maken of kiezen (max 5)"}
          </SupercellButton>

          {photoPreviews.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {photoPreviews.map((url, i) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="h-28 w-full rounded-xl border border-slate-100 object-cover shadow-sm"
                  />
                  <SupercellButton
                    size="icon"
                    variant="danger"
                    onClick={() => removePhoto(i)}
                    aria-label={`Foto ${i + 1} verwijderen`}
                    className="absolute -right-3 -top-3 flex h-16 w-16 items-center justify-center rounded-full border-b-[4px] ring-4 ring-white"
                  >
                    <X className="h-4 w-4" strokeWidth={3} aria-hidden />
                  </SupercellButton>
                </div>
              ))}
            </div>
          ) : null}

          <SupercellButton
            size="lg"
            variant="success"
            onClick={handleSave}
            disabled={!canSave}
            aria-busy={isSaving}
            className="flex min-h-[96px] w-full items-center justify-center gap-3 text-2xl normal-case"
          >
            {isSaving ? (
              "Opslaan…"
            ) : (
              <>
                <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
                Opslaan
              </>
            )}
          </SupercellButton>
        </div>
      ) : null}
    </div>
  );
}

// =========================================================================
// Section – samenvatting + wijzig-knop. Ingeklapte secties tonen alleen
// de samenvatting zodat de gebruiker altijd ziet wat hij/zij eerder koos.
// =========================================================================
type SectionProps = {
  title: string;
  summary: string | null;
  onEdit: (() => void) | null;
  collapsed: boolean;
  summaryAccentClass?: string;
  children: React.ReactNode;
};

function Section({
  title,
  summary,
  onEdit,
  collapsed,
  summaryAccentClass,
  children,
}: SectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
        {collapsed && summary && onEdit ? (
          <SupercellButton
            size="sm"
            variant="neutral"
            onClick={onEdit}
            className="flex min-h-[64px] items-center gap-2 text-base normal-case"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Wijzigen
          </SupercellButton>
        ) : null}
      </div>

      {collapsed && summary ? (
        <p
          className={`truncate rounded-2xl border border-slate-100 bg-white px-5 py-5 text-2xl font-black text-slate-900 shadow-sm ${
            summaryAccentClass ?? ""
          }`}
        >
          {summary}
        </p>
      ) : (
        children
      )}
    </section>
  );
}
