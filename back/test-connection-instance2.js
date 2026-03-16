require("dotenv").config();
const sql = require("mssql");

// Cuando usas instanceName, NO uses port
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: process.env.DB_INSTANCE,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

async function testConnection() {
  console.log("Probando conexión con instancia (sin puerto):");
  console.log(`  Server: ${config.server}\\${config.options.instanceName}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}\n`);

  try {
    console.log("Conectando...");
    const pool = await sql.connect(config);
    console.log("✅ Conexión exitosa!");
    
    const result = await pool.request().query("SELECT DB_NAME() as dbname");
    console.log(`✅ Base de datos actual: ${result.recordset[0].dbname}`);
    
    // Verificar si existe tabla imPersonal
    const checkTable = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'imPersonal'
    `);
    
    if (checkTable.recordset.length > 0) {
      console.log("✅ Tabla imPersonal existe");
      
      // Verificar campo Password
      const checkPassword = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'imPersonal' AND COLUMN_NAME = 'Password'
      `);
      
      console.log(`✅ Campo Password: ${checkPassword.recordset.length > 0 ? 'EXISTE' : 'NO EXISTE'}`);
    } else {
      console.log("⚠️  Tabla imPersonal NO existe");
    }
    
    await pool.close();
  } catch (error) {
    console.error("❌ Error de conexión:", error.message);
  }
}

testConnection();
