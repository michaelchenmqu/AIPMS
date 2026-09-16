import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, KpiTile } from "@/components/ui";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { isChannexConfigured } from "@/lib/channex";
import {
  connectPropertyToChannex,
  updateGuestExperience,
  togglePropertyLettingMode,
  createLeaseAction,
  recordRentPaymentAction,
  endLeaseAction,
} from "../actions";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ leaseError?: string }>;
}) {
  const { id } = await params;
  const { leaseError } = await searchParams;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      owner: true,
      reservations: { orderBy: { checkIn: "desc" } },
      jobs: { where: { status: "DONE" }, orderBy: { departureAt: "desc" }, take: 10 },
      modeChanges: { orderBy: { changedAt: "desc" } },
      leases: {
        orderBy: { createdAt: "desc" },
        include: { tenants: { include: { tenant: true } }, ledgerEntries: { orderBy: { date: "desc" } } },
      },
    },
  });
  if (!property) notFound();

  const revenue = property.reservations.reduce((s, r) => s + r.totalAmount, 0);
  const rating = ((property.airbnbScore + property.bookingScore + property.stayzScore) / 3 / 20).toFixed(1);
  const avgJobCost = property.jobs.length
    ? property.jobs.reduce((s, j) => s + (j.totalCost ?? 0), 0) / property.jobs.length
    : 0;

  const activeLease = property.leases.find((l) => l.status === "ACTIVE" || l.status === "ENDING");
  const leaseBalance = activeLease?.ledgerEntries.reduce((s, e) => s + e.amount, 0) ?? 0;

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const guestUrl = `${proto}://${host}/guest?propertyId=${property.id}`;
  const guestQrDataUrl = await QRCode.toDataURL(guestUrl, { margin: 1, width: 160, color: { dark: "#0b2b33" } });

  return (
    <div>
      <Link href="/portal/properties" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
        ← Property performance
      </Link>
      <PageHeader
        title={property.name}
        subtitle={`${property.address} · ${property.region}`}
        actions={
          <Link
            href={`/portal/owners/${property.ownerId}`}
            className="text-sm font-semibold text-[var(--color-teal-dark)] hover:underline"
          >
            View owner →
          </Link>
        }
      />

      {leaseError && (
        <div className="text-sm text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-lg px-4 py-3 mb-5">
          {leaseError}
        </div>
      )}

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-[var(--color-navy)]">Letting mode</div>
            <Badge tone={property.lettingMode === "LONG_TERM" ? "info" : "teal"}>
              {property.lettingMode === "LONG_TERM" ? "Long-term leasing" : "Short-term letting"}
            </Badge>
          </div>
          {property.lettingMode === "SHORT_TERM" ? (
            <form action={togglePropertyLettingMode.bind(null, property.id, "LONG_TERM")}>
              <button className="tap text-xs font-semibold text-[var(--color-teal-dark)] hover:underline">
                Switch to long-term leasing →
              </button>
            </form>
          ) : (
            <form action={togglePropertyLettingMode.bind(null, property.id, "SHORT_TERM")}>
              <button className="tap text-xs font-semibold text-[var(--color-teal-dark)] hover:underline">
                Switch back to short-term →
              </button>
            </form>
          )}
        </div>
        {property.modeChanges.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {property.modeChanges.map((c) => (
              <div key={c.id} className="text-xs text-[var(--color-muted)]">
                Switched {c.fromMode === "SHORT_TERM" ? "to long-term leasing" : "back to short-term"} ·{" "}
                {formatDateTime(c.changedAt)}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Total revenue" value={formatMoney(revenue)} sub={`${property.reservations.length} bookings`} />
        <KpiTile label="Rating" value={`${rating}★`} sub="Blended across channels" tone="success" />
        <KpiTile label="Avg. turnover cost" value={formatMoney(avgJobCost)} sub="Usage-based" />
        <KpiTile
          label="Channel health"
          value={`${Math.round((property.airbnbScore + property.bookingScore + property.stayzScore) / 3)}`}
          sub={`Airbnb ${property.airbnbScore} · Booking ${property.bookingScore} · Stayz ${property.stayzScore}`}
        />
      </div>

      {property.lettingMode === "LONG_TERM" && (
        <Card className="p-6 mb-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Long-term lease</div>
          {!activeLease ? (
            <>
              <div className="text-xs text-[var(--color-muted)] mb-4">No active lease yet — add one to start the rent ledger.</div>
              <form action={createLeaseAction.bind(null, property.id)} className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Tenant name</label>
                  <input name="tenantName" required className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Tenant email</label>
                  <input name="tenantEmail" type="email" className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Tenant phone</label>
                  <input name="tenantPhone" placeholder="+61…" className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Start date</label>
                  <input name="startDate" type="date" required className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Rent amount</label>
                  <input name="rentAmount" type="number" step="0.01" required className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Rent frequency</label>
                  <select name="rentFrequency" defaultValue="WEEKLY" className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2">
                    <option value="WEEKLY">Weekly</option>
                    <option value="FORTNIGHTLY">Fortnightly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Bond amount (optional)</label>
                  <input name="bondAmount" type="number" step="0.01" className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
                </div>
                <div className="sm:col-span-2">
                  <button className="tap text-sm font-semibold bg-[var(--color-navy)] text-white rounded-lg px-4 py-2">
                    Add lease
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div>
                  <div className="text-sm font-medium text-[var(--color-navy)]">
                    {activeLease.tenants.map((t) => t.tenant.name).join(", ")}
                  </div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {formatMoney(activeLease.rentAmount)} / {activeLease.rentFrequency.toLowerCase()} · started{" "}
                    {formatDate(activeLease.startDate)}
                    {activeLease.bondAmount ? ` · bond ${formatMoney(activeLease.bondAmount)} (${activeLease.bondStatus.toLowerCase()})` : ""}
                  </div>
                </div>
                <form action={endLeaseAction.bind(null, property.id, activeLease.id)}>
                  <button className="tap text-xs text-[var(--color-muted)] hover:text-[var(--color-error)]">End lease</button>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <KpiTile label="Ledger balance" value={formatMoney(leaseBalance)} tone={leaseBalance >= 0 ? "success" : "warning"} />
                <KpiTile label="Management fee" value={`${Math.round(activeLease.managementFeeRate * 100)}%`} />
              </div>

              <form action={recordRentPaymentAction.bind(null, property.id, activeLease.id)} className="flex items-end gap-2 mb-5 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Amount</label>
                  <input name="amount" type="number" step="0.01" required className="text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2 w-32" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Date</label>
                  <input name="date" type="date" className="text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
                </div>
                <button className="tap text-sm font-semibold bg-[var(--color-navy)] text-white rounded-lg px-4 py-2">
                  Record rent payment
                </button>
              </form>

              <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)] mb-2.5">Ledger</div>
              <div className="flex flex-col gap-2">
                {activeLease.ledgerEntries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-muted)]">
                      {formatDate(e.date)} · {e.memo}
                    </span>
                    <span className={`font-mono ${e.amount < 0 ? "text-[var(--color-error)]" : ""}`}>{formatMoney(e.amount)}</span>
                  </div>
                ))}
                {activeLease.ledgerEntries.length === 0 && (
                  <div className="text-sm text-[var(--color-muted)]">No rent recorded yet.</div>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Recent reservations</div>
          <div className="flex flex-col gap-3">
            {property.reservations.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-[var(--color-navy)]">{r.guestName}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {formatDate(r.checkIn)} – {formatDate(r.checkOut)}
                  </div>
                </div>
                <Badge tone={r.status === "IN_STAY" ? "success" : r.status === "UPCOMING" ? "info" : "neutral"}>
                  {r.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
            {property.reservations.length === 0 && (
              <div className="text-sm text-[var(--color-muted)]">No reservations on record.</div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Recent turnovers</div>
          <div className="flex flex-col gap-3">
            {property.jobs.map((j) => (
              <Link
                key={j.id}
                href={`/portal/housekeeping/${j.id}`}
                className="tap flex items-center justify-between text-sm"
              >
                <div>
                  <div className="font-medium text-[var(--color-navy)]">
                    {j.departureAt ? formatDate(j.departureAt) : "—"}
                  </div>
                  <div className="text-xs text-[var(--color-muted)]">{j.computedHours}h on-site</div>
                </div>
                <div className="font-mono text-sm">{formatMoney(j.totalCost ?? 0)}</div>
              </Link>
            ))}
            {property.jobs.length === 0 && <div className="text-sm text-[var(--color-muted)]">No completed turnovers yet.</div>}
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Guest App access</div>
        <div className="text-xs text-[var(--color-muted)] mb-4">
          Print this on a welcome card — guests scan it, verify with their last name and arrival date, and get their
          stay info plus an AI concierge for questions.
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated QR code data URI */}
          <img src={guestQrDataUrl} alt="Guest App QR code" className="w-[120px] h-[120px] rounded-lg border border-[var(--color-sand-300)]" />
          <div className="min-w-0">
            <div className="text-xs text-[var(--color-muted)] mb-1">Guest link</div>
            <div className="text-xs font-mono text-[var(--color-navy)] break-all bg-[var(--color-sand-100)] rounded-lg px-3 py-2">
              {guestUrl}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Guest experience details</div>
        <div className="text-xs text-[var(--color-muted)] mb-4">
          Drawn on by the Guest App, the AI concierge, and the check-in WhatsApp reminder — see /portal/reminders.
        </div>
        <form action={updateGuestExperience.bind(null, property.id)} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Wifi network</label>
            <input
              name="wifiNetwork"
              defaultValue={property.wifiNetwork ?? ""}
              className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Wifi password</label>
            <input
              name="wifiPassword"
              defaultValue={property.wifiPassword ?? ""}
              className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Check-in time</label>
            <input
              name="checkInTime"
              defaultValue={property.checkInTime}
              className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Checkout time</label>
            <input
              name="checkoutTime"
              defaultValue={property.checkoutTime}
              className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">House manual</label>
            <textarea
              name="houseManual"
              defaultValue={property.houseManual ?? ""}
              rows={3}
              placeholder="Parking, appliances, nearby food — anything the AI concierge should know"
              className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Bin day</label>
            <input
              name="binDay"
              defaultValue={property.binDay ?? ""}
              placeholder="e.g. General: Tuesday · Recycling: Wednesday (fortnightly)"
              className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" name="hasGasBottle" defaultChecked={property.hasGasBottle} />
            Has a gas bottle (BBQ, hot water, etc.)
          </label>
          <div className="sm:col-span-2">
            <button className="tap text-sm font-semibold bg-[var(--color-navy)] text-white rounded-lg px-4 py-2">
              Save
            </button>
          </div>
        </form>
      </Card>

      {isChannexConfigured() && (
        <Card className="p-6 mt-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Channel manager</div>
          <div className="text-xs text-[var(--color-muted)] mb-4">
            Connects this property to Airbnb, Booking.com, and Stayz through Channex — rates and availability sync
            out, bookings sync back in automatically.
          </div>
          {property.channexPropertyId ? (
            <Badge tone="success">Connected · {property.channexPropertyId}</Badge>
          ) : (
            <form action={connectPropertyToChannex.bind(null, property.id)}>
              <button className="tap text-sm font-semibold text-[var(--color-teal-dark)] hover:underline">
                Connect to Channex →
              </button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
