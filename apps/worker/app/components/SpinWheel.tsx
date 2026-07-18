import { useEffect, useRef, useState } from "react";

export interface WheelSegment { id: string; label: string; crestUrl: string | null; competitorNumber: number | null; }

// Spectrum-styled wheel of fortune. Tell it to spin to a segment (by giving a
// new `spinToken` + `targetId`) and it rotates several turns before landing the
// target under the top pointer, then shows the result in the hub.
const COLORS = ["#d81e27", "#e5b23a", "#1f6feb", "#2ea043", "#8957e5", "#e36209", "#0891b2", "#c2410c"];

export function SpinWheel({
  segments, targetId, spinToken, onLanded,
}: {
  segments: WheelSegment[];
  targetId: string | null;
  spinToken: number;
  onLanded?: (seg: WheelSegment) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<WheelSegment | null>(null);
  const lastToken = useRef(0);

  const n = Math.max(segments.length, 1);
  const seg = 360 / n;

  useEffect(() => {
    if (spinToken === lastToken.current || !targetId) return;
    lastToken.current = spinToken;
    const idx = segments.findIndex((s) => s.id === targetId);
    if (idx < 0) return;

    // Land the target segment's centre under the pointer (top = 0deg), plus 5
    // full turns for drama. Rotation only ever increases.
    const targetCentre = idx * seg + seg / 2;
    const base = rotation - (rotation % 360);
    const next = base + 360 * 5 + (360 - targetCentre);
    setLanded(null);
    setSpinning(true);
    setRotation(next);
    const t = setTimeout(() => {
      setSpinning(false);
      const s = segments[idx];
      setLanded(s);
      onLanded?.(s);
    }, 3600);
    return () => clearTimeout(t);
  }, [spinToken, targetId, segments, seg, rotation, onLanded]);

  const gradient = `conic-gradient(${segments
    .map((_, i) => `${COLORS[i % COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`)
    .join(", ")})`;

  return (
    <div className="relative mx-auto" style={{ width: 300, height: 300 }}>
      {/* Pointer */}
      <div className="absolute left-1/2 top-[-6px] z-20 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "20px solid #e5b23a" }} />
      {/* Wheel */}
      <div
        className="h-full w-full rounded-full border-4 border-gold/70 shadow-2xl"
        style={{
          background: gradient,
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
        }}
      />
      {/* Hub */}
      <div className="absolute left-1/2 top-1/2 z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-gold/70 bg-surface text-center">
        {landed ? (
          <div className="px-1">
            {landed.crestUrl ? (
              <img src={landed.crestUrl} alt="" width={28} height={28} className="mx-auto object-contain" />
            ) : landed.competitorNumber != null ? (
              <span className="text-2xl font-extrabold text-gold">{landed.competitorNumber}</span>
            ) : null}
            <p className="mt-0.5 text-[10px] font-semibold leading-tight text-ink">{landed.label}</p>
          </div>
        ) : (
          <span className="text-2xl font-extrabold text-brand">S</span>
        )}
      </div>
    </div>
  );
}
