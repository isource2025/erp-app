require("dotenv").config();
const { getPool } = require("./src/config/db");

async function checkCbtesFecha() {
  console.log("🔍 Verificando formato de fechas en cbtes...\n");
  
  try {
    const pool = await getPool();
    
    // Verificar estructura de la columna Fecha
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'cbtes' AND COLUMN_NAME = 'Fecha'
    `);
    
    console.log("📋 Estructura de columna Fecha:");
    console.log(columns.recordset);
    
    // Obtener algunos registros de ejemplo
    const sample = await pool.request().query(`
      SELECT TOP 5 
        IdTransaccion,
        Fecha,
        Ano,
        Mes,
        TipoCbte,
        NroCbte,
        Descripcion,
        ImporteTotal
      FROM cbtes 
      WHERE TipoCbte = 'RC' AND IDStatus <> 0
      ORDER BY IdTransaccion DESC
    `);
    
    console.log("\n📊 Registros de ejemplo:");
    console.log("=".repeat(100));
    sample.recordset.forEach(r => {
      console.log(`ID: ${r.IdTransaccion}`);
      console.log(`  Fecha: ${r.Fecha} (tipo: ${typeof r.Fecha})`);
      console.log(`  Año/Mes: ${r.Ano}/${r.Mes}`);
      console.log(`  Tipo: ${r.TipoCbte} - N°: ${r.NroCbte}`);
      console.log(`  Cliente: ${r.Descripcion?.trim()}`);
      console.log(`  Importe: ${r.ImporteTotal}`);
      console.log("");
    });
    
    await pool.close();
    console.log("✅ Verificación completada!\n");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

checkCbtesFecha();
