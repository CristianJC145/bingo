import { Request, Response } from "express";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

export interface PrintTemplateField {
  id: string;
  label: string;
  xPct: number;
  yPct: number;
  fontSize: number;
  align: "left" | "center" | "right";
  color: "dark" | "light";
}

export interface PrintTemplateNumberGrid {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  gapPct: number;
  fontSize: number;
}

export interface PrintTemplateConfig {
  fields: PrintTemplateField[];
  numberGrid: PrintTemplateNumberGrid;
}

interface PrintTemplateManifest {
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  url: string;
  updatedAt: string;
  config: PrintTemplateConfig;
}

const dataDirectory = path.resolve(process.cwd(), "data");
const mediaDirectory = path.resolve(process.cwd(), "storage", "print-templates");
const manifestPath = path.join(dataDirectory, "print-template.json");
const extensionByMime: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const defaultConfig = (): PrintTemplateConfig => ({
  fields: [],
  numberGrid: { xPct: 15, yPct: 38, widthPct: 70, heightPct: 46, gapPct: 1.4, fontSize: 14 },
});

const ensureStorage = () => Promise.all([mkdir(dataDirectory, { recursive: true }), mkdir(mediaDirectory, { recursive: true })]);

const readManifest = async (): Promise<PrintTemplateManifest | null> => {
  await ensureStorage();
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as PrintTemplateManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return null;
  }
};

const saveManifest = async (manifest: PrintTemplateManifest | null) => {
  await ensureStorage();
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
};

export const getPrintTemplate = async (_request: Request, response: Response) => {
  try {
    response.json({ data: await readManifest() });
  } catch (error) {
    console.error("Error reading print template:", error);
    response.status(500).json({ message: "No fue posible cargar la plantilla." });
  }
};

export const uploadPrintTemplate = async (request: Request, response: Response) => {
  const mimeType = request.headers["content-type"]?.split(";")[0].toLowerCase() ?? "";
  const extension = extensionByMime[mimeType];
  if (!extension) { response.status(415).json({ message: "Formato no compatible. Usa PNG, JPG o WEBP." }); return; }
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) { response.status(400).json({ message: "Selecciona una imagen válida." }); return; }

  const width = Number(request.query.width);
  const height = Number(request.query.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    response.status(400).json({ message: "No se pudieron leer las dimensiones de la imagen." });
    return;
  }

  const fileName = `template${extension}`;

  try {
    await ensureStorage();
    const previous = await readManifest();
    if (previous) await unlink(path.join(mediaDirectory, previous.fileName)).catch(() => undefined);

    await writeFile(path.join(mediaDirectory, fileName), request.body);
    const manifest: PrintTemplateManifest = {
      fileName,
      mimeType,
      width,
      height,
      url: `/print-templates/media/${fileName}?v=${Date.now()}`,
      updatedAt: new Date().toISOString(),
      config: defaultConfig(),
    };
    await saveManifest(manifest);
    response.status(201).json({ data: manifest, message: "Plantilla cargada correctamente." });
  } catch (error) {
    console.error("Error saving print template:", error);
    response.status(500).json({ message: "No fue posible guardar la plantilla." });
  }
};

export const savePrintTemplateConfig = async (request: Request, response: Response) => {
  try {
    const manifest = await readManifest();
    if (!manifest) { response.status(404).json({ message: "Primero sube una plantilla." }); return; }
    const config = request.body as PrintTemplateConfig;
    manifest.config = config;
    manifest.updatedAt = new Date().toISOString();
    await saveManifest(manifest);
    response.json({ data: manifest, message: "Configuración guardada." });
  } catch (error) {
    console.error("Error saving print template config:", error);
    response.status(500).json({ message: "No fue posible guardar la configuración." });
  }
};

export const deletePrintTemplate = async (_request: Request, response: Response) => {
  try {
    const manifest = await readManifest();
    if (manifest) {
      await unlink(path.join(mediaDirectory, manifest.fileName)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    }
    await saveManifest(null);
    response.json({ message: "Plantilla eliminada." });
  } catch (error) {
    console.error("Error deleting print template:", error);
    response.status(500).json({ message: "No fue posible eliminar la plantilla." });
  }
};
