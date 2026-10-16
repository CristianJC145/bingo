import db from '../database';
import { RowDataPacket } from 'mysql2';

interface Figure {
  id: number;
  name: string;
  pattern: boolean[][];
}

interface WinningCard {
  id: number;
  pattern: unknown;
  patternFigure: unknown;
}

export interface GameSessionState {
  cartonRange: { start?: number; end?: number; specific?: number[] };
  cardsRangue: boolean;
  selectedFigures: Figure[];
  isGameStarted: boolean;
  gameRandom: boolean;
  balls: number[];
  drawnNumbers: number[];
  previousWinners: WinningCard[];
  startedAt: number | null;
}

export const emptyGameSession = (): GameSessionState => ({
  cartonRange: { start: 0, end: 0, specific: [] },
  cardsRangue: false,
  selectedFigures: [],
  isGameStarted: false,
  gameRandom: true,
  balls: [],
  drawnNumbers: [],
  previousWinners: [],
  startedAt: null,
});

export const ensureGameSessionTable = async (): Promise<void> => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS game_session (
      id TINYINT NOT NULL DEFAULT 1,
      state LONGTEXT CHARACTER SET utf8mb4,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

export const loadGameSession = async (): Promise<GameSessionState> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT state FROM game_session WHERE id = 1');
  if (rows.length === 0 || !rows[0].state) return emptyGameSession();
  try {
    return { ...emptyGameSession(), ...JSON.parse(rows[0].state) };
  } catch {
    return emptyGameSession();
  }
};

export const saveGameSession = async (state: GameSessionState): Promise<void> => {
  const serialized = JSON.stringify(state);
  await db.query(
    'INSERT INTO game_session (id, state) VALUES (1, ?) ON DUPLICATE KEY UPDATE state = ?',
    [serialized, serialized]
  );
};

export const clearGameSession = async (): Promise<void> => {
  await saveGameSession(emptyGameSession());
};
