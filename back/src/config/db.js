const sql = require("mssql");

const hasPort = !!process.env.DB_PORT;
const hasInstance = !!process.env.DB_INSTANCE;

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Lógica de Aclysa: si hay instance pero NO hay port, usa instanceName
// Si hay port, usa el puerto (ignora instance)
if (hasInstance && !hasPort) {
  config.options.instanceName = process.env.DB_INSTANCE;
} else if (hasPort) {
  config.port = parseInt(process.env.DB_PORT);
}

let pool = null;

async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }
  pool = await sql.connect(config);
  return pool;
}

module.exports = { getPool, sql };
