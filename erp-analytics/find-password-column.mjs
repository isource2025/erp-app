import sql from "mssql";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

async function findPasswordColumn() {
  const pool = await sql.connect(config);
  
  // Get ALL columns from imPersonal
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'imPersonal' 
    ORDER BY ORDINAL_POSITION
  `);
  
  console.log("TODAS las columnas en imPersonal:");
  console.log("=".repeat(60));
  cols.recordset.forEach(c => {
    const marker = c.COLUMN_NAME.toLowerCase().includes('pass') ? ' ← ESTE' : '';
    console.log(`${c.ORDINAL_POSITION}. ${c.COLUMN_NAME} (${c.DATA_TYPE})${marker}`);
  });
  
  // Try to select all columns
  const sample = await pool.request().query(`SELECT TOP 1 * FROM imPersonal WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> ''`);
  
  console.log("\n\nColumnas disponibles en el resultado:");
  console.log("=".repeat(60));
  if (sample.recordset.length > 0) {
    Object.keys(sample.recordset[0]).forEach((key, idx) => {
      const marker = key.toLowerCase().includes('pass') ? ' ← ESTE' : '';
      console.log(`${idx + 1}. ${key}${marker}`);
    });
  }
  
  await pool.close();
}

findPasswordColumn().catch(console.error);
