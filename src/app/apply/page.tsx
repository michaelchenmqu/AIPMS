import { prisma } from "@/lib/prisma";
import { submitApplication } from "./actions";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; submitted?: string; error?: string }>;
}) {
  const { propertyId, submitted, error } = await searchParams;
  const property = propertyId ? await prisma.property.findUnique({ where: { id: propertyId } }) : null;

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4 py-12"
      style={{ backgroundImage: "url('/images/aipms-app-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-[var(--color-navy)]/50" aria-hidden="true" />

      <div className="relative w-full max-w-sm flex flex-col items-center">
        <h1 className="font-[family-name:var(--font-serif)] text-2xl font-bold text-white text-center drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
          {property ? `Apply for ${property.name}` : "Rental application"}
        </h1>
        {property && (
          <p className="mt-1.5 text-sm text-white/85 text-center drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">{property.address}</p>
        )}

        <div className="w-full bg-white rounded-2xl shadow-[var(--shadow-lift)] p-6 mt-6">
          {!property || property.lettingMode !== "LONG_TERM" ? (
            <p className="text-sm text-[var(--color-muted)]">
              This property isn&apos;t currently taking applications. Please check the listing link and try again.
            </p>
          ) : submitted ? (
            <p className="text-sm text-[var(--color-text)]">
              Thanks — your application has been submitted. The property manager will be in touch.
            </p>
          ) : (
            <form action={submitApplication} className="flex flex-col gap-4">
              <input type="hidden" name="propertyId" value={propertyId} />
              {error && <div className="text-xs text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-lg px-3 py-2">{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Full name</label>
                <input name="name" required className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Email</label>
                <input name="email" type="email" required className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Phone</label>
                <input name="phone" placeholder="+61…" className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Preferred move-in date</label>
                <input name="moveInDate" type="date" className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Anything else we should know?</label>
                <textarea name="note" rows={3} className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
              </div>
              <button className="tap text-sm font-semibold bg-[var(--color-navy)] text-white rounded-lg px-4 py-2.5">
                Submit application
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
