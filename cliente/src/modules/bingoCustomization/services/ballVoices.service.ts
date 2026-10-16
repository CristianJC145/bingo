import configureApi from "../../../shared/utils/axios";
import { SOUND_API_ORIGIN } from "./soundEffects.service";

export interface BallVoice {
  id: string;
  name: string;
  extension: string | null;
  ballCount: number;
  createdAt: string;
}

const endpoint = `${SOUND_API_ORIGIN}/api/ball-voices`;
const allowedExtensions = [".mp3", ".wav", ".ogg", ".m4a", ".aac"];

export const DEFAULT_VOICE_ID = "default";
export const ACTIVE_VOICE_KEY = "bingo-active-ball-voice";
export const REPEAT_VOICE_KEY = "bingo-repeat-ball-voice";

export const getFileExtension = (fileName: string): string => {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
};

export const isSupportedVoiceFile = (fileName: string) => allowedExtensions.includes(getFileExtension(fileName));

// Extrae el número de balota del nombre del archivo (NUM7.mp3 → 7, "07.wav" → 7).
export const parseBallNumber = (fileName: string): number | null => {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "");
  const match = base.match(/(\d{1,2})/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 && value <= 75 ? value : null;
};

export const listBallVoices = async (): Promise<BallVoice[]> => (await configureApi().get(endpoint)).data.data;

export const createBallVoice = async (name: string): Promise<BallVoice> =>
  (await configureApi().post(endpoint, { name })).data.data;

export const uploadBallVoiceBall = async (voiceId: string, ballNumber: number, file: File): Promise<BallVoice> => {
  const extension = getFileExtension(file.name);
  const response = await configureApi().put(`${endpoint}/${voiceId}/ball/${ballNumber}`, file, {
    headers: { "Content-Type": file.type || "application/octet-stream" },
    params: { ext: extension },
  });
  return response.data.data;
};

export const deleteBallVoice = async (voiceId: string): Promise<void> => {
  await configureApi().delete(`${endpoint}/${voiceId}`);
};

export const getBallVoiceOrigin = () => SOUND_API_ORIGIN;
