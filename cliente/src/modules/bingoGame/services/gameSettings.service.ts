import configureApi from "../../../shared/utils/axios";

const SETTINGS_URL = "http://localhost:3000/api/game/settings";

export const ALL_MUNICIPALITY_VALUES = [
  "COLON", "SAN_FRANCISCO", "SANTIAGO", "SIBUNDOY", "MOCOA", "PUERTO_GUZMAN", "VILLAGARZON",
  "ORITO", "PUERTO_ASIS", "PUERTO_CAICEDO", "PUERTO_LEGUIZAMO", "SAN_MIGUEL", "VALLE_DEL_GUAMUEZ",
];
export const WITHOUT_DISABILITY_VALUE = "SIN_DISCAPACIDAD";
export const ALL_DISABILITY_VALUES = [
  WITHOUT_DISABILITY_VALUE, "FISICA", "VISUAL", "AUDITIVA", "INTELECTUAL", "PSICOSOCIAL",
  "SORDOCEGUERA", "MULTIPLE", "SINDROME_DOWN",
];
export const ALL_CAREGIVER_VALUES = ["SI", "NO"];

export interface GameSettings {
  /** Si los cartones ganadores superan este número, la partida debe repetirse. */
  winnerRepeatThreshold: number;
  /** Segundos que la figura seleccionada se muestra en grande sobre la transmisión. */
  figureShowcaseSeconds: number;
  /** Solo compiten los cartones que un registrador ya vinculó a una persona. */
  registeredCardsOnly: boolean;
  /** Repite cada balota automáticamente después del primer canto. */
  automaticBallRepeat: boolean;
  /** Municipios habilitados para competir en el bingo. */
  activeMunicipalities: string[];
  /** Condiciones de discapacidad habilitadas para competir. */
  activeDisabilities: string[];
  /** Estados de cuidador habilitados para competir. */
  activeCaregiverStatuses: string[];
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  winnerRepeatThreshold: 7,
  figureShowcaseSeconds: 6,
  registeredCardsOnly: false,
  automaticBallRepeat: false,
  activeMunicipalities: [...ALL_MUNICIPALITY_VALUES],
  activeDisabilities: [...ALL_DISABILITY_VALUES],
  activeCaregiverStatuses: [...ALL_CAREGIVER_VALUES],
};

/** Normaliza la respuesta para que la interfaz nunca quede con valores vacíos. */
const normalize = (data: Partial<GameSettings> | undefined): GameSettings => ({
  winnerRepeatThreshold: Number(data?.winnerRepeatThreshold) || DEFAULT_GAME_SETTINGS.winnerRepeatThreshold,
  figureShowcaseSeconds: Number(data?.figureShowcaseSeconds) || DEFAULT_GAME_SETTINGS.figureShowcaseSeconds,
  registeredCardsOnly: Boolean(data?.registeredCardsOnly),
  automaticBallRepeat: Boolean(data?.automaticBallRepeat),
  activeMunicipalities: Array.isArray(data?.activeMunicipalities)
    ? data.activeMunicipalities.filter((value): value is string => typeof value === "string" && ALL_MUNICIPALITY_VALUES.includes(value))
    : [...ALL_MUNICIPALITY_VALUES],
  activeDisabilities: Array.isArray(data?.activeDisabilities)
    ? data.activeDisabilities.filter((value): value is string => typeof value === "string" && ALL_DISABILITY_VALUES.includes(value))
    : [...ALL_DISABILITY_VALUES],
  activeCaregiverStatuses: Array.isArray(data?.activeCaregiverStatuses)
    ? data.activeCaregiverStatuses.filter((value): value is string => typeof value === "string" && ALL_CAREGIVER_VALUES.includes(value))
    : [...ALL_CAREGIVER_VALUES],
});

export const getGameSettings = async (): Promise<GameSettings> => {
  const response = await configureApi().get(SETTINGS_URL);
  return normalize(response.data?.data);
};

export const saveGameSettings = async (payload: Partial<GameSettings>): Promise<GameSettings> => {
  const response = await configureApi().put(SETTINGS_URL, payload);
  return normalize(response.data?.data);
};
