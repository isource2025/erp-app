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
    instanceName: process.env.DB_INSTANCE,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

async function testConnection() {
  console.log("Probando conexión con instancia:");
  console.log(`  Server: ${config.server}`);
  console.log(`  Instance: ${config.options.instanceName}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}\n`);

  try {
    console.log("Conectando...");
    const pool = await sql.connect(config);
    console.log("✅ Conexión exitosa!");
    
    const result = await pool.request().query("SELECT DB_NAME() as dbname, @@VERSION as version");
    console.log(`✅ Base de datos actual: ${result.recordset[0].dbname}`);
    console.log(`✅ Versión SQL Server: ${result.recordset[0].version.split('\n')[0]}`);
    
    await pool.close();
  } catch (error) {
    console.error("❌ Error de conexión:", error.message);
  }
}

testConnection();
