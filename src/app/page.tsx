import Link from "next/link";

const PORTALS = [
  {
    href: "/login?as=staff",
    title: "Web portal",
    desc: "Back-office: AI Trainer, dashboard, reservations, housekeeping & laundry, invoicing, trust accounting.",
    tag: "Staff",
  },
  {
    href: "/login?as=owner",
    title: "Owner portal",
    desc: "Usage-based statements, portfolio & photos, AI listing suggestions, growth tools.",
    tag: "Owner · desktop",
  },
  {
    href: "/login?as=contractor",
    title: "Contractor portal",
    desc: "Assigned jobs, schedule, and payout tracking for cleaning & maintenance companies.",
    tag: "Contractor",
  },
  {
    href: "/login?as=owner",
    title: "Owner App",
    desc: "The same portal, mobile-first — stay status, statements, and growth tools on the go.",
    tag: "Owner · mobile",
  },
  {
    href: "/login?as=housekeeper",
    title: "Housekeeper App",
    desc: "Job feed, arrival/departure capture, linen counters, and AI clean-check — built for the field.",
    tag: "Housekeeper · mobile",
  },
];

export default function Home() {
  return (
    <div className="flex-1 bg-[var(--color-navy)] text-white">
      <div className="relative overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/videos/aipms-homepage.mp4" type="video/mp4" />
          <source src="/videos/aipms-homepage.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-[var(--color-navy)]/80" />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-14">
          <div className="text-xs font-semibold tracking-widest uppercase text-[var(--color-teal)] mb-4">
            AIPMS · AI-Powered Holiday Letting Platform
          </div>
          <h1 className="font-[family-name:var(--font-serif)] text-4xl sm:text-5xl font-bold leading-tight max-w-2xl">
            Bill owners for what actually happened — not a flat fee.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[rgba(255,255,255,0.75)]">
            Housekeeping billed by verified time on-site. Linen billed by what a clean actually used.
            Every turnover checked by AI against the property&apos;s own reference photos — soft-flagged
            for a supervisor, never blocking the job. This is a working demo across five portals: the
            back-office web platform, the owner and contractor portals, and the Owner &amp; Housekeeper
            mobile apps.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="tap inline-flex items-center justify-center rounded-[10px] bg-[var(--color-teal)] text-[var(--color-navy)] px-5 py-3 text-sm font-semibold"
            >
              Sign in to a demo account
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="mt-14 grid sm:grid-cols-2 gap-4">
          {PORTALS.map((p) => (
            <Link
              key={p.title + p.tag}
              href={p.href}
              className="tap block rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] p-5 hover:bg-[rgba(255,255,255,0.1)]"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-teal)]">
                {p.tag}
              </div>
              <div className="font-[family-name:var(--font-serif)] text-lg font-bold mt-1">{p.title}</div>
              <div className="text-sm text-[rgba(255,255,255,0.65)] mt-1.5 leading-relaxed">{p.desc}</div>
            </Link>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-[rgba(255,255,255,0.12)] text-xs text-[rgba(255,255,255,0.5)]">
          Demo build — see the repo README for demo credentials and what&apos;s stubbed vs. real.
        </div>
      </div>
    </div>
  );
}
