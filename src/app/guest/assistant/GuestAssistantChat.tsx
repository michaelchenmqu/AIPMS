"use client";

import { useState, useRef, useEffect } from "react";
import { BotAvatar, type BotMood } from "@/components/guest/BotAvatar";

type Msg = { id: string; role: "USER" | "ASSISTANT"; content: string };

const SUGGESTIONS = ["What's the wifi password?", "What time is checkout?", "Where can we park?", "Any good food nearby?"];

export default function GuestAssistantChat({
  propertyName,
  initialMessages,
}: {
  propertyName: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<BotMood>("idle");
  const bottomRef = useRef<HTMLDivElement>(null);
  const happyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (happyTimeout.current) clearTimeout(happyTimeout.current);
    };
  }, []);

  async function send(content: string) {
    if (!content.trim() || loading) return;
    setInput("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "USER", content }]);
    setLoading(true);
    setMood("thinking");
    try {
      const res = await fetch("/api/guest/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((m) => [...m, { id: data.message.id, role: "ASSISTANT", content: data.message.content }]);
        setMood("happy");
        happyTimeout.current = setTimeout(() => setMood("idle"), 2200);
      } else {
        setMood("idle");
      }
    } catch {
      setMood("idle");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none flex items-center gap-3 px-5 pt-4 pb-3 border-b border-[var(--color-sand-300)]">
        <BotAvatar mood={mood} size={48} />
        <div>
          <div className="text-sm font-bold text-[var(--color-navy)]">Your AI concierge</div>
          <div className="text-[11px] text-[var(--color-muted)]">Here to help with anything at {propertyName}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--color-muted)]">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="tap text-left text-sm bg-white rounded-xl px-3.5 py-2.5 text-[var(--color-navy)] shadow-[var(--shadow-card)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "USER" ? "bg-[var(--color-navy)] text-white" : "bg-white text-[var(--color-text)] shadow-[var(--shadow-card)]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-3.5 py-2.5 text-sm text-[var(--color-muted)] shadow-[var(--shadow-card)]">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex-none flex items-center gap-2 border-t border-[var(--color-sand-300)] bg-white/90 backdrop-blur-sm p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your concierge…"
          className="flex-1 rounded-lg border border-[var(--color-sand-400)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="tap inline-flex items-center justify-center rounded-[10px] bg-[var(--color-teal)] text-[var(--color-navy)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
