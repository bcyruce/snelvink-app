"use client";

import SupercellButton from "@/components/SupercellButton";
import { useUser, UserProvider } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Check, Plus, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  accept_reasons: string[] | null;
  reject_reasons: string[] | null;
};

function ProductEditContent() {
  const router = useRouter();
  const params = useParams<{ productId: string }>();
  const productId = params?.productId ?? "";
  const { profile } = useUser();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [acceptReasons, setAcceptReasons] = useState<string[]>(["Anders"]);
  const [rejectReasons, setRejectReasons] = useState<string[]>([
    "Temperatuur te hoog",
    "Verpakking beschadigd",
    "THT/TGT verstreken",
    "Verkeerd product",
    "Kwaliteit onvoldoende",
    "Anders",
  ]);
  const [showAcceptReasons, setShowAcceptReasons] = useState(false);
  const [showRejectReasons, setShowRejectReasons] = useState(false);
  const [newAcceptReason, setNewAcceptReason] = useState("");
  const [newRejectReason, setNewRejectReason] = useState("");

  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;

      const { data, error } = await supabase
        .from("haccp_products")
        .select("id, name, accept_reasons, reject_reasons")
        .eq("id", productId)
        .single();

      if (error || !data) {
        console.error("Product not found:", error);
        setErrorMessage("Product niet gevonden.");
        setLoading(false);
        return;
      }

      setProduct(data);
      setName(data.name);
      setAcceptReasons(
        data.accept_reasons && data.accept_reasons.length > 0
          ? data.accept_reasons
          : ["Anders"],
      );
      setRejectReasons(
        data.reject_reasons && data.reject_reasons.length > 0
          ? data.reject_reasons
          : [
              "Temperatuur te hoog",
              "Verpakking beschadigd",
              "THT/TGT verstreken",
              "Verkeerd product",
              "Kwaliteit onvoldoende",
              "Anders",
            ],
      );
      setLoading(false);
    }

    loadProduct();
  }, [productId]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Vul een naam in.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    // Ensure "Anders" is always included
    const finalAcceptReasons = acceptReasons.includes("Anders")
      ? acceptReasons
      : [...acceptReasons, "Anders"];
    const finalRejectReasons = rejectReasons.includes("Anders")
      ? rejectReasons
      : [...rejectReasons, "Anders"];

    const { error } = await supabase
      .from("haccp_products")
      .update({
        name: trimmedName,
        accept_reasons: finalAcceptReasons,
        reject_reasons: finalRejectReasons,
      })
      .eq("id", productId);

    if (error) {
      console.error("Save failed:", error);
      setErrorMessage("Opslaan mislukt: " + (error.message ?? "Onbekende fout."));
      setSaving(false);
      return;
    }

    router.push("/taken/ontvangst");
  }, [name, acceptReasons, rejectReasons, productId, router]);

  const addAcceptReason = () => {
    const trimmed = newAcceptReason.trim();
    if (trimmed && !acceptReasons.includes(trimmed)) {
      setAcceptReasons([
        ...acceptReasons.filter((r) => r !== "Anders"),
        trimmed,
        "Anders",
      ]);
      setNewAcceptReason("");
    }
  };

  const removeAcceptReason = (reason: string) => {
    if (reason === "Anders") return;
    setAcceptReasons(acceptReasons.filter((r) => r !== reason));
  };

  const addRejectReason = () => {
    const trimmed = newRejectReason.trim();
    if (trimmed && !rejectReasons.includes(trimmed)) {
      setRejectReasons([
        ...rejectReasons.filter((r) => r !== "Anders"),
        trimmed,
        "Anders",
      ]);
      setNewRejectReason("");
    }
  };

  const removeRejectReason = (reason: string) => {
    if (reason === "Anders") return;
    setRejectReasons(rejectReasons.filter((r) => r !== reason));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-gray-600">
          Laden...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pb-32 pt-8 sm:px-6">
        <div className="mx-auto max-w-md">
          <p className="text-center text-red-600">Product niet gevonden.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-32 pt-8 sm:px-6">
      <div className="mx-auto max-w-md">
        <SupercellButton
          type="button"
          size="lg"
          variant="neutral"
          onClick={() => router.push("/taken/ontvangst")}
          className="mb-8 flex h-20 w-full items-center justify-center gap-3 text-2xl"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </SupercellButton>

        <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-slate-900">
          Product bewerken
        </h1>

        {errorMessage ? (
          <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-6">
          {/* Name */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Productnaam
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[72px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 text-2xl font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
            />
          </label>

          {/* Status buttons row */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Redenen per status
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAcceptReasons(!showAcceptReasons);
                  setShowRejectReasons(false);
                }}
                className={[
                  "flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-b-4 transition-all",
                  showAcceptReasons
                    ? "border-emerald-700 bg-emerald-500 text-white"
                    : "border-emerald-300 bg-emerald-50 text-emerald-700",
                ].join(" ")}
              >
                <Check className="h-8 w-8" strokeWidth={3} />
                <span className="text-sm font-bold">Goedgekeurd</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRejectReasons(!showRejectReasons);
                  setShowAcceptReasons(false);
                }}
                className={[
                  "flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-b-4 transition-all",
                  showRejectReasons
                    ? "border-red-700 bg-red-500 text-white"
                    : "border-red-300 bg-red-50 text-red-700",
                ].join(" ")}
              >
                <X className="h-8 w-8" strokeWidth={3} />
                <span className="text-sm font-bold">Afgekeurd</span>
              </button>
            </div>
          </div>

          {/* Accept reasons panel */}
          {showAcceptReasons ? (
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
              <h3 className="mb-3 text-lg font-bold text-emerald-800">
                Redenen voor goedkeuring
              </h3>
              <p className="mb-4 text-sm text-emerald-700">
                Kies de mogelijke redenen die medewerkers kunnen selecteren bij
                goedkeuring.
              </p>

              <ul className="mb-4 flex flex-col gap-2">
                {acceptReasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white px-4 py-3"
                  >
                    <span className="font-semibold text-slate-800">{reason}</span>
                    {reason !== "Anders" ? (
                      <button
                        type="button"
                        onClick={() => removeAcceptReason(reason)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Standaard</span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAcceptReason}
                  onChange={(e) => setNewAcceptReason(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addAcceptReason())
                  }
                  placeholder="Nieuwe reden..."
                  className="min-h-[48px] flex-1 rounded-xl border-2 border-emerald-300 bg-white px-4 text-base font-semibold text-slate-900 outline-none focus:border-emerald-500"
                />
                <SupercellButton
                  type="button"
                  size="icon"
                  variant="success"
                  onClick={addAcceptReason}
                  className="flex h-12 w-12 items-center justify-center"
                >
                  <Plus className="h-5 w-5" />
                </SupercellButton>
              </div>
            </div>
          ) : null}

          {/* Reject reasons panel */}
          {showRejectReasons ? (
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
              <h3 className="mb-3 text-lg font-bold text-red-800">
                Redenen voor afkeuring
              </h3>
              <p className="mb-4 text-sm text-red-700">
                Kies de mogelijke redenen die medewerkers kunnen selecteren bij
                afkeuring.
              </p>

              <ul className="mb-4 flex flex-col gap-2">
                {rejectReasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white px-4 py-3"
                  >
                    <span className="font-semibold text-slate-800">{reason}</span>
                    {reason !== "Anders" ? (
                      <button
                        type="button"
                        onClick={() => removeRejectReason(reason)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Standaard</span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRejectReason}
                  onChange={(e) => setNewRejectReason(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addRejectReason())
                  }
                  placeholder="Nieuwe reden..."
                  className="min-h-[48px] flex-1 rounded-xl border-2 border-red-300 bg-white px-4 text-base font-semibold text-slate-900 outline-none focus:border-red-500"
                />
                <SupercellButton
                  type="button"
                  size="icon"
                  variant="danger"
                  onClick={addRejectReason}
                  className="flex h-12 w-12 items-center justify-center"
                >
                  <Plus className="h-5 w-5" />
                </SupercellButton>
              </div>
            </div>
          ) : null}

          {/* Save button */}
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
      </div>
    </main>
  );
}

export default function ProductEditPage() {
  return (
    <UserProvider>
      <ProductEditContent />
    </UserProvider>
  );
}
