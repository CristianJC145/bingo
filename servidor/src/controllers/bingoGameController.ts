import db from "../database";
import { Request, Response } from 'express';
import { CheckWinnerRequest } from "../models/FigureCards";
import { RowDataPacket } from 'mysql2/promise';
import { wss } from "..";
import { getBroadcastState, resetBroadcastState, updateBroadcastState } from "../services/broadcastState";
import { GameSessionState, clearGameSession, loadGameSession, saveGameSession } from "../services/gameSessionStore";
import { GameSettings, getGameSettings, saveGameSettings, validateSettings } from "../services/gameSettingsStore";
import { CAREGIVER_CATEGORIES, DISABILITY_CATEGORIES, MUNICIPIOS, WITHOUT_DISABILITY_VALUE } from "../constants/catalogs";
import {
  SPIN_DURATION_MS,
  closeRoulette,
  getRouletteState,
  getRouletteWinnerCard,
  markResolved,
  openRoulette,
  spinRoulette,
} from "../services/winnerRouletteStore";
import { recordWinnerHistory } from "../services/winnerHistoryStore";

/** El municipio se guarda por código; la transmisión muestra la etiqueta legible. */
const labelForMunicipio = (value: string | null) => MUNICIPIOS.find((item) => item.value === value)?.label ?? value;

interface BingoCard extends RowDataPacket {
    id: number;
    card: any;
}
let previousWinningCards: any[] = [];
/** Ganadores del último bingo y si se están mostrando en la transmisión. */
let activeWinners: any[] = [];
let winnersVisible = false;

export const getActiveWinners = (): any[] => (winnersVisible ? activeWinners : []);

export const hydratePreviousWinners = (cards: any[]) => {
  previousWinningCards = cards ?? [];
};

/** Envía un mensaje a todos los navegadores conectados (incluido el de OBS). */
const broadcast = (payload: Record<string, unknown>) => {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(message);
  });
};

export const getGameSettingsHandler = (_req: Request, res: Response) => {
  res.json({ data: getGameSettings() });
};

export const saveGameSettingsHandler = async (req: Request, res: Response) => {
  const payload: Partial<GameSettings> = {};
  if (req.body?.winnerRepeatThreshold !== undefined) payload.winnerRepeatThreshold = Number(req.body.winnerRepeatThreshold);
  if (req.body?.figureShowcaseSeconds !== undefined) payload.figureShowcaseSeconds = Number(req.body.figureShowcaseSeconds);
  if (req.body?.registeredCardsOnly !== undefined) payload.registeredCardsOnly = req.body.registeredCardsOnly;
  if (req.body?.automaticBallRepeat !== undefined) payload.automaticBallRepeat = req.body.automaticBallRepeat;
  if (req.body?.activeMunicipalities !== undefined) {
    payload.activeMunicipalities = Array.isArray(req.body.activeMunicipalities)
      ? req.body.activeMunicipalities.map((value: unknown) => String(value))
      : [];
  }
  if (req.body?.activeDisabilities !== undefined) {
    payload.activeDisabilities = Array.isArray(req.body.activeDisabilities)
      ? req.body.activeDisabilities.map((value: unknown) => String(value))
      : [];
  }
  if (req.body?.activeCaregiverStatuses !== undefined) {
    payload.activeCaregiverStatuses = Array.isArray(req.body.activeCaregiverStatuses)
      ? req.body.activeCaregiverStatuses.map((value: unknown) => String(value))
      : [];
  }

  const validation = validateSettings(payload);
  if (!validation.valid) {
    res.status(400).json({ message: validation.message });
    return;
  }

  try {
    const updated = await saveGameSettings(payload);
    // La transmisión debe reflejar los nuevos valores sin recargar el navegador de OBS.
    broadcast({ type: 'settings-update', settings: updated });
    res.json({ data: updated, message: 'Configuración guardada.' });
  } catch (error) {
    console.error('Error guardando la configuración:', error);
    res.status(500).json({ message: 'No fue posible guardar la configuración.' });
  }
};

export const getWinnerOverlayState = (_req: Request, res: Response) => {
  res.json({ data: { visible: winnersVisible, count: activeWinners.length } });
};

/* ---- Ruleta de desempate ---- */

export const getWinnerRouletteState = (_req: Request, res: Response) => {
  res.json({ data: { ...getRouletteState(), spinDurationMs: SPIN_DURATION_MS } });
};

/** Lanza el sorteo: el puesto ganador se decide aquí y viaja a todos los clientes. */
export const spinWinnerRoulette = (_req: Request, res: Response) => {
  const current = getRouletteState();
  if (!current.active || current.candidates.length < 2) {
    res.status(409).json({ message: 'No hay un sorteo pendiente entre varios ganadores.' });
    return;
  }
  if (current.phase === 'spinning') {
    res.status(409).json({ message: 'La ruleta ya está girando.' });
    return;
  }

  const spun = spinRoulette();
  broadcast({ type: 'winner-roulette-spin', roulette: spun, spinDurationMs: SPIN_DURATION_MS });
  // Al terminar la animación el estado queda resuelto aunque nadie vuelva a consultarlo.
  setTimeout(markResolved, SPIN_DURATION_MS);
  res.json({ data: { ...spun, spinDurationMs: SPIN_DURATION_MS } });
};

/** El administrador avisa cuando terminó de cantarse la balota que abrió el empate. */
export const announceWinnerRoulette = (_req: Request, res: Response) => {
  const current = getRouletteState();
  if (!current.active) {
    res.status(409).json({ message: 'La ruleta ya no está activa.' });
    return;
  }
  broadcast({ type: 'winner-roulette-announce' });
  res.json({ message: 'Anuncio de empate enviado a la transmisión.' });
};

/**
 * Cierra la ruleta y deja como único ganador el cartón sorteado, de modo que la
 * celebración habitual continúe con un solo cartón.
 */
export const confirmWinnerRoulette = async (_req: Request, res: Response) => {
  const current = getRouletteState();
  if (!current.active || current.winnerIndex === null) {
    res.status(409).json({ message: 'Todavía no hay un ganador sorteado.' });
    return;
  }

  const winnerCard = getRouletteWinnerCard();
  if (!winnerCard) {
    res.status(409).json({ message: 'No fue posible recuperar el cartón sorteado.' });
    return;
  }

  const rouletteCandidates = current.candidates.length;
  closeRoulette();
  activeWinners = [winnerCard];
  winnersVisible = true;

  try {
    const session = await loadGameSession();
    await recordWinnerHistory({ ...winnerCard, gameStartedAt: session.startedAt }, 'RULETA', rouletteCandidates);
  } catch (error) {
    // El historial no debe impedir que la transmisión revele un resultado ya sorteado.
    console.error('No fue posible guardar el ganador por ruleta:', error);
  }

  broadcast({ type: 'winner-roulette-close', resolved: true });
  broadcast({ type: 'game-update', winner: true, winningCards: activeWinners, ...getBroadcastState() });

  res.json({ data: { cardNumber: winnerCard.id, nombreCompleto: winnerCard.nombreCompleto ?? null } });
};

/** Cancela el sorteo sin elegir: los ganadores siguen empatados y sin celebración. */
export const cancelWinnerRoulette = (_req: Request, res: Response) => {
  closeRoulette();
  broadcast({ type: 'winner-roulette-close', resolved: false });
  res.json({ data: getRouletteState() });
};

/** El administrador decide si la celebración se ve o no; puede volver a mostrarla. */
export const setWinnerOverlayState = (req: Request, res: Response) => {
  const visible = Boolean(req.body?.visible);
  if (visible && activeWinners.length === 0) {
    res.status(409).json({ message: 'No hay ganadores para mostrar.' });
    return;
  }
  // Mientras el premio esté en sorteo no puede mostrarse a todos los empatados.
  if (visible && getRouletteState().active) {
    res.status(409).json({ message: 'Primero hay que sortear al ganador en la ruleta.' });
    return;
  }
  winnersVisible = visible;

  const message = visible
    ? JSON.stringify({ type: 'game-update', winner: true, winningCards: activeWinners, ...getBroadcastState() })
    : JSON.stringify({ type: 'winner-close' });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(message);
  });

  res.json({ data: { visible: winnersVisible, count: activeWinners.length } });
};

export const resetGame = async (req: Request, res: Response) => {
  previousWinningCards = [];
  activeWinners = [];
  winnersVisible = false;
  closeRoulette();
  resetBroadcastState();
  await clearGameSession();

  const message = JSON.stringify({ type: 'game-reset' });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });

  res.json({ message: 'Game reset successfully' });
};

/**
 * Juego libre: solo se transmiten las balotas a OBS. No hay cartones, figuras
 * ni ganadores, así que no se toca la base de datos ni la sesión guardada.
 */
export const freeBalls = (req: Request, res: Response) => {
  const balls = Array.isArray(req.body?.balls)
    ? req.body.balls.filter((ball: unknown) => Number.isInteger(ball) && (ball as number) >= 1 && (ball as number) <= 75)
    : [];
  updateBroadcastState({ balls, figures: [] });
  broadcast({ type: 'game-update', winner: false, winningCards: [], balls, figures: [] });
  res.status(200).json({ balls });
};

export const freeReset = (req: Request, res: Response) => {
  resetBroadcastState();
  broadcast({ type: 'game-reset' });
  res.status(200).json({ message: 'Free game reset' });
};

export const getGameSession = async (req: Request, res: Response) => {
  try {
    const state = await loadGameSession();
    res.json(state);
  } catch (error) {
    res.status(500).json({ message: 'Error loading game session' });
  }
};

export const saveGameSessionHandler = async (req: Request, res: Response) => {
  try {
    const state = req.body as GameSessionState;
    await saveGameSession(state);
    previousWinningCards = state.previousWinners ?? [];
    res.status(200).json({ message: 'Session saved' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving game session' });
  }
};

/**
 * Muestra las figuras en grande sobre la transmisión durante unos segundos,
 * para que el público entienda cómo se juega la ronda.
 */
const showcaseFigures = (figures: any[]) => {
  if (!Array.isArray(figures) || figures.length === 0) return;
  broadcast({ type: 'figure-showcase', figures, seconds: getGameSettings().figureShowcaseSeconds });
};

export const updateFigure = (req: Request, res: Response) => {
  const { figures } = req.body;
  updateBroadcastState({ figures });
  broadcast({ type: 'figures-update', figures });
  // Al elegir figura se presenta automáticamente; limpiarla no dispara nada.
  showcaseFigures(figures);
  res.status(200).send('Figuras actualizadas');
}

/** Permite al administrador volver a presentar las figuras ya seleccionadas. */
export const showcaseFigureHandler = (req: Request, res: Response) => {
  const figures = req.body?.figures ?? getBroadcastState().figures;
  if (!Array.isArray(figures) || figures.length === 0) {
    res.status(409).json({ message: 'No hay figuras seleccionadas para mostrar.' });
    return;
  }
  showcaseFigures(figures);
  res.json({ data: { seconds: getGameSettings().figureShowcaseSeconds } });
}

const checkFigureMatch = (card: number[][], figure: any, balls: number[]): boolean => {
  const transposedPattern = transposeFigure(figure);
  const ballSet = new Set(balls);
  for (let row = 0; row < transposedPattern.length; row++) {
    for (let col = 0; col < transposedPattern[row].length; col++) {
      if (row === 2 && col === 2) continue;
      const cellNumber = card[row][col];
      const isSelected = ballSet.has(cellNumber);

      if (transposedPattern[row][col] && !isSelected) {
        return false;
      }
    }
  }
  return true;
};

const getBingoCards = async(range: {start?: number; end?: number; specific?: number[]}) => {
  const gameSettings = getGameSettings();
  const activeMunicipalities = gameSettings.activeMunicipalities;
  const municipalityFilterActive = activeMunicipalities.length < MUNICIPIOS.length;
  const activeDisabilities = gameSettings.activeDisabilities;
  const disabilityFilterActive = activeDisabilities.length < DISABILITY_CATEGORIES.length;
  const activeCaregiverStatuses = gameSettings.activeCaregiverStatuses;
  const caregiverFilterActive = activeCaregiverStatuses.length < CAREGIVER_CATEGORIES.length;
  // Estos filtros requieren registro: un cartón sin registro no tiene datos demográficos verificables.
  const requiresRegistration = gameSettings.registeredCardsOnly || municipalityFilterActive || disabilityFilterActive || caregiverFilterActive;
  const registeredJoin = requiresRegistration ? 'JOIN card_registrations r ON r.card_number = c.id' : '';
  const municipalityClause = municipalityFilterActive
    ? activeMunicipalities.length > 0
      ? ` AND r.municipio IN (${activeMunicipalities.map(() => '?').join(',')})`
      : ' AND 1 = 0'
    : '';
  const municipalityParameters = municipalityFilterActive ? activeMunicipalities : [];
  const disabilityTypes = activeDisabilities.filter((value) => value !== WITHOUT_DISABILITY_VALUE);
  const disabilityConditions: string[] = [];
  if (activeDisabilities.includes(WITHOUT_DISABILITY_VALUE)) disabilityConditions.push("r.discapacidad = 'NO'");
  if (disabilityTypes.length > 0) {
    disabilityConditions.push(`(r.discapacidad = 'SI' AND r.tipo_discapacidad IN (${disabilityTypes.map(() => '?').join(',')}))`);
  }
  const disabilityClause = disabilityFilterActive
    ? disabilityConditions.length > 0 ? ` AND (${disabilityConditions.join(' OR ')})` : ' AND 1 = 0'
    : '';
  const disabilityParameters = disabilityFilterActive ? disabilityTypes : [];
  const caregiverClause = caregiverFilterActive
    ? activeCaregiverStatuses.length > 0
      ? ` AND r.cuidador IN (${activeCaregiverStatuses.map(() => '?').join(',')})`
      : ' AND 1 = 0'
    : '';
  const caregiverParameters = caregiverFilterActive ? activeCaregiverStatuses : [];

  let cartons: BingoCard[];
  if (range.specific && range.specific.length > 0) {
    const placeholders = range.specific.map(() => '?').join(',');
    const [results]: [BingoCard[], any] = await db.query(
      `SELECT c.* FROM bingoCards c ${registeredJoin} WHERE c.id IN (${placeholders})${municipalityClause}${disabilityClause}${caregiverClause}`,
      [...range.specific, ...municipalityParameters, ...disabilityParameters, ...caregiverParameters]
    );
    cartons = results;
  } else if (range.start !== undefined && range.end !== undefined) {
    const [results]: [BingoCard[], any] = await db.query(
      `SELECT c.* FROM bingoCards c ${registeredJoin} WHERE c.id BETWEEN ? AND ?${municipalityClause}${disabilityClause}${caregiverClause}`,
      [range.start, range.end, ...municipalityParameters, ...disabilityParameters, ...caregiverParameters]
    );
    cartons = results;
  } else {
    throw new Error('Invalid range specified');
  }
  return cartons;
};

export const checkWinner = async (req: Request, res: Response) => {
  const { balls, figures, range }: CheckWinnerRequest = req.body;
  updateBroadcastState({ balls, figures });
  const liveUpdate = JSON.stringify({ type: 'game-update', winner: false, winningCards: [], balls, figures });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(liveUpdate);
  });
  const checkForNewWinners = (currentWinners: any[], previousWinners: any[]) => {
    return currentWinners.filter(
      cw => !previousWinners.some(pw => pw.id === cw.id)
    );
  };
  try {
    const cartons = await getBingoCards(range);
    let winner = false;
    let winningCards = [];
    for (const carton of cartons) {
      const cardPattern = JSON.parse(carton.card);
      for (const figure of figures) {
        const figurePattern = figure.pattern;
        if (checkFigureMatch(cardPattern, figurePattern, balls)) {
          winner = true;
          winningCards.push({
            id: carton.id,
            pattern: carton.card,
            patternFigure: figurePattern,
            figureId: figure.id ?? null,
            figureName: figure.name ?? null,
            winningBalls: balls,
          });
          break;
        }
      }
    }
    
    const newWinningCards = checkForNewWinners(winningCards, previousWinningCards);

    // Se adjunta el nombre de la persona registrada para mostrarlo en la celebración.
    if (newWinningCards.length > 0) {
      const ids = newWinningCards.map((card) => card.id);
      const placeholders = ids.map(() => '?').join(',');
      const [registrations] = await db.query<RowDataPacket[]>(
        `SELECT card_number, nombre_completo, municipio, nombre_residencia, discapacidad, cuidador, adulto_mayor
         FROM card_registrations WHERE card_number IN (${placeholders})`,
        ids
      );
      const byCard = new Map(registrations.map((row) => [row.card_number, row]));
      newWinningCards.forEach((card) => {
        const registration = byCard.get(card.id);
        card.nombreCompleto = registration?.nombre_completo ?? null;
        card.municipio = registration?.municipio ?? null;
        card.municipioLabel = registration ? labelForMunicipio(registration.municipio) : null;
        card.barrio = registration?.nombre_residencia ?? null;
        card.discapacidad = registration?.discapacidad === 'SI';
        card.cuidador = registration?.cuidador === 'SI';
        card.adultoMayor = registration?.adulto_mayor === 'SI';
      });
      previousWinningCards = [...previousWinningCards, ...newWinningCards];
      activeWinners = newWinningCards;

      /*
       * Con un solo ganador la celebración arranca sola. Con varios el premio se
       * sortea primero: no se muestra ningún cartón hasta que la ruleta decida.
       */
      if (newWinningCards.length > 1) {
        winnersVisible = false;
        openRoulette(newWinningCards);
        broadcast({ type: 'winner-roulette-open', roulette: getRouletteState(), spinDurationMs: SPIN_DURATION_MS });
      } else {
        winnersVisible = true;
        try {
          const session = await loadGameSession();
          await recordWinnerHistory({ ...newWinningCards[0], gameStartedAt: session.startedAt }, 'BINGO');
        } catch (error) {
          // Una caída del historial nunca debe bloquear el resultado principal de la partida.
          console.error('No fue posible guardar el ganador por bingo:', error);
        }
      }
    }

    const message = JSON.stringify({
      type: 'game-update',
      winner: winnersVisible && newWinningCards.length > 0,
      winningCards: winnersVisible ? newWinningCards : [],
      balls,
      figures,
    });
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });

    res.json({ winner: newWinningCards.length > 0, winningCards });
  } catch (error) {
    res.status(500).json({ message: 'Error checking winner' });
  }
};

const transposeFigure = (figure: boolean[][]): boolean[][] => {
  const transposed: boolean[][] = figure[0].map((_, colIndex) => figure.map(row => row[colIndex]));
  return transposed;
};
