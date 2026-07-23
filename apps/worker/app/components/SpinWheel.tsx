import { useEffect, useRef, useState } from "react";

export interface WheelSegment { id: string; label: string; crestUrl: string | null; competitorNumber: number | null; }

// Spectrum wheel of fortune, drawn in SVG so every segment carries its real
// team/driver name. Give it a new `spinToken` + `targetId` and it rotates a few
// turns before landing that segment under the top pointer, then celebrates it.
const COLORS = ["#d81e27", "#e5b23a", "#1f6feb", "#2ea043", "#8957e5", "#e36209", "#0891b2", "#be123c", "#7c3aed", "#0d9488"];
const SIZE = 340;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 6;

function pointAt(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180; // 0° = top, clockwise
  return [CX + radius * Math.sin(rad), CY - radius * Math.cos(rad)];
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

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
  const [landedId, setLandedId] = useState<string | null>(null);
  const lastToken = useRef(0);

  const n = Math.max(segments.length, 1);
  const seg = 360 / n;
  const landed = segments.find((s) => s.id === landedId) ?? null;

  // The draw room re-polls state every ~1.2s, handing us a fresh `segments`
  // array and a new `onLanded` closure on every render. Read those through refs
  // so a routine re-render can't re-run the spin effect and clear its own
  // landing timeout — the effect must fire ONLY when a new spin is requested,
  // otherwise the wheel gets stuck "spinning" and never reveals or re-enables.
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;

  useEffect(() => {
    if (spinToken === lastToken.current || !targetId) return;
    lastToken.current = spinToken;
    const segs = segmentsRef.current;
    const idx = segs.findIndex((s) => s.id === targetId);
    if (idx < 0) return;

    // Land the target segment's centre under the pointer (top), plus a few full
    // turns for drama. Rotation only ever increases so it always spins forward.
    const count = Math.max(segs.length, 1);
    const step = 360 / count;
    const targetCentre = idx * step + step / 2;
    setLandedId(null);
    setSpinning(true);
    setRotation((prev) => {
      const base = prev - (prev % 360);
      return base + 360 * 6 + (360 - targetCentre);
    });
    const t = setTimeout(() => {
      setSpinning(false);
      setLandedId(segs[idx].id);
      onLandedRef.current?.(segs[idx]);
    }, 4200);
    return () => clearTimeout(t);
  }, [spinToken, targetId]);

  // Label sizing shrinks as the field grows so 20+ names still fit the rim.
  const fontSize = n > 24 ? 7 : n > 18 ? 8.5 : n > 12 ? 10 : 12;
  const maxChars = n > 18 ? 10 : n > 12 ? 13 : 16;
  const rLabel = R - 12;

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}>
      {/* Pointer */}
      <div
        className="absolute left-1/2 top-[-4px] z-20 -translate-x-1/2 drop-shadow"
        style={{ width: 0, height: 0, borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderTop: "24px solid #e5b23a" }}
      />
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "transform 4.1s cubic-bezier(0.16, 0.84, 0.24, 1)" : "none",
          filter: spinning ? "drop-shadow(0 0 18px rgba(229,178,58,0.35))" : "drop-shadow(0 6px 20px rgba(0,0,0,0.5))",
        }}
      >
        <circle cx={CX} cy={CY} r={R + 4} fill="#0b0b10" stroke="rgba(229,178,58,0.7)" strokeWidth={4} />
        {segments.map((s, i) => {
          const a0 = i * seg;
          const a1 = (i + 1) * seg;
          const [x0, y0] = pointAt(a0, R);
          const [x1, y1] = pointAt(a1, R);
          const large = seg > 180 ? 1 : 0;
          const am = a0 + seg / 2;
          const [lx, ly] = pointAt(am, rLabel);
          const isWinner = s.id === landedId;
          // Read outward along the radius; flip on the left half so it stays upright.
          const flip = am > 180;
          const rot = flip ? am + 90 : am - 90;
          return (
            <g key={s.id}>
              <path
                d={`M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`}
                fill={COLORS[i % COLORS.length]}
                stroke={isWinner ? "#ffffff" : "rgba(0,0,0,0.25)"}
                strokeWidth={isWinner ? 3 : 1}
                style={{ filter: landedId && !isWinner ? "brightness(0.5)" : "none", transition: "filter 0.4s, stroke 0.2s" }}
              />
              <text
                x={lx}
                y={ly}
                fill="#fff"
                fontSize={fontSize}
                fontWeight={isWinner ? 800 : 600}
                textAnchor={flip ? "start" : "end"}
                dominantBaseline="central"
                transform={`rotate(${rot} ${lx} ${ly})`}
                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 0.6 }}
              >
                {s.competitorNumber != null ? `${s.competitorNumber} · ` : ""}{truncate(s.label, maxChars)}
              </text>
              {s.crestUrl && (() => {
                const [ix, iy] = pointAt(am, R * 0.55);
                return <image href={s.crestUrl} x={ix - 11} y={iy - 11} width={22} height={22} preserveAspectRatio="xMidYMid meet" />;
              })()}
            </g>
          );
        })}
      </svg>

      {/* Hub */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-gold/70 bg-surface text-center shadow-inner">
        {landed ? (
          <div className="px-1">
            {landed.crestUrl ? (
              <img src={landed.crestUrl} alt="" width={30} height={30} className="mx-auto object-contain" />
            ) : landed.competitorNumber != null ? (
              <span className="block text-2xl font-extrabold text-gold">{landed.competitorNumber}</span>
            ) : (
              <span className="block text-lg">🎉</span>
            )}
            <p className="mt-0.5 text-[10px] font-bold leading-tight text-ink">{truncate(landed.label, 14)}</p>
          </div>
        ) : (
          <span className={`text-2xl font-extrabold text-brand ${spinning ? "animate-pulse" : ""}`}>S</span>
        )}
      </div>
    </div>
  );
}
