import configureApi from "../../../shared/utils/axios";
import { SOUND_API_ORIGIN } from "./soundEffects.service";

export interface SlotWinnerSoundAsset {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  updatedAt: string;
  url: string;
}

const endpoint = `${SOUND_API_ORIGIN}/api/slot-winner-sound`;
const mimeByExtension: Record<string, string> = {
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", aac: "audio/aac",
};
const supportedMime = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac"]);

export const getSlotWinnerSoundMime = (file: File): string => supportedMime.has(file.type?.toLowerCase())
  ? file.type.toLowerCase()
  : mimeByExtension[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
export const getSlotWinnerSoundUrl = (url: string): string => `${SOUND_API_ORIGIN}${url}`;
export const getSlotWinnerSound = async (): Promise<SlotWinnerSoundAsset | null> => (await configureApi().get(endpoint)).data.data;
export const uploadSlotWinnerSound = async (file: File): Promise<SlotWinnerSoundAsset> => (await configureApi().put(endpoint, file, {
  headers: { "Content-Type": getSlotWinnerSoundMime(file), "X-File-Name": encodeURIComponent(file.name) },
})).data.data;
export const resetSlotWinnerSound = async (): Promise<void> => { await configureApi().delete(endpoint); };
