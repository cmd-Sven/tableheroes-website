"use client";

import { useFormStatus } from "react-dom";
import { login } from "../actions";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md border border-hero-border bg-hero-dark px-4 py-3 font-barlow font-bold uppercase text-white shadow-lg transition-transform hover:bg-hero-vibrant hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
      suppressHydrationWarning={true}
    >
      {pending ? "Laden..." : "Login"}
    </button>
  );
}

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setErrorMessage(null);
    const result = await login(formData);
    if (result) {
      setErrorMessage(result);
    }
  }

  return (
    <>
      <h1 className="mb-6 font-barlow font-extrabold text-3xl uppercase text-white text-center">
        Willkommen zurück, <span className="text-hero-vibrant">Held.</span>
      </h1>

      <form action={handleSubmit} className="space-y-4" suppressHydrationWarning={true}>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            name="email"
            type="email"
            placeholder="E-Mail Adresse"
            required
            className="w-full rounded bg-slate-900 border border-hero-dark p-3 pl-10 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none transition-colors"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            name="password"
            type="password"
            placeholder="Passwort"
            required
            className="w-full rounded bg-slate-900 border border-hero-dark p-3 pl-10 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none transition-colors"
            suppressHydrationWarning={true}
          />
        </div>

        {errorMessage && (
          <div className="text-accent-blood text-sm font-bold text-center bg-red-950/20 p-2 rounded border border-red-900/50">
            {errorMessage}
          </div>
        )}

        <SubmitButton />
      </form>

      <div className="mt-6 text-center">
        <a
          href="/signup"
          className="font-libre text-sm text-gray-400 hover:text-hero-vibrant transition-colors"
        >
          Noch keinen Account? Registrieren
        </a>
      </div>
    </>
  );
}

