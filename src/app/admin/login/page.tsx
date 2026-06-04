"use client";

import { useState } from "react";

const labelClass = "block text-sm font-semibold text-neutral-800";
const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-cardinal focus:outline-none";

export default function AdminLoginPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        body: new FormData(form),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not sign in.");
      }
      // Full navigation so the server reads the new session cookie.
      window.location.replace("/admin");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not sign in.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-cardinal">
          HPRI Summer Fellowship
        </p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-neutral-900">
          Admin sign in
        </h1>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <div>
            <label htmlFor="username" className={labelClass}>
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>
          {status === "error" ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex items-center justify-center rounded-md bg-cardinal px-4 py-2 text-sm font-semibold text-white transition hover:bg-cardinal-dark disabled:opacity-60"
          >
            {status === "submitting" ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
