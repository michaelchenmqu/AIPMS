import { requireGuestScope } from "@/lib/guest";
import { prisma } from "@/lib/prisma";
import GuestShell from "@/components/guest/GuestShell";
import FeedbackForm from "./FeedbackForm";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill={filled ? "var(--color-teal)" : "none"} stroke={filled ? "var(--color-teal)" : "var(--color-sand-400)"} strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z"
      />
    </svg>
  );
}

export default async function GuestFeedbackPage() {
  const { reservation, property } = await requireGuestScope();

  const existing = await prisma.guestFeedback.findUnique({ where: { reservationId: reservation.id } });

  return (
    <GuestShell title={property.name} activeHref="/guest/feedback">
      {existing ? (
        <div className="px-5 pt-8 text-center">
          <div className="text-3xl mb-2">🙏</div>
          <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">Thanks for the feedback!</div>
          <div className="flex justify-center gap-1 mt-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} filled={n <= existing.overallRating} />
            ))}
          </div>
          {existing.comment && (
            <div className="bg-white rounded-2xl p-3.5 text-sm text-[var(--color-text)] mt-4 text-left">{existing.comment}</div>
          )}
        </div>
      ) : (
        <FeedbackForm />
      )}
    </GuestShell>
  );
}
