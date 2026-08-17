"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, formatMoney } from "@/lib/format";

type RoomKind = "LIVING_ROOM" | "BEDROOM" | "KITCHEN" | "BATHROOM";
type LinenItem = "QUEEN" | "SINGLE" | "BATH";

type Job = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "IN_PROGRESS" | "DONE";
  hourlyRate: number;
  arrivalAt: string | null;
  departureAt: string | null;
  computedHours: number | null;
  laborCost: number | null;
  linenCost: number | null;
  totalCost: number | null;
  property: { name: string; address: string; heroImage: string };
  reservation: { guestName: string } | null;
  linenUsage: { item: LinenItem; quantity: number }[];
  roomChecks: { room: RoomKind; matchPercent: number | null; flagged: boolean; aiNote: string | null }[];
};

const ROOMS: { key: RoomKind; label: string }[] = [
  { key: "LIVING_ROOM", label: "Living room" },
  { key: "BEDROOM", label: "Main bedroom" },
  { key: "KITCHEN", label: "Kitchen" },
  { key: "BATHROOM", label: "Bathroom" },
];

const LINEN_ITEMS: { key: LinenItem; label: string }[] = [
  { key: "QUEEN", label: "Queen" },
  { key: "SINGLE", label: "Single" },
  { key: "BATH", label: "Bath towel" },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getGeo(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

function matchColor(pct: number | null) {
  if (pct == null) return "text-[var(--color-muted)]";
  if (pct >= 90) return "text-[var(--color-success)]";
  if (pct >= 85) return "text-[var(--color-warning)]";
  return "text-[var(--color-error)]";
}

export default function JobFlow({ job: initialJob }: { job: Job }) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [busy, setBusy] = useState<string | null>(null);
  const [linen, setLinen] = useState<Record<LinenItem, number>>(() => {
    const base: Record<LinenItem, number> = { QUEEN: 0, SINGLE: 0, BATH: 0 };
    for (const l of initialJob.linenUsage) base[l.item] = l.quantity;
    return base;
  });
  const arrivalInputRef = useRef<HTMLInputElement>(null);
  const roomInputRefs = useRef<Record<RoomKind, HTMLInputElement | null>>({
    LIVING_ROOM: null,
    BEDROOM: null,
    KITCHEN: null,
    BATHROOM: null,
  });

  async function accept() {
    setBusy("accept");
    const res = await fetch(`/api/housekeeper/jobs/${job.id}/accept`, { method: "POST" });
    const data = await res.json();
    if (data.job) setJob((j) => ({ ...j, status: data.job.status }));
    setBusy(null);
  }

  async function captureArrival(file: File) {
    setBusy("arrival");
    const [photoDataUrl, geo] = await Promise.all([fileToDataUrl(file), getGeo()]);
    const res = await fetch(`/api/housekeeper/jobs/${job.id}/arrival`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoDataUrl, lat: geo?.lat ?? null, lng: geo?.lng ?? null }),
    });
    const data = await res.json();
    if (data.job) setJob((j) => ({ ...j, status: data.job.status, arrivalAt: data.job.arrivalAt }));
    setBusy(null);
  }

  async function captureRoom(room: RoomKind, file: File) {
    setBusy(room);
    const photoDataUrl = await fileToDataUrl(file);
    const res = await fetch(`/api/housekeeper/jobs/${job.id}/room-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, photoDataUrl }),
    });
    const data = await res.json();
    if (data.roomCheck) {
      setJob((j) => ({
        ...j,
        roomChecks: [
          ...j.roomChecks.filter((rc) => rc.room !== room),
          {
            room,
            matchPercent: data.roomCheck.matchPercent,
            flagged: data.roomCheck.flagged,
            aiNote: data.roomCheck.aiNote,
          },
        ],
      }));
    }
    setBusy(null);
  }

  async function setLinenCount(item: LinenItem, quantity: number) {
    const q = Math.max(0, quantity);
    setLinen((l) => ({ ...l, [item]: q }));
    await fetch(`/api/housekeeper/jobs/${job.id}/linen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, quantity: q }),
    });
  }

  async function completeJob() {
    setBusy("complete");
    const res = await fetch(`/api/housekeeper/jobs/${job.id}/complete`, { method: "POST" });
    const data = await res.json();
    if (data.job) {
      setJob((j) => ({
        ...j,
        status: data.job.status,
        departureAt: data.job.departureAt,
        computedHours: data.job.computedHours,
        laborCost: data.job.laborCost,
        linenCost: data.job.linenCost,
        totalCost: data.job.totalCost,
      }));
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="pb-8">
      <div className="px-5 pt-6 pb-3">
        <button onClick={() => router.push("/app/housekeeper")} className="text-xs text-[var(--color-muted)] mb-2">
          ← Feed
        </button>
        <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">
          {job.property.name}
        </div>
        <div className="text-xs text-[var(--color-muted-2)] mt-0.5">
          {job.property.address}
          {job.reservation && ` · ${job.reservation.guestName}`}
        </div>
      </div>

      {job.status === "PENDING" && (
        <div className="px-5">
          <button
            onClick={accept}
            disabled={busy === "accept"}
            className="tap w-full h-12 bg-[var(--color-navy)] text-white rounded-xl text-sm font-bold disabled:opacity-60"
          >
            {busy === "accept" ? "Accepting…" : "Accept job"}
          </button>
        </div>
      )}

      {job.status === "ACCEPTED" && (
        <div className="px-5">
          <div className="bg-white rounded-2xl p-4 text-sm text-[var(--color-muted)] mb-3">
            Capture the key-box photo to record your verified arrival time.
          </div>
          <input
            ref={arrivalInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && captureArrival(e.target.files[0])}
          />
          <button
            onClick={() => arrivalInputRef.current?.click()}
            disabled={busy === "arrival"}
            className="tap w-full h-12 bg-[var(--color-navy)] text-white rounded-xl text-sm font-bold disabled:opacity-60"
          >
            {busy === "arrival" ? "Capturing…" : "📷 Capture arrival"}
          </button>
        </div>
      )}

      {(job.status === "IN_PROGRESS" || job.status === "DONE") && (
        <div className="px-5 flex flex-col gap-5">
          {job.arrivalAt && (
            <div className="text-xs text-[var(--color-muted)]">
              Arrived {formatDateTime(new Date(job.arrivalAt))} (server-verified)
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold text-[var(--color-muted-2)] uppercase tracking-wide mb-2">
              Room checklist
            </div>
            <div className="flex flex-col gap-2.5">
              {ROOMS.map((r) => {
                const check = job.roomChecks.find((rc) => rc.room === r.key);
                return (
                  <div key={r.key} className="bg-white rounded-2xl p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-navy)]">{r.label}</span>
                      {check ? (
                        <span className={`text-sm font-bold ${matchColor(check.matchPercent)}`}>
                          {check.matchPercent}% match
                        </span>
                      ) : job.status === "IN_PROGRESS" ? (
                        <>
                          <input
                            ref={(el) => {
                              roomInputRefs.current[r.key] = el;
                            }}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && captureRoom(r.key, e.target.files[0])}
                          />
                          <button
                            onClick={() => roomInputRefs.current[r.key]?.click()}
                            disabled={busy === r.key}
                            className="tap text-xs font-bold text-[var(--color-teal-dark)]"
                          >
                            {busy === r.key ? "Checking…" : "📷 Capture"}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">Not captured</span>
                      )}
                    </div>
                    {check?.aiNote && <p className="text-xs text-[var(--color-muted)] mt-1.5">{check.aiNote}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-[var(--color-muted-2)] uppercase tracking-wide mb-2">
              Linen used
            </div>
            <div className="bg-white rounded-2xl p-3.5 flex flex-col gap-3">
              {LINEN_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-navy)]">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={job.status !== "IN_PROGRESS"}
                      onClick={() => setLinenCount(item.key, linen[item.key] - 1)}
                      className="tap w-7 h-7 rounded-full bg-[var(--color-sand-200)] text-[var(--color-navy)] font-bold disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-mono text-sm">{linen[item.key]}</span>
                    <button
                      disabled={job.status !== "IN_PROGRESS"}
                      onClick={() => setLinenCount(item.key, linen[item.key] + 1)}
                      className="tap w-7 h-7 rounded-full bg-[var(--color-sand-200)] text-[var(--color-navy)] font-bold disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {job.status === "IN_PROGRESS" && (
            <button
              onClick={completeJob}
              disabled={busy === "complete"}
              className="tap w-full h-12 bg-[var(--color-teal)] text-[var(--color-navy)] rounded-xl text-sm font-bold disabled:opacity-60"
            >
              {busy === "complete" ? "Completing…" : "Complete job"}
            </button>
          )}

          {job.status === "DONE" && (
            <div className="bg-[var(--color-navy)] rounded-2xl p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-[rgba(255,255,255,0.6)] mb-2">
                Job complete — usage-based
              </div>
              <div className="flex justify-between text-xs text-[#bcd0e0] py-1.5 border-b border-white/12">
                <span>
                  Time on-site ({job.computedHours}h @ ${job.hourlyRate}/hr)
                </span>
                <span className="font-bold text-white">{formatMoney(job.laborCost ?? 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#bcd0e0] py-1.5">
                <span>Linen used</span>
                <span className="font-bold text-white">{formatMoney(job.linenCost ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/20">
                <span className="text-[12.5px] font-bold text-white">Total</span>
                <span className="font-[family-name:var(--font-serif)] text-[17px] font-bold text-[var(--color-teal)]">
                  {formatMoney(job.totalCost ?? 0)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
