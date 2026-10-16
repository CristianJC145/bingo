import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import db from '../database';
import {
  isValidGenero,
  isValidMunicipio,
  isValidSector,
  isValidSiNo,
  isValidTipoDiscapacidad,
  isValidTipoIdentificacion,
} from '../constants/catalogs';

interface RangeRow extends RowDataPacket {
  start_card: number;
  end_card: number;
  municipio: string | null;
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
  registered_by_name?: string | null;
  updated_at: string;
}

const toIsoDate = (value: string | Date): string => {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
};

const mapRegistration = (row: RegistrationRow) => ({
  cardNumber: row.card_number,
  municipio: row.municipio,
  nombreCompleto: row.nombre_completo,
  tipoIdentificacion: row.tipo_identificacion,
  numeroIdentificacion: row.numero_identificacion,
  genero: row.genero,
  fechaNacimiento: toIsoDate(row.fecha_nacimiento),
  desplazado: row.desplazado,
  contacto: row.contacto,
  sector: row.sector,
  nombreResidencia: row.nombre_residencia,
  discapacidad: row.discapacidad,
  tipoDiscapacidad: row.tipo_discapacidad,
  cuidador: row.cuidador,
  adultoMayor: row.adulto_mayor,
  registeredBy: row.registered_by,
  registeredByName: row.registered_by_name ?? null,
  updatedAt: row.updated_at,
});

/** Rangos de cartones visibles para el usuario (todos si es admin). */
const getVisibleRanges = async (request: Request): Promise<{ start: number; end: number; municipio: string | null }[]> => {
  const isAdmin = request.user?.role === 'admin';
  const [rows] = await db.query<RangeRow[]>(
    isAdmin
      ? 'SELECT start_card, end_card, municipio FROM card_assignments ORDER BY start_card ASC'
      : 'SELECT start_card, end_card, municipio FROM card_assignments WHERE user_id = ? ORDER BY start_card ASC',
    isAdmin ? [] : [request.user!.id]
  );
  return rows.map((row) => ({ start: row.start_card, end: row.end_card, municipio: row.municipio }));
};

const enumerateRange = (ranges: { start: number; end: number; municipio: string | null }[]): number[] => {
  const numbers: number[] = [];
  ranges.forEach(({ start, end }) => {
    for (let card = start; card <= end; card++) numbers.push(card);
  });
  return numbers;
};

const rangeWhereClause = (ranges: { start: number; end: number; municipio: string | null }[]) => {
  const clause = ranges.map(() => '(card_number BETWEEN ? AND ?)').join(' OR ');
  const params = ranges.flatMap(({ start, end }) => [start, end]);
  return { clause: `(${clause})`, params };
};

export const listRegistrations = async (request: Request, response: Response) => {
  const status = String(request.query.status ?? 'all');
  const search = String(request.query.search ?? '').trim();
  const page = Math.max(1, Number(request.query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(request.query.perPage) || 15));

  try {
    const ranges = await getVisibleRanges(request);
    if (ranges.length === 0) {
      response.json({ data: [], total: 0, perPage, summary: { total: 0, registered: 0, available: 0 } });
      return;
    }

    const { clause, params } = rangeWhereClause(ranges);
    const [registeredRows] = await db.query<RegistrationRow[]>(
      `SELECT r.*, u.full_name AS registered_by_name
       FROM card_registrations r
       LEFT JOIN users u ON u.id = r.registered_by
       WHERE ${clause}
       ORDER BY r.card_number ASC`,
      params
    );

    const registeredByCard = new Map(registeredRows.map((row) => [row.card_number, row]));
    const allCards = enumerateRange(ranges);
    const summary = {
      total: allCards.length,
      registered: registeredRows.length,
      available: allCards.length - registeredRows.length,
    };

    const matchesSearch = (cardNumber: number): boolean => {
      if (!search) return true;
      if (String(cardNumber).includes(search)) return true;
      const registration = registeredByCard.get(cardNumber);
      if (!registration) return false;
      const haystack = `${registration.nombre_completo} ${registration.numero_identificacion}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    };

    let cards = allCards;
    if (status === 'registered') cards = cards.filter((card) => registeredByCard.has(card));
    else if (status === 'available') cards = cards.filter((card) => !registeredByCard.has(card));
    cards = cards.filter(matchesSearch);

    const total = cards.length;
    const pageCards = cards.slice((page - 1) * perPage, page * perPage);
    const data = pageCards.map((cardNumber) => {
      const registration = registeredByCard.get(cardNumber);
      return registration
        ? { ...mapRegistration(registration), assignedMunicipio: ranges.find((range) => cardNumber >= range.start && cardNumber <= range.end)?.municipio ?? null, status: 'registered' as const }
        : { cardNumber, municipio: ranges.find((range) => cardNumber >= range.start && cardNumber <= range.end)?.municipio ?? null, assignedMunicipio: ranges.find((range) => cardNumber >= range.start && cardNumber <= range.end)?.municipio ?? null, status: 'available' as const };
    });

    response.json({ data, total, perPage, summary });
  } catch (error) {
    console.error('Error listando registros:', error);
    response.status(500).json({ message: 'No fue posible cargar los cartones.' });
  }
};

interface ValidationResult { valid: boolean; message?: string; }

/** Calcula años cumplidos sin depender de zona horaria ni aproximar por milisegundos. */
const isOlderAdult = (isoDate: string, today = new Date()): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return false;
  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  const birthDay = Number(match[3]);
  let age = today.getFullYear() - birthYear;
  const currentMonth = today.getMonth() + 1;
  if (currentMonth < birthMonth || (currentMonth === birthMonth && today.getDate() < birthDay)) age -= 1;
  return age >= 60;
};

const validatePayload = (body: Record<string, unknown>): ValidationResult => {
  const text = (value: unknown) => String(value ?? '').trim();
  const requiredText: [string, string][] = [
    [text(body.nombreCompleto), 'el nombre completo'],
    [text(body.numeroIdentificacion), 'el número de identificación'],
    [text(body.contacto), 'el número de contacto'],
    [text(body.nombreResidencia), 'el nombre de la residencia'],
  ];
  for (const [value, label] of requiredText) {
    if (!value) return { valid: false, message: `Debes diligenciar ${label}.` };
  }
  if (!/^\d{6,15}$/.test(text(body.numeroIdentificacion))) return { valid: false, message: 'El número de identificación debe tener entre 6 y 15 dígitos.' };
  if (!/^\d{7,15}$/.test(text(body.contacto))) return { valid: false, message: 'El contacto debe ser un número de teléfono entre 7 y 15 dígitos.' };
  if (!isValidMunicipio(text(body.municipio))) return { valid: false, message: 'Selecciona un municipio válido.' };
  if (!isValidTipoIdentificacion(text(body.tipoIdentificacion))) return { valid: false, message: 'Selecciona el tipo de identificación.' };
  if (!isValidGenero(text(body.genero))) return { valid: false, message: 'Selecciona el género.' };
  if (!isValidSector(text(body.sector))) return { valid: false, message: 'Selecciona el sector.' };
  if (!isValidSiNo(text(body.desplazado))) return { valid: false, message: 'Indica si la persona es desplazada.' };
  if (!isValidSiNo(text(body.discapacidad))) return { valid: false, message: 'Indica si la persona tiene discapacidad.' };
  if (!isValidSiNo(text(body.cuidador))) return { valid: false, message: 'Indica si la persona tiene cuidador.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(body.fechaNacimiento))) return { valid: false, message: 'Ingresa una fecha de nacimiento válida.' };
  if (body.adultoMayor !== undefined && !isValidSiNo(text(body.adultoMayor))) return { valid: false, message: 'Indica si la persona es adulta mayor.' };
  if (text(body.discapacidad) === 'SI' && !isValidTipoDiscapacidad(text(body.tipoDiscapacidad))) {
    return { valid: false, message: 'Selecciona el tipo de discapacidad.' };
  }
  return { valid: true };
};

export const saveRegistration = async (request: Request, response: Response) => {
  const cardNumber = Number(request.params.cardNumber);
  if (!Number.isInteger(cardNumber) || cardNumber <= 0) {
    response.status(400).json({ message: 'Número de cartón inválido.' });
    return;
  }

  try {
    const ranges = await getVisibleRanges(request);
    const assignment = ranges.find(({ start, end }) => cardNumber >= start && cardNumber <= end);
    if (!assignment) {
      response.status(403).json({ message: 'Este cartón no está dentro de los bloques asignados a tu usuario.' });
      return;
    }
    if (!assignment.municipio) {
      response.status(409).json({ message: 'El administrador debe definir el municipio de este bloque antes de registrar cartones.' });
      return;
    }

    const body: Record<string, unknown> = { ...(request.body as Record<string, unknown>), municipio: assignment.municipio };
    const validation = validatePayload(body);
    if (!validation.valid) {
      response.status(400).json({ message: validation.message });
      return;
    }
    const text = (value: unknown) => String(value ?? '').trim();
    const hasDiscapacidad = text(body.discapacidad) === 'SI';
    const eligibleOlderAdult = isOlderAdult(text(body.fechaNacimiento));
    // Clientes antiguos que no envíen el campo también obtienen la detección automática.
    const adultoMayor = eligibleOlderAdult && text(body.adultoMayor) !== 'NO' ? 'SI' : 'NO';

    await db.query(
      `INSERT INTO card_registrations
        (card_number, municipio, nombre_completo, tipo_identificacion, numero_identificacion, genero, fecha_nacimiento,
         desplazado, contacto, sector, nombre_residencia, discapacidad, tipo_discapacidad, cuidador, adulto_mayor, registered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        municipio = VALUES(municipio), nombre_completo = VALUES(nombre_completo),
        tipo_identificacion = VALUES(tipo_identificacion), numero_identificacion = VALUES(numero_identificacion),
        genero = VALUES(genero), fecha_nacimiento = VALUES(fecha_nacimiento), desplazado = VALUES(desplazado),
        contacto = VALUES(contacto), sector = VALUES(sector), nombre_residencia = VALUES(nombre_residencia),
        discapacidad = VALUES(discapacidad), tipo_discapacidad = VALUES(tipo_discapacidad), cuidador = VALUES(cuidador),
        adulto_mayor = VALUES(adulto_mayor)`,
      [
        cardNumber,
        text(body.municipio),
        text(body.nombreCompleto),
        text(body.tipoIdentificacion),
        text(body.numeroIdentificacion),
        text(body.genero),
        text(body.fechaNacimiento),
        text(body.desplazado),
        text(body.contacto),
        text(body.sector),
        text(body.nombreResidencia),
        text(body.discapacidad),
        hasDiscapacidad ? text(body.tipoDiscapacidad) : null,
        text(body.cuidador),
        adultoMayor,
        request.user!.id,
      ]
    );

    const [rows] = await db.query<RegistrationRow[]>(
      `SELECT r.*, u.full_name AS registered_by_name FROM card_registrations r
       LEFT JOIN users u ON u.id = r.registered_by WHERE r.card_number = ?`,
      [cardNumber]
    );
    response.json({ data: { ...mapRegistration(rows[0]), status: 'registered' }, message: `Cartón ${cardNumber} registrado correctamente.` });
  } catch (error) {
    console.error('Error guardando registro:', error);
    response.status(500).json({ message: 'No fue posible guardar el registro.' });
  }
};

export const deleteRegistration = async (request: Request, response: Response) => {
  const cardNumber = Number(request.params.cardNumber);
  try {
    const ranges = await getVisibleRanges(request);
    const isWithinRanges = ranges.some(({ start, end }) => cardNumber >= start && cardNumber <= end);
    if (!isWithinRanges) {
      response.status(403).json({ message: 'Este cartón no está dentro de los bloques asignados a tu usuario.' });
      return;
    }
    await db.query('DELETE FROM card_registrations WHERE card_number = ?', [cardNumber]);
    response.json({ message: `Registro del cartón ${cardNumber} eliminado.` });
  } catch (error) {
    console.error('Error eliminando registro:', error);
    response.status(500).json({ message: 'No fue posible eliminar el registro.' });
  }
};
