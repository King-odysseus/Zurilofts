// Plays a gentle notification chime using the Web Audio API - no external
// files or network requests needed. Use playMessageSound() for incoming
// messages and playBookingSound() for new booking alerts.

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browsers require user gesture before first play)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Soft ascending two-note chime for new messages.
 * Plays at low volume - unobtrusive but noticeable.
 */
export function playMessageSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    // Note 1 - C6
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1047, now);
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Note 2 - E6 (slightly after)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1319, now + 0.12);
    osc2.connect(gain);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch {
    // Audio not supported or blocked - silently ignore
  }
}

/**
 * Slightly more urgent three-note chime for booking alerts.
 */
export function playBookingSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    // C6 → E6 → G6
    const freqs = [1047, 1319, 1568];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      osc.connect(gain);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
    });
  } catch {
    // Audio not supported or blocked - silently ignore
  }
}
