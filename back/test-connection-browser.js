require("dotenv").config();
const sql = require("mssql");

// Intentar con SQL Browser (puerto 1434 UDP)
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: process.env.DB_INSTANCE,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

console.log("Intentando conectar usando SQL Browser Service...");
console.log(`Server: ${config.server}`);
console.log(`Instance: ${config.options.instanceName}`);
console.log(`Database: ${config.database}\n`);

sql.connect(config)
  .then(pool => {
    console.log("✅ Conexión exitosa!");
    return pool.request().query("SELECT DB_NAME() as dbname");
  })
  .then(result => {
    console.log(`✅ Base de datos: ${result.recordset[0].dbname}`);
    sql.close();
  })
  .catch(err => {
    console.error("❌ Error:", err.message);
    console.log("\n💡 Sugerencias:");
    console.log("1. Verifica que SQL Server Browser esté corriendo");
    console.log("2. Verifica que el puerto 1434 UDP esté abierto");
    console.log("3. Verifica que la instancia acepte conexiones remotas");
    console.log("4. O usa una base de datos en el servidor principal (sin instancia)");
  });
