"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui";

const DEMO_ACCOUNTS = [
  { key: "staff", email: "staff@aipms.demo", label: "Staff — Web portal", desc: "Back-office: dashboard, reservations, housekeeping, invoicing" },
  { key: "owner", email: "james@aipms.demo", label: "James — Owner", desc: "Owner portal + Owner App · 5 properties" },
  { key: "contractor", email: "clean@aipms.demo", label: "Sarah — Contractor", desc: "Contractor portal · Coastal Clean Co" },
  { key: "housekeeper", email: "maria@aipms.demo", label: "Maria — Housekeeper", desc: "Housekeeper App · 2 pending jobs" },
];

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? undefined;
  const preselect = params.get("as");
  const preselectAccount = DEMO_ACCOUNTS.find((a) => a.key === preselect);

  const [email, setEmail] = useState(preselectAccount?.email ?? "");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl || "/redirect");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-[var(--shadow-lift)] p-7">
        <h1 className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">
          Sign in to AIPMS
        </h1>
        <p className="text-sm text-[var(--color-muted)] mt-1 mb-5">Pick a demo account below, or enter credentials.</p>

        <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
          placeholder="you@aipms.demo"
        />
        <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
        />
        {error && <div className="text-xs text-[var(--color-error)] mb-3">{error}</div>}
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-2)] mb-2">
          Quick demo login
        </div>
        <div className="flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword("demo1234");
              }}
              className="tap text-left bg-white rounded-xl border border-[var(--color-sand-300)] px-3.5 py-2.5"
            >
              <div className="text-sm font-semibold text-[var(--color-navy)]">{a.label}</div>
              <div className="text-xs text-[var(--color-muted)]">{a.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
