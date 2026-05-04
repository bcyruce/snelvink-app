"use client";

import SupercellButton from "@/components/SupercellButton";
import {
  LANGUAGE_META,
  SUPPORTED_LANGUAGES,
} from "@/context/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { Globe } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AuthView = "login" | "register";
type RegisterRole = "owner" | "employee";
type LoginPanel = "auth" | "forgot" | "reset";

const baseInputClass =
  "h-12 w-full rounded-xl border bg-white px-4 text-base font-medium outline-none transition-all duration-200 sm:h-14 sm:px-5";

const labelClass = "text-xs font-medium";

export default function LoginPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useTranslation();
  const { theme } = useTheme();
  const [panel, setPanel] = useState<LoginPanel>(() => {
    if (typeof window === "undefined") return "auth";
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return hashParams.get("type") === "recovery" ? "reset" : "auth";
  });
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
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const inputClass = [
    baseInputClass,
    "text-neutral-900",
    "border-neutral-200",
    "focus:border-[var(--theme-primary)]",
    "focus:ring-2 focus:ring-[var(--theme-primary)]/20",
  ].join(" ");

  const resetFeedback = () => {
    setError(null);
    setInfo(null);
    setUnconfirmedEmail(null);
    setResendState("idle");
    setResendError(null);
  };

  const switchAuthView = (nextView: AuthView) => {
    setPanel("auth");
    setAuthView(nextView);
    resetFeedback();
    setInviteCode("");
    setFullName("");
    setRestaurantName("");
    setPassword("");
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPanel("reset");
        setAuthView("login");
        resetFeedback();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPanel("auth");
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

      router.replace("/app");
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
          ? `${window.location.origin}/app/login`
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

  async function handleSendRecoveryEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const targetEmail = (recoveryEmail || email).trim();
    if (!targetEmail) {
      setError(t("fillEmailAddress"));
      return;
    }

    setSendingRecovery(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/app/login`
          : undefined;
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
        targetEmail,
        {
          redirectTo,
        },
      );

      if (recoveryError) {
        setError(recoveryError.message || t("retryError"));
        return;
      }

      setInfo(t("passwordResetMailSent", { email: targetEmail }));
    } catch (err) {
      console.error("Reset-mail verzenden mislukt:", err);
      setError(t("retryError"));
    } finally {
      setSendingRecovery(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (newPassword.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setError(updateError.message || t("retryError"));
        return;
      }

      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/app/login");
      }
      setPanel("auth");
      setAuthView("login");
      setNewPassword("");
      setConfirmNewPassword("");
      setInfo(t("passwordUpdatedSuccess"));
    } catch (err) {
      console.error("Wachtwoord bijwerken mislukt:", err);
      setError(t("retryError"));
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPanel("auth");
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
          ? `${window.location.origin}/app/login`
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

      router.replace("/app");
      router.refresh();
    } catch (err) {
      console.error("Registreren mislukt:", err);
      setError(t("retryError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6 sm:py-12"
      style={{ background: "#FAFAFA", color: theme.fg }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-snelvink.png"
              alt="SnelVink"
              width={56}
              height={56}
              priority
              className="h-12 w-12 shrink-0 select-none"
            />
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-bold tracking-tight text-neutral-900">
                Snel
              </span>
              <span className="text-2xl font-bold tracking-tight text-neutral-400">
                vink
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {t("brandTagline")}
          </p>

          {/* Language Dropdown */}
          <div className="mt-4 relative">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as typeof language)}
                className="appearance-none bg-transparent text-sm font-medium text-neutral-600 cursor-pointer pr-6 focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((code) => {
                  const meta = LANGUAGE_META[code];
                  return (
                    <option key={code} value={code}>
                      {meta.flag} {meta.nativeName}
                    </option>
                  );
                })}
              </select>
              <svg className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </header>

        <section
          className="rounded-2xl border bg-white px-5 py-6 shadow-sm sm:px-6"
          style={{
            borderColor: "rgba(0, 0, 0, 0.06)",
          }}
        >
          {panel !== "reset" ? (
            <div className="mb-5 flex rounded-full bg-neutral-100 p-1">
              <button
                type="button"
                onClick={() => switchAuthView("login")}
                className="flex-1 rounded-full py-2 text-sm font-medium transition-all duration-200"
                style={{
                  background: authView === "login" ? "#fff" : "transparent",
                  color: authView === "login" ? theme.primary : theme.muted,
                  boxShadow: authView === "login" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {t("loginTitle")}
              </button>
              <button
                type="button"
                onClick={() => switchAuthView("register")}
                className="flex-1 rounded-full py-2 text-sm font-medium transition-all duration-200"
                style={{
                  background: authView === "register" ? "#fff" : "transparent",
                  color: authView === "register" ? theme.primary : theme.muted,
                  boxShadow: authView === "register" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {t("registerTitle")}
              </button>
            </div>
          ) : null}

          <h1
            className="mb-5 text-center text-xl font-semibold tracking-tight text-neutral-900"
          >
            {panel === "reset"
              ? t("resetPasswordTitle")
              : panel === "forgot"
                ? t("forgotPassword")
                : authView === "login"
                  ? t("loginTitle")
                  : t("registerTitle")}
          </h1>

          {panel === "reset" ? (
            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4" noValidate>
              <p
                className="rounded-xl border px-4 py-3 text-center text-xs font-semibold"
                style={{
                  color: theme.muted,
                  borderColor: theme.cardBorder,
                  background: "#fff",
                }}
              >
                {t("resetPasswordHint")}
              </p>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reset-password"
                  className={labelClass}
                  style={{ color: theme.muted }}
                >
                  {t("newPassword")}
                </label>
                <input
                  id="reset-password"
                  name="resetPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirm-reset-password"
                  className={labelClass}
                  style={{ color: theme.muted }}
                >
                  {t("confirmPassword")}
                </label>
                <input
                  id="confirm-reset-password"
                  name="confirmResetPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              {error ? (
                <p
                  className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {info ? (
                <p
                  className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700"
                  role="status"
                >
                  {info}
                </p>
              ) : null}
              <SupercellButton
                type="submit"
                size="lg"
                variant="primary"
                disabled={updatingPassword}
                aria-busy={updatingPassword}
                textCase="normal"
                className="mt-1 h-14 w-full text-lg"
              >
                {updatingPassword ? t("working") : t("updatePassword")}
              </SupercellButton>
              <button
                type="button"
                onClick={() => {
                  setPanel("auth");
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setError(null);
                }}
                className="text-center text-sm font-medium hover:underline"
                style={{ color: theme.primary }}
              >
                {t("back")}
              </button>
            </form>
          ) : panel === "forgot" ? (
            <form
              onSubmit={handleSendRecoveryEmail}
              className="flex flex-col gap-4"
              noValidate
            >
              <p
                className="text-center text-sm font-medium"
                style={{ color: theme.muted }}
              >
                {t("forgotPasswordHint")}
              </p>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="recovery-email"
                  className={labelClass}
                  style={{ color: theme.muted }}
                >
                  {t("emailAddress")}
                </label>
                <input
                  id="recovery-email"
                  name="recoveryEmail"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              {info ? (
                <p
                  className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700"
                  role="status"
                >
                  {info}
                </p>
              ) : null}
              {error ? (
                <p
                  className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <SupercellButton
                type="submit"
                size="md"
                variant="primary"
                disabled={sendingRecovery}
                aria-busy={sendingRecovery}
                className="w-full"
              >
                {sendingRecovery ? t("sending") : t("sendResetLink")}
              </SupercellButton>
              <button
                type="button"
                onClick={() => {
                  setPanel("auth");
                  setError(null);
                  setInfo(null);
                }}
                className="text-center text-sm font-medium hover:underline"
                style={{ color: theme.primary }}
              >
                {t("back")}
              </button>
            </form>
          ) : authView === "login" ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-email"
                  className={labelClass}
                  style={{ color: theme.muted }}
                >
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

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-password"
                  className={labelClass}
                  style={{ color: theme.muted }}
                >
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

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPanel("forgot");
                    setAuthView("login");
                    setRecoveryEmail((prev) => prev || email.trim());
                    setError(null);
                    setInfo(null);
                  }}
                  className="text-sm font-medium hover:underline"
                  style={{ color: theme.primary }}
                >
                  {t("forgotPassword")}
                </button>
              </div>

              {info ? (
                <p
                  className="rounded-lg bg-amber-50 px-4 py-3 text-center text-sm font-medium leading-snug text-amber-700"
                  role="status"
                >
                  {info}
                </p>
              ) : null}

              {unconfirmedEmail ? (
                <div
                  className="flex flex-col gap-3 rounded-lg bg-amber-50 px-4 py-4 text-amber-800"
                  role="status"
                >
                  <p className="text-center text-sm font-medium leading-snug">
                    {t("unconfirmedEmailMessage", { email: unconfirmedEmail })}
                  </p>
                  <SupercellButton
                    type="button"
                    size="md"
                    variant="neutral"
                    onClick={() => void handleResendVerification()}
                    disabled={resendState === "sending" || resendState === "sent"}
                    aria-busy={resendState === "sending"}
                    className="w-full"
                  >
                    {resendState === "sending"
                      ? t("sending")
                      : resendState === "sent"
                        ? `${t("sent")} ✓`
                        : t("resendConfirmation")}
                  </SupercellButton>
                  {resendState === "sent" ? (
                    <p className="text-center text-xs font-medium text-emerald-700">
                      {t("newConfirmationSent")}
                    </p>
                  ) : null}
                  {resendState === "error" && resendError ? (
                    <p className="text-center text-xs font-medium text-red-700">
                      {resendError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <p
                  className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700"
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
                className="mt-2 w-full"
              >
                {loading ? t("working") : t("loginTitle")}
              </SupercellButton>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4" noValidate>
              <fieldset className="flex flex-col gap-2 border-0 p-0">
                <legend className="sr-only">{t("accountType")}</legend>
                <p
                  className="text-center text-xs font-medium"
                  style={{ color: theme.muted }}
                >
                  {t("chooseAccountType")}
                </p>
                <div className="flex rounded-full bg-neutral-100 p-1">
                  <label
                    className="flex flex-1 cursor-pointer items-center justify-center rounded-full py-2 text-center text-sm font-medium transition-all duration-200"
                    style={{
                      background: registerRole === "owner" ? "#fff" : "transparent",
                      color: registerRole === "owner" ? theme.primary : theme.muted,
                      boxShadow: registerRole === "owner" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}
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
                    className="flex flex-1 cursor-pointer items-center justify-center rounded-full py-2 text-center text-sm font-medium transition-all duration-200"
                    style={{
                      background: registerRole === "employee" ? "#fff" : "transparent",
                      color: registerRole === "employee" ? theme.primary : theme.muted,
                      boxShadow: registerRole === "employee" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}
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

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-fullname"
                  className={labelClass}
                  style={{ color: theme.muted }}
                >
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

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-email"
                  className={labelClass}
                  style={{ color: theme.muted }}
                >
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

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-password"
                  className={labelClass}
                  style={{ color: theme.muted }}
                >
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
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="restaurant-naam"
                    className={labelClass}
                    style={{ color: theme.muted }}
                  >
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
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="invite-code"
                    className={labelClass}
                    style={{ color: theme.muted }}
                  >
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
                  <p
                    className="rounded-lg bg-neutral-50 px-4 py-3 text-center text-xs"
                    style={{ color: theme.muted }}
                  >
                    {t("inviteCodeHelp")}
                  </p>
                </div>
              )}

              {error ? (
                <p
                  className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700"
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
                className="mt-2 w-full"
              >
                {loading ? t("working") : t("createAccount")}
              </SupercellButton>
            </form>
          )}

          {panel === "auth" ? (
            <p
              className="mt-5 text-center text-sm"
              style={{ color: theme.muted }}
            >
              {authView === "login" ? t("noAccount") : t("alreadyHaveAccount")}{" "}
              <button
                type="button"
                onClick={() =>
                  switchAuthView(authView === "login" ? "register" : "login")
                }
                className="font-semibold hover:underline"
                style={{ color: theme.primary }}
              >
                {authView === "login" ? t("registerTitle") : t("loginTitle")}
              </button>
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
