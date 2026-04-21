"use client";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { Mail, X } from "lucide-react";
import { useState } from "react";

function normalizeOtp(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export default function VerifyEmailBanner() {
  const { user, profile, refresh } = useUser();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  if (!profile || profile.is_email_verified) {
    return null;
  }

  const email = user?.email?.trim() ?? "";

  const getAccessToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const handleVerifyNow = async () => {
    setFeedback(null);
    setVerifyError(null);
    if (!email) {
      setFeedback("Geen e-mailadres gevonden.");
      return;
    }

    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setFeedback("Je bent niet ingelogd. Meld je opnieuw aan.");
        return;
      }

      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setFeedback(data.error ?? "Kon geen code versturen. Probeer opnieuw.");
        return;
      }

      setOtp("");
      setShowOtpModal(true);
      setFeedback("Code verstuurd. Vul hem hieronder in.");
    } catch (e) {
      console.error(e);
      setFeedback("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckCode = async () => {
    const code = normalizeOtp(otp);
    if (code.length !== 6) {
      setVerifyError("Voer de 6-cijferige code in.");
      return;
    }

    setVerifyError(null);
    setVerifyBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setVerifyError("Je bent niet ingelogd. Meld je opnieuw aan.");
        return;
      }

      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setVerifyError(data.error ?? "Controleren mislukt.");
        return;
      }

      setShowOtpModal(false);
      setOtp("");
      setFeedback(null);
      await refresh();
    } catch (e) {
      console.error(e);
      setVerifyError("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setVerifyBusy(false);
    }
  };

  const closeModal = () => {
    setShowOtpModal(false);
    setOtp("");
    setVerifyError(null);
  };

  return (
    <>
      {showOtpModal ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="otp-modal-title"
        >
          <button
            type="button"
            aria-label="Sluiten"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={closeModal}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="otp-modal-title"
                className="text-xl font-black text-gray-900"
              >
                Code uit je e-mail
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-800 transition-transform active:scale-95"
                aria-label="Sluiten"
              >
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <p className="text-base font-medium text-gray-600">
              We hebben een 6-cijferige code gestuurd naar{" "}
              <span className="font-bold text-gray-900">{email}</span>.
            </p>

            <label htmlFor="verify-email-otp" className="sr-only">
              Verificatiecode
            </label>
            <input
              id="verify-email-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(normalizeOtp(e.target.value));
                setVerifyError(null);
              }}
              placeholder="000000"
              className="mt-5 h-20 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 text-center text-4xl font-black tabular-nums tracking-[1em] text-gray-900 outline-none focus:border-amber-500"
            />

            {verifyError ? (
              <p className="mt-2 text-center text-sm font-semibold text-red-600">
                {verifyError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleCheckCode()}
              disabled={verifyBusy}
              aria-busy={verifyBusy}
              className="mt-6 h-20 w-full rounded-2xl bg-amber-600 text-xl font-bold text-white shadow-md transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {verifyBusy ? "Controleren…" : "Code controleren"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="sticky top-0 z-30 border-b border-amber-300 bg-amber-200 px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <p className="text-center text-base font-bold leading-snug text-amber-950 sm:text-lg">
            E-mailadres nog niet geverifieerd. Bevestig je account om je gegevens
            veilig te stellen.
          </p>
          <button
            type="button"
            onClick={() => void handleVerifyNow()}
            disabled={busy}
            aria-busy={busy}
            className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl border-2 border-amber-900/30 bg-amber-100 text-lg font-black text-amber-950 shadow-sm transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail className="h-7 w-7 shrink-0" strokeWidth={2.25} aria-hidden />
            {busy ? "Bezig…" : "Nu verifiëren"}
          </button>
          {feedback && !showOtpModal ? (
            <p
              className="text-center text-sm font-semibold text-amber-950/90"
              role="status"
            >
              {feedback}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
