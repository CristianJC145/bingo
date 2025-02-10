import db from "../database";
import { Request, Response } from 'express';
import { CheckWinnerRequest } from "../models/FigureCards";
import { RowDataPacket } from 'mysql2/promise';
import { wss } from "..";

interface BingoCard extends RowDataPacket {
    id: number;
    card: any;
}
let previousWinningCards: any[] = [];

export const resetGame = (req: Request, res: Response) => {
  previousWinningCards = [];

  const message = JSON.stringify({ type: 'game-reset' });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });

  res.json({ message: 'Game reset successfully' });
};

export const updateFigure = (req: Request, res: Response) => {
  const { figures } = req.body;
  const updateMessage = JSON.stringify({ type: 'figures-update', figures });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(updateMessage);
    }
  });
  res.status(200).send('Figuras actualizadas');
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
  let cartons: BingoCard[];
  if (range.specific && range.specific.length > 0) {
    const placeholders = range.specific.map(() => '?').join(',');
    const [results]: [BingoCard[], any] = await db.query(`SELECT * FROM bingoCards WHERE id IN (${placeholders})`, range.specific);
    cartons = results;
  } else if (range.start !== undefined && range.end !== undefined) {
    const [results]: [BingoCard[], any] = await db.query('SELECT * FROM bingoCards WHERE id BETWEEN ? AND ?', [range.start, range.end]);
    cartons = results;
  } else {
    throw new Error('Invalid range specified');
  }
  return cartons;
};

export const checkWinner = async (req: Request, res: Response) => {
  const { balls, figures, range }: CheckWinnerRequest = req.body;
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
            patternFigure: figurePattern
          });
          break;
        }
      }
    }
    
    const newWinningCards = checkForNewWinners(winningCards, previousWinningCards);
    if (newWinningCards.length > 0) {
      previousWinningCards = [...previousWinningCards, ...newWinningCards];
    }

    const message = JSON.stringify({ type: 'game-update', winner: newWinningCards.length > 0, winningCards: newWinningCards, balls, figures });
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
