require("dotenv").config();
const { getPool } = require("./src/config/db");

async function checkRecibosStructure() {
  console.log("🔍 Verificando estructura de recibos/cobros...\n");
  
  try {
    const pool = await getPool();
    
    // Verificar si existe tabla Recibos
    const tablesCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('Recibos', 'cbtes')
      ORDER BY TABLE_NAME
    `);
    
    console.log("📋 Tablas disponibles:");
    tablesCheck.recordset.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
    
    // Verificar tipos de comprobantes en cbtes
    const tiposCheck = await pool.request().query(`
      SELECT TipoCbte, COUNT(*) as cantidad
      FROM cbtes
      WHERE IDStatus <> 0
      GROUP BY TipoCbte
      ORDER BY cantidad DESC
    `);
    
    console.log("\n📊 Tipos de comprobantes en cbtes:");
    tiposCheck.recordset.forEach(t => {
      console.log(`  ${t.TipoCbte}: ${t.cantidad} registros`);
    });
    
    // Verificar recibos (RC)
    const recibosStats = await pool.request().query(`
      SELECT 
        COUNT(*) as total_recibos,
        SUM(ImporteTotal) as total_cobrado,
        MIN(Fecha) as fecha_min,
        MAX(Fecha) as fecha_max
      FROM cbtes
      WHERE TipoCbte = 'RC' AND IDStatus <> 0
    `);
    
    console.log("\n💰 Estadísticas de Recibos (RC = Cobrado):");
    const stats = recibosStats.recordset[0];
    console.log(`  Total recibos: ${stats.total_recibos}`);
    console.log(`  Total cobrado: $${stats.total_cobrado?.toLocaleString('es-AR')}`);
    console.log(`  Fecha más antigua: ${stats.fecha_min?.toLocaleDateString('es-AR')}`);
    console.log(`  Fecha más reciente: ${stats.fecha_max?.toLocaleDateString('es-AR')}`);
    
    // Verificar si existe tabla Recibos separada
    const recibosTableCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Recibos'
    `);
    
    if (recibosTableCheck.recordset[0].count > 0) {
      const recibosCount = await pool.request().query(`SELECT COUNT(*) as total FROM Recibos`);
      console.log(`\n📝 Tabla Recibos separada: ${recibosCount.recordset[0].total} registros`);
    } else {
      console.log("\n📝 No existe tabla Recibos separada");
    }
    
    // Muestra de recibos recientes
    console.log("\n📋 Últimos 5 recibos:");
    const sample = await pool.request().query(`
      SELECT TOP 5
        Fecha,
        NroCbte,
        LTRIM(RTRIM(Descripcion)) as cliente,
        ImporteTotal,
        Saldo
      FROM cbtes
      WHERE TipoCbte = 'RC' AND IDStatus <> 0
      ORDER BY Fecha DESC
    `);
    
    sample.recordset.forEach(r => {
      console.log(`  ${r.Fecha.toLocaleDateString('es-AR')} - RC ${r.NroCbte} - ${r.cliente} - $${r.ImporteTotal?.toLocaleString('es-AR')}`);
    });
    
    await pool.close();
    console.log("\n✅ Verificación completada!\n");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

checkRecibosStructure();
