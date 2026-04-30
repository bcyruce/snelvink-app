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

const DEFAULT_REJECT_REASONS: readonly string[] = [
  "Temperatuur te hoog",
  "Verpakking beschadigd",
  "THT/TGT verstreken",
  "Verkeerd product",
  "Kwaliteit onvoldoende",
];

type Product = {
  id: string;
  name: string;
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

type OntvangstCheckProps = {
  mode?: "record" | "manage";
};

export default function OntvangstCheck({ mode = "record" }: OntvangstCheckProps) {
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
  const [reason, setReason] = useState<string | null>(null);

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
      .select("id, name")
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
  }, [loadProducts]);

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
      .select("id, name")
      .single();

    if (error) {
      console.error("Product toevoegen mislukt:", error);
      setErrorMessage("Product toevoegen mislukt.");
      return;
    }
    if (data) {
      const next = data as Product;
      setProducts((prev) => [...prev, next]);
      setSelectedProduct(next);
    }
  }, [restaurantId]);

  const handleRenameProduct = useCallback(async (product: Product) => {
    const input = window.prompt("Nieuwe productnaam", product.name);
    if (!input) return;
    const name = input.trim();
    if (!name || name === product.name) return;

    const { error } = await supabase
      .from("haccp_products")
      .update({ name })
      .eq("id", product.id);

    if (error) {
      console.error("Product hernoemen mislukt:", error);
      setErrorMessage("Product hernoemen mislukt.");
      return;
    }

    setProducts((prev) =>
      prev.map((item) => (item.id === product.id ? { ...item, name } : item)),
    );
    setSelectedProduct((prev) =>
      prev && prev.id === product.id ? { ...prev, name } : prev,
    );
  }, []);

  const handleDeleteProduct = useCallback(async (product: Product) => {
    const ok = window.confirm(`"${product.name}" verwijderen?`);
    if (!ok) return;

    const { error } = await supabase.from("haccp_products").delete().eq("id", product.id);
    if (error) {
      console.error("Product verwijderen mislukt:", error);
      setErrorMessage("Product verwijderen mislukt.");
      return;
    }

    setProducts((prev) => prev.filter((item) => item.id !== product.id));
    setSelectedProduct((prev) =>
      prev && prev.id === product.id ? null : prev,
    );
  }, []);

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
    setReason(null);
  };
  const resetStatus = () => {
    setStatus(null);
    setReason(null);
  };
  const resetReason = () => {
    setReason(null);
  };

  // ---------- step derivation ----------
  const currentStep: "product" | "beoordeling" | "reden" | "foto" =
    !selectedProduct
      ? "product"
      : !status
        ? "beoordeling"
        : status === "afgekeurd" && !reason
          ? "reden"
          : "foto";

  const canSave =
    !!selectedProduct &&
    !!status &&
    !(status === "afgekeurd" && !reason) &&
    !!restaurantId &&
    !isSaving;

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

      const { error: insertError } = await supabase
        .from("haccp_records")
        .insert({
          restaurant_id: restaurantId,
          user_id: user?.id ?? null,
          module_type: "ontvangst",
          equipment_id: null,
          product_name: selectedProduct.name,
          status,
          reason: status === "afgekeurd" ? reason : null,
          temperature: null,
          recorded_at: buildRecordedAt(recordedAtLocal),
          image_urls: uploadedUrls,
        });

      if (insertError) {
        console.error("Registratie opslaan mislukt:", insertError);
        setErrorMessage("Opslaan mislukt. Probeer opnieuw.");
        return;
      }

      router.push("/");
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

      {mode === "record" ? (
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

      {mode === "manage" ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Producten
          </h3>
          {loadingProducts ? (
            <p className="text-center text-slate-500">Producten laden…</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="flex min-h-[80px] items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm"
                >
                  <span className="flex-1 truncate text-xl font-bold text-slate-900">
                    {product.name}
                  </span>
                  <SupercellButton
                    size="icon"
                    variant="neutral"
                    onClick={() => handleRenameProduct(product)}
                    aria-label={`Hernoem ${product.name}`}
                    className="flex h-16 w-16 items-center justify-center p-2"
                  >
                    <Pencil className="h-5 w-5" aria-hidden />
                  </SupercellButton>
                  <SupercellButton
                    size="icon"
                    variant="danger"
                    onClick={() => handleDeleteProduct(product)}
                    aria-label={`Verwijder ${product.name}`}
                    className="flex h-16 w-16 items-center justify-center p-2"
                  >
                    <Trash2 className="h-5 w-5" aria-hidden />
                  </SupercellButton>
                </li>
              ))}
            </ul>
          )}
          <SupercellButton
            size="lg"
            variant="neutral"
            onClick={handleAddProduct}
            className="flex min-h-[80px] w-full items-center justify-center gap-3 border-2 border-dashed border-slate-200 text-xl normal-case"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
            Product toevoegen
          </SupercellButton>
        </section>
      ) : (
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
      )}

      {/* ===== Beoordeling sectie ===== */}
      {mode === "record" && selectedProduct ? (
        <Section
          title="Beoordeling"
          summary={
            status === "goedgekeurd"
              ? "✓ Goedgekeurd"
              : status === "afgekeurd"
                ? "✕ Afgekeurd"
                : null
          }
          onEdit={status ? resetStatus : null}
          collapsed={currentStep !== "beoordeling"}
          summaryAccentClass={
            status === "goedgekeurd"
              ? "text-green-700"
              : status === "afgekeurd"
                ? "text-red-700"
                : undefined
          }
        >
          <div className="flex flex-col gap-3">
            <SupercellButton
              size="lg"
              variant="success"
              onClick={() => setStatus("goedgekeurd")}
              className="flex min-h-[112px] w-full items-center justify-center gap-4 rounded-3xl text-3xl normal-case"
            >
              <Check className="h-9 w-9" strokeWidth={3} aria-hidden />
              Goedgekeurd
            </SupercellButton>
            <SupercellButton
              size="lg"
              variant="danger"
              onClick={() => setStatus("afgekeurd")}
              className="flex min-h-[112px] w-full items-center justify-center gap-4 rounded-3xl text-3xl normal-case"
            >
              <X className="h-9 w-9" strokeWidth={3} aria-hidden />
              Afgekeurd
            </SupercellButton>
          </div>
        </Section>
      ) : null}

      {/* ===== Reden sectie (alleen bij afkeuring) ===== */}
      {mode === "record" && selectedProduct && status === "afgekeurd" ? (
        <Section
          title="Reden afkeuring"
          summary={reason}
          summaryAccentClass="text-red-700"
          onEdit={reason ? resetReason : null}
          collapsed={currentStep !== "reden"}
        >
          <div className="flex flex-col gap-3">
            {DEFAULT_REJECT_REASONS.map((r) => (
              <SupercellButton
                key={r}
                size="lg"
                variant="neutral"
                onClick={() => setReason(r)}
                className="flex min-h-[80px] w-full items-center justify-center text-center text-xl normal-case"
              >
                {r}
              </SupercellButton>
            ))}
            <SupercellButton
              size="lg"
              variant="neutral"
              onClick={() => {
                const custom = window.prompt("Beschrijf de reden van afkeuring");
                if (!custom) return;
                const trimmed = custom.trim();
                if (trimmed) setReason(trimmed);
              }}
              className="flex min-h-[80px] w-full items-center justify-center gap-3 border-2 border-dashed border-slate-200 text-xl normal-case"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
              Anders…
            </SupercellButton>
          </div>
        </Section>
      ) : null}

      {/* ===== Foto + opslaan ===== */}
      {mode === "record" && currentStep === "foto" ? (
        <div className="flex flex-col gap-4">
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
