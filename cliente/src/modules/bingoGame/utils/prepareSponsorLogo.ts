/**
 * Normaliza los logos de patrocinadores, que llegan sin ningún estándar: distintos
 * tamaños, proporciones, márgenes transparentes de sobra y colores que pueden
 * desaparecer sobre un panel oscuro.
 *
 * Nada de esto recorta el logo: solo se elimina el vacío que lo rodea y se decide
 * cómo presentarlo.
 */

export interface PreparedLogo {
  /** Imagen lista para mostrar: recortada de sus márgenes vacíos si los tenía. */
  src: string;
  /** Proporción ancho/alto del contenido real, ya sin márgenes. */
  aspect: number;
  /** Ancho y alto útiles en píxeles, para no ampliar más allá de su resolución. */
  width: number;
  height: number;
  /** El logo es oscuro sobre fondo transparente: necesita una placa clara detrás. */
  needsLightPlate: boolean;
  /** La imagen trae su propio fondo opaco, así que se presenta tal cual. */
  hasOwnBackground: boolean;
}

/** Píxeles con menos alfa que esto se consideran vacíos al buscar el recorte. */
const ALPHA_THRESHOLD = 12;
/** Por debajo de esta luminancia media el logo no se lee sobre el panel oscuro. */
const DARK_LUMINANCE = 0.42;
/** No merece la pena regenerar la imagen por un margen menor que este. */
const MIN_TRIM_RATIO = 0.02;
/** Lado máximo al analizar: con esto basta para medir y evita canvas enormes. */
const ANALYSIS_MAX_SIDE = 900;

const cache = new Map<string, PreparedLogo>();

const loadImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image();
    // Necesario para poder leer los píxeles: el servidor ya responde con CORS abierto.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });

/** Descripción mínima cuando no se puede analizar (fallo de red o de CORS). */
const fallback = (url: string, image: HTMLImageElement | null): PreparedLogo => ({
  src: url,
  aspect: image && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1,
  width: image?.naturalWidth ?? 0,
  height: image?.naturalHeight ?? 0,
  needsLightPlate: false,
  hasOwnBackground: true,
});

export const prepareSponsorLogo = async (url: string): Promise<PreparedLogo> => {
  const cached = cache.get(url);
  if (cached) return cached;

  const image = await loadImage(url);
  if (!image || !image.naturalWidth || !image.naturalHeight) return fallback(url, image);

  // El análisis se hace sobre una copia reducida; el recorte final usa la original.
  const scale = Math.min(1, ANALYSIS_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const sampleW = Math.max(1, Math.round(image.naturalWidth * scale));
  const sampleH = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = sampleW;
  canvas.height = sampleH;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return fallback(url, image);
  context.drawImage(image, 0, 0, sampleW, sampleH);

  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, sampleW, sampleH).data;
  } catch {
    // Canvas contaminado: se muestra la imagen tal cual, sin analizar.
    return fallback(url, image);
  }

  let minX = sampleW;
  let minY = sampleH;
  let maxX = -1;
  let maxY = -1;
  let transparentPixels = 0;
  let luminanceSum = 0;
  let visiblePixels = 0;

  for (let y = 0; y < sampleH; y++) {
    for (let x = 0; x < sampleW; x++) {
      const offset = (y * sampleW + x) * 4;
      const alpha = pixels[offset + 3];
      if (alpha < ALPHA_THRESHOLD) { transparentPixels++; continue; }

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      // Luminancia percibida, ponderada por el alfa para no contar bordes suaves.
      const weight = alpha / 255;
      luminanceSum += ((pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722) / 255) * weight;
      visiblePixels += weight;
    }
  }

  if (maxX < 0) return fallback(url, image);

  const totalPixels = sampleW * sampleH;
  const hasOwnBackground = transparentPixels / totalPixels < 0.02;
  const averageLuminance = visiblePixels > 0 ? luminanceSum / visiblePixels : 1;

  // Coordenadas del contenido llevadas de vuelta a la resolución original.
  const inverse = 1 / scale;
  const cropX = Math.max(0, Math.floor(minX * inverse));
  const cropY = Math.max(0, Math.floor(minY * inverse));
  const cropW = Math.min(image.naturalWidth - cropX, Math.ceil((maxX - minX + 1) * inverse));
  const cropH = Math.min(image.naturalHeight - cropY, Math.ceil((maxY - minY + 1) * inverse));

  const trimmedRatio = 1 - (cropW * cropH) / (image.naturalWidth * image.naturalHeight);
  const shouldTrim = !hasOwnBackground && trimmedRatio > MIN_TRIM_RATIO && cropW > 0 && cropH > 0;

  let src = url;
  if (shouldTrim) {
    const trimCanvas = document.createElement("canvas");
    trimCanvas.width = cropW;
    trimCanvas.height = cropH;
    const trimContext = trimCanvas.getContext("2d");
    if (trimContext) {
      trimContext.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      // PNG conserva la transparencia, imprescindible para la placa clara.
      src = trimCanvas.toDataURL("image/png");
    }
  }

  const width = shouldTrim ? cropW : image.naturalWidth;
  const height = shouldTrim ? cropH : image.naturalHeight;

  const prepared: PreparedLogo = {
    src,
    aspect: width / height,
    width,
    height,
    // Solo tiene sentido añadir placa si el logo es oscuro y no trae fondo propio.
    needsLightPlate: !hasOwnBackground && averageLuminance < DARK_LUMINANCE,
    hasOwnBackground,
  };

  cache.set(url, prepared);
  return prepared;
};
