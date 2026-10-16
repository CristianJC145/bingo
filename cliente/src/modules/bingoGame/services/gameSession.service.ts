import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";
import { Figure } from "../dtos/checkWinnerDto";

interface Card { id: number; pattern: number[][]; patternFigure: boolean[][]; }
interface CartonRange { start?: number; end?: number; specific?: number[]; }

export interface GameSessionState {
  cartonRange: CartonRange;
  cardsRangue: boolean;
  selectedFigures: Figure[];
  isGameStarted: boolean;
  gameRandom: boolean;
  balls: number[];
  drawnNumbers: number[];
  previousWinners: Card[];
  startedAt: number | null;
}

export class GameSessionService {
  async get(): Promise<GameSessionState> {
    const response = await configureApi().get(`${services.game}/session`);
    return response.data;
  }

  async save(state: GameSessionState): Promise<void> {
    await configureApi().post(`${services.game}/session`, state);
  }
}
