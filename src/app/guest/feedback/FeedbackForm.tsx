"use client";

import { useState } from "react";

function Star({ filled, onClick, size = 26 }: { filled: boolean; onClick?: () => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label="rate"
      className={onClick ? "tap" : ""}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "var(--color-teal)" : "none"} stroke={filled ? "var(--color-teal)" : "var(--color-sand-400)"} strokeWidth="1.5">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z"
        />
      </svg>
    </button>
  );
}

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[var(--color-text)]">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= value} onClick={() => onChange(n)} />
        ))}
      </div>
    </div>
  );
}

export default function FeedbackForm() {
  const [overall, setOverall] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!overall) {
      setError("Pick an overall rating first.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/guest/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating: overall,
          cleanlinessRating: cleanliness || null,
          communicationRating: communication || null,
          accuracyRating: accuracy || null,
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) {
        setError("Something went wrong — try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="px-5 pt-8 text-center">
        <div className="text-3xl mb-2">🙏</div>
        <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">Thanks for the feedback!</div>
        <div className="text-sm text-[var(--color-muted)] mt-1.5">It helps us keep improving your stay.</div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-6">
      <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">How was your stay?</div>
      <div className="text-xs text-[var(--color-muted)] mt-1 mb-4">A quick rating helps us — and the host — a lot.</div>

      <div className="bg-white rounded-2xl p-4">
        <StarRow label="Overall" value={overall} onChange={setOverall} />
        <div className="h-px bg-[var(--color-sand-200)]" />
        <StarRow label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
        <div className="h-px bg-[var(--color-sand-200)]" />
        <StarRow label="Communication" value={communication} onChange={setCommunication} />
        <div className="h-px bg-[var(--color-sand-200)]" />
        <StarRow label="Accuracy" value={accuracy} onChange={setAccuracy} />
      </div>

      <div className="mt-3">
        <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Anything you&apos;d like to add? (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] resize-none bg-white"
        />
      </div>

      {error && <div className="text-xs text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-lg px-3 py-2.5 mt-3">{error}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="tap w-full mt-4 rounded-[10px] bg-[var(--color-teal)] text-[var(--color-navy)] px-5 py-3 text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Submit feedback"}
      </button>
    </div>
  );
}
