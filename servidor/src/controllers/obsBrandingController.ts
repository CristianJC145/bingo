import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

interface ObsBrandingAsset {
  id: string;
  fileName: string;
  mimeType: string;
  mediaType: "image" | "video";
  size: number;
  updatedAt: string;
  url: string;
}

const dataDirectory = path.resolve(process.cwd(), "data");
const mediaDirectory = path.resolve(process.cwd(), "storage", "obs-branding");
const manifestPath = path.join(dataDirectory, "obs-branding.json");
const extensionByMime: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

const ensureStorage = () => Promise.all([
  mkdir(dataDirectory, { recursive: true }),
  mkdir(mediaDirectory, { recursive: true }),
]);

const readAsset = async (): Promise<ObsBrandingAsset | null> => {
  await ensureStorage();
  try { return JSON.parse(await readFile(manifestPath, "utf8")) as ObsBrandingAsset | null; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeFile(manifestPath, "null", "utf8");
    return null;
  }
};

const saveAsset = async (asset: ObsBrandingAsset | null) => {
  await ensureStorage();
  await writeFile(manifestPath, JSON.stringify(asset, null, 2), "utf8");
};

export const getObsBranding = async (_request: Request, response: Response) => {
  try { response.json({ data: await readAsset() }); }
  catch (error) {
    console.error("Error reading OBS branding:", error);
    response.status(500).json({ message: "No fue posible cargar el fondo de transmisión." });
  }
};

export const saveObsBranding = async (request: Request, response: Response) => {
  const mimeType = request.headers["content-type"]?.split(";")[0].toLowerCase() ?? "";
  const extension = extensionByMime[mimeType];
  if (!extension) { response.status(415).json({ message: "Formato no compatible. Usa PNG, JPG, WEBP, GIF, MP4 o WEBM." }); return; }
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) { response.status(400).json({ message: "Selecciona una imagen o video válido." }); return; }

  const previous = await readAsset().catch(() => null);
  const fileName = `${randomUUID()}${extension}`;
  const asset: ObsBrandingAsset = {
    id: randomUUID(),
    fileName,
    mimeType,
    mediaType: mimeType.startsWith("video/") ? "video" : "image",
    size: request.body.length,
    updatedAt: new Date().toISOString(),
    url: `/obs-branding/media/${fileName}`,
  };

  try {
    await ensureStorage();
    await writeFile(path.join(mediaDirectory, fileName), request.body);
    await saveAsset(asset);
    if (previous) await unlink(path.join(mediaDirectory, path.basename(previous.fileName))).catch(() => undefined);
    response.status(201).json({ data: asset, message: "Fondo de transmisión actualizado." });
  } catch (error) {
    await unlink(path.join(mediaDirectory, fileName)).catch(() => undefined);
    console.error("Error saving OBS branding:", error);
    response.status(500).json({ message: "No fue posible guardar el fondo de transmisión." });
  }
};

export const deleteObsBranding = async (_request: Request, response: Response) => {
  try {
    const asset = await readAsset();
    if (asset) await unlink(path.join(mediaDirectory, path.basename(asset.fileName))).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    await saveAsset(null);
    response.json({ message: "Se restauró el fondo predeterminado." });
  } catch (error) {
    console.error("Error deleting OBS branding:", error);
    response.status(500).json({ message: "No fue posible restaurar el fondo predeterminado." });
  }
};
