require("dotenv").config();
const { getPool } = require("./src/config/db");

async function testCobranzasQuery() {
  console.log("🔍 Probando query de cobranzas...\n");
  
  try {
    const pool = await getPool();
    
    // Query actual que estamos usando
    const query = `
      SELECT 
        CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END as ano,
        CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END as mes,
        SUM(c.ImporteTotal) as total_cobrado, 
        COUNT(*) as cantidad_recibos
      FROM cbtes c 
      WHERE c.TipoCbte = 'RC' AND c.IDStatus <> 0
      GROUP BY 
        CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END,
        CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END
      ORDER BY ano DESC, mes DESC
    `;
    
    const result = await pool.request().query(query);
    
    console.log(`📊 Total de períodos encontrados: ${result.recordset.length}\n`);
    
    console.log("Primeros 10 períodos:");
    result.recordset.slice(0, 10).forEach(r => {
      console.log(`  ${r.ano}-${String(r.mes).padStart(2, '0')}: ${r.cantidad_recibos} recibos - $${r.total_cobrado?.toLocaleString('es-AR')}`);
    });
    
    // Verificar distribución de fechas
    console.log("\n📅 Distribución de recibos por año:");
    const porAno = await pool.request().query(`
      SELECT 
        YEAR(Fecha) as ano,
        COUNT(*) as cantidad
      FROM cbtes
      WHERE TipoCbte = 'RC' AND IDStatus <> 0
      GROUP BY YEAR(Fecha)
      ORDER BY ano DESC
    `);
    
    porAno.recordset.forEach(r => {
      console.log(`  ${r.ano}: ${r.cantidad} recibos`);
    });
    
    await pool.close();
    console.log("\n✅ Prueba completada!\n");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

testCobranzasQuery();
