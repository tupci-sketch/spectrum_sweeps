// A team/driver emblem. Uses the real crest image when the catalog has one
// (e.g. after an FPL sync); otherwise draws a clean monogram badge from the
// team's colours + a short code, so every entrant always has an emblem.

const KNOWN: Record<string, string> = {
  "Arsenal": "ARS", "Aston Villa": "AVL", "Bournemouth": "BOU", "Brentford": "BRE",
  "Brighton & Hove Albion": "BHA", "Chelsea": "CHE", "Crystal Palace": "CRY", "Everton": "EVE",
  "Fulham": "FUL", "Liverpool": "LIV", "Manchester City": "MCI", "Manchester United": "MUN",
  "Newcastle United": "NEW", "Nottingham Forest": "NFO", "Tottenham Hotspur": "TOT",
  "West Ham United": "WHU", "Wolverhampton Wanderers": "WOL", "Leeds United": "LEE",
  "Sunderland": "SUN", "Burnley": "BUR", "Ipswich Town": "IPS", "Hull City": "HUL",
  "Coventry City": "COV", "Sheffield United": "SHU", "Leicester City": "LEI", "Southampton": "SOU",
};

const PALETTE = ["#d81e27", "#e5b23a", "#1f6feb", "#2ea043", "#8957e5", "#e36209", "#0891b2", "#be123c", "#0d9488", "#7c3aed"];

export function codeFor(label: string): string {
  if (KNOWN[label]) return KNOWN[label];
  const words = label.replace(/[&.]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return (words[0][0] + words[1][0] + (words[2]?.[0] ?? words[1][1] ?? "")).toUpperCase().slice(0, 3);
}

export function colorFor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function TeamCrest({
  label, crestUrl, number, size = 32,
}: { label: string; crestUrl?: string | null; number?: number | null; size?: number }) {
  if (crestUrl) {
    return <img src={crestUrl} alt="" width={size} height={size} className="inline-block shrink-0 object-contain align-middle" />;
  }
  const code = number != null ? String(number) : codeFor(label);
  const bg = colorFor(label);
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-md align-middle font-extrabold text-white shadow"
      style={{
        width: size, height: size,
        background: `linear-gradient(145deg, ${bg}, rgba(0,0,0,0.35))`,
        fontSize: Math.round(size * (code.length > 2 ? 0.34 : 0.42)),
        border: "1px solid rgba(255,255,255,0.25)",
      }}
      title={label}
    >
      {code}
    </span>
  );
}
