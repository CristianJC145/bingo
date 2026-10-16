import { createHash } from 'crypto';
import { RowDataPacket } from 'mysql2';
import db from '../database';
import { MUNICIPIOS, TIPOS_DISCAPACIDAD } from '../constants/catalogs';

export type WinnerMethod = 'BINGO' | 'RULETA' | 'MAQUINA_SUERTE';

interface RegistrationSnapshot extends RowDataPacket {
  nombre_completo: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  genero: string;
  fecha_nacimiento: Date | string;
  desplazado: string;
  contacto: string;
  municipio: string;
  sector: string;
  nombre_residencia: string;
  discapacidad: string;
  tipo_discapacidad: string | null;
  cuidador: string;
  adulto_mayor: string;
  registered_by_name: string | null;
}

export interface WinnerHistoryInput {
  id: number;
  figureId?: number | null;
  figureName?: string | null;
  patternFigure?: unknown;
  winningBalls?: number[];
  gameStartedAt?: number | null;
}

export interface WinnerHistoryQuery {
  method?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  perPage: number;
}

export const ensureWinnerHistoryTable = async (): Promise<void> => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS winner_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      event_key CHAR(64) NOT NULL,
      card_number INT NOT NULL,
      win_method ENUM('BINGO', 'RULETA') NOT NULL,
      roulette_candidates INT NOT NULL DEFAULT 1,
      figure_id INT NULL,
      figure_name VARCHAR(160) NULL,
      figure_pattern JSON NULL,
      winning_balls JSON NULL,
      game_started_at BIGINT NULL,
      nombre_completo VARCHAR(160) NULL,
      tipo_identificacion VARCHAR(10) NULL,
      numero_identificacion VARCHAR(30) NULL,
      genero VARCHAR(10) NULL,
      fecha_nacimiento DATE NULL,
      desplazado VARCHAR(5) NULL,
      contacto VARCHAR(30) NULL,
      municipio VARCHAR(40) NULL,
      sector VARCHAR(15) NULL,
      nombre_residencia VARCHAR(160) NULL,
      discapacidad VARCHAR(5) NULL,
      tipo_discapacidad VARCHAR(30) NULL,
      cuidador VARCHAR(5) NULL,
      adulto_mayor VARCHAR(5) NULL,
      registered_by_name VARCHAR(160) NULL,
      won_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_winner_history_event (event_key),
      INDEX idx_winner_history_card (card_number),
      INDEX idx_winner_history_method (win_method),
      INDEX idx_winner_history_date (won_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Migración compatible con instalaciones que ya tenían el historial inicial.
  await db.query(`ALTER TABLE winner_history MODIFY win_method ENUM('BINGO', 'RULETA', 'MAQUINA_SUERTE') NOT NULL`);
  const [adultColumns] = await db.query<RowDataPacket[]>(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'winner_history' AND COLUMN_NAME = 'adulto_mayor'
  `);
  if (adultColumns.length === 0) await db.query("ALTER TABLE winner_history ADD COLUMN adulto_mayor VARCHAR(5) NULL AFTER cuidador");
};

const normalizeJson = (value: unknown) => value === undefined ? null : JSON.stringify(value);

/** Guarda una fotografía de los datos para que el historial no cambie si editan al participante. */
export const recordWinnerHistory = async (
  winner: WinnerHistoryInput,
  method: WinnerMethod,
  rouletteCandidates = 1
): Promise<void> => {
  const [rows] = await db.query<RegistrationSnapshot[]>(
    `SELECT r.*, u.full_name AS registered_by_name
     FROM card_registrations r
     LEFT JOIN users u ON u.id = r.registered_by
     WHERE r.card_number = ? LIMIT 1`,
    [winner.id]
  );
  const registration = rows[0] ?? null;
  const eventKey = createHash('sha256').update(JSON.stringify({
    card: winner.id,
    method,
    figure: winner.figureId ?? winner.figureName ?? null,
    balls: winner.winningBalls ?? [],
    gameStartedAt: winner.gameStartedAt ?? null,
  })).digest('hex');

  await db.query(
    `INSERT IGNORE INTO winner_history
      (event_key, card_number, win_method, roulette_candidates, figure_id, figure_name,
       figure_pattern, winning_balls, game_started_at, nombre_completo, tipo_identificacion,
       numero_identificacion, genero, fecha_nacimiento, desplazado, contacto, municipio,
       sector, nombre_residencia, discapacidad, tipo_discapacidad, cuidador, adulto_mayor, registered_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      eventKey,
      winner.id,
      method,
      rouletteCandidates,
      winner.figureId ?? null,
      winner.figureName ?? null,
      normalizeJson(winner.patternFigure),
      normalizeJson(winner.winningBalls ?? []),
      winner.gameStartedAt ?? null,
      registration?.nombre_completo ?? null,
      registration?.tipo_identificacion ?? null,
      registration?.numero_identificacion ?? null,
      registration?.genero ?? null,
      registration?.fecha_nacimiento ?? null,
      registration?.desplazado ?? null,
      registration?.contacto ?? null,
      registration?.municipio ?? null,
      registration?.sector ?? null,
      registration?.nombre_residencia ?? null,
      registration?.discapacidad ?? null,
      registration?.tipo_discapacidad ?? null,
      registration?.cuidador ?? null,
      registration?.adulto_mayor ?? null,
      registration?.registered_by_name ?? null,
    ]
  );
};

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

const labelOf = (options: { value: string; label: string }[], value: string | null) =>
  options.find((item) => item.value === value)?.label ?? value;

export const listWinnerHistory = async ({ method, search, dateFrom, dateTo, page, perPage }: WinnerHistoryQuery) => {
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (method === 'BINGO' || method === 'RULETA' || method === 'MAQUINA_SUERTE') { where.push('win_method = ?'); params.push(method); }
  if (dateFrom) { where.push('won_at >= ?'); params.push(`${dateFrom} 00:00:00`); }
  if (dateTo) { where.push('won_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${dateTo} 00:00:00`); }
  if (search) {
    where.push('(CAST(card_number AS CHAR) LIKE ? OR nombre_completo LIKE ? OR numero_identificacion LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * perPage;
  const [[countRow]] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM winner_history ${clause}`, params);
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT * FROM winner_history ${clause} ORDER BY won_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
  const periodWhere: string[] = [];
  const periodParams: string[] = [];
  if (dateFrom) { periodWhere.push('won_at >= ?'); periodParams.push(`${dateFrom} 00:00:00`); }
  if (dateTo) { periodWhere.push('won_at < DATE_ADD(?, INTERVAL 1 DAY)'); periodParams.push(`${dateTo} 00:00:00`); }
  const periodClause = periodWhere.length ? `WHERE ${periodWhere.join(' AND ')}` : '';
  const [[summary]] = await db.query<RowDataPacket[]>(`
    SELECT COUNT(*) total,
      SUM(win_method = 'BINGO') bingo,
      SUM(win_method = 'RULETA') roulette,
      SUM(win_method = 'MAQUINA_SUERTE') slot_machine,
      SUM(nombre_completo IS NOT NULL) with_registration
    FROM winner_history ${periodClause}
  `, periodParams);
  const [dailyRows] = await db.query<RowDataPacket[]>(`
    SELECT DATE_FORMAT(won_at, '%Y-%m-%d') day,
      COUNT(*) total,
      SUM(win_method IN ('BINGO', 'RULETA')) bingo_awards,
      SUM(win_method = 'BINGO') bingo,
      SUM(win_method = 'RULETA') roulette,
      SUM(win_method = 'MAQUINA_SUERTE') slot_machine
    FROM winner_history ${periodClause}
    GROUP BY DATE_FORMAT(won_at, '%Y-%m-%d') ORDER BY day DESC
  `, periodParams);

  return {
    data: rows.map((row) => ({
      id: Number(row.id),
      cardNumber: row.card_number,
      method: row.win_method,
      rouletteCandidates: row.roulette_candidates,
      figureId: row.figure_id,
      figureName: row.figure_name,
      figurePattern: parseJson<boolean[][]>(row.figure_pattern, []),
      winningBalls: parseJson<number[]>(row.winning_balls, []),
      gameStartedAt: row.game_started_at === null ? null : Number(row.game_started_at),
      nombreCompleto: row.nombre_completo,
      tipoIdentificacion: row.tipo_identificacion,
      numeroIdentificacion: row.numero_identificacion,
      genero: row.genero,
      fechaNacimiento: row.fecha_nacimiento,
      desplazado: row.desplazado,
      contacto: row.contacto,
      municipio: row.municipio,
      municipioLabel: labelOf(MUNICIPIOS, row.municipio),
      sector: row.sector,
      nombreResidencia: row.nombre_residencia,
      discapacidad: row.discapacidad,
      tipoDiscapacidad: row.tipo_discapacidad,
      tipoDiscapacidadLabel: labelOf(TIPOS_DISCAPACIDAD, row.tipo_discapacidad),
      cuidador: row.cuidador,
      adultoMayor: row.adulto_mayor,
      registeredByName: row.registered_by_name,
      wonAt: row.won_at,
    })),
    total: Number(countRow.total),
    page,
    perPage,
    summary: {
      total: Number(summary.total ?? 0),
      bingoAwards: Number(summary.bingo ?? 0) + Number(summary.roulette ?? 0),
      bingo: Number(summary.bingo ?? 0),
      roulette: Number(summary.roulette ?? 0),
      slotMachine: Number(summary.slot_machine ?? 0),
      withRegistration: Number(summary.with_registration ?? 0),
    },
    dailySummary: dailyRows.map((row) => ({
      day: row.day,
      total: Number(row.total),
      bingoAwards: Number(row.bingo_awards),
      bingo: Number(row.bingo),
      roulette: Number(row.roulette),
      slotMachine: Number(row.slot_machine),
    })),
  };
};
