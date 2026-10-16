import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import db from '../database';
import { MUNICIPIOS, isValidMunicipio } from '../constants/catalogs';

interface AssignmentRow extends RowDataPacket {
  id: number;
  user_id: number;
  start_card: number;
  end_card: number;
  municipio: string | null;
  created_at: string;
  full_name: string;
  username: string;
  registered_count: number;
}

const mapAssignment = (row: AssignmentRow) => ({
  id: row.id,
  userId: row.user_id,
  userFullName: row.full_name,
  username: row.username,
  startCard: row.start_card,
  endCard: row.end_card,
  municipio: row.municipio,
  municipioLabel: MUNICIPIOS.find((item) => item.value === row.municipio)?.label ?? null,
  totalCards: row.end_card - row.start_card + 1,
  registeredCards: Number(row.registered_count ?? 0),
  createdAt: row.created_at,
});

export const listAssignments = async (request: Request, response: Response) => {
  const onlyMine = request.user?.role !== 'admin';
  try {
    const [rows] = await db.query<AssignmentRow[]>(`
      SELECT a.*, u.full_name, u.username,
        (SELECT COUNT(*) FROM card_registrations r WHERE r.card_number BETWEEN a.start_card AND a.end_card) AS registered_count
      FROM card_assignments a
      INNER JOIN users u ON u.id = a.user_id
      ${onlyMine ? 'WHERE a.user_id = ?' : ''}
      ORDER BY a.start_card ASC
    `, onlyMine ? [request.user!.id] : []);
    response.json({ data: rows.map(mapAssignment) });
  } catch (error) {
    console.error('Error listando asignaciones:', error);
    response.status(500).json({ message: 'No fue posible cargar las asignaciones.' });
  }
};

export const createAssignment = async (request: Request, response: Response) => {
  const userId = Number(request.body?.userId);
  const startCard = Number(request.body?.startCard);
  const endCard = Number(request.body?.endCard);
  const municipio = String(request.body?.municipio ?? '').trim();

  if (!Number.isInteger(userId) || userId <= 0) {
    response.status(400).json({ message: 'Selecciona un usuario válido.' });
    return;
  }
  if (!Number.isInteger(startCard) || !Number.isInteger(endCard) || startCard <= 0 || endCard < startCard) {
    response.status(400).json({ message: 'El rango de cartones no es válido.' });
    return;
  }
  if (!isValidMunicipio(municipio)) {
    response.status(400).json({ message: 'Selecciona el municipio al que pertenece el bloque.' });
    return;
  }

  try {
    const [users] = await db.query<RowDataPacket[]>("SELECT id FROM users WHERE id = ? AND role = 'registrador' LIMIT 1", [userId]);
    if (users.length === 0) { response.status(404).json({ message: 'Selecciona un usuario registrador válido.' }); return; }

    // Un cartón solo puede pertenecer a un usuario: se rechaza cualquier solapamiento con otra asignación.
    const [overlaps] = await db.query<AssignmentRow[]>(`
      SELECT a.*, u.full_name, u.username, 0 AS registered_count
      FROM card_assignments a
      INNER JOIN users u ON u.id = a.user_id
      WHERE a.start_card <= ? AND a.end_card >= ?
      ORDER BY a.start_card ASC
    `, [endCard, startCard]);

    if (overlaps.length > 0) {
      const conflict = overlaps[0];
      response.status(409).json({
        message: `El rango se cruza con los cartones ${conflict.start_card}–${conflict.end_card} ya asignados a ${conflict.full_name}.`,
        conflicts: overlaps.map(mapAssignment),
      });
      return;
    }

    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO card_assignments (user_id, start_card, end_card, municipio) VALUES (?, ?, ?, ?)',
      [userId, startCard, endCard, municipio]
    );
    const [rows] = await db.query<AssignmentRow[]>(`
      SELECT a.*, u.full_name, u.username, 0 AS registered_count
      FROM card_assignments a INNER JOIN users u ON u.id = a.user_id WHERE a.id = ?
    `, [result.insertId]);
    response.status(201).json({ data: mapAssignment(rows[0]), message: 'Cartones asignados correctamente.' });
  } catch (error) {
    console.error('Error creando asignación:', error);
    response.status(500).json({ message: 'No fue posible asignar los cartones.' });
  }
};

/** Permite completar o corregir el municipio de un bloque sin alterar registros históricos. */
export const updateAssignmentMunicipality = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  const municipio = String(request.body?.municipio ?? '').trim();
  if (!Number.isInteger(id) || id <= 0 || !isValidMunicipio(municipio)) {
    response.status(400).json({ message: 'Selecciona un municipio válido.' });
    return;
  }
  try {
    const [result] = await db.query<ResultSetHeader>('UPDATE card_assignments SET municipio = ? WHERE id = ?', [municipio, id]);
    if (result.affectedRows === 0) { response.status(404).json({ message: 'La asignación no existe.' }); return; }
    response.json({ message: 'Municipio del bloque actualizado.' });
  } catch (error) {
    console.error('Error actualizando municipio de la asignación:', error);
    response.status(500).json({ message: 'No fue posible actualizar el municipio.' });
  }
};

/** Vacía los datos personales registrados en un bloque, pero conserva su asignación. */
export const clearAssignmentRegistrations = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ message: 'La asignación no es válida.' });
    return;
  }
  try {
    const [rows] = await db.query<AssignmentRow[]>('SELECT * FROM card_assignments WHERE id = ? LIMIT 1', [id]);
    const assignment = rows[0];
    if (!assignment) { response.status(404).json({ message: 'La asignación no existe.' }); return; }

    const [result] = await db.query<ResultSetHeader>(
      'DELETE FROM card_registrations WHERE card_number BETWEEN ? AND ?',
      [assignment.start_card, assignment.end_card]
    );
    response.json({
      data: { deleted: result.affectedRows },
      message: result.affectedRows === 1
        ? 'Se eliminó 1 registro del bloque.'
        : `Se eliminaron ${result.affectedRows} registros del bloque.`,
    });
  } catch (error) {
    console.error('Error vaciando registros de la asignación:', error);
    response.status(500).json({ message: 'No fue posible borrar los registros del bloque.' });
  }
};

export const deleteAssignment = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  try {
    const [rows] = await db.query<AssignmentRow[]>('SELECT * FROM card_assignments WHERE id = ? LIMIT 1', [id]);
    const assignment = rows[0];
    if (!assignment) { response.status(404).json({ message: 'La asignación no existe.' }); return; }

    const [registered] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM card_registrations WHERE card_number BETWEEN ? AND ?',
      [assignment.start_card, assignment.end_card]
    );
    if (Number(registered[0].total) > 0) {
      response.status(409).json({ message: `Este bloque ya tiene ${registered[0].total} cartón(es) registrados. Elimina primero esos registros.` });
      return;
    }

    await db.query('DELETE FROM card_assignments WHERE id = ?', [id]);
    response.json({ message: 'Asignación eliminada.' });
  } catch (error) {
    console.error('Error eliminando asignación:', error);
    response.status(500).json({ message: 'No fue posible eliminar la asignación.' });
  }
};

/** Devuelve true si el cartón pertenece a un bloque asignado al usuario indicado. */
export const isCardAssignedToUser = async (cardNumber: number, userId: number): Promise<boolean> => {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id FROM card_assignments WHERE user_id = ? AND ? BETWEEN start_card AND end_card LIMIT 1',
    [userId, cardNumber]
  );
  return rows.length > 0;
};
