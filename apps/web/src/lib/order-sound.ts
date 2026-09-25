// =============================================================================
// Restaurant Order Sound Engine — Web Audio API Synthesizer Chimes
// Zero-latency, crystal clear harmonic sound notifications for restaurant operations
// =============================================================================

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Auto-unlock Web Audio on first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

/**
 * Play a synthesized tone with customizable frequency, wave type, and envelope
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainLevel = 0.25,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Attack & Decay envelope
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * 🔔 1. New Order / KOT Received Sound (Crisp Dual-Tone Restaurant Chime)
 */
export function playNewOrderSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // First Ding (D5 - 587 Hz)
    playTone(ctx, 587.33, now, 0.28, 0.35, 'sine');
    playTone(ctx, 1174.66, now, 0.25, 0.12, 'triangle'); // High harmonic

    // Second Ding (A5 - 880 Hz + D6 - 1175 Hz resonant chime)
    playTone(ctx, 880, now + 0.14, 0.55, 0.38, 'sine');
    playTone(ctx, 1174.66, now + 0.14, 0.6, 0.15, 'sine');
    playTone(ctx, 1760, now + 0.14, 0.35, 0.06, 'triangle');
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * 👨‍🍳 2. Order Accepted Sound (Affirmative Two-Note Melody)
 */
export function playOrderAcceptedSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Note 1: C5 (523 Hz)
    playTone(ctx, 523.25, now, 0.2, 0.28, 'sine');
    // Note 2: G5 (784 Hz)
    playTone(ctx, 783.99, now + 0.12, 0.35, 0.32, 'sine');
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * 🛎️ 3. Food Ready to Serve Sound (Classic Service Call Bell - "Order Up!")
 */
export function playOrderReadySound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Authentic High Service Bell (C6 - 1046.5 Hz with strong bell resonance)
    playTone(ctx, 1046.5, now, 0.8, 0.4, 'sine');
    playTone(ctx, 2093.0, now, 0.6, 0.18, 'sine');
    playTone(ctx, 3135.96, now, 0.3, 0.08, 'triangle');
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * 💳 4. Payment Received / Paid Sound (Pleasant Ascending Success Chime)
 */
export function playPaymentReceivedSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Ascending arpeggio: C5 -> E5 -> G5 -> C6 (Golden Cash / Success Chime)
    playTone(ctx, 523.25, now, 0.12, 0.25, 'sine');
    playTone(ctx, 659.25, now + 0.09, 0.12, 0.28, 'sine');
    playTone(ctx, 783.99, now + 0.18, 0.15, 0.3, 'sine');
    playTone(ctx, 1046.5, now + 0.27, 0.6, 0.35, 'sine');
    playTone(ctx, 2093.0, now + 0.27, 0.4, 0.1, 'triangle');
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * General gentle alert chime
 */
export function playChimeSound(): void {
  playNewOrderSound();
}
