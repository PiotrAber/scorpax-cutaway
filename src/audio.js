// Procedural Web Audio Mechanical Sound Engine for SCORPAX SX-9 (zero external files).
// Inspired by cutaway/sfx/: crisp tactile switch clicks, filtered servo whirls proportional to disassembly velocity,
// and a magnetic lock thump when assemblies snap back together.
export function createAudioEngine() {
  let ctx = null;
  let enabled = false;
  let servoGain = null;
  let servoOsc = null;
  let servoFilter = null;
  let airGain = null;
  let lastApart = 0;
  let lastTickT = 0;

  const init = () => {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    // Continuous subtle servo hum (frequency + gain driven smoothly by mechanical motion velocity)
    servoOsc = ctx.createOscillator();
    servoOsc.type = 'triangle';
    servoOsc.frequency.value = 110;
    servoFilter = ctx.createBiquadFilter();
    servoFilter.type = 'bandpass';
    servoFilter.frequency.value = 340;
    servoFilter.Q.value = 3.2;
    servoGain = ctx.createGain();
    servoGain.gain.value = 0;
    servoOsc.connect(servoFilter).connect(servoGain).connect(ctx.destination);
    servoOsc.start();

    // Soft filtered air/hydraulic hiss buffer
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 1800;
    nf.Q.value = 1.8;
    airGain = ctx.createGain();
    airGain.gain.value = 0;
    noise.connect(nf).connect(airGain).connect(ctx.destination);
    noise.start();
  };

  const click = (accent = false) => {
    if (!enabled || !ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 1680 : 1280, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.032);
    gain.gain.setValueAtTime(accent ? 0.09 : 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  };

  const snap = () => {
    if (!enabled || !ctx) return;
    const now = ctx.currentTime;
    // Magnetic mechanical lock thump
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.14);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
    click(true);
  };

  const update = (apart, dt) => {
    if (!enabled || !ctx || dt <= 0) {
      lastApart = apart;
      return;
    }
    const now = ctx.currentTime;
    const vel = Math.min(2.5, Math.abs(apart - lastApart) / Math.max(0.008, dt));
    // Detect magnetic snap reassembly crossing near 0
    if (lastApart > 0.06 && apart <= 0.02) snap();
    lastApart = apart;

    if (servoGain && servoOsc && servoFilter) {
      const targetG = vel > 0.04 ? Math.min(0.045, vel * 0.025) : 0;
      servoGain.gain.setTargetAtTime(targetG, now, 0.04);
      servoOsc.frequency.setTargetAtTime(115 + apart * 150 + vel * 60, now, 0.04);
      servoFilter.frequency.setTargetAtTime(320 + apart * 620, now, 0.05);
    }
    if (airGain) {
      const targetA = vel > 0.08 ? Math.min(0.022, vel * 0.012) : 0;
      airGain.gain.setTargetAtTime(targetA, now, 0.05);
    }
    // Delicate ratchet ticks while sliding apart rapidly
    if (vel > 0.35 && now - lastTickT > 0.11) {
      lastTickT = now;
      click(false);
    }
  };

  const setEnabled = (on) => {
    enabled = !!on;
    if (enabled) {
      init();
      if (ctx?.state === 'suspended') ctx.resume();
      click(true);
    } else if (ctx && servoGain && airGain) {
      const now = ctx.currentTime;
      servoGain.gain.setTargetAtTime(0, now, 0.03);
      airGain.gain.setTargetAtTime(0, now, 0.03);
    }
    return enabled;
  };

  return {
    setEnabled,
    isEnabled: () => enabled,
    click,
    snap,
    update,
  };
}
