import { Request, Response } from 'express';
import db from '../database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface InsertResult extends ResultSetHeader {
    insertId: number;
}

export const getFigures = async (_req: Request, res: Response) => {
    try {
        const [results] = await db.query('SELECT * FROM bingoFigures');
        const [total] = await db.query(`SELECT COUNT(*) AS total FROM bingoFigures`);
        const dataRespose = {
            data: results,
            total: 10,
            perPage: 10
        }
        res.json(dataRespose);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching figures' });
    }
};

export const createOrUpdateFigure = async (req: Request, res: Response) => {
    const { id } = req.body;
    let { name, pattern } = req.body;

    if (typeof pattern === 'string') {
        pattern = JSON.parse(pattern);
    }

    pattern[2][2] = false;

    try {
        if (id) {
            await db.query('UPDATE bingoFigures SET name = ?, pattern = ? WHERE id = ?', [name, JSON.stringify(pattern), id]);
            res.status(200).json({ message: 'Figure updated' });
        } else {
            const [result] = await db.query<InsertResult>('INSERT INTO bingoFigures (name, pattern) VALUES (?, ?)', [name, JSON.stringify(pattern)]);
            res.status(201).json({ id: result.insertId, name, pattern });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error saving figure' });
    }
};

export const deleteFigure = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM bingoFigures WHERE id = ?', [id]);
        res.status(200).json({ message: 'Figure deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting figure' });
    }
};
