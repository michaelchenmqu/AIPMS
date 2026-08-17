"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className ?? "text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)] tap"}
    >
      Sign out
    </button>
  );
}
