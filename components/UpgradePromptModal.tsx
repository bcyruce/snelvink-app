"use client";

import SupercellButton from "@/components/SupercellButton";
import { useTranslation } from "@/hooks/useTranslation";
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
  const { t } = useTranslation();

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
      setOtpError(t("enterSixDigitCode"));
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
        aria-label={t("close")}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white p-6">
        {showUpgradeContent ? (
          <>
            <p className="text-center text-lg font-bold leading-relaxed text-slate-900">
              {children}
            </p>
            <SupercellButton
              type="button"
              size="lg"
              variant="primary"
              onClick={onClose}
              textCase="normal"
              className="mt-6 h-16 w-full text-xl"
            >
              {t("understood")}
            </SupercellButton>
          </>
        ) : (
          <>
            <p className="text-center text-xl font-black text-slate-900">
              {t("confirmEmail")}
            </p>
            <p className="mt-2 text-center text-base font-semibold text-slate-600">
              {t("enterOtpCode")}
            </p>

            <label htmlFor="upgrade-otp" className="sr-only">
              {t("oneTimeCode")}
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
              className="mt-6 h-20 w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-4 text-center text-4xl font-black tabular-nums tracking-[1em] text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
            />

            {otpError ? (
              <p className="mt-2 text-center text-sm font-bold text-red-600">
                {otpError}
              </p>
            ) : null}

            <SupercellButton
              type="button"
              size="lg"
              variant="primary"
              onClick={handleVerifyOTP}
              disabled={verifying}
              aria-busy={verifying}
              textCase="normal"
              className="mt-6 h-16 w-full text-xl"
            >
              {verifying ? t("checking") : t("checkCode")}
            </SupercellButton>
          </>
        )}
      </div>
    </div>
  );
}
