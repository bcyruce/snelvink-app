"use client";

import SupercellButton from "@/components/SupercellButton";
import { useUser } from "@/hooks/useUser";
import { useEffect, useState, type ReactNode } from "react";

type UpgradePromptModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

function normalizeOtpDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export default function UpgradePromptModal({
  open,
  onClose,
  children,
}: UpgradePromptModalProps) {
  const { profile } = useUser();

  const [mockVerified, setMockVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const needsOtpGate =
    profile !== null && profile.is_email_verified === false && !mockVerified;

  useEffect(() => {
    if (!open) {
      setMockVerified(false);
      setOtp("");
      setOtpError(null);
      setVerifying(false);
    }
  }, [open]);

  const handleVerifyOTP = () => {
    const code = normalizeOtpDigits(otp);
    if (code.length !== 6) {
      setOtpError("Voer de 6-cijferige code in.");
      return;
    }

    setOtpError(null);
    setVerifying(true);

    window.setTimeout(() => {
      setMockVerified(true);
      setVerifying(false);
      setOtp("");
    }, 800);
  };

  if (!open) return null;

  const showUpgradeContent = !needsOtpGate;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Sluiten"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
        {showUpgradeContent ? (
          <>
            <p className="text-center text-lg font-semibold leading-relaxed text-gray-900">
              {children}
            </p>
            <SupercellButton
              type="button"
              size="lg"
              variant="neutral"
              onClick={onClose}
              className="mt-6 h-20 w-full text-xl normal-case"
            >
              Begrepen
            </SupercellButton>
          </>
        ) : (
          <>
            <p className="text-center text-lg font-bold text-gray-900">
              Bevestig je e-mailadres
            </p>
            <p className="mt-2 text-center text-base font-medium text-gray-600">
              Voer de 6-cijferige code uit je e-mail in om verder te gaan.
            </p>

            <label htmlFor="upgrade-otp" className="sr-only">
              Eenmalige code
            </label>
            <input
              id="upgrade-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(normalizeOtpDigits(e.target.value));
                setOtpError(null);
              }}
              placeholder="000000"
              className="mt-6 h-20 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 text-center text-4xl font-black tabular-nums tracking-[1em] text-gray-900 outline-none focus:border-gray-400"
            />

            {otpError ? (
              <p className="mt-2 text-center text-sm font-semibold text-red-600">
                {otpError}
              </p>
            ) : null}

            <SupercellButton
              type="button"
              size="lg"
              variant="neutral"
              onClick={handleVerifyOTP}
              disabled={verifying}
              aria-busy={verifying}
              className="mt-6 h-20 w-full text-xl normal-case"
            >
              {verifying ? "Controleren…" : "Code controleren"}
            </SupercellButton>
          </>
        )}
      </div>
    </div>
  );
}
