// Prepara la base de datos de BINGO: crea `bingo` e importa ../bingo.sql solo si aun no existe.
// Nunca sobrescribe datos: si la tabla bingocards ya existe, no hace nada.
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({ host: "localhost", user: "root", password: "", multipleStatements: true });
  try {
    await conn.query("CREATE DATABASE IF NOT EXISTS `bingo` DEFAULT CHARACTER SET utf8");
    const [rows] = await conn.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'bingo' AND table_name = 'bingocards' LIMIT 1"
    );
    if (rows.length > 0) {
      console.log("Base de datos 'bingo' ya existe. Sin cambios.");
      return;
    }
    const sql = fs.readFileSync(path.join(__dirname, "..", "bingo.sql"), "utf8");
    await conn.query(sql);
    console.log("Base de datos 'bingo' creada e importada.");
  } finally {
    await conn.end();
  }
})().catch((error) => {
  console.error("No fue posible preparar la base de datos:", error.message);
  process.exit(1);
});
