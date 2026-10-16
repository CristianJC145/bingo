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

interface CountResult extends RowDataPacket {
  total: number;
}

export const listBingoCards = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Math.max(1, Number(req.query.perPage) || 10);
  const search = String(req.query.search ?? '').trim();
  const offset = (page - 1) * perPage;

  try {
    const whereClause = search ? 'WHERE CAST(id AS CHAR) LIKE ?' : '';
    const whereParams = search ? [`%${search}%`] : [];

    const [countResult] = await db.query<CountResult[]>(
      `SELECT COUNT(*) AS total FROM bingocards ${whereClause}`,
      whereParams
    );
    const [results] = await db.query<RowDataPacket[]>(
      `SELECT * FROM bingocards ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`,
      [...whereParams, perPage, offset]
    );

    res.json({ data: results, total: countResult[0]?.total ?? 0, perPage });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getBingoCardById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [results] = await db.query<RowDataPacket[]>('SELECT * FROM bingocards WHERE id = ?', [id]);
    if (results.length === 0) {
      res.status(404).json({ error: 'Cartón no encontrado' });
      return;
    }
    res.json(results[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const MAX_RANGE_CARDS = 5000;

export const getBingoCardsByRange = async (req: Request, res: Response) => {
  const { start, end, specific } = req.query;

  try {
    let query = '';
    let params: (string | number)[] = [];

    if (specific) {
      const ids = String(specific).split(',').map(Number).filter((value) => Number.isInteger(value) && value > 0);
      if (ids.length === 0) { res.json([]); return; }
      if (ids.length > MAX_RANGE_CARDS) { res.status(400).json({ error: `No se pueden solicitar más de ${MAX_RANGE_CARDS} cartones a la vez.` }); return; }
      query = `SELECT * FROM bingocards WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id ASC`;
      params = ids;
    } else if (start !== undefined && end !== undefined) {
      const startId = Number(start);
      const endId = Number(end);
      if (!Number.isInteger(startId) || !Number.isInteger(endId) || startId > endId) {
        res.status(400).json({ error: 'Rango inválido.' });
        return;
      }
      if (endId - startId + 1 > MAX_RANGE_CARDS) { res.status(400).json({ error: `No se pueden solicitar más de ${MAX_RANGE_CARDS} cartones a la vez.` }); return; }
      query = 'SELECT * FROM bingocards WHERE id BETWEEN ? AND ? ORDER BY id ASC';
      params = [startId, endId];
    } else {
      res.status(400).json({ error: 'Debes indicar un rango (start/end) o cartones específicos (specific).' });
      return;
    }

    const [results] = await db.query<RowDataPacket[]>(query, params);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBingoCard = async (req: Request, res: Response) => {
  const { id } = req.params;
  let { card } = req.body;
  try {
    if (typeof card === 'string') card = JSON.parse(card);
    card[2][2] = Number(id);
    await db.query('UPDATE bingocards SET card = ? WHERE id = ?', [JSON.stringify(card), id]);
    res.json({ id: Number(id), card });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBingoCard = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM bingocards WHERE id = ?', [id]);
    res.status(200).json({ message: 'Card deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const BULK_INSERT_BATCH_SIZE = 500;

export const bulkImportBingoCards = async (req: Request, res: Response) => {
  const { cards } = req.body as { cards: { id: number; card: number[][] }[] };

  if (!Array.isArray(cards) || cards.length === 0) {
    res.status(400).json({ error: 'No se recibieron cartones para importar' });
    return;
  }

  try {
    let inserted = 0;
    let maxId = 0;

    for (let index = 0; index < cards.length; index += BULK_INSERT_BATCH_SIZE) {
      const batch = cards.slice(index, index + BULK_INSERT_BATCH_SIZE);
      const values: any[] = [];
      const placeholders = batch.map(({ id, card }) => {
        const normalizedCard = typeof card === 'string' ? JSON.parse(card) : card;
        normalizedCard[2][2] = id;
        values.push(id, JSON.stringify(normalizedCard));
        maxId = Math.max(maxId, id);
        return '(?, ?)';
      }).join(', ');

      const [result] = await db.query<ResultSetHeader>(
        `INSERT IGNORE INTO bingocards (id, card) VALUES ${placeholders}`,
        values
      );
      inserted += result.affectedRows;
    }

    const [metadataRows] = await db.query<MetadataResult[]>('SELECT `value` FROM metadata WHERE `key` = "lastBingoCardId"');
    const currentLastId = metadataRows[0]?.value ?? 0;
    if (maxId > currentLastId) {
      await db.query(
        'INSERT INTO metadata (`key`, `value`) VALUES ("lastBingoCardId", ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [maxId, maxId]
      );
    }

    res.json({ total: cards.length, inserted, skipped: cards.length - inserted });
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
