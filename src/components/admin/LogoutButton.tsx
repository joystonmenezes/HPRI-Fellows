"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.replace("/admin/login");
  }
  return (
    <button
      onClick={logout}
      className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
