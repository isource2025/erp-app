require("dotenv").config();
const sql = require("mssql");

const hasPort = !!process.env.DB_PORT;
const hasInstance = !!process.env.DB_INSTANCE;

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Lógica de Aclysa
if (hasInstance && !hasPort) {
  config.options.instanceName = process.env.DB_INSTANCE;
  console.log(`Usando instanceName: ${process.env.DB_INSTANCE}`);
} else if (hasPort) {
  config.port = parseInt(process.env.DB_PORT);
  console.log(`Usando port: ${process.env.DB_PORT}`);
}

async function testConnection() {
  console.log("🔌 Probando conexión a UEP con configuración de Aclysa...\n");
  console.log(`Server: ${config.server}`);
  console.log(`Database: ${config.database}`);
  console.log(`Instance: ${config.options.instanceName || 'N/A'}`);
  console.log(`Port: ${config.port || 'N/A'}`);
  console.log(`User: ${config.user}\n`);

  try {
    console.log("Conectando...");
    const pool = await sql.connect(config);
    console.log("✅ Conexión exitosa a UEP!\n");
    
    const result = await pool.request().query("SELECT DB_NAME() as dbname");
    console.log(`✅ Base de datos actual: ${result.recordset[0].dbname}`);
    
    // Verificar tabla imPersonal
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
      
      console.log(`${checkPassword.recordset.length > 0 ? '✅' : '⚠️ '} Campo Password: ${checkPassword.recordset.length > 0 ? 'EXISTE' : 'NO EXISTE'}`);
      
      // Contar usuarios con email
      const countUsers = await pool.request().query(`
        SELECT COUNT(*) as total 
        FROM imPersonal 
        WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> ''
      `);
      
      console.log(`📊 Usuarios con email: ${countUsers.recordset[0].total}`);
    } else {
      console.log("⚠️  Tabla imPersonal NO existe");
    }
    
    await pool.close();
  } catch (error) {
    console.error("❌ Error de conexión:", error.message);
  }
}

testConnection();
