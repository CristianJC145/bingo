import db from '../database';
import { RowDataPacket } from 'mysql2';
import { CAREGIVER_CATEGORIES, DISABILITY_CATEGORIES, MUNICIPIOS, isValidCaregiverCategory, isValidDisabilityCategory, isValidMunicipio } from '../constants/catalogs';

interface MetadataRow extends RowDataPacket { key: string; value: number; }
interface MunicipalitySettingRow extends RowDataPacket { municipio: string; enabled: number; }
interface DisabilitySettingRow extends RowDataPacket { disability_type: string; enabled: number; }
interface CaregiverSettingRow extends RowDataPacket { caregiver_status: string; enabled: number; }

export interface GameSettings {
  /** Si los cartones ganadores superan este número, la partida debe repetirse. */
  winnerRepeatThreshold: number;
  /** Segundos que la figura seleccionada se muestra en grande sobre la transmisión. */
  figureShowcaseSeconds: number;
  /** Solo compiten los cartones con registro en `card_registrations`. */
  registeredCardsOnly: boolean;
  /** Repite cada balota automáticamente después de su canto principal. */
  automaticBallRepeat: boolean;
  /** Municipios cuyos cartones registrados pueden competir. */
  activeMunicipalities: string[];
  /** Condiciones de discapacidad habilitadas, incluyendo personas sin discapacidad. */
  activeDisabilities: string[];
  /** Estados de cuidador habilitados para participar. */
  activeCaregiverStatuses: string[];
}

/** Los ajustes viven como filas de `metadata`; los booleanos se guardan como 0/1. */
type SettingDefinition =
  | { key: 'winnerRepeatThreshold' | 'figureShowcaseSeconds'; type: 'number'; min: number; max: number }
  | { key: 'registeredCardsOnly' | 'automaticBallRepeat'; type: 'boolean' };

const SETTING_KEYS: SettingDefinition[] = [
  { key: 'winnerRepeatThreshold', type: 'number', min: 1, max: 500 },
  { key: 'figureShowcaseSeconds', type: 'number', min: 2, max: 60 },
  { key: 'registeredCardsOnly', type: 'boolean' },
  { key: 'automaticBallRepeat', type: 'boolean' },
];

const defaults = (): GameSettings => ({
  winnerRepeatThreshold: 7,
  figureShowcaseSeconds: 6,
  registeredCardsOnly: false,
  automaticBallRepeat: false,
  activeMunicipalities: MUNICIPIOS.map((item) => item.value),
  activeDisabilities: DISABILITY_CATEGORIES.map((item) => item.value),
  activeCaregiverStatuses: CAREGIVER_CATEGORIES.map((item) => item.value),
});

let settings: GameSettings = defaults();

export const getGameSettings = (): GameSettings => settings;

const ensureMunicipalitySettings = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS bingo_game_municipalities (
      municipio VARCHAR(40) NOT NULL PRIMARY KEY,
      enabled TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const values = MUNICIPIOS.map(() => '(?, 1)').join(',');
  await db.query(
    `INSERT IGNORE INTO bingo_game_municipalities (municipio, enabled) VALUES ${values}`,
    MUNICIPIOS.map((item) => item.value)
  );
};

const ensureDisabilitySettings = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS bingo_game_disabilities (
      disability_type VARCHAR(30) NOT NULL PRIMARY KEY,
      enabled TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const values = DISABILITY_CATEGORIES.map(() => '(?, 1)').join(',');
  await db.query(
    `INSERT IGNORE INTO bingo_game_disabilities (disability_type, enabled) VALUES ${values}`,
    DISABILITY_CATEGORIES.map((item) => item.value)
  );
};

const ensureCaregiverSettings = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS bingo_game_caregivers (
      caregiver_status VARCHAR(5) NOT NULL PRIMARY KEY,
      enabled TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const values = CAREGIVER_CATEGORIES.map(() => '(?, 1)').join(',');
  await db.query(
    `INSERT IGNORE INTO bingo_game_caregivers (caregiver_status, enabled) VALUES ${values}`,
    CAREGIVER_CATEGORIES.map((item) => item.value)
  );
};

export const loadGameSettings = async (): Promise<GameSettings> => {
  try {
    await ensureMunicipalitySettings();
    await ensureDisabilitySettings();
    await ensureCaregiverSettings();
    const keys = SETTING_KEYS.map((item) => item.key);
    const placeholders = keys.map(() => '?').join(',');
    const [rows] = await db.query<MetadataRow[]>(
      `SELECT \`key\`, \`value\` FROM metadata WHERE \`key\` IN (${placeholders})`,
      keys
    );
    const stored = new Map(rows.map((row) => [row.key, Number(row.value)]));

    const next = defaults();
    SETTING_KEYS.forEach((item) => {
      const value = stored.get(item.key);
      if (value === undefined || !Number.isFinite(value)) return;
      if (item.type === 'boolean') next[item.key] = value === 1;
      else if (Number.isInteger(value) && value >= item.min && value <= item.max) next[item.key] = value;
    });
    const [municipalityRows] = await db.query<MunicipalitySettingRow[]>(
      'SELECT municipio, enabled FROM bingo_game_municipalities'
    );
    const enabled = new Set(municipalityRows.filter((row) => Number(row.enabled) === 1).map((row) => row.municipio));
    next.activeMunicipalities = MUNICIPIOS.map((item) => item.value).filter((value) => enabled.has(value));
    const [disabilityRows] = await db.query<DisabilitySettingRow[]>(
      'SELECT disability_type, enabled FROM bingo_game_disabilities'
    );
    const enabledDisabilities = new Set(disabilityRows.filter((row) => Number(row.enabled) === 1).map((row) => row.disability_type));
    next.activeDisabilities = DISABILITY_CATEGORIES.map((item) => item.value).filter((value) => enabledDisabilities.has(value));
    const [caregiverRows] = await db.query<CaregiverSettingRow[]>(
      'SELECT caregiver_status, enabled FROM bingo_game_caregivers'
    );
    const enabledCaregivers = new Set(caregiverRows.filter((row) => Number(row.enabled) === 1).map((row) => row.caregiver_status));
    next.activeCaregiverStatuses = CAREGIVER_CATEGORIES.map((item) => item.value).filter((value) => enabledCaregivers.has(value));
    settings = next;
  } catch (error) {
    console.error('Error cargando la configuración del juego:', error);
  }
  return settings;
};

export interface SettingsValidation { valid: boolean; message?: string; }

export const validateSettings = (payload: Partial<GameSettings>): SettingsValidation => {
  for (const item of SETTING_KEYS) {
    const value = payload[item.key];
    if (value === undefined) continue;
    if (item.type === 'boolean') {
      if (typeof value !== 'boolean') return { valid: false, message: `El valor de "${item.key}" debe ser verdadero o falso.` };
      continue;
    }
    if (!Number.isInteger(value) || (value as number) < item.min || (value as number) > item.max) {
      return { valid: false, message: `El valor de "${item.key}" debe estar entre ${item.min} y ${item.max}.` };
    }
  }
  if (payload.activeMunicipalities !== undefined) {
    if (!Array.isArray(payload.activeMunicipalities) || payload.activeMunicipalities.length === 0) {
      return { valid: false, message: 'Selecciona al menos un municipio para la partida.' };
    }
    if (payload.activeMunicipalities.some((value) => typeof value !== 'string' || !isValidMunicipio(value))) {
      return { valid: false, message: 'La selección contiene un municipio no válido.' };
    }
  }
  if (payload.activeDisabilities !== undefined) {
    if (!Array.isArray(payload.activeDisabilities) || payload.activeDisabilities.length === 0) {
      return { valid: false, message: 'Selecciona al menos una condición de discapacidad para la partida.' };
    }
    if (payload.activeDisabilities.some((value) => typeof value !== 'string' || !isValidDisabilityCategory(value))) {
      return { valid: false, message: 'La selección contiene una discapacidad no válida.' };
    }
  }
  if (payload.activeCaregiverStatuses !== undefined) {
    if (!Array.isArray(payload.activeCaregiverStatuses) || payload.activeCaregiverStatuses.length === 0) {
      return { valid: false, message: 'Selecciona al menos una condición de cuidador para la partida.' };
    }
    if (payload.activeCaregiverStatuses.some((value) => typeof value !== 'string' || !isValidCaregiverCategory(value))) {
      return { valid: false, message: 'La selección contiene una condición de cuidador no válida.' };
    }
  }
  return { valid: true };
};

export const saveGameSettings = async (payload: Partial<GameSettings>): Promise<GameSettings> => {
  await ensureMunicipalitySettings();
  await ensureDisabilitySettings();
  await ensureCaregiverSettings();
  const next = { ...settings };
  for (const item of SETTING_KEYS) {
    const value = payload[item.key];
    if (value === undefined) continue;
    const stored = item.type === 'boolean' ? (value ? 1 : 0) : value;
    await db.query(
      'INSERT INTO metadata (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [item.key, stored, stored]
    );
    (next[item.key] as GameSettings[typeof item.key]) = value;
  }
  if (payload.activeMunicipalities !== undefined) {
    const active = new Set(payload.activeMunicipalities);
    const values = MUNICIPIOS.map(() => '(?, ?)').join(',');
    const parameters = MUNICIPIOS.flatMap((item) => [item.value, active.has(item.value) ? 1 : 0]);
    await db.query(
      `INSERT INTO bingo_game_municipalities (municipio, enabled) VALUES ${values}
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
      parameters
    );
    next.activeMunicipalities = MUNICIPIOS.map((item) => item.value).filter((value) => active.has(value));
  }
  if (payload.activeDisabilities !== undefined) {
    const active = new Set(payload.activeDisabilities);
    const values = DISABILITY_CATEGORIES.map(() => '(?, ?)').join(',');
    const parameters = DISABILITY_CATEGORIES.flatMap((item) => [item.value, active.has(item.value) ? 1 : 0]);
    await db.query(
      `INSERT INTO bingo_game_disabilities (disability_type, enabled) VALUES ${values}
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
      parameters
    );
    next.activeDisabilities = DISABILITY_CATEGORIES.map((item) => item.value).filter((value) => active.has(value));
  }
  if (payload.activeCaregiverStatuses !== undefined) {
    const active = new Set(payload.activeCaregiverStatuses);
    const values = CAREGIVER_CATEGORIES.map(() => '(?, ?)').join(',');
    const parameters = CAREGIVER_CATEGORIES.flatMap((item) => [item.value, active.has(item.value) ? 1 : 0]);
    await db.query(
      `INSERT INTO bingo_game_caregivers (caregiver_status, enabled) VALUES ${values}
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
      parameters
    );
    next.activeCaregiverStatuses = CAREGIVER_CATEGORIES.map((item) => item.value).filter((value) => active.has(value));
  }
  settings = next;
  return settings;
};
