import configureApi from "../../../shared/utils/axios";
import { SOUND_API_ORIGIN } from "./soundEffects.service";

export interface SponsorAsset {
  id: string;
  name: string;
  kind?: "brand" | "person";
  role?: string;
  fileName: string;
  mimeType: string;
  mediaType: "image" | "video" | "text";
  size: number;
  createdAt: string;
  url: string;
}

const endpoint = `${SOUND_API_ORIGIN}/api/sponsors`;
const mimeByExtension: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", webm: "video/webm" };

export const getSponsorMime = (file: File) => file.type && (file.type.startsWith("image/") || file.type.startsWith("video/")) ? file.type : mimeByExtension[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
export const getSponsorUrl = (url: string) => `${SOUND_API_ORIGIN}${url}`;
export const listSponsors = async (): Promise<SponsorAsset[]> => (await configureApi().get(endpoint)).data.data;
export const uploadSponsor = async (name: string, file: File): Promise<SponsorAsset> => (await configureApi().post(endpoint, file, { headers: { "Content-Type": getSponsorMime(file), "X-Sponsor-Name": encodeURIComponent(name) } })).data.data;
export const createPersonSponsor = async (name: string, role?: string): Promise<SponsorAsset> => (await configureApi().post(`${endpoint}/person`, { name, role: role?.trim() || undefined })).data.data;
export const deleteSponsor = async (id: string) => { await configureApi().delete(`${endpoint}/${id}`); };

export const isPersonSponsor = (asset: SponsorAsset) => asset.kind === "person" || asset.mediaType === "text";
export const getSponsorInitials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("es");
