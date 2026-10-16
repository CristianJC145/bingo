import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { findUserById, findUserByUsername, toPublicUser } from '../services/authStore';
import { signToken } from '../middleware/auth';
import { catalogs } from '../constants/catalogs';

export const login = async (request: Request, response: Response) => {
  const username = String(request.body?.username ?? '').trim();
  const password = String(request.body?.password ?? '');

  if (!username || !password) {
    response.status(400).json({ message: 'Ingresa tu usuario y contraseña.' });
    return;
  }

  try {
    const user = await findUserByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      response.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
      return;
    }
    if (!user.active) {
      response.status(403).json({ message: 'Tu usuario está desactivado. Contacta al administrador.' });
      return;
    }

    const publicUser = toPublicUser(user);
    const token = signToken({ id: user.id, username: user.username, role: user.role, fullName: user.full_name });
    response.json({ token, user: publicUser });
  } catch (error) {
    console.error('Error en login:', error);
    response.status(500).json({ message: 'No fue posible iniciar sesión.' });
  }
};

export const me = async (request: Request, response: Response) => {
  try {
    const user = await findUserById(request.user!.id);
    if (!user || !user.active) {
      response.status(401).json({ message: 'Tu usuario ya no está disponible.' });
      return;
    }
    response.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Error obteniendo el perfil:', error);
    response.status(500).json({ message: 'No fue posible cargar tu perfil.' });
  }
};

export const changeOwnPassword = async (request: Request, response: Response) => {
  const currentPassword = String(request.body?.currentPassword ?? '');
  const newPassword = String(request.body?.newPassword ?? '');

  if (newPassword.length < 6) {
    response.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    return;
  }

  try {
    const user = await findUserById(request.user!.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      response.status(401).json({ message: 'La contraseña actual no es correcta.' });
      return;
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    response.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error cambiando la contraseña:', error);
    response.status(500).json({ message: 'No fue posible cambiar la contraseña.' });
  }
};

export const getCatalogs = (_request: Request, response: Response) => {
  response.json({ data: catalogs });
};
