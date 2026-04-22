"use client";

import { supabase } from "@/lib/supabase";
import { ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthView = "login" | "register";
type RegisterRole = "owner" | "employee";

const inputClass =
  "h-16 w-full rounded-2xl border border-gray-200 bg-white px-5 text-xl text-gray-900 shadow-sm outline-none ring-0 transition-colors focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10";

const labelClass = "text-sm font-semibold text-gray-800";

export default function LoginPage() {
  const router = useRouter();
  const [authView, setAuthView] = useState<AuthView>("login");
  const [registerRole, setRegisterRole] = useState<RegisterRole>("owner");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        console.error("Inloggen mislukt:", signInError.message);
        setError("Inloggen mislukt. Controleer je gegevens.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Inloggen mislukt:", err);
      setError("Inloggen mislukt. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const trimmedEmail = email.trim();

    if (registerRole === "owner" && !restaurantName.trim()) {
      setError("Vul de restaurantnaam in.");
      setLoading(false);
      return;
    }

    try {
      const userMetadata =
        registerRole === "owner"
          ? {
              role: "eigenaar" as const,
              restaurant_name: restaurantName.trim(),
            }
          : {
              role: "staff" as const,
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
        setError(signUpError.message || "Registreren mislukt.");
        return;
      }

      if (!signUpData.user) {
        setError("Registreren mislukt. Probeer opnieuw.");
        return;
      }

      // Wanneer e-mailbevestiging aanstaat in Supabase, geeft signUp geen
      // session terug. We sturen de gebruiker dan terug naar het inlogscherm
      // met de instructie om eerst de bevestigingsmail te openen.
      if (!signUpData.session) {
        setAuthView("login");
        setPassword("");
        setRestaurantName("");
        setInfo(
          `We hebben een bevestigingsmail naar ${trimmedEmail} gestuurd. Open de link in je inbox om je account te activeren en log daarna in.`,
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Registreren mislukt:", err);
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-14 sm:px-10 sm:py-20">
      <div className="mx-auto w-full max-w-sm">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-900 text-white shadow-md">
            <ChefHat className="h-11 w-11" strokeWidth={1.75} aria-hidden />
          </div>
          <p className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            SnelVink
          </p>
        </header>

        <h1 className="mb-8 text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {authView === "login" ? "Aanmelden" : "Registreren"}
        </h1>

        {authView === "login" ? (
          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-5"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className={labelClass}>
                E-mailadres
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
                Wachtwoord
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

            {error ? (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-base font-medium text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="mt-2 h-16 w-full rounded-2xl bg-gray-900 text-xl font-bold text-white shadow-md transition-transform hover:bg-gray-800 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Bezig…" : "Aanmelden"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleRegister}
            className="flex flex-col gap-5"
            noValidate
          >
            <fieldset className="flex flex-col gap-3 border-0 p-0">
              <legend className="sr-only">Accounttype</legend>
              <p className="text-center text-sm font-semibold text-gray-600">
                Kies je accounttype
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={[
                    "flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-2 px-4 py-4 text-center text-base font-bold transition-colors",
                    registerRole === "owner"
                      ? "border-gray-900 bg-gray-100 text-gray-900"
                      : "border-gray-200 bg-white text-gray-700",
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
                  Eigenaar
                </label>
                <label
                  className={[
                    "flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-2 px-4 py-4 text-center text-base font-bold transition-colors",
                    registerRole === "employee"
                      ? "border-gray-900 bg-gray-100 text-gray-900"
                      : "border-gray-200 bg-white text-gray-700",
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
                  Personeel
                </label>
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <label htmlFor="register-email" className={labelClass}>
                E-mailadres
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
                Wachtwoord
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
                  Restaurantnaam
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
              <p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-center text-sm font-medium text-gray-600">
                Je account wordt na registratie door het systeem gekoppeld. Vraag
                je werkgever om hulp als je niet binnenkomt.
              </p>
            )}

            {error ? (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-base font-medium text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="mt-2 h-16 w-full rounded-2xl bg-gray-900 text-xl font-bold text-white shadow-md transition-transform hover:bg-gray-800 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Bezig…" : "Account aanmaken"}
            </button>
          </form>
        )}

        <p className="mt-10 text-center text-base leading-relaxed text-gray-600">
          {authView === "login" ? (
            <>
              Nog geen account?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthView("register");
                  setError(null);
                  setInfo(null);
                }}
                className="font-bold text-gray-900 underline decoration-gray-400 underline-offset-4"
              >
                Registreren
              </button>
            </>
          ) : (
            <>
              Al een account?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthView("login");
                  setError(null);
                  setInfo(null);
                }}
                className="font-bold text-gray-900 underline decoration-gray-400 underline-offset-4"
              >
                Aanmelden
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
