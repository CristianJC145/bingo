import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import db from '../database';
import { MUNICIPIOS, TIPOS_DISCAPACIDAD } from '../constants/catalogs';

interface AssignmentRow extends RowDataPacket {
  id: number;
  user_id: number;
  start_card: number;
  end_card: number;
  municipio: string | null;
  full_name: string;
  username: string;
}

interface RegistrationRow extends RowDataPacket {
  card_number: number;
  municipio: string;
  nombre_completo: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  genero: string;
  fecha_nacimiento: string | Date;
  desplazado: string;
  contacto: string;
  sector: string;
  nombre_residencia: string;
  discapacidad: string;
  tipo_discapacidad: string | null;
  cuidador: string;
  adulto_mayor: string;
  registered_by: number | null;
  registered_by_name: string | null;
  updated_at: string;
}

const labelOf = (options: { value: string; label: string }[], value: string | null) =>
  options.find((item) => item.value === value)?.label ?? value;

const toIsoDate = (value: string | Date): string => {
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
};

/** Fila lista para la tabla: el bloque al que pertenece más los datos de la persona. */
const mapRow = (cardNumber: number, assignment: AssignmentRow | undefined, registration: RegistrationRow | undefined) => ({
  cardNumber,
  assignedToId: assignment?.user_id ?? null,
  assignedToName: assignment?.full_name ?? null,
  blockStart: assignment?.start_card ?? null,
  blockEnd: assignment?.end_card ?? null,
  status: registration ? ('registered' as const) : ('available' as const),
  municipio: registration?.municipio ?? assignment?.municipio ?? null,
  municipioLabel: labelOf(MUNICIPIOS, registration?.municipio ?? assignment?.municipio ?? null),
  assignedMunicipio: assignment?.municipio ?? null,
  nombreCompleto: registration?.nombre_completo ?? null,
  tipoIdentificacion: registration?.tipo_identificacion ?? null,
  numeroIdentificacion: registration?.numero_identificacion ?? null,
  genero: registration?.genero ?? null,
  fechaNacimiento: registration ? toIsoDate(registration.fecha_nacimiento) : null,
  desplazado: registration?.desplazado ?? null,
  contacto: registration?.contacto ?? null,
  sector: registration?.sector ?? null,
  nombreResidencia: registration?.nombre_residencia ?? null,
  discapacidad: registration?.discapacidad ?? null,
  tipoDiscapacidad: registration?.tipo_discapacidad ?? null,
  tipoDiscapacidadLabel: registration?.discapacidad === 'SI' ? labelOf(TIPOS_DISCAPACIDAD, registration.tipo_discapacidad) : null,
  cuidador: registration?.cuidador ?? null,
  adultoMayor: registration?.adulto_mayor ?? null,
  registeredByName: registration?.registered_by_name ?? null,
  updatedAt: registration?.updated_at ?? null,
});

/**
 * Listado global de cartones asignados con los datos de sus titulares.
 * Recorre los bloques asignados, de modo que también aparecen los cartones
 * entregados a un registrador que todavía no tienen persona registrada.
 */
export const listAssignedCards = async (request: Request, response: Response) => {
  const status = String(request.query.status ?? 'all');
  const search = String(request.query.search ?? '').trim().toLowerCase();
  const userId = Number(request.query.userId) || 0;
  const municipio = String(request.query.municipio ?? '').trim();
  const page = Math.max(1, Number(request.query.page) || 1);
  const perPage = Math.min(200, Math.max(1, Number(request.query.perPage) || 20));

  try {
    const [assignments] = await db.query<AssignmentRow[]>(
      `SELECT a.id, a.user_id, a.start_card, a.end_card, a.municipio, u.full_name, u.username
       FROM card_assignments a
       JOIN users u ON u.id = a.user_id
       ${userId ? 'WHERE a.user_id = ?' : ''}
       ORDER BY a.start_card ASC`,
      userId ? [userId] : []
    );

    if (assignments.length === 0) {
      response.json({ data: [], total: 0, page, perPage, summary: { total: 0, registered: 0, available: 0, globalRegistered: 0 } });
      return;
    }

    const [registrations] = await db.query<RegistrationRow[]>(
      `SELECT r.*, u.full_name AS registered_by_name
       FROM card_registrations r
       LEFT JOIN users u ON u.id = r.registered_by`
    );
    const registrationByCard = new Map(registrations.map((row) => [row.card_number, row]));

    // Cada cartón se resuelve contra su bloque; los bloques no se solapan por diseño.
    const rows: ReturnType<typeof mapRow>[] = [];
    assignments.forEach((assignment) => {
      for (let cardNumber = assignment.start_card; cardNumber <= assignment.end_card; cardNumber++) {
        rows.push(mapRow(cardNumber, assignment, registrationByCard.get(cardNumber)));
      }
    });

    const summary = {
      total: rows.length,
      registered: rows.filter((row) => row.status === 'registered').length,
      available: rows.filter((row) => row.status === 'available').length,
      globalRegistered: registrations.length,
    };

    let filtered = rows;
    if (status === 'registered' || status === 'available') filtered = filtered.filter((row) => row.status === status);
    if (municipio) filtered = filtered.filter((row) => row.municipio === municipio);
    if (search) {
      filtered = filtered.filter((row) => {
        if (String(row.cardNumber).includes(search)) return true;
        const haystack = `${row.nombreCompleto ?? ''} ${row.numeroIdentificacion ?? ''} ${row.contacto ?? ''} ${row.assignedToName ?? ''}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    const total = filtered.length;
    const data = filtered.slice((page - 1) * perPage, page * perPage);
    response.json({ data, total, page, perPage, summary });
  } catch (error) {
    console.error('Error listando cartones asignados:', error);
    response.status(500).json({ message: 'No fue posible cargar los cartones asignados.' });
  }
};

/**
 * Vacía el padrón de personas inscritas en cartones sin eliminar los bloques
 * asignados, los usuarios ni el historial consolidado de ganadores.
 */
export const clearAllAssignedCardRegistrations = async (_request: Request, response: Response) => {
  try {
    const [result] = await db.query<ResultSetHeader>('DELETE FROM card_registrations');
    response.json({
      data: { deleted: result.affectedRows },
      message: result.affectedRows === 1
        ? 'Se eliminó 1 registro de cartón.'
        : `Se eliminaron ${result.affectedRows} registros de cartones.`,
    });
  } catch (error) {
    console.error('Error borrando los registros de cartones:', error);
    response.status(500).json({ message: 'No fue posible borrar los registros de cartones.' });
  }
};
