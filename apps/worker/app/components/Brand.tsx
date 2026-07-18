// Inline SVG so the mark is crisp at any size and needs no asset request
// (Artifacts/Pages both serve this from the bundle). Gold shield + red "S",
// echoing the concept mockups' badge.
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2cf7a" />
          <stop offset="1" stopColor="#c8912a" />
        </linearGradient>
      </defs>
      <path
        d="M24 3l16 5v12c0 10.5-6.8 18.7-16 22-9.2-3.3-16-11.5-16-22V8l16-5z"
        fill="url(#sg)"
        stroke="#a5141b"
        strokeWidth="1.5"
      />
      <path
        d="M24 8l11 3.4v9.1c0 7.6-4.7 13.6-11 16.2-6.3-2.6-11-8.6-11-16.2v-9.1L24 8z"
        fill="#141519"
      />
      <text x="24" y="30" textAnchor="middle" fontSize="18" fontWeight="800" fill="#d81e27" fontFamily="system-ui, sans-serif">
        S
      </text>
    </svg>
  );
}

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={compact ? 30 : 36} />
      <div className="leading-none">
        <div className="font-extrabold tracking-tight text-ink" style={{ fontSize: compact ? 15 : 17 }}>
          SPECTRUM
        </div>
        <div className="font-semibold tracking-[0.2em] text-brand" style={{ fontSize: compact ? 8 : 9 }}>
          SWEEPSTAKES
        </div>
      </div>
    </div>
  );
}
