/**
 * Ruleta de desempate: cuando un bingo deja más de un cartón ganador, el premio
 * se sortea entre ellos. El resultado se decide en el servidor para que la
 * transmisión y el panel del administrador animen hacia el mismo puesto.
 */

export type RoulettePhase = 'idle' | 'ready' | 'spinning' | 'resolved';

export interface RouletteCandidate {
  cardNumber: number;
  nombreCompleto: string | null;
  municipioLabel: string | null;
}

export interface WinnerRouletteState {
  active: boolean;
  phase: RoulettePhase;
  candidates: RouletteCandidate[];
  /** Puesto ganador dentro de `candidates`; todos los clientes frenan ahí. */
  winnerIndex: number | null;
  spunAt: number | null;
}

/** Duración de la animación; el panel espera esto antes de habilitar la confirmación. */
export const SPIN_DURATION_MS = 7200;

const emptyState = (): WinnerRouletteState => ({
  active: false,
  phase: 'idle',
  candidates: [],
  winnerIndex: null,
  spunAt: null,
});

let state: WinnerRouletteState = emptyState();
/** Cartones completos de los candidatos, para reconstruir la celebración al final. */
let candidateCards: any[] = [];

export const getRouletteState = (): WinnerRouletteState => state;

export const openRoulette = (cards: any[]) => {
  candidateCards = cards;
  state = {
    active: true,
    phase: 'ready',
    candidates: cards.map((card) => ({
      cardNumber: card.id,
      nombreCompleto: card.nombreCompleto ?? null,
      municipioLabel: card.municipioLabel ?? null,
    })),
    winnerIndex: null,
    spunAt: null,
  };
};

/** Sortea un puesto al azar y lo fija; girar de nuevo exige reabrir. */
export const spinRoulette = (): WinnerRouletteState => {
  const winnerIndex = Math.floor(Math.random() * state.candidates.length);
  state = { ...state, phase: 'spinning', winnerIndex, spunAt: Date.now() };
  return state;
};

export const markResolved = () => {
  state = { ...state, phase: 'resolved' };
};

/** Cartón completo del puesto sorteado, listo para la celebración normal. */
export const getRouletteWinnerCard = (): any | null => {
  if (state.winnerIndex === null) return null;
  return candidateCards[state.winnerIndex] ?? null;
};

export const closeRoulette = () => {
  candidateCards = [];
  state = emptyState();
};
