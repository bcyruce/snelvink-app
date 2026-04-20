"use client";

import { supabase } from "@/lib/supabase";
import { ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        console.error("Inloggen mislukt:", signInError.message);
        setError(true);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Inloggen mislukt:", err);
      setError(true);
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
          Inloggen bij SnelVink
        </h1>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="login-email"
              className="text-sm font-semibold text-gray-800"
            >
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
              aria-invalid={error}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-lg text-gray-900 shadow-sm outline-none ring-0 transition-colors focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="login-password"
              className="text-sm font-semibold text-gray-800"
            >
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
              aria-invalid={error}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-lg text-gray-900 shadow-sm outline-none ring-0 transition-colors focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
            />
          </div>

          {error ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800"
              role="alert"
            >
              Oeps! Inloggen mislukt. Controleer je gegevens.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="mt-2 w-full rounded-2xl bg-gray-900 py-5 text-xl font-bold text-white shadow-md transition-transform hover:bg-gray-800 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Bezig…" : "Aanmelden"}
          </button>
        </form>

        <p className="mt-10 text-center text-sm leading-relaxed text-gray-500">
          Nog geen account? Neem contact op
        </p>
      </div>
    </div>
  );
}
