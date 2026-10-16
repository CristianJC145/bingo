import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import db from '../database';
import { wss } from '..';
import { MUNICIPIOS } from '../constants/catalogs';
import { recordWinnerHistory } from '../services/winnerHistoryStore';

interface MunicipioCountRow extends RowDataPacket { municipio: string; total: number; }
interface WinnerRow extends RowDataPacket {
  card_number: number;
  municipio: string;
  nombre_completo: string;
  sector: string;
  nombre_residencia: string | null;
  discapacidad: string;
  cuidador: string;
  adulto_mayor: string;
  card: string | null;
}

export interface SlotResult {
  municipio: string;
  municipioLabel: string;
  cardNumber: number;
  nombreCompleto: string;
  sector: string;
  /* Los mismos datos que acompañan al ganador del bingo, para que la celebración
     muestre exactamente las mismas etiquetas en los dos sorteos. */
  barrio: string | null;
  discapacidad: boolean;
  cuidador: boolean;
  adultoMayor: boolean;
  /** Cuadrícula del cartón por columnas B-I-N-G-O; null si el cartón no está en el inventario. */
  card: number[][] | null;
  spunAt: number;
}

export interface SlotState {
  /** La máquina está visible en la transmisión. */
  active: boolean;
  /** La celebración del cartón ganador puede mostrarse (el admin puede ocultarla sin quitar la máquina). */
  winnerVisible: boolean;
  result: SlotResult | null;
}

let slotState: SlotState = { active: false, winnerVisible: false, result: null };

export const getSlotState = (): SlotState => slotState;

const labelForMunicipio = (value: string) => MUNICIPIOS.find((item) => item.value === value)?.label ?? value;

const broadcast = (payload: object) => {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(message);
  });
};

/** Estado real y global de la máquina: permite saber si sigue visible en la transmisión. */
export const getSlotStateHandler = (_request: Request, response: Response) => {
  response.json({ data: slotState });
};

/** Muestra la máquina en reposo antes de iniciar el sorteo. */
export const openSlotMachine = (_request: Request, response: Response) => {
  slotState = { active: true, winnerVisible: false, result: null };
  broadcast({ type: 'slot-open', ...slotState });
  response.json({ data: slotState, message: 'Máquina visible en la transmisión.' });
};

/** Municipios que tienen al menos un cartón registrado (los únicos elegibles). */
export const getSlotMunicipios = async (_request: Request, response: Response) => {
  try {
    const [rows] = await db.query<MunicipioCountRow[]>(
      'SELECT municipio, COUNT(*) AS total FROM card_registrations GROUP BY municipio ORDER BY municipio ASC'
    );
    response.json({
      data: rows.map((row) => ({ value: row.municipio, label: labelForMunicipio(row.municipio), total: Number(row.total) })),
    });
  } catch (error) {
    console.error('Error consultando municipios del sorteo:', error);
    response.status(500).json({ message: 'No fue posible consultar los municipios.' });
  }
};

export const spinSlotMachine = async (request: Request, response: Response) => {
  const forcedMunicipio = typeof request.body?.municipio === 'string' ? request.body.municipio : null;

  try {
    const [municipios] = await db.query<MunicipioCountRow[]>(
      'SELECT municipio, COUNT(*) AS total FROM card_registrations GROUP BY municipio'
    );
    const pool = forcedMunicipio ? municipios.filter((row) => row.municipio === forcedMunicipio) : municipios;

    if (pool.length === 0) {
      response.status(409).json({ message: 'No hay cartones registrados para sortear.' });
      return;
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const [winners] = await db.query<WinnerRow[]>(
      `SELECT r.card_number, r.municipio, r.nombre_completo, r.sector,
              r.nombre_residencia, r.discapacidad, r.cuidador, r.adulto_mayor, c.card
       FROM card_registrations r
       LEFT JOIN bingocards c ON c.id = r.card_number
       WHERE r.municipio = ? ORDER BY RAND() LIMIT 1`,
      [chosen.municipio]
    );
    if (winners.length === 0) {
      response.status(409).json({ message: 'No se encontró un cartón para ese municipio.' });
      return;
    }

    const winner = winners[0];
    let card: number[][] | null = null;
    if (winner.card) {
      try { card = JSON.parse(winner.card) as number[][]; }
      catch { card = null; }
    }

    const result: SlotResult = {
      municipio: winner.municipio,
      municipioLabel: labelForMunicipio(winner.municipio),
      cardNumber: winner.card_number,
      nombreCompleto: winner.nombre_completo,
      sector: winner.sector,
      barrio: winner.nombre_residencia ?? null,
      discapacidad: winner.discapacidad === 'SI',
      cuidador: winner.cuidador === 'SI',
      adultoMayor: winner.adulto_mayor === 'SI',
      card,
      spunAt: Date.now(),
    };

    slotState = { active: true, winnerVisible: true, result };
    broadcast({ type: 'slot-spin', ...slotState });
    try {
      await recordWinnerHistory({
        id: result.cardNumber,
        figureName: 'Máquina de la suerte',
        winningBalls: [],
        gameStartedAt: result.spunAt,
      }, 'MAQUINA_SUERTE');
    } catch (historyError) {
      // El sorteo ya está resuelto: una falla del historial no debe ocultarlo al público.
      console.error('No fue posible guardar el ganador de la máquina:', historyError);
    }
    response.json({ data: result });
  } catch (error) {
    console.error('Error girando la máquina:', error);
    response.status(500).json({ message: 'No fue posible girar la máquina.' });
  }
};

/** Oculta solo la celebración del ganador; la máquina sigue en pantalla. */
export const closeSlotWinner = (_request: Request, response: Response) => {
  slotState = { ...slotState, winnerVisible: false };
  broadcast({ type: 'slot-winner-close', ...slotState });
  response.json({ message: 'Ganador oculto en la transmisión.' });
};

export const closeSlotMachine = (_request: Request, response: Response) => {
  slotState = { active: false, winnerVisible: false, result: null };
  broadcast({ type: 'slot-close', ...slotState });
  response.json({ message: 'Máquina oculta en la transmisión.' });
};
