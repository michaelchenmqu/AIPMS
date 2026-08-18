export type BotMood = "idle" | "thinking" | "happy";

/** Friendly concierge bot avatar — original inline SVG, animated with pure
 *  CSS (gentle bob, periodic blink, thinking dots, happy smile-eyes). No
 *  external image assets. */
export function BotAvatar({ mood = "idle", size = 72 }: { mood?: BotMood; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" className="bot-bob flex-none">
      {/* soft ground shadow */}
      <ellipse cx="80" cy="146" rx="34" ry="6" fill="var(--color-navy)" opacity="0.08" />

      {/* antenna */}
      <line x1="80" y1="8" x2="80" y2="22" stroke="#b9c4cd" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="7" r="6" fill="var(--color-teal)" className="bot-antenna-glow" />

      {/* ears */}
      <ellipse cx="24" cy="76" rx="7" ry="16" fill="#dfe6ec" transform="rotate(-18 24 76)" />
      <ellipse cx="136" cy="76" rx="7" ry="16" fill="#dfe6ec" transform="rotate(18 136 76)" />

      {/* shoulders / body hint */}
      <path d="M32 150 Q32 118 80 118 Q128 118 128 150 Z" fill="#eef2f5" />

      {/* head */}
      <rect x="22" y="20" width="116" height="104" rx="46" fill="#ffffff" stroke="#d7dee3" strokeWidth="1.5" />

      {/* face screen */}
      <rect x="42" y="54" width="76" height="50" rx="18" fill="var(--color-navy)" />

      {mood === "thinking" ? (
        <g>
          <circle cx="66" cy="79" r="4.5" fill="var(--color-teal)" className="bot-dot-bounce-1" />
          <circle cx="80" cy="79" r="4.5" fill="var(--color-teal)" className="bot-dot-bounce-2" />
          <circle cx="94" cy="79" r="4.5" fill="var(--color-teal)" className="bot-dot-bounce-3" />
        </g>
      ) : mood === "happy" ? (
        <g stroke="var(--color-teal)" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M60 82 Q67 73 74 82" />
          <path d="M86 82 Q93 73 100 82" />
        </g>
      ) : (
        <g className="bot-blink">
          <rect x="60" y="73" width="13" height="11" rx="5.5" fill="var(--color-teal)" />
          <rect x="87" y="73" width="13" height="11" rx="5.5" fill="var(--color-teal)" />
        </g>
      )}
    </svg>
  );
}
