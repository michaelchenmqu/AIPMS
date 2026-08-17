import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4 py-12"
      style={{ backgroundImage: "url('/images/aipms-app-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-[var(--color-navy)]/45" aria-hidden="true" />
      <Link
        href="/"
        className="relative mb-8 font-[family-name:var(--font-serif)] text-2xl font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
      >
        AIPMS
      </Link>
      <div className="relative w-full max-w-sm">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
