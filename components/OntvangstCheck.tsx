"use client";

import InlineAddInput from "@/components/InlineAddInput";
import SupercellButton from "@/components/SupercellButton";
import UpgradePromptModal from "@/components/UpgradePromptModal";
import { useTranslation } from "@/hooks/useTranslation";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { Camera, Check, Pencil, Trash2, X } from "lucide-react";
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
  require_correction_on_reject: boolean | null;
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
  /**
   * Wanneer gezet, opereert de module op rijen met dit `custom_module_id`
   * in plaats van standaard ontvangst-producten. Records worden geschreven
   * naar `haccp_records` met `module_type = "custom_boolean"`.
   */
  customModuleId?: string;
  /** Custom heeft een eigen titel ("module naam") in plaats van "Ontvangst". */
  title?: string;
};

export default function OntvangstCheck({
  mode = "record",
  customModuleId,
  title,
}: Props) {
  const isCustom = !!customModuleId;
  const editBasePath = isCustom
    ? `/taken/custom/${customModuleId}/edit`
    : "/taken/ontvangst/edit";
  const recordModuleType = isCustom ? "custom_boolean" : "ontvangst";
  const router = useRouter();
  const { t } = useTranslation();
  const { user, profile, isFreePlan } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;
  const headingTitle = title ?? t("ontvangst");
  const itemSingular = isCustom ? t("item") : t("product");
  const itemSingularLower = itemSingular.toLowerCase();
  const allowAddItemInRecord = !(mode === "record" && isCustom);

  // ---------- form state ----------
  const [recordedAtLocal, setRecordedAtLocal] = useState<string>(() =>
    formatLocalDateTime(new Date()),
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [andersText, setAndersText] = useState("");
  const [correctionAction, setCorrectionAction] = useState("");
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

    const baseQuery = supabase
      .from("haccp_products")
      .select(
        "id, name, accept_reasons, reject_reasons, require_correction_on_reject",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });
    const { data, error } = await (isCustom
      ? baseQuery.eq("custom_module_id", customModuleId)
      : baseQuery.is("custom_module_id", null));

    if (error) {
      console.error("haccp_products laden mislukt:", error);
      setErrorMessage(t("loadProductsFailed"));
    } else {
      setProducts((data ?? []) as Product[]);
    }
    setLoadingProducts(false);
  }, [restaurantId, customModuleId, isCustom, t]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts, restaurantId]);

  // ---------- product CRUD ----------
  const handleAddProduct = useCallback(
    async (name: string) => {
      if (!restaurantId) return;

      const { data, error } = await supabase
        .from("haccp_products")
        .insert({
          restaurant_id: restaurantId,
          name,
          custom_module_id: customModuleId ?? null,
          ...(isCustom
            ? {
                accept_reasons: [...DEFAULT_ACCEPT_REASONS],
                reject_reasons: [...DEFAULT_ACCEPT_REASONS],
                require_correction_on_reject: false,
              }
            : {}),
        })
        .select(
          "id, name, accept_reasons, reject_reasons, require_correction_on_reject",
        )
        .single();

      if (error) {
        console.error("Product toevoegen mislukt:", error);
        setErrorMessage(t("productAddFailed"));
        return;
      }
      if (data) {
        const next = data as Product;
        setProducts((prev) => [...prev, next]);
        if (mode === "record") {
          setSelectedProduct(next);
        }
      }
    },
    [restaurantId, mode, customModuleId, isCustom, t],
  );

  const handleDeleteProduct = useCallback(
    async (product: Product) => {
      const ok = window.confirm(
        t("confirmDeleteHistoryKept", { name: product.name }),
      );
      if (!ok) return;

      const { error } = await supabase
        .from("haccp_products")
        .delete()
        .eq("id", product.id);

      if (error) {
        console.error("Verwijderen mislukt:", error);
        setErrorMessage(t("deleteFailed"));
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    },
    [t],
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

  const isAndersOption = (reason: string) => reason.trim() === "Anders";
  const isAndersSelected = selectedReasons.includes("Anders");

  const toggleReason = (reason: string) => {
    if (isAndersOption(reason)) {
      setSelectedReasons((prev) =>
        prev.includes("Anders")
          ? prev.filter((r) => r !== "Anders")
          : [...prev, "Anders"],
      );
      if (isAndersSelected) setAndersText("");
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
    if (next !== status) {
      setSelectedReasons([]);
      setAndersText("");
      setCorrectionAction("");
    }
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

  const requiresRejectCorrection =
    isCustom &&
    status === "afgekeurd" &&
    selectedProduct?.require_correction_on_reject === true;
  const correctionRequired =
    requiresRejectCorrection && correctionAction.trim().length === 0;

  const canSave =
    !!selectedProduct &&
    !!status &&
    !!restaurantId &&
    !isSaving &&
    !correctionRequired;

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
            setErrorMessage(t("photoUploadFailed"));
            return;
          }
          const { data } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);
          if (data.publicUrl) uploadedUrls.push(data.publicUrl);
        }
      }

      const reasonsArray = selectedReasons
        .map((r) => {
          if (r === "Anders") {
            const trimmed = andersText.trim();
            return trimmed.length > 0 ? `Anders: ${trimmed}` : "Anders";
          }
          return r;
        })
        .filter((r) => r.trim().length > 0);

      const { error: insertError } = await supabase
        .from("haccp_records")
        .insert({
          restaurant_id: restaurantId,
          user_id: user?.id ?? null,
          module_type: recordModuleType,
          custom_module_id: customModuleId ?? null,
          equipment_id: null,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          status,
          reason: reasonsArray.length > 0 ? reasonsArray.join(", ") : null,
          reasons: reasonsArray,
          temperature: null,
          recorded_at: buildRecordedAt(recordedAtLocal),
          image_urls: uploadedUrls,
          opmerking: opmerking.trim() || null,
          correction_action: requiresRejectCorrection
            ? correctionAction.trim() || null
            : null,
        });

      if (insertError) {
        console.error("Registratie opslaan mislukt:", insertError);
        setErrorMessage(t("saveFailed"));
        return;
      }

      router.push("/registreren");
    } catch (err) {
      console.error("Onverwachte fout bij opslaan:", err);
      setErrorMessage(t("unexpectedErrorRetry"));
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
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-2xl font-black tracking-tight text-[var(--theme-fg)]">
            {headingTitle}
          </h2>
          <p className="mt-1 text-sm font-medium text-[var(--theme-muted)]">
            {t("manageItems")}
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3">
            <p className="text-center text-sm font-bold text-red-700">
              {errorMessage}
            </p>
          </div>
        ) : null}

        {!restaurantId ? (
          <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] px-5 py-8 text-center">
            <p className="text-base font-semibold text-[var(--theme-muted)]">
              {t("noRestaurantLinked")}
            </p>
          </div>
        ) : null}

        {loadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--theme-primary)] border-t-transparent" />
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {products.map((p, index) => (
              <li key={p.id}>
                <div 
                  className="group flex items-center gap-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4 transition-all hover:border-[var(--theme-primary)]/30 hover:shadow-md"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-primary)]/10">
                    <span className="text-lg font-black text-[var(--theme-primary)]">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-[var(--theme-fg)]">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={`${editBasePath}/${p.id}`}
                      aria-label={`${t("edit")} ${p.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-primary)]/10 hover:text-[var(--theme-primary)]"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p)}
                      aria-label={`${t("delete")} ${p.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--theme-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2">
          <InlineAddInput
            label={t("addProduct", { name: itemSingularLower })}
            placeholder={t("nameOfProduct", { name: itemSingularLower })}
            onAdd={handleAddProduct}
            disabled={!restaurantId}
          />
        </div>
      </div>
    );
  }

  // =========================================================================
  // RECORD MODE: Full recording flow
  // =========================================================================
  return (
    <div className="flex flex-col gap-4">
      <UpgradePromptModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      >
        {t("basicPlanPhotoMessage")}
      </UpgradePromptModal>

      {/* Header */}
      <div className="mb-2">
        <h2 className="text-2xl font-black tracking-tight text-[var(--theme-fg)]">
          {headingTitle}
        </h2>
        <p className="mt-1 text-sm font-medium text-[var(--theme-muted)]">
          {t("selectToRecord")}
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3">
          <p className="text-center text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        </div>
      ) : null}

      {!restaurantId ? (
        <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] px-5 py-8 text-center">
          <p className="text-base font-semibold text-[var(--theme-muted)]">
            {t("noRestaurantLinked")}
          </p>
        </div>
      ) : null}

      {/* ===== Product/Item sectie ===== */}
      <Section
        title={itemSingular}
        summary={selectedProduct?.name ?? null}
        onEdit={null}
        collapsed={currentStep !== "product"}
      >
        {loadingProducts ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--theme-primary)] border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((p, index) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProduct(p)}
                className="group flex items-center gap-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4 text-left transition-all hover:border-[var(--theme-primary)]/30 hover:shadow-md active:scale-[0.98]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-primary)]/10">
                  <span className="text-lg font-black text-[var(--theme-primary)]">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="min-w-0 flex-1 truncate text-base font-bold text-[var(--theme-fg)]">
                  {p.name}
                </span>
              </button>
            ))}

            {allowAddItemInRecord ? (
              <div className="mt-2">
                <InlineAddInput
                  label={t("addProduct", { name: itemSingularLower })}
                  placeholder={t("nameOfProduct", { name: itemSingularLower })}
                  onAdd={handleAddProduct}
                />
              </div>
            ) : null}
          </div>
        )}
      </Section>

      {/* ===== Datum/tijd (alleen na product selectie) ===== */}
      {selectedProduct ? (
        <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
              {t("receivedDateTimeLabel")}
            </span>
            <input
              type="datetime-local"
              value={recordedAtLocal}
              onChange={(e) => setRecordedAtLocal(e.target.value)}
              className="h-14 w-full rounded-xl border border-[var(--theme-card-border)] bg-white px-4 text-center text-lg font-bold tabular-nums text-[var(--theme-fg)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20"
            />
          </label>
        </div>
      ) : null}

      {/* ===== Beoordeling – knoppen blijven altijd zichtbaar ===== */}
      {selectedProduct ? (
        <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
          <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
            {t("rating")}
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSetStatus("goedgekeurd")}
              aria-pressed={status === "goedgekeurd"}
              className={[
                "flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 transition-all active:scale-[0.98]",
                status === "goedgekeurd"
                  ? "border-emerald-600 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300",
              ].join(" ")}
            >
              <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
              <span className="text-sm font-black">{t("goedgekeurd")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetStatus("afgekeurd")}
              aria-pressed={status === "afgekeurd"}
              className={[
                "flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 transition-all active:scale-[0.98]",
                status === "afgekeurd"
                  ? "border-red-600 bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : "border-red-200 bg-red-50 text-red-700 hover:border-red-300",
              ].join(" ")}
            >
              <X className="h-7 w-7" strokeWidth={3} aria-hidden />
              <span className="text-sm font-black">{t("afgekeurd")}</span>
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
              ? "border-emerald-200 bg-emerald-50/50"
              : "border-red-200 bg-red-50/50",
          ].join(" ")}
        >
          <h3
            className={[
              "mb-3 text-sm font-black uppercase tracking-wider",
              status === "goedgekeurd" ? "text-emerald-700" : "text-red-700",
            ].join(" ")}
          >
            {status === "goedgekeurd"
              ? t("acceptReasonsTitle")
              : t("rejectReasonsTitle")}
          </h3>

          {reasonsForStatus.length === 0 ? (
            <p className="rounded-xl bg-white px-4 py-4 text-center text-sm font-semibold text-[var(--theme-muted)]">
              {t("noReasonsConfigured")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {reasonsForStatus.map((r) => {
                const isSelected = selectedReasons.includes(r);
                const accent =
                  status === "goedgekeurd"
                    ? isSelected
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "border-emerald-200 bg-white text-[var(--theme-fg)] hover:border-emerald-300"
                    : isSelected
                      ? "border-red-500 bg-red-500 text-white shadow-md shadow-red-500/20"
                      : "border-red-200 bg-white text-[var(--theme-fg)] hover:border-red-300";
                return (
                  <li key={r} className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => toggleReason(r)}
                      aria-pressed={isSelected}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-bold transition-all active:scale-[0.98]",
                        accent,
                      ].join(" ")}
                    >
                      <span className="min-w-0 flex-1 truncate">{r === "Anders" ? t("other") : r}</span>
                      {isSelected ? (
                        <Check
                          className="h-5 w-5 shrink-0"
                          strokeWidth={3}
                          aria-hidden
                        />
                      ) : (
                        <span className="h-5 w-5 shrink-0 rounded-full border-2 border-current opacity-30" />
                      )}
                    </button>

                    {isAndersOption(r) && isSelected ? (
                      <input
                        type="text"
                        value={andersText}
                        onChange={(e) => setAndersText(e.target.value)}
                        placeholder={t("describeOptional")}
                        autoFocus
                        className={[
                          "h-12 w-full rounded-xl border-2 bg-white px-4 text-base font-semibold text-[var(--theme-fg)] outline-none transition-all focus:ring-2",
                          status === "goedgekeurd"
                            ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                            : "border-red-300 focus:border-red-500 focus:ring-red-500/20",
                        ].join(" ")}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {selectedReasons.length > 0 ? (
            <p
              className={[
                "mt-3 text-xs font-bold uppercase tracking-wider",
                status === "goedgekeurd" ? "text-emerald-700" : "text-red-700",
              ].join(" ")}
            >
              {selectedReasons.length === 1
                ? t("reasonSelected", { count: selectedReasons.length })
                : t("reasonsSelected", { count: selectedReasons.length })}
            </p>
          ) : null}
        </div>
      ) : null}

      {requiresRejectCorrection ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              {t("correctiveAction")}
            </span>
            <textarea
              value={correctionAction}
              onChange={(e) => setCorrectionAction(e.target.value)}
              placeholder={t("correctiveActionPlaceholder")}
              rows={3}
              className={[
                "w-full resize-none rounded-xl border-2 bg-white px-4 py-3 text-base font-semibold text-[var(--theme-fg)] outline-none transition-all focus:ring-2",
                correctionRequired
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-200 focus:border-[var(--theme-primary)] focus:ring-[var(--theme-primary)]/20",
              ].join(" ")}
              aria-invalid={correctionRequired}
              aria-required="true"
            />
            {correctionRequired ? (
              <span className="text-xs font-bold text-red-700">
                {t("correctiveActionRequired")}
              </span>
            ) : null}
          </label>
        </div>
      ) : null}

      {/* ===== Opmerking + Foto + opslaan ===== */}
      {selectedProduct && status ? (
        <div className="flex flex-col gap-4">
          {/* Note Section */}
          <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
                {t("noteOptional")}
              </span>
              <textarea
                value={opmerking}
                onChange={(e) => setOpmerking(e.target.value)}
                placeholder={t("notePlaceholder")}
                rows={2}
                className="w-full resize-none rounded-xl border border-[var(--theme-card-border)] bg-white px-4 py-3 text-base font-medium text-[var(--theme-fg)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20"
              />
            </label>
          </div>

          {/* Photo Section */}
          <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
            <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
              {t("photosOptional")}
            </span>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoChange}
            />

            <button
              type="button"
              onClick={handlePickPhotos}
              disabled={isSaving || photoSlotsLeft <= 0}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--theme-card-border)] bg-white text-base font-bold text-[var(--theme-muted)] transition-all hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] disabled:opacity-50"
            >
              <Camera className="h-5 w-5" aria-hidden />
              {photoSlotsLeft <= 0
                ? t("maxPhotos", { count: MAX_PHOTOS })
                : photoFiles.length > 0
                  ? t("addPhotoProgress", { current: photoFiles.length, max: MAX_PHOTOS })
                  : t("pickPhoto", { count: MAX_PHOTOS })}
            </button>

            {photoPreviews.length > 0 ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {photoPreviews.map((url, i) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt={t("photoAlt", { number: i + 1 })}
                      className="h-20 w-full rounded-lg border border-[var(--theme-card-border)] object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label={t("removePhoto", { number: i + 1 })}
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110"
                    >
                      <X className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Save Button */}
          <SupercellButton
            size="lg"
            variant="success"
            onClick={handleSave}
            disabled={!canSave}
            aria-busy={isSaving}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-black normal-case"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("saving")}
              </span>
            ) : (
              <>
                <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
                {t("save")}
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
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
          {title}
        </h3>
        {collapsed && summary && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--theme-primary)]/10 px-3 text-sm font-bold text-[var(--theme-primary)] transition-colors hover:bg-[var(--theme-primary)]/20"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {t("edit")}
          </button>
        ) : null}
      </div>

      {collapsed && summary ? (
        <div
          className={`flex items-center gap-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4 ${
            summaryAccentClass ?? ""
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-primary)]/10">
            <span className="text-base font-black text-[var(--theme-primary)]">
              {summary.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="min-w-0 flex-1 truncate text-base font-bold text-[var(--theme-fg)]">
            {summary}
          </span>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
