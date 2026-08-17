"use client";

import { useState } from "react";
import clsx from "clsx";

export default function DemoActionButton({
  children,
  message,
  className,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setToast(message);
          setTimeout(() => setToast(null), 2200);
        }}
        className={clsx("tap", className)}
      >
        {children}
      </button>
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-navy)] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-[var(--shadow-lift)]">
          {toast}
        </div>
      )}
    </>
  );
}
