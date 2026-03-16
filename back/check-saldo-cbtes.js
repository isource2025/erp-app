require("dotenv").config();
const { getPool } = require("./src/config/db");

async function checkSaldoCbtes() {
  console.log("🔍 Verificando saldos en cbtes...\n");
  
  try {
    const pool = await getPool();
    
    // Verificar facturas de MC SALUD S.A. del 9/3/2026
    const query = `
      SELECT TOP 10
        Fecha,
        TipoCbte,
        NroCbte,
        LTRIM(RTRIM(Descripcion)) as Cliente,
        ImporteTotal,
        Saldo,
        Saldo_Inicial,
        IDStatus
      FROM cbtes
      WHERE LTRIM(RTRIM(Descripcion)) LIKE '%MC SALUD%'
        AND MONTH(Fecha) = 3
        AND YEAR(Fecha) = 2026
      ORDER BY Fecha DESC, NroCbte DESC
    `;
    
    const result = await pool.request().query(query);
    
    console.log("📋 Comprobantes de MC SALUD S.A. en marzo 2026:\n");
    
    result.recordset.forEach(r => {
      console.log(`Fecha: ${r.Fecha.toLocaleDateString('es-AR')}`);
      console.log(`Tipo: ${r.TipoCbte} - N°: ${r.NroCbte}`);
      console.log(`Cliente: ${r.Cliente}`);
      console.log(`Importe Total: $${r.ImporteTotal?.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
      console.log(`Saldo Inicial: $${r.Saldo_Inicial?.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
      console.log(`Saldo Actual: $${r.Saldo?.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
      console.log(`Estado: ${r.IDStatus}`);
      console.log('---');
    });
    
    // Verificar si hay notas de crédito relacionadas
    console.log("\n📋 Notas de Crédito de MC SALUD S.A.:\n");
    const ncQuery = `
      SELECT TOP 5
        Fecha,
        TipoCbte,
        NroCbte,
        ImporteTotal,
        Saldo
      FROM cbtes
      WHERE LTRIM(RTRIM(Descripcion)) LIKE '%MC SALUD%'
        AND TipoCbte = 'NC'
      ORDER BY Fecha DESC
    `;
    
    const ncResult = await pool.request().query(ncQuery);
    ncResult.recordset.forEach(r => {
      console.log(`${r.Fecha.toLocaleDateString('es-AR')} - ${r.TipoCbte} ${r.NroCbte}: Total=$${r.ImporteTotal?.toLocaleString('es-AR')}, Saldo=$${r.Saldo?.toLocaleString('es-AR')}`);
    });
    
    await pool.close();
    console.log("\n✅ Verificación completada!\n");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

checkSaldoCbtes();
