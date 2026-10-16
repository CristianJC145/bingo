import slotWinnerSoundUrl from "../../../assets/sounds/slot/slot-winner.mp3";
import { getSlotWinnerSound, getSlotWinnerSoundUrl } from "../../bingoCustomization/services/slotWinnerSound.service";

/**
 * Sonidos de la máquina sintetizados con Web Audio API: no dependen de archivos
 * subidos y arrancan sin latencia de descarga.
 */

let context: AudioContext | null = null;
let tickTimer: number | null = null;
let winnerBufferPromise: Promise<AudioBuffer | null> | null = null;
let winnerBufferUrl = "";
let winnerSoundReady: Promise<AudioBuffer | null> | null = null;
let winnerSource: AudioBufferSourceNode | null = null;

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
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
};

/** Precarga el jackpot para que su entrada no dependa de la red durante el sorteo. */
const loadWinnerSound = (url: string): Promise<AudioBuffer | null> => {
  const audio = getContext();
  if (!audio) return Promise.resolve(null);
  if (!winnerBufferPromise || winnerBufferUrl !== url) {
    winnerBufferUrl = url;
    winnerBufferPromise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`No fue posible cargar el audio (${response.status}).`);
        return response.arrayBuffer();
      })
      .then((data) => audio.decodeAudioData(data))
      .catch((error) => {
        console.error("No fue posible preparar el sonido del ganador:", error);
        winnerBufferPromise = null;
        winnerBufferUrl = "";
        return null;
      });
  }
  return winnerBufferPromise;
};

/** Resuelve en cada sorteo el archivo activo; si el servidor falla conserva el predeterminado. */
const prepareWinnerSound = async (): Promise<AudioBuffer | null> => {
  let url = slotWinnerSoundUrl;
  try {
    const custom = await getSlotWinnerSound();
    if (custom?.url) url = getSlotWinnerSoundUrl(custom.url);
  } catch { /* El sorteo puede continuar con el sonido incluido en la aplicación. */ }
  const selected = await loadWinnerSound(url);
  return selected ?? (url !== slotWinnerSoundUrl ? loadWinnerSound(slotWinnerSoundUrl) : null);
};

/** Clic corto de cada paso del rodillo. */
const playTick = () => tone(1180, 0, 0.045, 0.16, "square");

/** Ticks acelerando mientras giran los rodillos; se detiene con stopSpinLoop(). */
export const startSpinLoop = () => {
  stopSpinLoop();
  const startedAt = Date.now();
  const schedule = () => {
    playTick();
    const elapsed = Date.now() - startedAt;
    // Arranca rápido y se va frenando, como un rodillo real perdiendo inercia.
    const interval = Math.min(150, 55 + elapsed / 28);
    tickTimer = window.setTimeout(schedule, interval);
  };
  schedule();
};

export const stopSpinLoop = () => {
  if (tickTimer !== null) {
    window.clearTimeout(tickTimer);
    tickTimer = null;
  }
};

/** Golpe seco al frenar cada rodillo. */
export const playReelStop = () => {
  tone(320, 0, 0.16, 0.22, "triangle");
  tone(160, 0, 0.22, 0.14, "sine");
};

/** Fanfarria ascendente al revelar el ganador. */
export const playWinFanfare = () => {
  stopSpinLoop();
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((frequency, index) => {
    tone(frequency, index * 0.11, 0.34, 0.2, "triangle");
    tone(frequency * 2, index * 0.11, 0.22, 0.07, "sine");
  });
  tone(1318.5, 0.46, 0.75, 0.22, "triangle");
  tone(1567.98, 0.46, 0.75, 0.13, "sine");
};

/** Jackpot fuerte, reservado para el instante en que entra el cartón ganador. */
export const playWinnerReveal = () => {
  const audio = getContext();
  if (!audio) return;
  void (winnerSoundReady ?? prepareWinnerSound()).then((buffer) => {
    if (!buffer) {
      playWinFanfare();
      return;
    }
    try { winnerSource?.stop(); }
    catch { /* Ya había terminado. */ }
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    const compressor = audio.createDynamicsCompressor();
    source.buffer = buffer;
    gain.gain.value = 1.12;
    compressor.threshold.value = -12;
    compressor.knee.value = 16;
    compressor.ratio.value = 4;
    source.connect(gain).connect(compressor).connect(audio.destination);
    source.onended = () => { if (winnerSource === source) winnerSource = null; };
    winnerSource = source;
    source.start();
  });
};

/** Debe llamarse desde un gesto del usuario para desbloquear el audio del navegador. */
export const primeAudio = () => {
  getContext();
  winnerSoundReady = prepareWinnerSound();
  void winnerSoundReady;
};
