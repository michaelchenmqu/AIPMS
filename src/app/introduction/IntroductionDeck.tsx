"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

function noopSubscribe() {
  return () => {};
}
function getFullscreenSupport() {
  return typeof document !== "undefined" && document.fullscreenEnabled === true;
}
function getFullscreenSupportServer() {
  return false;
}

function BrowserFrame({ src, alt, maxH = "44vh" }: { src: string; alt: string; maxH?: string }) {
  return (
    <div
      className="inline-flex flex-col rounded-xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.1)] bg-[#1c1c1c]"
      style={{ maxHeight: maxH }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#1c1c1c] shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- introduction deck screenshot */}
      <img src={src} alt={alt} className="block w-auto object-contain object-top" style={{ maxHeight: `calc(${maxH} - 32px)` }} />
    </div>
  );
}

function PhoneFrame({ src, alt, maxH = "44vh" }: { src: string; alt: string; maxH?: string }) {
  return (
    <div
      className="inline-block rounded-[28px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.45)] border-4 border-[#1c1c1c]"
      style={{ maxHeight: maxH }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- introduction deck screenshot */}
      <img src={src} alt={alt} className="block w-auto h-full object-contain" style={{ maxHeight: maxH }} />
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-teal)] mb-3">
      {children}
    </div>
  );
}

type Slide = { id: string; content: React.ReactNode };

const SLIDES: Slide[] = [
  {
    id: "title",
    content: (
      <div className="min-h-full flex flex-col items-center justify-center text-center px-10">
        <div className="text-[13px] font-semibold uppercase tracking-[0.3em] text-[var(--color-teal)] mb-3">
          Introduction
        </div>
        <div className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)] mb-6">
          AIPMS · AI-Powered Property Management
        </div>
        <h1 className="font-[family-name:var(--font-serif)] text-5xl sm:text-6xl font-bold leading-tight text-white max-w-3xl">
          Maximise Revenue.
          <br />
          Reduce Costs.
          <br />
          Run Smarter with AI.
        </h1>
        <p className="mt-7 max-w-xl text-base text-[rgba(255,255,255,0.7)] leading-relaxed">
          One intelligent platform for holiday letting operators — six connected portals and apps,
          built around three outcomes that matter to your bottom line.
        </p>
      </div>
    ),
  },
  {
    id: "problem",
    content: (
      <div className="min-h-full flex flex-col justify-center px-10 sm:px-20">
        <Kicker>The problem</Kicker>
        <h2 className="font-[family-name:var(--font-serif)] text-4xl font-bold text-white max-w-2xl">
          Running a property portfolio today means stitching together five different tools.
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 gap-5 max-w-3xl">
          {[
            ["Scattered channels", "Airbnb, Booking.com, Stayz and direct bookings, tracked in separate tabs."],
            ["Flat-fee guesswork", "Cleaning & maintenance billed at a flat rate, whether the job took one hour or four."],
            ["Manual verification", "No easy way to confirm a turnover was actually done to standard before paying."],
            ["Guest questions, every time", "Wifi passwords and checkout times, answered one message at a time."],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] p-5">
              <div className="text-sm font-bold text-white">{title}</div>
              <div className="text-sm text-[rgba(255,255,255,0.65)] mt-1.5 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "revenue",
    content: (
      <div className="min-h-full flex flex-col justify-center px-10 sm:px-16 py-10">
        <Kicker>Pillar one</Kicker>
        <h2 className="font-[family-name:var(--font-serif)] text-4xl font-bold text-white">Maximise Revenue</h2>
        <div className="mt-8 grid lg:grid-cols-[1fr_1.3fr] gap-10 items-center">
          <ul className="flex flex-col gap-4 text-[rgba(255,255,255,0.85)] text-[15px] leading-relaxed">
            <li>
              <span className="text-white font-semibold">Unified calendar</span> merges every channel into one grid and
              surfaces vacancy gaps automatically — no more checking four booking sites to find a hole in the schedule.
            </li>
            <li>
              <span className="text-white font-semibold">One-click AI campaigns</span> draft a caption, hashtags and
              platform picks for any vacancy gap, ready to post or schedule in seconds.
            </li>
            <li>
              <span className="text-white font-semibold">Revenue trend visibility</span> for the whole portfolio, and
              per-property, so pricing and marketing decisions are backed by real numbers.
            </li>
            <li>
              <span className="text-white font-semibold">Guest-initiated upsells</span> — guests can request to extend
              their stay right from the Guest App, with the nightly rate shown plainly. A low-pressure revenue channel
              your team approves in one click, not a hard sell.
            </li>
          </ul>
          <div className="flex justify-center">
            <BrowserFrame src="/introduction/calendar.png" alt="Unified booking calendar with Promote action" maxH="56vh" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "costs",
    content: (
      <div className="min-h-full flex flex-col justify-center px-10 sm:px-16 py-10">
        <Kicker>Pillar two</Kicker>
        <h2 className="font-[family-name:var(--font-serif)] text-4xl font-bold text-white">Reduce Costs</h2>
        <div className="mt-8 grid lg:grid-cols-[1fr_1.3fr] gap-10 items-center">
          <ul className="flex flex-col gap-4 text-[rgba(255,255,255,0.85)] text-[15px] leading-relaxed">
            <li>
              <span className="text-white font-semibold">Usage-based billing</span> replaces flat cleaning fees — labor
              and linen are costed to the actual job, tracked automatically from arrival to departure.
            </li>
            <li>
              <span className="text-white font-semibold">AI clean-check</span> compares after-photos against reference
              shots before a job is marked done, catching missed rooms without a manual inspection visit.
            </li>
            <li>
              <span className="text-white font-semibold">Transparent contractor payouts</span> — every team sees exactly
              what they earned, by job, by property, by month.
            </li>
          </ul>
          <div className="flex justify-center">
            <BrowserFrame src="/introduction/dashboard.png" alt="Staff dashboard with usage-based billing savings chart" maxH="56vh" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "ai",
    content: (
      <div className="min-h-full flex flex-col justify-center px-10 sm:px-16 py-10">
        <Kicker>Pillar three</Kicker>
        <h2 className="font-[family-name:var(--font-serif)] text-4xl font-bold text-white">Run Smarter with AI</h2>
        <div className="mt-8 grid lg:grid-cols-[1fr_1.3fr] gap-10 items-center">
          <ul className="flex flex-col gap-4 text-[rgba(255,255,255,0.85)] text-[15px] leading-relaxed">
            <li>
              <span className="text-white font-semibold">AI Trainer</span> answers pricing, onboarding, and billing
              questions on demand — a back-office expert available to every staff member, instantly.
            </li>
            <li>
              <span className="text-white font-semibold">AI-drafted marketing</span> writes the caption and hashtags for
              every vacancy campaign, so filling a gap takes a click, not a copywriter.
            </li>
            <li>
              <span className="text-white font-semibold">AI guest concierge</span> answers wifi, checkout, and local-area
              questions around the clock — no front-desk phone call required.
            </li>
          </ul>
          <div className="flex items-end justify-center gap-6">
            <BrowserFrame src="/introduction/ai-trainer.png" alt="AI Trainer chat drafting a pricing recommendation" maxH="48vh" />
            <PhoneFrame src="/introduction/guest-assistant.png" alt="Guest App AI concierge chat" maxH="48vh" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "portals",
    content: (
      <div className="min-h-full flex flex-col justify-center px-10 sm:px-16 py-10">
        <Kicker>One platform</Kicker>
        <h2 className="font-[family-name:var(--font-serif)] text-4xl font-bold text-white">
          Six connected experiences, one source of truth
        </h2>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-5">
          {[
            ["Staff — Web portal", "/introduction/dashboard.png", "Back-office"],
            ["Owner — Desktop", "/introduction/owner-portal.png", "Statements & growth"],
            ["Contractor — Desktop", "/introduction/contractor-portal.png", "Jobs & payouts"],
            ["Owner — Mobile App", "/introduction/owner-app.png", "On the go"],
            ["Housekeeper — Mobile App", "/introduction/housekeeper-app.png", "Built for the field"],
            ["Guest — Mobile App", "/introduction/guest-app.png", "No account needed"],
          ].map(([title, img, tag]) => (
            <div key={title} className="flex flex-col gap-2.5">
              <div className="rounded-lg overflow-hidden border border-[rgba(255,255,255,0.15)] shadow-[0_16px_32px_rgba(0,0,0,0.4)] h-[150px] bg-[#1c1c1c]">
                {/* eslint-disable-next-line @next/next/no-img-element -- introduction deck thumbnail */}
                <img src={img} alt={title} className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{title}</div>
                <div className="text-xs text-[rgba(255,255,255,0.55)]">{tag}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "new-features",
    content: (
      <div className="min-h-full flex flex-col justify-center px-10 sm:px-16 py-10">
        <Kicker>New since 26 August</Kicker>
        <h2 className="font-[family-name:var(--font-serif)] text-4xl font-bold text-white max-w-2xl">
          Real trust accounting and WhatsApp — live, not simulated
        </h2>
        <div className="mt-8 grid lg:grid-cols-[1fr_1.3fr] gap-10 items-center">
          <ul className="flex flex-col gap-4 text-[rgba(255,255,255,0.85)] text-[15px] leading-relaxed">
            <li>
              <span className="text-white font-semibold">Bank-reconciled trust accounting</span> — a real (sandbox,
              for now) bank feed connects via Basiq and matches automatically against the trust ledger. Bank
              balance, ledger balance, and every owner&apos;s balance — checked three ways, every sync.
            </li>
            <li>
              <span className="text-white font-semibold">WhatsApp, in the same Inbox</span> — real guest WhatsApp
              messages land AI-classified, right alongside Airbnb, Booking.com and direct enquiries. Reply without
              leaving AIPMS.
            </li>
            <li>
              <span className="text-white font-semibold">Built with AU compliance in view</span> — AUSTRAC&apos;s
              AML/CTF regime (mandatory since 1 July 2026) is flagged directly on the Trust accounting page as a
              go-live checklist item, not quietly ignored.
            </li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <BrowserFrame
              src="/introduction/trust-accounting.png"
              alt="Trust accounting page showing bank reconciliation, a three-way check, and owner balances"
              maxH="46vh"
            />
            <BrowserFrame
              src="/introduction/whatsapp-inbox.png"
              alt="Inbox showing a real WhatsApp guest message alongside other channels"
              maxH="46vh"
            />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "guest-spotlight",
    content: (
      <div className="min-h-full flex flex-col justify-center px-10 sm:px-16 py-10">
        <Kicker>New — Guest App</Kicker>
        <h2 className="font-[family-name:var(--font-serif)] text-4xl font-bold text-white max-w-xl">
          The front desk, in every guest&apos;s pocket
        </h2>
        <div className="mt-8 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <ul className="flex flex-col gap-4 text-[rgba(255,255,255,0.85)] text-[15px] leading-relaxed">
            <li>
              <span className="text-white font-semibold">Scan and go</span> — a QR code on the welcome card, verified
              with just a last name and arrival date. No app download, no account.
            </li>
            <li>
              <span className="text-white font-semibold">All the essentials</span> — dates, checkout time, wifi, and
              house notes, on one screen.
            </li>
            <li>
              <span className="text-white font-semibold">Self-serve stay requests</span> — extend the stay, early
              check-in, late checkout and more, with the nightly rate shown plainly up front and approved by staff in
              a tap — a low-pressure revenue channel, not a hard sell.
            </li>
            <li>
              <span className="text-white font-semibold">Explore, rate, and chat</span> — a live weather forecast and
              local recommendations, a quick star rating after checkout, and a friendly AI concierge answering
              questions day or night.
            </li>
          </ul>
          <div className="flex justify-center gap-5">
            <PhoneFrame src="/introduction/guest-app.png" alt="Guest App stay details screen" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "recap",
    content: (
      <div className="min-h-full flex flex-col items-center justify-center text-center px-10">
        <Kicker>Why AIPMS</Kicker>
        <h2 className="font-[family-name:var(--font-serif)] text-4xl font-bold text-white max-w-2xl">
          Three groups. One platform, working for all of them.
        </h2>
        <div className="mt-10 grid sm:grid-cols-3 gap-6 max-w-4xl">
          {[
            ["⌂", "Owner satisfaction", "Usage-based billing, transparent statements, and AI growth suggestions — clear returns, not a black box."],
            ["♥", "Guest experience", "Self-serve stay requests, local recommendations, and a friendly AI concierge — a great stay without a phone call."],
            ["⚙", "Staff efficiency", "AI clean-check, inbox triage, and one-click campaigns — verified work, with far less manual chasing."],
          ].map(([icon, title, desc]) => (
            <div key={title} className="rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] p-6">
              <div className="w-11 h-11 rounded-full bg-[var(--color-teal)] text-[var(--color-navy)] flex items-center justify-center text-xl font-bold mx-auto">
                {icon}
              </div>
              <div className="text-lg font-bold text-white mt-4">{title}</div>
              <div className="text-sm text-[rgba(255,255,255,0.65)] mt-2 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "cta",
    content: (
      <div className="min-h-full flex flex-col items-center justify-center text-center px-10">
        <h2 className="font-[family-name:var(--font-serif)] text-4xl sm:text-5xl font-bold text-white">
          See it running, live.
        </h2>
        <p className="mt-4 max-w-lg text-[rgba(255,255,255,0.7)] text-[15px] leading-relaxed">
          Every screen in this deck is a real, working demo — sign in as staff, an owner, a contractor, or scan
          into the Guest App yourself.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <a
            href="https://ai-pms.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="tap inline-flex items-center justify-center rounded-[10px] bg-[var(--color-teal)] text-[var(--color-navy)] px-6 py-3 text-sm font-semibold"
          >
            Try the live demo →
          </a>
          <Link
            href="/"
            className="tap inline-flex items-center justify-center rounded-[10px] bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.25)] text-white px-6 py-3 text-sm font-semibold"
          >
            Back to AIPMS
          </Link>
        </div>
        <div className="mt-10 text-xs font-semibold tracking-widest uppercase text-[var(--color-teal)]">
          AIPMS · AI-Powered Holiday Letting Platform
        </div>
      </div>
    ),
  },
];

const HEADER_TOP = "max(1.25rem,calc(env(safe-area-inset-top) + 0.75rem))";
const FOOTER_BOTTOM = "max(1.25rem,calc(env(safe-area-inset-bottom) + 0.5rem))";
const SLIDE_PAD_TOP = "max(5rem,calc(env(safe-area-inset-top) + 4rem))";
const SLIDE_PAD_BOTTOM = "max(4rem,calc(env(safe-area-inset-bottom) + 3rem))";

export default function IntroductionDeck() {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canFullscreen = useSyncExternalStore(noopSubscribe, getFullscreenSupport, getFullscreenSupportServer);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const scrollToIndex = useCallback((i: number, smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.min(SLIDES.length - 1, Math.max(0, i));
      setIndex(clamped);
      scrollToIndex(clamped);
    },
    [scrollToIndex]
  );

  const go = useCallback((delta: number) => goTo(indexRef.current + delta), [goTo]);

  // Keep the counter/dots in sync with native swipe/scroll, without fighting it.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    function onScroll() {
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / el.clientWidth);
        setIndex((prev) => (prev === i ? prev : i));
      });
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Re-align on orientation change / resize so the current slide stays in view.
  useEffect(() => {
    function onResize() {
      scrollToIndex(indexRef.current, false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [scrollToIndex]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        goTo(0);
      } else if (e.key === "End") {
        goTo(SLIDES.length - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, goTo]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await rootRef.current?.requestFullscreen();
    }
  }

  return (
    <div ref={rootRef} className="fixed inset-0 bg-[var(--color-navy)] overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/images/introduction-bg.jpg)" }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,43,51,0.88),rgba(11,43,51,0.93)_45%,rgba(11,43,51,0.97))]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(31,184,172,0.14),_transparent_60%)]" />

      <div
        ref={scrollRef}
        className="relative h-full w-full flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar"
      >
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className="w-screen h-full flex-shrink-0 snap-start snap-always overflow-y-auto overscroll-y-contain no-scrollbar"
            style={{ paddingTop: SLIDE_PAD_TOP, paddingBottom: SLIDE_PAD_BOTTOM }}
            aria-hidden={i !== index}
          >
            {slide.content}
          </div>
        ))}
      </div>

      <div className="absolute left-5 flex items-center gap-3" style={{ top: HEADER_TOP }}>
        <Link href="/" className="text-xs font-semibold text-[rgba(255,255,255,0.6)] hover:text-white">
          ← AIPMS
        </Link>
      </div>

      <div className="absolute right-5 flex items-center gap-3" style={{ top: HEADER_TOP }}>
        <div className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
          {index + 1} / {SLIDES.length}
        </div>
        {canFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="tap text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] text-white px-3 py-1.5 hover:bg-[rgba(255,255,255,0.18)]"
          >
            {isFullscreen ? "Exit fullscreen" : "Present"}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => go(-1)}
        disabled={index === 0}
        aria-label="Previous slide"
        className="tap hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] text-white items-center justify-center disabled:opacity-20 hover:bg-[rgba(255,255,255,0.16)]"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={index === SLIDES.length - 1}
        aria-label="Next slide"
        className="tap hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] text-white items-center justify-center disabled:opacity-20 hover:bg-[rgba(255,255,255,0.16)]"
      >
        ›
      </button>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2" style={{ bottom: FOOTER_BOTTOM }}>
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`tap h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-[var(--color-teal)]" : "w-1.5 bg-[rgba(255,255,255,0.25)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
