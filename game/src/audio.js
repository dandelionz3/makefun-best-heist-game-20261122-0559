// Sound, synthesised live with WebAudio: no audio files, no network. A tiny helper
// builds each effect from oscillators and a gain envelope. The context is created on the
// first gesture (browsers forbid sound before one); before that, every call is a no-op.

export function createAudio() {
  let context = null;
  let muted = false;
  let alarmTimer = 0;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = null) {
    const ctx = ensure();
    if (!ctx || muted || ctx.state === 'suspended') return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(880, 0.12, 'sine', 0.16);
      tone(1318, 0.16, 'sine', 0.12, 0.07);
    },
    diamond() {
      tone(523, 0.14, 'triangle', 0.18);
      tone(659, 0.14, 'triangle', 0.18, 0.1);
      tone(784, 0.2, 'triangle', 0.18, 0.2);
      tone(1046, 0.3, 'triangle', 0.16, 0.3);
    },
    coin() {
      tone(1567, 0.07, 'square', 0.06);
      tone(2093, 0.1, 'square', 0.05, 0.06);
    },
    emp() {
      tone(220, 0.4, 'sawtooth', 0.1, 0, 55);
    },
    smoke() {
      tone(320, 0.3, 'sine', 0.08, 0, 140);
    },
    hack() {
      tone(660, 0.06, 'square', 0.05);
      tone(990, 0.06, 'square', 0.05, 0.08);
    },
    spotted() {
      tone(440, 0.16, 'sawtooth', 0.1, 0, 330);
    },
    caught() {
      tone(220, 0.5, 'sawtooth', 0.14, 0, 110);
      tone(165, 0.7, 'sawtooth', 0.12, 0.12, 82);
    },
    win() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.11));
    },
    /** A soft two-note pulse while the alarm is high; call it every frame. */
    alarmPulse(dt, level) {
      if (level < 55) return;
      alarmTimer -= dt;
      if (alarmTimer > 0) return;
      alarmTimer = level > 85 ? 0.45 : 0.8;
      tone(980, 0.09, 'square', 0.05);
      tone(740, 0.09, 'square', 0.05, 0.12);
    },
  };
}
