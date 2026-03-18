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

async function check() {
  const pool = await sql.connect(config);
  
  // Check columns
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'imPersonal' 
    ORDER BY ORDINAL_POSITION
  `);
  
  console.log("Columnas en imPersonal:");
  cols.recordset.forEach(c => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
  
  const hasPassword = cols.recordset.some(c => c.COLUMN_NAME.toLowerCase() === 'password');
  console.log(`\n¿Tiene campo password? ${hasPassword ? 'SÍ' : 'NO'}`);
  
  // Sample with email
  const sample = await pool.request().query(`
    SELECT TOP 3 Valor, ApellidoNombre, email 
    FROM imPersonal 
    WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> ''
  `);
  
  console.log("\nMuestra de registros con email:");
  sample.recordset.forEach(r => {
    console.log(`  Valor: ${r.Valor}, Nombre: ${r.ApellidoNombre?.trim()}, Email: ${r.email?.trim()}`);
  });
  
  await pool.close();
}

check().catch(console.error);
