"use client";

import SupercellButton from "@/components/SupercellButton";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthView = "login" | "register";
type RegisterRole = "owner" | "employee";

const inputClass =
  "h-16 w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 text-lg font-bold text-slate-900 outline-none transition-colors focus:border-blue-500 focus:border-b-blue-700";

const labelClass = "text-sm font-black uppercase tracking-wide text-slate-700";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [authView, setAuthView] = useState<AuthView>("login");
  const [registerRole, setRegisterRole] = useState<RegisterRole>("owner");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [fullName, setFullName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Wordt gezet wanneer login faalt omdat het e-mailadres nog niet bevestigd
  // is. Toont een aparte gele box met een "opnieuw versturen"-knop.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setUnconfirmedEmail(null);
    setResendState("idle");
    setResendError(null);
    setLoading(true);

    const trimmedEmail = email.trim();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        console.error("Inloggen mislukt:", signInError.message);

        // Supabase geeft bij niet-bevestigde e-mail een specifieke foutcode.
        const code = (
          signInError as { code?: string; name?: string }
        ).code;
        const message = signInError.message?.toLowerCase() ?? "";
        const isUnconfirmed =
          code === "email_not_confirmed" ||
          message.includes("email not confirmed") ||
          message.includes("not confirmed");

        if (isUnconfirmed) {
          setUnconfirmedEmail(trimmedEmail);
          setError(null);
        } else {
          setError(t("loginFailedCheck"));
        }
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Inloggen mislukt:", err);
      setError(t("loginFailedRetry"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!unconfirmedEmail) return;

    setResendState("sending");
    setResendError(null);

    try {
      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: unconfirmedEmail,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });

      if (resendError) {
        console.error(
          "Bevestigingsmail opnieuw versturen mislukt:",
          resendError.message,
        );
        setResendState("error");
        setResendError(
          resendError.message ||
            t("resendConfirmationFailed"),
        );
        return;
      }

      setResendState("sent");
    } catch (err) {
      console.error("Bevestigingsmail opnieuw versturen mislukt:", err);
      setResendState("error");
      setResendError(t("retryError"));
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const trimmedEmail = email.trim();

    const trimmedFullName = fullName.trim();
    if (!trimmedFullName) {
      setError(t("fillFullName"));
      setLoading(false);
      return;
    }

    if (registerRole === "owner" && !restaurantName.trim()) {
      setError(t("fillRestaurantName"));
      setLoading(false);
      return;
    }

    const normalizedInviteCode = inviteCode.replace(/\D/g, "").slice(0, 6);
    if (registerRole === "employee" && normalizedInviteCode.length !== 6) {
      setError(t("invalidInviteCode"));
      setLoading(false);
      return;
    }

    try {
      const userMetadata =
        registerRole === "owner"
          ? {
              role: "eigenaar" as const,
              restaurant_name: restaurantName.trim(),
              full_name: trimmedFullName,
            }
          : {
              role: "staff" as const,
              invite_code: normalizedInviteCode,
              full_name: trimmedFullName,
            };

      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: userMetadata,
            emailRedirectTo,
          },
        });

      if (signUpError) {
        console.error("Registreren mislukt:", signUpError.message);
        const rawMessage = signUpError.message ?? "";
        const lowered = rawMessage.toLowerCase();
        let friendly: string;
        if (lowered.includes("plan limiet bereikt")) {
          friendly = t("staffLimitReached");
        } else if (
          lowered.includes("ongeldige invite code") ||
          lowered.includes("invite code is verplicht")
        ) {
          friendly = t("inviteCodeInvalid");
        } else {
          friendly = rawMessage || t("registerFailed");
        }
        setError(friendly);
        return;
      }

      if (!signUpData.user) {
        setError(t("registerFailedRetry"));
        return;
      }

      // Debug: laat zien of Supabase e-mailbevestiging vereist
      // (identities: [] betekent dat dit adres al bestaat en Supabase dit
      // verbergt tegen user-enumeration).
      console.debug("[signup] result", {
        hasSession: !!signUpData.session,
        identitiesLength: signUpData.user.identities?.length ?? 0,
        emailConfirmedAt: signUpData.user.email_confirmed_at,
      });

      // Wanneer Supabase een bestaande (reeds geregistreerde) e-mail tegenkomt
      // en e-mailbevestiging aanstaat, krijgen we een "fake" user terug met
      // identities: []. We tonen dan niet de standaard bevestigingsmelding,
      // maar sturen de gebruiker naar het inlogscherm met een hint.
      const isExistingUser =
        (signUpData.user.identities?.length ?? 0) === 0;

      if (isExistingUser) {
        setAuthView("login");
        setPassword("");
        setRestaurantName("");
        setInviteCode("");
        setFullName("");
        setInfo(
          t("emailAlreadyRegistered"),
        );
        return;
      }

      // Wanneer e-mailbevestiging aanstaat in Supabase, geeft signUp geen
      // session terug. We sturen de gebruiker dan terug naar het inlogscherm
      // met de instructie om eerst de bevestigingsmail te openen.
      if (!signUpData.session) {
        setAuthView("login");
        setPassword("");
        setRestaurantName("");
        setInviteCode("");
        setFullName("");
        setInfo(
          t("confirmationMailSent", { email: trimmedEmail }),
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Registreren mislukt:", err);
      setError(t("retryError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-14 sm:px-10 sm:py-20">
      <div className="mx-auto w-full max-w-sm">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-blue-700 border-b-4 bg-blue-500 text-white">
            <ChefHat className="h-11 w-11" strokeWidth={2.25} aria-hidden />
          </div>
          <p className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            SnelVink
          </p>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            HACCP
          </p>
        </header>

        <h1 className="mb-8 text-center text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {authView === "login" ? t("loginTitle") : t("registerTitle")}
        </h1>

        {authView === "login" ? (
          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-5"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className={labelClass}>
                {t("emailAddress")}
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="login-password" className={labelClass}>
                {t("password")}
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
                className={inputClass}
              />
            </div>

            {info ? (
              <p
                className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-center text-base font-semibold leading-snug text-amber-950"
                role="status"
              >
                {info}
              </p>
            ) : null}

            {unconfirmedEmail ? (
              <div
                className="flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-amber-100 px-4 py-4 text-amber-950"
                role="status"
              >
                <p className="text-center text-base font-bold leading-snug">
                  {t("unconfirmedEmailMessage", { email: unconfirmedEmail })}
                </p>
                <SupercellButton
                  type="button"
                  size="lg"
                  variant="neutral"
                  onClick={() => void handleResendVerification()}
                  disabled={resendState === "sending" || resendState === "sent"}
                  aria-busy={resendState === "sending"}
                  className="h-14 w-full rounded-xl border-2 border-amber-900/30 text-base normal-case text-amber-950"
                >
                  {resendState === "sending"
                    ? t("sending")
                    : resendState === "sent"
                      ? `${t("sent")} ✓`
                      : t("resendConfirmation")}
                </SupercellButton>
                {resendState === "sent" ? (
                  <p className="text-center text-sm font-semibold text-green-900">
                    {t("newConfirmationSent")}
                  </p>
                ) : null}
                {resendState === "error" && resendError ? (
                  <p className="text-center text-sm font-semibold text-red-800">
                    {resendError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-base font-medium text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <SupercellButton
              type="submit"
              size="lg"
              variant="primary"
              disabled={loading}
              aria-busy={loading}
              textCase="normal"
              className="mt-2 h-16 w-full text-xl"
            >
              {loading ? t("working") : t("loginTitle")}
            </SupercellButton>
          </form>
        ) : (
          <form
            onSubmit={handleRegister}
            className="flex flex-col gap-5"
            noValidate
          >
            <fieldset className="flex flex-col gap-3 border-0 p-0">
              <legend className="sr-only">{t("accountType")}</legend>
              <p className="text-center text-sm font-semibold text-gray-600">
                {t("chooseAccountType")}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={[
                    "flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-2 border-b-4 px-4 py-4 text-center text-base font-black transition-colors",
                    registerRole === "owner"
                      ? "border-blue-700 bg-blue-500 text-white"
                      : "border-slate-300 bg-white text-slate-700",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="register-role"
                    value="owner"
                    checked={registerRole === "owner"}
                    onChange={() => setRegisterRole("owner")}
                    className="sr-only"
                  />
                  {t("owner")}
                </label>
                <label
                  className={[
                    "flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-2 border-b-4 px-4 py-4 text-center text-base font-black transition-colors",
                    registerRole === "employee"
                      ? "border-blue-700 bg-blue-500 text-white"
                      : "border-slate-300 bg-white text-slate-700",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="register-role"
                    value="employee"
                    checked={registerRole === "employee"}
                    onChange={() => setRegisterRole("employee")}
                    className="sr-only"
                  />
                  {t("employee")}
                </label>
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <label htmlFor="register-fullname" className={labelClass}>
                {t("name")}
              </label>
              <input
                id="register-fullname"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="register-email" className={labelClass}>
                {t("emailAddress")}
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="register-password" className={labelClass}>
                {t("password")}
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            {registerRole === "owner" ? (
              <div className="flex flex-col gap-2">
                <label htmlFor="restaurant-naam" className={labelClass}>
                  {t("restaurantName")}
                </label>
                <input
                  id="restaurant-naam"
                  name="restaurantName"
                  type="text"
                  autoComplete="organization"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className={inputClass}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label htmlFor="invite-code" className={labelClass}>
                  {t("inviteCodeLabel")}
                </label>
                <input
                  id="invite-code"
                  name="inviteCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                  maxLength={6}
                  value={inviteCode}
                  onChange={(e) =>
                    setInviteCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder={t("inviteCodePlaceholder")}
                  className={inputClass}
                />
                <p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-center text-sm font-medium text-gray-600">
                  {t("inviteCodeHelp")}
                </p>
              </div>
            )}

            {error ? (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-base font-medium text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <SupercellButton
              type="submit"
              size="lg"
              variant="primary"
              disabled={loading}
              aria-busy={loading}
              textCase="normal"
              className="mt-2 h-16 w-full text-xl"
            >
              {loading ? t("working") : t("createAccount")}
            </SupercellButton>
          </form>
        )}

        <p className="mt-10 text-center text-base leading-relaxed text-gray-600">
          {authView === "login" ? (
            <>
              {t("noAccount")}{" "}
              <SupercellButton
                type="button"
                size="sm"
                variant="neutral"
                onClick={() => {
                  setAuthView("register");
                  setError(null);
                  setInfo(null);
                  setUnconfirmedEmail(null);
                  setResendState("idle");
                  setResendError(null);
                  setInviteCode("");
                  setFullName("");
                }}
                className="px-2 py-1 text-base normal-case"
              >
                {t("registerTitle")}
              </SupercellButton>
            </>
          ) : (
            <>
              {t("alreadyHaveAccount")}{" "}
              <SupercellButton
                type="button"
                size="sm"
                variant="neutral"
                onClick={() => {
                  setAuthView("login");
                  setError(null);
                  setInfo(null);
                  setUnconfirmedEmail(null);
                  setResendState("idle");
                  setResendError(null);
                  setInviteCode("");
                  setFullName("");
                }}
                className="px-2 py-1 text-base normal-case"
              >
                {t("loginTitle")}
              </SupercellButton>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
