import db from "../database";
import { Request, Response } from 'express';
import { CheckWinnerRequest } from "../models/FigureCards";
import { RowDataPacket } from 'mysql2/promise';
import { Server as WebSocketServer } from 'ws';
import { wss } from "..";

interface BingoCard extends RowDataPacket {
    id: number;
    card: any;
}

const checkFigureMatch = (card: number[][], figure: any, balls: number[]): boolean => {
  const transposedPattern = transposeFigure(figure);
  const ballSet = new Set(balls);
  for (let row = 0; row < transposedPattern.length; row++) {
    for (let col = 0; col < transposedPattern[row].length; col++) {
      if (row === 2 && col === 2) continue;
      const cellNumber  = card[row][col];
      const isSelected = ballSet.has(cellNumber);

      if (transposedPattern[row][col] && !isSelected) {
        return false;
      }
    }
  }
  return true;
};
  
export const checkWinner = async (req: Request, res: Response) => {
  const { balls, figures, range }: CheckWinnerRequest = req.body;
  console.log("rango seleccionado: ", req.body)

  try {
    const [cartons]: [BingoCard[], any] = await db.query('SELECT * FROM bingoCards WHERE id BETWEEN ? AND ?', [range.start, range.end]);

    let winner = false;
    let winningCards = [];
    for (const carton of cartons) {
      const cardPattern = JSON.parse(carton.card);
      for (const figure of figures) {
        const figurePattern = figure.pattern;
        if (checkFigureMatch(cardPattern, figurePattern, balls)) {
          winner= true;
          winningCards.push(carton.id);
          break;
        }
      }
    }
    const message = JSON.stringify({ type: 'winner-update', winner, winningCards, balls, figures });
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
    res.json({ winner, winningCards });
  } catch (error) {
    res.status(500).json({ message: 'Error checking winner' });
  }
};

const transposeFigure = (figure: boolean[][]): boolean[][] => {
  const transposed: boolean[][] = figure[0].map((_, colIndex) => figure.map(row => row[colIndex]));
  return transposed;
};
