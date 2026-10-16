import type { CelebrationChip } from "../components/WinnerCelebration";

/**
 * Datos de la persona registrada que acompañan a su cartón en una celebración.
 * Lo comparten el ganador del bingo y el de la máquina de la suerte para que las
 * etiquetas se vean exactamente iguales en ambos sorteos.
 */
export interface WinnerChipSource {
  municipioLabel?: string | null;
  barrio?: string | null;
  discapacidad?: boolean;
  cuidador?: boolean;
  adultoMayor?: boolean;
}

/**
 * Municipio y barrio se muestran por su valor; las condiciones son banderas
 * que solo aparecen cuando aplican y nunca se recortan por ser textos cortos y fijos.
 */
export const buildWinnerChips = (source: WinnerChipSource): CelebrationChip[] => {
  const chips: CelebrationChip[] = [];
  if (source.municipioLabel) chips.push({ value: source.municipioLabel, tone: "violet" });
  if (source.barrio) chips.push({ value: source.barrio, tone: "teal" });
  if (source.discapacidad) chips.push({ value: "Discapacidad", tone: "gold", fixed: true });
  if (source.cuidador) chips.push({ value: "Cuidador", tone: "rose", fixed: true });
  if (source.adultoMayor) chips.push({ value: "Adulto mayor", tone: "teal", fixed: true });
  return chips;
};
