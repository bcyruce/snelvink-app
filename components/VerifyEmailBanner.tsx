"use client";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { Mail } from "lucide-react";
import { useState } from "react";

export default function VerifyEmailBanner() {
  const { user, profile, refresh } = useUser();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!profile || profile.is_email_verified) {
    return null;
  }

  const email = user?.email?.trim() ?? "";

  const handleVerifyNow = async () => {
    setFeedback(null);
    if (!email) {
      setFeedback("Geen e-mailadres gevonden.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        console.error("Verificatie-e-mail versturen mislukt:", error);
        setFeedback("Kon geen e-mail versturen. Probeer later opnieuw.");
        return;
      }

      setFeedback("Controleer je inbox en open de bevestigingslink.");
      void refresh();
    } catch (e) {
      console.error(e);
      setFeedback("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setBusy(false);
    }
  };

  return (
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
        {feedback ? (
          <p
            className="text-center text-sm font-semibold text-amber-950/90"
            role="status"
          >
            {feedback}
          </p>
        ) : null}
      </div>
    </div>
  );
}
