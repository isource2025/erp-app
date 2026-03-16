require("dotenv").config();
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || "1433"),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

async function listDatabases() {
  console.log("Conectando al servidor SQL Server...");
  console.log(`Server: ${config.server}:${config.port}`);
  console.log(`User: ${config.user}\n`);

  try {
    const pool = await sql.connect(config);
    console.log("✅ Conexión exitosa al servidor!\n");
    
    const result = await pool.request().query(`
      SELECT name 
      FROM sys.databases 
      WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
      ORDER BY name
    `);
    
    console.log("Bases de datos disponibles:");
    console.log("=".repeat(40));
    result.recordset.forEach((db, idx) => {
      console.log(`${idx + 1}. ${db.name}`);
    });
    
    await pool.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

listDatabases();
