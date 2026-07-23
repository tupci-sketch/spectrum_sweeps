import { useEffect, useState } from "react";

// Self-contained confetti burst (no external library, CSP-safe). Renders a
// fixed layer of falling pieces for a few seconds, then removes itself.
const COLORS = ["#d81e27", "#e5b23a", "#1f6feb", "#2ea043", "#8957e5", "#0891b2"];

export function Confetti({ fire }: { fire: boolean }) {
  const [pieces, setPieces] = useState<number[]>([]);

  useEffect(() => {
    if (!fire) return;
    setPieces(Array.from({ length: 90 }, (_, i) => i));
    const t = setTimeout(() => setPieces([]), 4200);
    return () => clearTimeout(t);
  }, [fire]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 2.6 + Math.random() * 1.6;
        const size = 6 + Math.random() * 6;
        const color = COLORS[i % COLORS.length];
        const rotate = Math.random() * 360;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              top: "-16px",
              left: `${left}%`,
              width: size,
              height: size * 0.5,
              background: color,
              transform: `rotate(${rotate}deg)`,
              borderRadius: 1,
              animation: `spectrum-confetti ${duration}s cubic-bezier(0.3,0.7,0.5,1) ${delay}s forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes spectrum-confetti {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
