import bcrypt from 'bcryptjs';
import db from '../database';
import { RowDataPacket } from 'mysql2';

export type UserRole = 'admin' | 'registrador';

export interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  full_name: string;
  password_hash: string;
  role: UserRole;
  active: number;
  created_at: string;
}

export interface PublicUser {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export const toPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  username: row.username,
  fullName: row.full_name,
  role: row.role,
  active: Boolean(row.active),
  createdAt: row.created_at,
});

const DEFAULT_ADMIN_USERNAME = process.env.BINGO_ADMIN_USER ?? 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.BINGO_ADMIN_PASSWORD ?? 'admin123';

export const ensureAuthTables = async (): Promise<void> => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(60) NOT NULL UNIQUE,
      full_name VARCHAR(120) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','registrador') NOT NULL DEFAULT 'registrador',
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS card_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      start_card INT NOT NULL,
      end_card INT NOT NULL,
      municipio VARCHAR(40) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_assignment_user (user_id),
      INDEX idx_assignment_range (start_card, end_card),
      CONSTRAINT fk_assignment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [assignmentMunicipalityColumns] = await db.query<RowDataPacket[]>(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'card_assignments' AND COLUMN_NAME = 'municipio'
  `);
  if (assignmentMunicipalityColumns.length === 0) {
    await db.query('ALTER TABLE card_assignments ADD COLUMN municipio VARCHAR(40) NULL AFTER end_card');
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS card_registrations (
      card_number INT NOT NULL PRIMARY KEY,
      municipio VARCHAR(40) NOT NULL,
      nombre_completo VARCHAR(160) NOT NULL,
      tipo_identificacion VARCHAR(10) NOT NULL,
      numero_identificacion VARCHAR(30) NOT NULL,
      genero VARCHAR(10) NOT NULL,
      fecha_nacimiento DATE NOT NULL,
      desplazado VARCHAR(5) NOT NULL,
      contacto VARCHAR(30) NOT NULL,
      sector VARCHAR(15) NOT NULL,
      nombre_residencia VARCHAR(160) NOT NULL,
      discapacidad VARCHAR(5) NOT NULL,
      tipo_discapacidad VARCHAR(30) NULL,
      cuidador VARCHAR(5) NOT NULL,
      adulto_mayor VARCHAR(5) NOT NULL DEFAULT 'NO',
      registered_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_registration_municipio (municipio),
      INDEX idx_registration_user (registered_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Las instalaciones existentes reciben la columna una sola vez y se clasifican
  // automáticamente usando la edad cumplida en la fecha de la migración.
  const [adultColumns] = await db.query<RowDataPacket[]>(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'card_registrations' AND COLUMN_NAME = 'adulto_mayor'
  `);
  if (adultColumns.length === 0) {
    await db.query("ALTER TABLE card_registrations ADD COLUMN adulto_mayor VARCHAR(5) NOT NULL DEFAULT 'NO' AFTER cuidador");
    await db.query("UPDATE card_registrations SET adulto_mayor = 'SI' WHERE TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) >= 60");
  }
  // Solo se infiere cuando todos los registros históricos del bloque coinciden.
  // Se repite de forma segura al iniciar para recuperarse de migraciones interrumpidas.
  await db.query(`
    UPDATE card_assignments a
    JOIN (
      SELECT a2.id, MIN(r.municipio) municipio
      FROM card_assignments a2
      JOIN card_registrations r ON r.card_number BETWEEN a2.start_card AND a2.end_card
      GROUP BY a2.id HAVING COUNT(DISTINCT r.municipio) = 1
    ) inferred ON inferred.id = a.id
    SET a.municipio = inferred.municipio
    WHERE a.municipio IS NULL
  `);

  const [admins] = await db.query<UserRow[]>("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (admins.length === 0) {
    const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await db.query(
      "INSERT INTO users (username, full_name, password_hash, role) VALUES (?, ?, ?, 'admin')",
      [DEFAULT_ADMIN_USERNAME, 'Administrador', hash]
    );
    console.log(`Usuario administrador creado: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD}`);
  }
};

export const findUserByUsername = async (username: string): Promise<UserRow | null> => {
  const [rows] = await db.query<UserRow[]>('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] ?? null;
};

export const findUserById = async (id: number): Promise<UserRow | null> => {
  const [rows] = await db.query<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
};
