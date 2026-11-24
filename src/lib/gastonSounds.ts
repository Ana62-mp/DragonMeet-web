/**
 * Gastón's sounds, synthesised in the browser with the Web Audio API (no audio files, nothing to license).
 * Browsers only allow sound after the user has interacted with the page; until then calls are ignored.
 */
import type { MascotMood } from './mascot';

let ctx: AudioContext | null = null;
const audio = () => {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

const VOLUME = 0.16;

/** One nasal "oink": a buzzy tone through a band-pass filter with a quick downward pitch bend. */
function oink(a: AudioContext, at: number, pitch = 1) {
  const osc = a.createOscillator();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(260 * pitch, at);
  osc.frequency.exponentialRampToValueAtTime(170 * pitch, at + 0.14);
  filter.type = 'bandpass';
  filter.frequency.value = 950;
  filter.Q.value = 4;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(VOLUME, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  osc.connect(filter).connect(gain).connect(a.destination);
  osc.start(at);
  osc.stop(at + 0.18);
}

function glide(a: AudioContext, at: number, from: number, to: number, dur: number, type: OscillatorType = 'sine', vol = VOLUME) {
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** Soft snore: low-passed noise that swells and fades. */
function snore(a: AudioContext, at: number) {
  const len = 1.3;
  const buffer = a.createBuffer(1, a.sampleRate * len, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 380;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(VOLUME * 0.8, at + 0.6);
  gain.gain.linearRampToValueAtTime(0.0001, at + len);
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(at);
}

export function playMascotSound(mood: MascotMood) {
  const a = audio();
  if (!a || a.state !== 'running') return;
  const t = a.currentTime + 0.02;
  switch (mood) {
    case 'wave': oink(a, t); oink(a, t + 0.2, 1.1); break;
    case 'happy': glide(a, t, 420, 980, 0.22, 'triangle'); oink(a, t + 0.24, 1.25); oink(a, t + 0.42, 1.35); break;
    case 'sad': glide(a, t, 520, 230, 0.55, 'sine', VOLUME * 0.8); break;
    case 'sleep': snore(a, t); break;
    case 'curious': glide(a, t, 600, 900, 0.12, 'sine', VOLUME * 0.7); glide(a, t + 0.14, 700, 1100, 0.12, 'sine', VOLUME * 0.7); break;
    default: oink(a, t);
  }
}

/** Unlocks audio on the first user gesture so later reactions can play. */
export function primeAudio() {
  audio();
}
