import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { Request, Response } from "express";

interface SlotWinnerSoundAsset {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  updatedAt: string;
  url: string;
}

const dataDirectory = path.resolve(process.cwd(), "data");
const mediaDirectory = path.resolve(process.cwd(), "storage", "slot-winner-sound");
const manifestPath = path.join(dataDirectory, "slot-winner-sound.json");
const extensionByMime: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/wave": ".wav",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
};

const ensureStorage = () => Promise.all([
  mkdir(dataDirectory, { recursive: true }),
  mkdir(mediaDirectory, { recursive: true }),
]);

const readAsset = async (): Promise<SlotWinnerSoundAsset | null> => {
  await ensureStorage();
  try { return JSON.parse(await readFile(manifestPath, "utf8")) as SlotWinnerSoundAsset | null; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeFile(manifestPath, "null", "utf8");
    return null;
  }
};

const writeAsset = async (asset: SlotWinnerSoundAsset | null) => {
  await ensureStorage();
  await writeFile(manifestPath, JSON.stringify(asset, null, 2), "utf8");
};

export const getSlotWinnerSound = async (_request: Request, response: Response) => {
  try { response.json({ data: await readAsset() }); }
  catch (error) {
    console.error("Error reading slot winner sound:", error);
    response.status(500).json({ message: "No fue posible cargar el sonido de ganador." });
  }
};

export const saveSlotWinnerSound = async (request: Request, response: Response) => {
  const mimeType = request.headers["content-type"]?.split(";")[0].toLowerCase() ?? "";
  const extension = extensionByMime[mimeType];
  if (!extension) { response.status(415).json({ message: "Formato no compatible. Usa MP3, WAV, OGG, M4A o AAC." }); return; }
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) { response.status(400).json({ message: "Selecciona un archivo de audio válido." }); return; }

  const previous = await readAsset().catch(() => null);
  const fileName = `${randomUUID()}${extension}`;
  const encodedName = String(request.headers["x-file-name"] ?? "sonido-ganador");
  let originalName = encodedName;
  try { originalName = decodeURIComponent(encodedName); }
  catch { /* Conserva el nombre recibido si no estaba codificado. */ }
  originalName = originalName.slice(0, 180);
  const asset: SlotWinnerSoundAsset = {
    id: randomUUID(),
    fileName,
    originalName,
    mimeType,
    size: request.body.length,
    updatedAt: new Date().toISOString(),
    url: `/slot-winner-sound/media/${fileName}`,
  };

  try {
    await ensureStorage();
    await writeFile(path.join(mediaDirectory, fileName), request.body);
    await writeAsset(asset);
    if (previous) await unlink(path.join(mediaDirectory, path.basename(previous.fileName))).catch(() => undefined);
    response.status(201).json({ data: asset, message: "Sonido de ganador actualizado." });
  } catch (error) {
    await unlink(path.join(mediaDirectory, fileName)).catch(() => undefined);
    console.error("Error saving slot winner sound:", error);
    response.status(500).json({ message: "No fue posible guardar el sonido de ganador." });
  }
};

export const deleteSlotWinnerSound = async (_request: Request, response: Response) => {
  try {
    const asset = await readAsset();
    if (asset) await unlink(path.join(mediaDirectory, path.basename(asset.fileName))).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    await writeAsset(null);
    response.json({ message: "Se restauró el sonido predeterminado." });
  } catch (error) {
    console.error("Error deleting slot winner sound:", error);
    response.status(500).json({ message: "No fue posible restaurar el sonido predeterminado." });
  }
};
