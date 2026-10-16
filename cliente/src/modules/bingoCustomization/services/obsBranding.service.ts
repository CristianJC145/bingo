import configureApi from "../../../shared/utils/axios";
import { SOUND_API_ORIGIN } from "./soundEffects.service";

export interface ObsBrandingAsset {
  id: string;
  fileName: string;
  mimeType: string;
  mediaType: "image" | "video";
  size: number;
  updatedAt: string;
  url: string;
}

const endpoint = `${SOUND_API_ORIGIN}/api/obs-branding`;
const mimeByExtension: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", webm: "video/webm",
};

export const getObsBrandingMime = (file: File) => file.type && (file.type.startsWith("image/") || file.type.startsWith("video/"))
  ? file.type
  : mimeByExtension[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
export const getObsBrandingUrl = (url: string) => `${SOUND_API_ORIGIN}${url}`;
export const getObsBranding = async (): Promise<ObsBrandingAsset | null> => (await configureApi().get(endpoint)).data.data;
export const uploadObsBranding = async (file: File): Promise<ObsBrandingAsset> => (await configureApi().put(endpoint, file, { headers: { "Content-Type": getObsBrandingMime(file) } })).data.data;
export const resetObsBranding = async () => { await configureApi().delete(endpoint); };
