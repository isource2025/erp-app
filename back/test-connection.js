require("dotenv").config();
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "1433"),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

async function testConnection() {
  console.log("Probando conexión con:");
  console.log(`  Server: ${config.server}:${config.port}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}`);
  console.log("");

  try {
    console.log("Conectando...");
    const pool = await sql.connect(config);
    console.log("✅ Conexión exitosa!");
    
    const result = await pool.request().query("SELECT DB_NAME() as dbname");
    console.log(`✅ Base de datos actual: ${result.recordset[0].dbname}`);
    
    await pool.close();
  } catch (error) {
    console.error("❌ Error de conexión:", error.message);
    console.error("\nDetalles del error:", error);
  }
}

testConnection();
