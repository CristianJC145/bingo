import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import path from "path";

export interface BallVoice {
  id: string;
  name: string;
  extension: string | null;
  ballCount: number;
  createdAt: string;
}

const dataDirectory = path.resolve(process.cwd(), "data");
const voicesDirectory = path.resolve(process.cwd(), "storage", "ball-voices");
const manifestPath = path.join(dataDirectory, "ball-voices.json");
const allowedExtensions = [".mp3", ".wav", ".ogg", ".m4a", ".aac"];
const TOTAL_BALLS = 75;

const ensureStorage = () => Promise.all([mkdir(dataDirectory, { recursive: true }), mkdir(voicesDirectory, { recursive: true })]);

const readManifest = async (): Promise<BallVoice[]> => {
  await ensureStorage();
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as BallVoice[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeFile(manifestPath, "[]", "utf8");
    return [];
  }
};

const saveManifest = async (voices: BallVoice[]) => {
  await ensureStorage();
  await writeFile(manifestPath, JSON.stringify(voices, null, 2), "utf8");
};

const decodeName = (value: string | undefined) => {
  if (!value) return "Voz sin nombre";
  try { return decodeURIComponent(value).trim().slice(0, 60) || "Voz sin nombre"; }
  catch { return value.trim().slice(0, 60) || "Voz sin nombre"; }
};

const countBalls = async (voiceId: string): Promise<number> => {
  try {
    const files = await readdir(path.join(voicesDirectory, voiceId));
    return files.filter((file) => /^NUM\d+\./i.test(file)).length;
  } catch {
    return 0;
  }
};

export const listBallVoices = async (_request: Request, response: Response) => {
  try {
    response.json({ data: await readManifest() });
  } catch (error) {
    console.error("Error reading ball voices:", error);
    response.status(500).json({ message: "No fue posible cargar las voces." });
  }
};

export const createBallVoice = async (request: Request, response: Response) => {
  const name = decodeName((request.body?.name as string | undefined));
  const id = randomUUID();
  const voice: BallVoice = { id, name, extension: null, ballCount: 0, createdAt: new Date().toISOString() };
  try {
    await mkdir(path.join(voicesDirectory, id), { recursive: true });
    const voices = await readManifest();
    voices.unshift(voice);
    await saveManifest(voices);
    response.status(201).json({ data: voice, message: "Voz creada." });
  } catch (error) {
    console.error("Error creating ball voice:", error);
    response.status(500).json({ message: "No fue posible crear la voz." });
  }
};

export const uploadBallVoiceBall = async (request: Request, response: Response) => {
  const { id } = request.params;
  const ballNumber = Number(request.params.number);
  const extension = String(request.query.ext ?? "").toLowerCase();

  if (!Number.isInteger(ballNumber) || ballNumber < 1 || ballNumber > TOTAL_BALLS) {
    response.status(400).json({ message: "Número de balota inválido." });
    return;
  }
  if (!allowedExtensions.includes(extension)) {
    response.status(415).json({ message: "Formato no compatible. Usa MP3, WAV, OGG, M4A o AAC." });
    return;
  }
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
    response.status(400).json({ message: "Archivo de audio vacío." });
    return;
  }

  try {
    const voices = await readManifest();
    const voice = voices.find((item) => item.id === id);
    if (!voice) { response.status(404).json({ message: "La voz no existe." }); return; }
    if (voice.extension && voice.extension !== extension) {
      response.status(409).json({ message: `Todos los audios de la voz deben tener el mismo formato (${voice.extension}).` });
      return;
    }

    await writeFile(path.join(voicesDirectory, id, `NUM${ballNumber}${extension}`), request.body);
    voice.extension = extension;
    voice.ballCount = await countBalls(id);
    await saveManifest(voices);
    response.status(200).json({ data: voice });
  } catch (error) {
    console.error("Error uploading ball voice audio:", error);
    response.status(500).json({ message: "No fue posible guardar el audio." });
  }
};

export const deleteBallVoice = async (request: Request, response: Response) => {
  try {
    const voices = await readManifest();
    const voice = voices.find((item) => item.id === request.params.id);
    if (!voice) { response.status(404).json({ message: "La voz no existe." }); return; }
    await rm(path.join(voicesDirectory, voice.id), { recursive: true, force: true });
    await saveManifest(voices.filter((item) => item.id !== voice.id));
    response.json({ message: "Voz eliminada." });
  } catch (error) {
    console.error("Error deleting ball voice:", error);
    response.status(500).json({ message: "No fue posible eliminar la voz." });
  }
};
