import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import db from '../database';

interface CountRow extends RowDataPacket { key_value: string | null; total: number; }
interface TotalsRow extends RowDataPacket { total: number; }
interface UserProgressRow extends RowDataPacket {
  id: number;
  full_name: string;
  username: string;
  assigned: number;
  registered: number;
}

const toBreakdown = (rows: CountRow[]) =>
  rows.map((row) => ({ value: row.key_value ?? 'SIN_DATO', total: Number(row.total) }));

export const getDashboard = async (_request: Request, response: Response) => {
  try {
    const [[assignedRow]] = await db.query<TotalsRow[]>(
      'SELECT COALESCE(SUM(end_card - start_card + 1), 0) AS total FROM card_assignments'
    );
    const [[registeredRow]] = await db.query<TotalsRow[]>('SELECT COUNT(*) AS total FROM card_registrations');
    const [[usersRow]] = await db.query<TotalsRow[]>("SELECT COUNT(*) AS total FROM users WHERE role = 'registrador' AND active = 1");
    const [[inventoryRow]] = await db.query<TotalsRow[]>('SELECT COUNT(*) AS total FROM bingocards');

    const [municipios] = await db.query<CountRow[]>(
      'SELECT municipio AS key_value, COUNT(*) AS total FROM card_registrations GROUP BY municipio ORDER BY total DESC'
    );
    const [sectores] = await db.query<CountRow[]>(
      'SELECT sector AS key_value, COUNT(*) AS total FROM card_registrations GROUP BY sector ORDER BY total DESC'
    );
    const [generos] = await db.query<CountRow[]>(
      'SELECT genero AS key_value, COUNT(*) AS total FROM card_registrations GROUP BY genero ORDER BY total DESC'
    );
    const [discapacidades] = await db.query<CountRow[]>(
      "SELECT tipo_discapacidad AS key_value, COUNT(*) AS total FROM card_registrations WHERE discapacidad = 'SI' AND tipo_discapacidad IS NOT NULL GROUP BY tipo_discapacidad ORDER BY total DESC"
    );
    const [desplazados] = await db.query<CountRow[]>(
      'SELECT desplazado AS key_value, COUNT(*) AS total FROM card_registrations GROUP BY desplazado ORDER BY total DESC'
    );

    const [userProgress] = await db.query<UserProgressRow[]>(`
      SELECT u.id, u.full_name, u.username,
        COALESCE((SELECT SUM(a.end_card - a.start_card + 1) FROM card_assignments a WHERE a.user_id = u.id), 0) AS assigned,
        COALESCE((SELECT COUNT(*) FROM card_registrations r WHERE r.registered_by = u.id), 0) AS registered
      FROM users u
      WHERE u.role = 'registrador'
      ORDER BY registered DESC, u.full_name ASC
    `);

    const assigned = Number(assignedRow.total);
    const registered = Number(registeredRow.total);

    response.json({
      data: {
        totals: {
          inventory: Number(inventoryRow.total),
          assigned,
          registered,
          available: Math.max(0, assigned - registered),
          activeRegistrars: Number(usersRow.total),
        },
        byMunicipio: toBreakdown(municipios),
        bySector: toBreakdown(sectores),
        byGenero: toBreakdown(generos),
        byDiscapacidad: toBreakdown(discapacidades),
        byDesplazado: toBreakdown(desplazados),
        byUser: userProgress.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          username: row.username,
          assigned: Number(row.assigned),
          registered: Number(row.registered),
        })),
      },
    });
  } catch (error) {
    console.error('Error generando el dashboard:', error);
    response.status(500).json({ message: 'No fue posible cargar el resumen.' });
  }
};
