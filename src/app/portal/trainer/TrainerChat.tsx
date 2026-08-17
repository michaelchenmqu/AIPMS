"use client";

import { useState, useRef, useEffect } from "react";
import { Card, Button } from "@/components/ui";

type Msg = { id: string; role: "USER" | "ASSISTANT"; content: string };

const SUGGESTIONS = [
  "Draft a pricing recommendation for Island Oasis",
  "How do I onboard a new property?",
  "Explain how linen billing works",
];

export default function TrainerChat({ initialMessages }: { initialMessages: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(content: string) {
    if (!content.trim() || loading) return;
    setInput("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "USER", content }]);
    setLoading(true);
    try {
      const res = await fetch("/api/trainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((m) => [...m, { id: data.message.id, role: "ASSISTANT", content: data.message.content }]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--color-muted)]">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="tap text-left text-sm bg-[var(--color-sand-100)] rounded-xl px-4 py-2.5 text-[var(--color-navy)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "USER"
                  ? "bg-[var(--color-navy)] text-white"
                  : "bg-[var(--color-sand-100)] text-[var(--color-text)]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-sand-100)] rounded-2xl px-4 py-2.5 text-sm text-[var(--color-muted)]">
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
        className="flex items-center gap-2 border-t border-[var(--color-sand-200)] p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI Trainer…"
          className="flex-1 rounded-lg border border-[var(--color-sand-400)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
        />
        <Button type="submit" variant="accent" disabled={loading}>
          Send
        </Button>
      </form>
    </Card>
  );
}
