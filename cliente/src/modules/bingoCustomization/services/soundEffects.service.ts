import configureApi from "../../../shared/utils/axios";

export interface SoundEffect {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
}

export const SOUND_API_ORIGIN = "http://localhost:3000";
const soundEffectsEndpoint = `${SOUND_API_ORIGIN}/api/sound-effects`;
const mimeByExtension: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
};

export const getSupportedAudioMime = (file: File) => {
  if (file.type.startsWith("audio/")) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return mimeByExtension[extension] ?? "";
};

export const getSoundUrl = (path: string) => `${SOUND_API_ORIGIN}${path}`;

export const listSoundEffects = async (): Promise<SoundEffect[]> => {
  const response = await configureApi().get(soundEffectsEndpoint);
  return response.data.data;
};

export const uploadSoundEffect = async (name: string, file: File): Promise<SoundEffect> => {
  const mimeType = getSupportedAudioMime(file);
  const response = await configureApi().post(soundEffectsEndpoint, file, {
    headers: {
      "Content-Type": mimeType,
      "X-Sound-Name": encodeURIComponent(name),
    },
  });
  return response.data.data;
};

export const deleteSoundEffect = async (id: string): Promise<void> => {
  await configureApi().delete(`${soundEffectsEndpoint}/${id}`);
};

export const getMultipleWinnersSound = async (): Promise<SoundEffect | null> =>
  (await configureApi().get(`${soundEffectsEndpoint}/multiple-winners`)).data.data;

export const setMultipleWinnersSound = async (soundId: string | null): Promise<SoundEffect | null> =>
  (await configureApi().put(`${soundEffectsEndpoint}/multiple-winners`, { soundId })).data.data;

export const SOUND_VOLUME_KEY = "bingo-sound-effects-volume";

export const getSavedSoundVolume = () => {
  const storedValue = Number(localStorage.getItem(SOUND_VOLUME_KEY));
  return Number.isFinite(storedValue) && storedValue >= 0 && storedValue <= 1 ? storedValue : 0.8;
};
