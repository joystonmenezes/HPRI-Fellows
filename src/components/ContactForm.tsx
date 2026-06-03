"use client";

import { useState } from "react";

const labelClass = "block text-sm font-semibold text-neutral-800";
const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-cardinal focus:outline-none";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: new FormData(form),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not send your message.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send your message.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800"
      >
        Thank you — your message was sent. You will receive a confirmation email
        shortly.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div>
        <label htmlFor="c-name" className={labelClass}>
          Name
        </label>
        <input id="c-name" name="name" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-email" className={labelClass}>
          Email
        </label>
        <input
          id="c-email"
          name="email"
          type="email"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="c-subject" className={labelClass}>
          Subject <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <input id="c-subject" name="subject" className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="c-message"
          name="message"
          required
          rows={5}
          className={inputClass}
        />
      </div>
      {status === "error" ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center rounded-md bg-cardinal px-4 py-2 text-sm font-semibold text-white transition hover:bg-cardinal-dark disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
