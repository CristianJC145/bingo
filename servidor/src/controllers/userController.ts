import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import db from '../database';
import { UserRow, toPublicUser } from '../services/authStore';

interface UserWithStatsRow extends UserRow {
  assigned_cards: number;
  registered_cards: number;
}

export const listUsers = async (_request: Request, response: Response) => {
  try {
    const [rows] = await db.query<UserWithStatsRow[]>(`
      SELECT u.*,
        COALESCE((SELECT SUM(a.end_card - a.start_card + 1) FROM card_assignments a WHERE a.user_id = u.id), 0) AS assigned_cards,
        COALESCE((SELECT COUNT(*) FROM card_registrations r WHERE r.registered_by = u.id), 0) AS registered_cards
      FROM users u
      ORDER BY u.role = 'admin' DESC, u.full_name ASC
    `);
    response.json({
      data: rows.map((row) => ({
        ...toPublicUser(row),
        assignedCards: Number(row.assigned_cards),
        registeredCards: Number(row.registered_cards),
      })),
    });
  } catch (error) {
    console.error('Error listando usuarios:', error);
    response.status(500).json({ message: 'No fue posible cargar los usuarios.' });
  }
};

export const createUser = async (request: Request, response: Response) => {
  const username = String(request.body?.username ?? '').trim().toLowerCase();
  const fullName = String(request.body?.fullName ?? '').trim();
  const password = String(request.body?.password ?? '');
  const role = request.body?.role === 'admin' ? 'admin' : 'registrador';

  if (!/^[a-z0-9._-]{3,60}$/.test(username)) {
    response.status(400).json({ message: 'El usuario debe tener al menos 3 caracteres (letras, números, punto, guion o guion bajo).' });
    return;
  }
  if (fullName.length < 3) {
    response.status(400).json({ message: 'Ingresa el nombre completo del usuario.' });
    return;
  }
  if (password.length < 6) {
    response.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    return;
  }

  try {
    const [existing] = await db.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    if (existing.length > 0) {
      response.status(409).json({ message: 'Ya existe un usuario con ese nombre de usuario.' });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO users (username, full_name, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, fullName, hash, role]
    );
    const [rows] = await db.query<UserRow[]>('SELECT * FROM users WHERE id = ?', [result.insertId]);
    response.status(201).json({ data: { ...toPublicUser(rows[0]), assignedCards: 0, registeredCards: 0 }, message: 'Usuario creado correctamente.' });
  } catch (error) {
    console.error('Error creando usuario:', error);
    response.status(500).json({ message: 'No fue posible crear el usuario.' });
  }
};

export const updateUser = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  const fullName = String(request.body?.fullName ?? '').trim();
  const password = String(request.body?.password ?? '');
  const active = request.body?.active;

  try {
    const [rows] = await db.query<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    const user = rows[0];
    if (!user) { response.status(404).json({ message: 'El usuario no existe.' }); return; }

    if (user.role === 'admin' && active === false) {
      const [admins] = await db.query<RowDataPacket[]>("SELECT id FROM users WHERE role = 'admin' AND active = 1 AND id <> ?", [id]);
      if (admins.length === 0) {
        response.status(409).json({ message: 'Debe quedar al menos un administrador activo.' });
        return;
      }
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];
    if (fullName.length >= 3) { updates.push('full_name = ?'); values.push(fullName); }
    if (password) {
      if (password.length < 6) { response.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' }); return; }
      updates.push('password_hash = ?');
      values.push(await bcrypt.hash(password, 10));
    }
    if (typeof active === 'boolean') { updates.push('active = ?'); values.push(active ? 1 : 0); }

    if (updates.length === 0) { response.status(400).json({ message: 'No hay cambios para guardar.' }); return; }

    values.push(id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await db.query<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);
    response.json({ data: toPublicUser(updated[0]), message: 'Usuario actualizado.' });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    response.status(500).json({ message: 'No fue posible actualizar el usuario.' });
  }
};

export const deleteUser = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  if (id === request.user?.id) {
    response.status(409).json({ message: 'No puedes eliminar tu propio usuario.' });
    return;
  }

  try {
    const [rows] = await db.query<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    const user = rows[0];
    if (!user) { response.status(404).json({ message: 'El usuario no existe.' }); return; }

    if (user.role === 'admin') {
      const [admins] = await db.query<RowDataPacket[]>("SELECT id FROM users WHERE role = 'admin' AND id <> ?", [id]);
      if (admins.length === 0) {
        response.status(409).json({ message: 'Debe quedar al menos un administrador.' });
        return;
      }
    }

    const [registered] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM card_registrations WHERE registered_by = ?', [id]);
    if (Number(registered[0].total) > 0) {
      response.status(409).json({ message: `Este usuario tiene ${registered[0].total} cartón(es) registrados. Desactívalo en lugar de eliminarlo.` });
      return;
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);
    response.json({ message: 'Usuario eliminado.' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    response.status(500).json({ message: 'No fue posible eliminar el usuario.' });
  }
};
