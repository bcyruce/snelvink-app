"use client";

import SupercellButton from "@/components/SupercellButton";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { Mail } from "lucide-react";
import { useState } from "react";

export default function VerifyEmailBanner() {
  const { user, profile, refresh } = useUser();
  const { t } = useTranslation();
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const email = user.email?.trim() ?? "";

  const authNeedsConfirmation =
    user.email_confirmed_at == null || user.email_confirmed_at === "";

  const profileNeedsVerification =
    profile !== null && profile.is_email_verified === false;

  const showBanner = profileNeedsVerification || (!profile && authNeedsConfirmation);

  if (!showBanner) {
    return null;
  }

  const handleVerifyNow = async () => {
    setFeedback(null);
    setErrorMessage(null);

    if (!email) {
      setErrorMessage(t("verifyEmailMissing"));
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        console.error("Verificatie-e-mail versturen mislukt:", error.message);
        setErrorMessage(
          error.message ||
            t("verifyEmailSendFailed"),
        );
        return;
      }

      setFeedback(t("verifyEmailSent"));
      void refresh();
    } catch (e) {
      console.error(e);
      setErrorMessage(t("retryError"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="sticky top-0 z-30 border-b-4 border-amber-500 bg-amber-300 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <p className="text-center text-base font-black leading-snug text-amber-950 sm:text-lg">
          {t("emailNotVerified")}
        </p>
        <SupercellButton
          type="button"
          size="lg"
          variant="primary"
          onClick={() => void handleVerifyNow()}
          disabled={isSending}
          aria-busy={isSending}
          textCase="normal"
          className="flex h-16 w-full items-center justify-center gap-3 text-lg"
        >
          <Mail className="h-6 w-6 shrink-0" strokeWidth={2.5} aria-hidden />
          {isSending ? t("sending") : t("verifyNow")}
        </SupercellButton>
        {feedback ? (
          <p
            className="text-center text-sm font-semibold text-green-900"
            role="status"
          >
            {feedback}
          </p>
        ) : null}
        {errorMessage ? (
          <p
            className="text-center text-sm font-semibold text-red-800"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
