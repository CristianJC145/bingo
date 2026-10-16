import { getMultipleWinnersSound, getSoundUrl } from "../../bingoCustomization/services/soundEffects.service";

/**
 * Sonidos de la ruleta de desempate, sintetizados con Web Audio API.
 * Sin archivos que descargar: suenan al instante en el navegador de OBS.
 */

let context: AudioContext | null = null;
let announcement: HTMLAudioElement | null = null;

const getContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!context) {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  }
  if (context.state === "suspended") context.resume().catch(() => undefined);
  return context;
};

const tone = (
  frequency: number,
  startOffset: number,
  duration: number,
  peak: number,
  type: OscillatorType = "sine"
) => {
  const audio = getContext();
  if (!audio) return;
  const startAt = audio.currentTime + startOffset;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
};

/**
 * Golpe del fiel contra un tope de la rueda. Se llama en el instante exacto en que
 * el separador cruza la aguja, no con un temporizador: `speed` va de 0 a 1 y sube el
 * tono cuando la rueda va rápida, igual que un fiel real vibrando más agudo.
 *
 * `offset` permite escalonar dentro del mismo fotograma los topes que se cruzan a la
 * vez cuando la rueda va lanzada, para que suenen todos y no uno solo.
 */
export const playPegHit = (speed: number, offset = 0) => {
  const clamped = Math.max(0, Math.min(1, speed));
  tone(1180 + clamped * 620, offset, 0.03 + (1 - clamped) * 0.02, 0.1 + clamped * 0.07, "square");
  tone(430 + clamped * 120, offset, 0.045, 0.045, "triangle");
};

/** Redoble de tensión justo antes de soltar la rueda. */
export const playRouletteLaunch = () => {
  tone(180, 0, 0.5, 0.16, "sawtooth");
  tone(240, 0.06, 0.5, 0.1, "sawtooth");
  for (let i = 0; i < 8; i++) tone(90 + i * 14, i * 0.045, 0.09, 0.09, "square");
};

/** Campanada y acorde al quedar fijado el ganador. */
export const playRouletteWin = () => {
  tone(392, 0, 0.16, 0.18, "triangle");
  tone(659.25, 0.1, 0.28, 0.2, "triangle");
  tone(1046.5, 0.2, 0.55, 0.18, "sine");
};

/** Anuncio que abre el desempate: confirma al público que hubo varios bingos. */
export const playMultipleWinnersDefault = () => {
  [392, 523.25, 659.25].forEach((frequency, index) => {
    tone(frequency, index * 0.12, 0.42, 0.17, "triangle");
    tone(frequency * 1.5, index * 0.12 + 0.04, 0.28, 0.08, "sine");
  });
  tone(293.66, 0.48, 0.7, 0.2, "sawtooth");
  tone(587.33, 0.48, 0.85, 0.14, "triangle");
};

export const playTieAnnouncement = async () => {
  if (typeof window === "undefined") return;
  announcement?.pause();
  announcement = null;
  try {
    const effect = await getMultipleWinnersSound();
    if (!effect) { playMultipleWinnersDefault(); return; }
    const audio = new Audio(getSoundUrl(effect.url));
    announcement = audio;
    audio.volume = 0.95;
    audio.currentTime = 0;
    await audio.play();
  } catch {
    playMultipleWinnersDefault();
  }
};

/** Fanfarria distinta al mostrar la celebración del único ganador confirmado. */
export const playFinalWinnerReveal = () => {
  const notes = [392, 523.25, 659.25, 783.99, 1046.5];
  notes.forEach((frequency, index) => {
    tone(frequency, index * 0.1, 0.5, 0.19, "triangle");
    tone(frequency * 2, index * 0.1, 0.28, 0.055, "sine");
  });
  tone(1046.5, 0.56, 1.25, 0.22, "sine");
  tone(1567.98, 0.56, 1.05, 0.13, "triangle");
};

/** Debe llamarse desde un gesto del usuario para desbloquear el audio del navegador. */
export const primeRouletteAudio = () => { getContext(); };
