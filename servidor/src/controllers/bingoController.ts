import { Request, Response } from 'express';
import db from '../database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

// Define el tipo para el resultado de la consulta de inserción
interface InsertResult extends ResultSetHeader {
  insertId: number;
}

// Define el tipo para el resultado de la consulta de selección de metadata
interface MetadataResult extends RowDataPacket {
  value: number;
}

export const saveBingoCard = async (req: Request, res: Response) => {
  const { card } = req.body;
  try {
    const [result] = await db.query<InsertResult>('INSERT INTO bingocards (card) VALUES (?)', [JSON.stringify(card)]);
    res.json({ id: result.insertId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getBingoCards = async (req: Request, res: Response) => {
  try {
    const [results] = await db.query<RowDataPacket[]>('SELECT * FROM bingoCards');
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getLastBingoCardId = async (req: Request, res: Response) => {
  try {
    const [results] = await db.query<MetadataResult[]>('SELECT `value` FROM metadata WHERE `key` = "lastBingoCardId"');
    res.json(results[0] || { value: 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const setLastBingoCardId = async (req: Request, res: Response) => {
  const { lastId } = req.body;
  try {
    await db.query(
      'INSERT INTO metadata (`key`, `value`) VALUES ("lastBingoCardId", ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [lastId, lastId]
    );
    res.json({ value: lastId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
