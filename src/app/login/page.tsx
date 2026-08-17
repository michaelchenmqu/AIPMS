import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-sand-200)] px-4 py-12">
      <Link href="/" className="mb-8 font-[family-name:var(--font-serif)] text-2xl font-bold text-[var(--color-navy)]">
        AIPMS
      </Link>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
