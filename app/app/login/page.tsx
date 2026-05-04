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
  "h-14 w-full rounded-2xl border-2 border-b-4 bg-white px-4 text-base font-bold outline-none transition-colors sm:h-16 sm:px-5 sm:text-lg";

const labelClass = "text-[11px] font-black uppercase tracking-widest";

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
    "text-[var(--theme-fg,#1A2520)]",
    "border-[var(--theme-card-border,rgba(200,215,205,0.9))]",
    "focus:border-[var(--theme-primary,#2D5C3C)]",
    "focus:border-b-[var(--theme-primary-dark,#1E4029)]",
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
      className="min-h-screen px-4 py-6 sm:px-6 sm:py-8"
      style={{ background: theme.bg, color: theme.fg }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <header
          className="rounded-3xl border-2 border-b-4 px-4 py-4 sm:px-5"
          style={{
            background: theme.primary,
            borderColor: theme.primaryDark,
          }}
        >
          <div className="flex items-center gap-3">
            <Image
              src="/logo-snelvink.png"
              alt="SnelVink"
              width={72}
              height={72}
              priority
              className="h-16 w-16 shrink-0 select-none"
            />
            <div className="min-w-0">
              <p
                className="truncate text-3xl font-black uppercase tracking-[0.08em] text-white sm:text-4xl"
                style={{ lineHeight: 1 }}
              >
                SNEL
                <span className="ml-1.5 text-white/70">VINK</span>
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-white/90">
                {t("brandTagline")}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-white/90">
              <Globe className="h-4 w-4" strokeWidth={2.4} />
              <span className="text-[11px] font-black uppercase tracking-widest">
                {t("language")}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SUPPORTED_LANGUAGES.map((code) => {
                const meta = LANGUAGE_META[code];
                const active = language === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className="shrink-0 rounded-xl border-2 border-b-4 px-3 py-2 text-sm font-black transition-colors"
                    style={{
                      background: active ? "#fff" : "rgba(255,255,255,0.14)",
                      color: active ? theme.primary : "#fff",
                      borderColor: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                    }}
                    dir={meta.dir}
                  >
                    <span className="mr-1.5" aria-hidden>
                      {meta.flag}
                    </span>
                    {meta.nativeName}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <section
          className="rounded-3xl border-2 border-b-4 px-4 py-5 sm:px-5"
          style={{
            background: theme.cardBg,
            borderColor: theme.cardBorder,
          }}
        >
          {panel !== "reset" ? (
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchAuthView("login")}
                className="rounded-xl border-2 border-b-4 px-3 py-2.5 text-sm font-black uppercase tracking-wide transition-colors"
                style={{
                  background: authView === "login" ? theme.primary : "#fff",
                  color: authView === "login" ? "#fff" : theme.fg,
                  borderColor:
                    authView === "login" ? theme.primaryDark : theme.cardBorder,
                }}
              >
                {t("loginTitle")}
              </button>
              <button
                type="button"
                onClick={() => switchAuthView("register")}
                className="rounded-xl border-2 border-b-4 px-3 py-2.5 text-sm font-black uppercase tracking-wide transition-colors"
                style={{
                  background: authView === "register" ? theme.primary : "#fff",
                  color: authView === "register" ? "#fff" : theme.fg,
                  borderColor:
                    authView === "register" ? theme.primaryDark : theme.cardBorder,
                }}
              >
                {t("registerTitle")}
              </button>
            </div>
          ) : null}

          <h1
            className="mb-5 text-center text-2xl font-black tracking-tight sm:text-3xl"
            style={{ color: theme.fg }}
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
                  className="rounded-xl border-2 border-b-4 border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-900"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {info ? (
                <p
                  className="rounded-xl border-2 border-b-4 border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-900"
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
                className="text-center text-sm font-black uppercase tracking-wide"
                style={{ color: theme.primary }}
              >
                {t("back")}
              </button>
            </form>
          ) : panel === "forgot" ? (
            <form
              onSubmit={handleSendRecoveryEmail}
              className="flex flex-col gap-3 rounded-2xl border-2 border-b-4 px-4 py-4"
              style={{ borderColor: theme.cardBorder, background: "#fff" }}
              noValidate
            >
              <p
                className="text-center text-xs font-black uppercase tracking-[0.14em]"
                style={{ color: theme.muted }}
              >
                {t("forgotPassword")}
              </p>
              <p className="text-center text-xs font-semibold" style={{ color: theme.muted }}>
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
                  className="rounded-xl border-2 border-b-4 border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-900"
                  role="status"
                >
                  {info}
                </p>
              ) : null}
              {error ? (
                <p
                  className="rounded-xl border-2 border-b-4 border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-900"
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
                textCase="normal"
                className="h-12 w-full text-base"
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
                className="text-center text-xs font-black uppercase tracking-wide"
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
                  className="text-xs font-black uppercase tracking-wide"
                  style={{ color: theme.primary }}
                >
                  {t("forgotPassword")}
                </button>
              </div>

              {info ? (
                <p
                  className="rounded-xl border-2 border-b-4 border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm font-bold leading-snug text-amber-950"
                  role="status"
                >
                  {info}
                </p>
              ) : null}

              {unconfirmedEmail ? (
                <div
                  className="flex flex-col gap-3 rounded-2xl border-2 border-b-4 border-amber-300 bg-amber-100 px-4 py-4 text-amber-950"
                  role="status"
                >
                  <p className="text-center text-sm font-bold leading-snug">
                    {t("unconfirmedEmailMessage", { email: unconfirmedEmail })}
                  </p>
                  <SupercellButton
                    type="button"
                    size="md"
                    variant="neutral"
                    onClick={() => void handleResendVerification()}
                    disabled={resendState === "sending" || resendState === "sent"}
                    aria-busy={resendState === "sending"}
                    textCase="normal"
                    className="h-12 w-full text-sm"
                  >
                    {resendState === "sending"
                      ? t("sending")
                      : resendState === "sent"
                        ? `${t("sent")} ✓`
                        : t("resendConfirmation")}
                  </SupercellButton>
                  {resendState === "sent" ? (
                    <p className="text-center text-xs font-bold text-green-900">
                      {t("newConfirmationSent")}
                    </p>
                  ) : null}
                  {resendState === "error" && resendError ? (
                    <p className="text-center text-xs font-bold text-red-800">
                      {resendError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <p
                  className="rounded-xl border-2 border-b-4 border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-900"
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
                className="mt-1 h-14 w-full text-lg"
              >
                {loading ? t("working") : t("loginTitle")}
              </SupercellButton>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4" noValidate>
              <fieldset className="flex flex-col gap-2 border-0 p-0">
                <legend className="sr-only">{t("accountType")}</legend>
                <p
                  className="text-center text-xs font-black uppercase tracking-[0.14em]"
                  style={{ color: theme.muted }}
                >
                  {t("chooseAccountType")}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label
                    className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-b-4 px-3 py-2 text-center text-sm font-black uppercase tracking-wide transition-colors"
                    style={{
                      background: registerRole === "owner" ? theme.primary : "#fff",
                      color: registerRole === "owner" ? "#fff" : theme.fg,
                      borderColor:
                        registerRole === "owner" ? theme.primaryDark : theme.cardBorder,
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
                    className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-b-4 px-3 py-2 text-center text-sm font-black uppercase tracking-wide transition-colors"
                    style={{
                      background: registerRole === "employee" ? theme.primary : "#fff",
                      color: registerRole === "employee" ? "#fff" : theme.fg,
                      borderColor:
                        registerRole === "employee" ? theme.primaryDark : theme.cardBorder,
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
                    className="rounded-xl border px-4 py-3 text-center text-xs font-semibold"
                    style={{
                      color: theme.muted,
                      borderColor: theme.cardBorder,
                      background: "#fff",
                    }}
                  >
                    {t("inviteCodeHelp")}
                  </p>
                </div>
              )}

              {error ? (
                <p
                  className="rounded-xl border-2 border-b-4 border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-900"
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
                className="mt-1 h-14 w-full text-lg"
              >
                {loading ? t("working") : t("createAccount")}
              </SupercellButton>
            </form>
          )}

          {panel === "auth" ? (
            <p
              className="mt-5 text-center text-sm font-semibold"
              style={{ color: theme.muted }}
            >
              {authView === "login" ? t("noAccount") : t("alreadyHaveAccount")}{" "}
              <button
                type="button"
                onClick={() =>
                  switchAuthView(authView === "login" ? "register" : "login")
                }
                className="font-black uppercase tracking-wide"
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
