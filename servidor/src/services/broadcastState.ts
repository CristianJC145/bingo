export interface BroadcastFigure {
  id: number;
  name: string;
  pattern: boolean[][];
}

export interface BroadcastState {
  balls: number[];
  figures: BroadcastFigure[];
}

let currentState: BroadcastState = { balls: [], figures: [] };

export const getBroadcastState = (): BroadcastState => currentState;

export const updateBroadcastState = (state: Partial<BroadcastState>): BroadcastState => {
  currentState = { ...currentState, ...state };
  return currentState;
};

export const resetBroadcastState = (): BroadcastState => {
  currentState = { balls: [], figures: [] };
  return currentState;
};

