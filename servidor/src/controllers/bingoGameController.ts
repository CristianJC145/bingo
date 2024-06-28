import db from "../database";
import { Request, Response } from 'express';
import { CheckWinnerRequest } from "../models/FigureCards";
import { RowDataPacket } from 'mysql2/promise';

interface BingoCard extends RowDataPacket {
    id: number;
    card: boolean[][];
  }

const checkFigure = (pattern: boolean[][], balls: number[]) => {
    for (let i = 0; i < pattern.length; i++) {
        console.log("partner",i)
      for (let j = 0; j < pattern[i].length; j++) {
        if (i === 2 && j === 2) {
            continue;
          }
        if (pattern[i][j] && !balls.includes(i * 15 + j + 1)) {
          return false;
        }
      }
    }
    return true;
};
  
  export const checkWinner = async (req: Request, res: Response) => {
    const { balls, figures, range }: CheckWinnerRequest = req.body;
  
    try {
      const [cartons]: [BingoCard[], any] = await db.query('SELECT * FROM bingoCards WHERE id BETWEEN ? AND ?', [range.start, range.end]);
      let winner = false;
      let winningCard = null;
  
      for (const carton of cartons) {
        const card = carton.card;
        for (const figure of figures) {
            const pattern = figure.pattern;
          if (checkFigure(pattern, balls)) {
            console.log(card);
            winner= true;
            winningCard = card.indexOf;
            break;
          }
        }
        if (winner) break;
      }
      res.json({ winner, winningCard });
    } catch (error) {
      res.status(500).json({ message: 'Error checking winner' });
    }
};