import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

export interface SoundEffect {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
}

const dataDirectory = path.resolve(process.cwd(), "data");
const soundDirectory = path.resolve(process.cwd(), "storage", "sounds");
const manifestPath = path.join(dataDirectory, "sound-effects.json");
const eventSettingsPath = path.join(dataDirectory, "sound-event-settings.json");

interface SoundEventSettings {
  multipleWinnersSoundId: string | null;
}

const extensionByMime: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/x-aac": ".aac",
};

const ensureStorage = async () => {
  await Promise.all([
    mkdir(dataDirectory, { recursive: true }),
    mkdir(soundDirectory, { recursive: true }),
  ]);
};

const readManifest = async (): Promise<SoundEffect[]> => {
  await ensureStorage();
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as SoundEffect[];
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") throw error;
    await writeFile(manifestPath, "[]", "utf8");
    return [];
  }
};

const writeManifest = async (effects: SoundEffect[]) => {
  await ensureStorage();
  await writeFile(manifestPath, JSON.stringify(effects, null, 2), "utf8");
};

const readEventSettings = async (): Promise<SoundEventSettings> => {
  await ensureStorage();
  try {
    const stored = JSON.parse(await readFile(eventSettingsPath, "utf8")) as Partial<SoundEventSettings>;
    return { multipleWinnersSoundId: typeof stored.multipleWinnersSoundId === "string" ? stored.multipleWinnersSoundId : null };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const initial = { multipleWinnersSoundId: null };
    await writeFile(eventSettingsPath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
};

const writeEventSettings = async (settings: SoundEventSettings) => {
  await ensureStorage();
  await writeFile(eventSettingsPath, JSON.stringify(settings, null, 2), "utf8");
};

const decodeName = (value: string | undefined) => {
  if (!value) return "Nuevo efecto";
  try {
    return decodeURIComponent(value).trim().slice(0, 60) || "Nuevo efecto";
  } catch {
    return value.trim().slice(0, 60) || "Nuevo efecto";
  }
};

export const listSoundEffects = async (_request: Request, response: Response) => {
  try {
    const effects = await readManifest();
    response.json({ data: effects });
  } catch (error) {
    console.error("Error reading sound effects:", error);
    response.status(500).json({ message: "No fue posible cargar los efectos de sonido." });
  }
};

export const createSoundEffect = async (request: Request, response: Response) => {
  const mimeType = request.headers["content-type"]?.split(";")[0].toLowerCase() ?? "";
  const extension = extensionByMime[mimeType];
  if (!extension) {
    response.status(415).json({ message: "Formato no compatible. Usa MP3, WAV, OGG, M4A o AAC." });
    return;
  }
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
    response.status(400).json({ message: "Selecciona un archivo de audio válido." });
    return;
  }

  const id = randomUUID();
  const fileName = `${id}${extension}`;
  const effect: SoundEffect = {
    id,
    name: decodeName(request.headers["x-sound-name"] as string | undefined),
    fileName,
    mimeType,
    size: request.body.length,
    createdAt: new Date().toISOString(),
    url: `/sounds/custom/${fileName}`,
  };

  try {
    await ensureStorage();
    await writeFile(path.join(soundDirectory, fileName), request.body);
    const effects = await readManifest();
    effects.unshift(effect);
    await writeManifest(effects);
    response.status(201).json({ data: effect, message: "Efecto guardado correctamente." });
  } catch (error) {
    await unlink(path.join(soundDirectory, fileName)).catch(() => undefined);
    console.error("Error saving sound effect:", error);
    response.status(500).json({ message: "No fue posible guardar el efecto de sonido." });
  }
};

/** Audio de la biblioteca reservado para anunciar que hubo dos o más ganadores. */
export const getMultipleWinnersSound = async (_request: Request, response: Response) => {
  try {
    const [effects, settings] = await Promise.all([readManifest(), readEventSettings()]);
    const effect = effects.find((item) => item.id === settings.multipleWinnersSoundId) ?? null;
    response.json({ data: effect });
  } catch (error) {
    console.error("Error reading multiple winners sound:", error);
    response.status(500).json({ message: "No fue posible cargar el sonido para varios ganadores." });
  }
};

export const setMultipleWinnersSound = async (request: Request, response: Response) => {
  const soundId = request.body?.soundId === null ? null : String(request.body?.soundId ?? "").trim();
  try {
    const effects = await readManifest();
    if (soundId && !effects.some((item) => item.id === soundId)) {
      response.status(404).json({ message: "El efecto seleccionado ya no existe." });
      return;
    }
    await writeEventSettings({ multipleWinnersSoundId: soundId || null });
    response.json({
      data: soundId ? effects.find((item) => item.id === soundId) ?? null : null,
      message: soundId ? "Sonido para varios ganadores actualizado." : "Se restauró el aviso predeterminado para varios ganadores.",
    });
  } catch (error) {
    console.error("Error saving multiple winners sound:", error);
    response.status(500).json({ message: "No fue posible guardar el sonido para varios ganadores." });
  }
};

export const deleteSoundEffect = async (request: Request, response: Response) => {
  try {
    const effects = await readManifest();
    const effect = effects.find((item) => item.id === request.params.id);
    if (!effect) {
      response.status(404).json({ message: "El efecto de sonido no existe." });
      return;
    }

    await unlink(path.join(soundDirectory, path.basename(effect.fileName))).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    await writeManifest(effects.filter((item) => item.id !== effect.id));
    const settings = await readEventSettings();
    if (settings.multipleWinnersSoundId === effect.id) {
      await writeEventSettings({ multipleWinnersSoundId: null });
    }
    response.json({ message: "Efecto eliminado correctamente." });
  } catch (error) {
    console.error("Error deleting sound effect:", error);
    response.status(500).json({ message: "No fue posible eliminar el efecto de sonido." });
  }
};
