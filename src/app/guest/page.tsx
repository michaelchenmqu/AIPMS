import { prisma } from "@/lib/prisma";
import { BotAvatar } from "@/components/guest/BotAvatar";
import { verifyGuest } from "./actions";

export default async function GuestEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; error?: string }>;
}) {
  const { propertyId, error } = await searchParams;
  const property = propertyId ? await prisma.property.findUnique({ where: { id: propertyId } }) : null;

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4 py-12"
      style={{ backgroundImage: "url('/images/aipms-app-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-[var(--color-navy)]/50" aria-hidden="true" />

      <div className="relative w-full max-w-sm flex flex-col items-center">
        <BotAvatar mood="idle" size={84} />
        <h1 className="mt-3 font-[family-name:var(--font-serif)] text-2xl font-bold text-white text-center drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
          {property ? `Welcome to ${property.name}` : "Guest access"}
        </h1>
        <p className="mt-1.5 text-sm text-white/85 text-center drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
          Verify your booking to see your stay details and chat with your AI concierge.
        </p>

        <form action={verifyGuest} className="w-full bg-white rounded-2xl shadow-[var(--shadow-lift)] p-6 mt-6">
          <input type="hidden" name="propertyId" value={propertyId ?? ""} />

          {error && (
            <div className="text-xs text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-lg px-3 py-2.5 mb-4">
              We couldn&apos;t match a reservation to those details. Double-check your last name and arrival date, or
              ask your host.
            </div>
          )}

          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Last name on the booking</label>
          <input
            name="lastName"
            required
            autoComplete="family-name"
            className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2.5 text-sm mb-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
            placeholder="e.g. Patel"
          />

          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Arrival date</label>
          <input
            type="date"
            name="arrivalDate"
            required
            className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2.5 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
          />

          <button
            type="submit"
            className="tap w-full inline-flex items-center justify-center rounded-[10px] bg-[var(--color-teal)] text-[var(--color-navy)] px-5 py-3 text-sm font-semibold"
          >
            View my stay
          </button>
        </form>

        <p className="text-[11px] text-white/70 text-center mt-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
          Scanned this from a welcome card? You&apos;re in the right place.
        </p>
      </div>
    </div>
  );
}
