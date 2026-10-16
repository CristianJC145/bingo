import { settings } from "../../../shared/constant/settings.constants";
import { BallVoice, DEFAULT_VOICE_ID, getBallVoiceOrigin } from "../../bingoCustomization/services/ballVoices.service";

export const DEFAULT_VOICE: BallVoice = {
  id: DEFAULT_VOICE_ID,
  name: "Voz original",
  extension: ".wav",
  ballCount: 75,
  createdAt: "",
};

export const resolveBallAudioUrl = (ballNumber: number, voice: BallVoice): string => {
  if (voice.id === DEFAULT_VOICE_ID) {
    return `${settings.appSounds}/sounds/ball/NUM${ballNumber}.wav`;
  }
  return `${getBallVoiceOrigin()}/ball-voices/media/${voice.id}/NUM${ballNumber}${voice.extension ?? ""}`;
};

let currentAudio: HTMLAudioElement | null = null;
let currentPlayback: Promise<void> | null = null;
let settleCurrentPlayback: (() => void) | null = null;

const stopCurrentPlayback = () => {
  try { currentAudio?.pause(); }
  catch { /* ignore */ }
  settleCurrentPlayback?.();
  settleCurrentPlayback = null;
  currentAudio = null;
};

export const playBallAudio = (ballNumber: number, voice: BallVoice, volume = 1): Promise<void> => {
  stopCurrentPlayback();
  const audio = new Audio(resolveBallAudioUrl(ballNumber, voice));
  audio.volume = volume;
  currentAudio = audio;

  currentPlayback = new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (currentAudio === audio) {
        currentAudio = null;
        settleCurrentPlayback = null;
      }
      resolve();
    };

    settleCurrentPlayback = finish;
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    audio.play().catch((error) => {
      console.error("No fue posible reproducir el canto de la balota:", error);
      finish();
    });
  });

  return currentPlayback;
};

/** Permite encadenar una repetición solo si ningún otro canto tomó el control. */
export const isCurrentBallAudioPlayback = (playback: Promise<void>): boolean => currentPlayback === playback;

/**
 * Espera el canto que esté activo. La breve ventana inicial cubre el mismo ciclo de
 * React en el que se detecta el ganador y el panel de balotas inicia su audio.
 */
export const waitForCurrentBallAudio = async (acquisitionMs = 100): Promise<void> => {
  if (acquisitionMs > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, acquisitionMs));
  let playback = currentPlayback;
  while (playback) {
    await playback;
    // Permite que una repetición encadenada se convierta en el audio actual antes
    // de decidir que terminó por completo el anuncio de la balota.
    await Promise.resolve();
    const nextPlayback = currentPlayback;
    if (!nextPlayback || nextPlayback === playback) break;
    playback = nextPlayback;
  }
};
