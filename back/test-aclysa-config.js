require("dotenv").config();
const sql = require("mssql");

// Configuración EXACTA de Aclysa
const dbConfig = {
  server: '186.124.198.40',
  database: 'iSource',
  user: 'sa',
  password: 'isource',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

console.log("🔌 Probando con configuración EXACTA de Aclysa...\n");
console.log("Config:", JSON.stringify(dbConfig, null, 2));

async function testConnection() {
  try {
    console.log("\nConectando...");
    const pool = await sql.connect(dbConfig);
    console.log("✅ CONEXIÓN EXITOSA!\n");
    
    const result = await pool.request().query("SELECT DB_NAME() as dbname, @@VERSION as version");
    console.log(`Base de datos: ${result.recordset[0].dbname}`);
    console.log(`Versión: ${result.recordset[0].version.split('\n')[0]}\n`);
    
    // Verificar tabla imPersonal
    const checkTable = await pool.request().query(`
      SELECT COUNT(*) as total 
      FROM imPersonal 
      WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> ''
    `);
    console.log(`✅ Usuarios con email en imPersonal: ${checkTable.recordset[0].total}`);
    
    await pool.close();
    console.log("\n✅ Todo funciona correctamente!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("\nStack:", error.stack);
  }
}

testConnection();
