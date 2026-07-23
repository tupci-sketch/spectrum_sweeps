// Draw-room sound effects, synthesised with the Web Audio API so there are no
// audio files to ship and nothing to fetch (CSP-safe). Every call is wrapped so
// a blocked or unavailable AudioContext can never break the draw UI.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, dur = 0.12, type: OscillatorType = "sine", vol = 0.18, at = 0) {
  const c = getCtx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(c.destination);
    const t = c.currentTime + at;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* ignore */
  }
}

export const sounds = {
  // Call from a user gesture (the Spin click) to unlock audio.
  unlock() {
    getCtx();
  },
  countdown(n: number) {
    // Rising pitch 3 → 2 → 1 for mounting tension.
    blip(440 + (3 - n) * 130, 0.16, "square", 0.14);
  },
  go() {
    blip(880, 0.18, "sawtooth", 0.16);
    blip(1320, 0.14, "sawtooth", 0.08, 0.02);
  },
  tick() {
    blip(1400, 0.025, "square", 0.05);
  },
  // Decelerating ticks across the ~4s spin, like a real wheel slowing down.
  spinTicks(durationMs = 4000) {
    let elapsed = 0;
    let gap = 45;
    while (elapsed < durationMs) {
      setTimeout(() => this.tick(), elapsed);
      elapsed += gap;
      gap *= 1.09;
    }
  },
  reveal() {
    blip(659, 0.32, "sine", 0.2);
    blip(988, 0.32, "sine", 0.14, 0.01);
  },
  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.28, "triangle", 0.18, i * 0.14));
  },
};
