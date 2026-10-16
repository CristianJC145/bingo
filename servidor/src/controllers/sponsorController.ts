import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

interface SponsorAsset {
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

const dataDirectory = path.resolve(process.cwd(), "data");
const mediaDirectory = path.resolve(process.cwd(), "storage", "sponsors");
const manifestPath = path.join(dataDirectory, "sponsors.json");
const extensionByMime: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

const ensureStorage = () => Promise.all([mkdir(dataDirectory, { recursive: true }), mkdir(mediaDirectory, { recursive: true })]);

const readManifest = async (): Promise<SponsorAsset[]> => {
  await ensureStorage();
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as SponsorAsset[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeFile(manifestPath, "[]", "utf8");
    return [];
  }
};

const saveManifest = async (assets: SponsorAsset[]) => {
  await ensureStorage();
  await writeFile(manifestPath, JSON.stringify(assets, null, 2), "utf8");
};

const decodeName = (value: string | undefined) => {
  if (!value) return "Patrocinador";
  try { return decodeURIComponent(value).trim().slice(0, 90) || "Patrocinador"; }
  catch { return value.trim().slice(0, 90) || "Patrocinador"; }
};

const cleanText = (value: unknown, maxLength: number) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export const listSponsors = async (_request: Request, response: Response) => {
  try { response.json({ data: await readManifest() }); }
  catch (error) { console.error("Error reading sponsors:", error); response.status(500).json({ message: "No fue posible cargar los patrocinadores." }); }
};

export const createSponsor = async (request: Request, response: Response) => {
  const mimeType = request.headers["content-type"]?.split(";")[0].toLowerCase() ?? "";
  const extension = extensionByMime[mimeType];
  if (!extension) { response.status(415).json({ message: "Formato no compatible. Usa PNG, JPG, WEBP, GIF, MP4 o WEBM." }); return; }
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) { response.status(400).json({ message: "Selecciona una imagen o video válido." }); return; }

  const id = randomUUID();
  const fileName = `${id}${extension}`;
  const asset: SponsorAsset = {
    id,
    name: decodeName(request.headers["x-sponsor-name"] as string | undefined),
    kind: "brand",
    fileName,
    mimeType,
    mediaType: mimeType.startsWith("video/") ? "video" : "image",
    size: request.body.length,
    createdAt: new Date().toISOString(),
    url: `/sponsors/media/${fileName}`,
  };

  try {
    await ensureStorage();
    await writeFile(path.join(mediaDirectory, fileName), request.body);
    const assets = await readManifest();
    assets.push(asset);
    await saveManifest(assets);
    response.status(201).json({ data: asset, message: "Patrocinador agregado correctamente." });
  } catch (error) {
    await unlink(path.join(mediaDirectory, fileName)).catch(() => undefined);
    console.error("Error saving sponsor:", error);
    response.status(500).json({ message: "No fue posible guardar el patrocinador." });
  }
};

export const createPersonSponsor = async (request: Request, response: Response) => {
  const name = cleanText(request.body?.name, 90);
  const role = cleanText(request.body?.role, 120);
  if (!name) { response.status(400).json({ message: "Escribe el nombre del patrocinador." }); return; }

  const asset: SponsorAsset = {
    id: randomUUID(),
    name,
    kind: "person",
    role: role || undefined,
    fileName: "",
    mimeType: "text/plain",
    mediaType: "text",
    size: 0,
    createdAt: new Date().toISOString(),
    url: "",
  };

  try {
    const assets = await readManifest();
    assets.push(asset);
    await saveManifest(assets);
    response.status(201).json({ data: asset, message: "Patrocinador personal agregado correctamente." });
  } catch (error) {
    console.error("Error saving person sponsor:", error);
    response.status(500).json({ message: "No fue posible guardar el patrocinador." });
  }
};

export const deleteSponsor = async (request: Request, response: Response) => {
  try {
    const assets = await readManifest();
    const asset = assets.find((item) => item.id === request.params.id);
    if (!asset) { response.status(404).json({ message: "El patrocinador no existe." }); return; }
    if (asset.fileName) await unlink(path.join(mediaDirectory, path.basename(asset.fileName))).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    await saveManifest(assets.filter((item) => item.id !== asset.id));
    response.json({ message: "Patrocinador eliminado correctamente." });
  } catch (error) {
    console.error("Error deleting sponsor:", error);
    response.status(500).json({ message: "No fue posible eliminar el patrocinador." });
  }
};
