import Link from "next/link";
import { requireGuestScope } from "@/lib/guest";
import { formatDate, nowMs } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import GuestShell from "@/components/guest/GuestShell";
import { differenceInCalendarDays } from "date-fns";

export default async function GuestStayPage() {
  const { reservation, property } = await requireGuestScope();

  const firstWord = reservation.guestName.split(" ")[0];
  const displayName = firstWord.toLowerCase() === "the" ? reservation.guestName : firstWord;
  const now = nowMs();
  const nights = Math.max(1, differenceInCalendarDays(reservation.checkOut, reservation.checkIn));

  let phase: "upcoming" | "in-stay" | "past";
  let phaseLabel: string;
  if (now < reservation.checkIn.getTime()) {
    phase = "upcoming";
    const daysToGo = Math.max(0, differenceInCalendarDays(reservation.checkIn, new Date(now)));
    phaseLabel = daysToGo === 0 ? "Arriving today" : `${daysToGo} day${daysToGo === 1 ? "" : "s"} until check-in`;
  } else if (now <= reservation.checkOut.getTime()) {
    phase = "in-stay";
    const nightOfStay = Math.max(1, Math.ceil((now - reservation.checkIn.getTime()) / (24 * 60 * 60 * 1000)));
    phaseLabel = `Night ${Math.min(nightOfStay, nights)} of ${nights}`;
  } else {
    phase = "past";
    phaseLabel = "Thanks for staying with us";
  }

  const hasFeedback =
    phase === "past" ? Boolean(await prisma.guestFeedback.findUnique({ where: { reservationId: reservation.id } })) : true;

  return (
    <GuestShell title={property.name} activeHref="/guest/stay">
      <div className="pb-6">
        <div className="bg-gradient-to-br from-[#0b2b33] to-[#20507a] px-5 pt-8 pb-5 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9fb8cc]">Welcome</div>
          <div className="font-[family-name:var(--font-serif)] text-2xl font-bold mt-1">{displayName}</div>
          <div className="text-xs text-[#bcd0e0] mt-0.5">{property.name}</div>
        </div>

        <div className="px-5 pt-3.5">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[10.5px] text-[var(--color-muted)]">
                {formatDate(reservation.checkIn)} – {formatDate(reservation.checkOut)}
              </div>
              <div className="font-[family-name:var(--font-serif)] text-lg font-bold text-[var(--color-navy)] mt-0.5">
                {phaseLabel}
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                phase === "in-stay"
                  ? "text-[var(--color-success)] bg-[var(--color-success-bg)]"
                  : phase === "upcoming"
                  ? "text-[var(--color-info)] bg-[color-mix(in_srgb,var(--color-info)_14%,white)]"
                  : "text-[var(--color-muted)] bg-[var(--color-sand-100)]"
              }`}
            >
              {nights} night{nights === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="px-5 pt-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder illustration */}
          <img src={property.heroImage} alt="" className="w-full h-36 object-cover rounded-2xl" />
          <div className="text-xs text-[var(--color-muted)] mt-2">{property.address}</div>
        </div>

        <div className="px-5 pt-4 grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-2xl p-3.5">
            <div className="text-[10.5px] text-[var(--color-muted)]">Checkout</div>
            <div className="text-sm font-bold text-[var(--color-navy)] mt-0.5">{property.checkoutTime}</div>
          </div>
          <div className="bg-white rounded-2xl p-3.5">
            <div className="text-[10.5px] text-[var(--color-muted)]">Wifi network</div>
            <div className="text-sm font-bold text-[var(--color-navy)] mt-0.5 truncate">
              {property.wifiNetwork ?? "Ask host"}
            </div>
          </div>
        </div>

        {property.wifiNetwork && (
          <div className="px-5 pt-2.5">
            <div className="bg-white rounded-2xl p-3.5 flex items-center justify-between">
              <span className="text-xs text-[var(--color-muted)]">Wifi password</span>
              <span className="font-mono text-sm font-semibold text-[var(--color-navy)]">{property.wifiPassword}</span>
            </div>
          </div>
        )}

        {property.houseManual && (
          <div className="px-5 pt-4">
            <div className="text-[11px] font-bold text-[var(--color-muted-2)] uppercase tracking-wide mb-2">
              Good to know
            </div>
            <div className="bg-white rounded-2xl p-3.5 text-sm text-[var(--color-text)] leading-relaxed">
              {property.houseManual}
            </div>
          </div>
        )}

        {phase === "past" && !hasFeedback && (
          <div className="px-5 pt-5">
            <Link
              href="/guest/feedback"
              className="tap bg-white rounded-2xl p-4 flex items-center gap-3 border border-[var(--color-sand-300)]"
            >
              <div className="flex-1">
                <div className="text-sm font-bold text-[var(--color-navy)]">How was your stay?</div>
                <div className="text-xs text-[var(--color-muted)] mt-0.5">Leave a quick rating — it takes a minute.</div>
              </div>
              <div className="text-lg">⭐</div>
            </Link>
          </div>
        )}

        <div className="px-5 pt-5">
          <div className="bg-[var(--color-navy)] rounded-2xl p-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Need anything?</div>
              <div className="text-xs text-[#bcd0e0] mt-0.5">Ask your AI concierge — open the Assistant tab.</div>
            </div>
          </div>
        </div>
      </div>
    </GuestShell>
  );
}
