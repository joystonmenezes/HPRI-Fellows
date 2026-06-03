// Client-safe date/time helpers (no server-only imports), shared by the public
// page, the submit form, and the admin editor.
//
// Assignment open/close times are stored as "YYYY-MM-DDTHH:mm" strings taken
// straight from a <input type="datetime-local"> and interpreted as Los Angeles
// wall-clock time. We never convert time zones on these strings — they are
// compared and displayed exactly as entered — which keeps the logic simple and
// free of off-by-one-hour bugs.

export type SubmitState = "open" | "upcoming" | "closed" | "inactive";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "2026-06-22T17:00" → "Jun 22, 5:00 PM PT". Returns "" for empty/invalid input.
export function formatWallTime(s: string | undefined): string {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return "";
  const [, , mo, d, hh, mi] = m;
  let h = Number(hh);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${MONTHS[Number(mo) - 1]} ${Number(d)}, ${h}:${mi} ${ampm} PT`;
}
