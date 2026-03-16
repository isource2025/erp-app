require("dotenv").config();
const { getPool } = require("./src/config/db");

async function checkImPersonal() {
  console.log("🔍 Analizando tabla imPersonal en UEP...\n");
  
  try {
    const pool = await getPool();
    
    // Verificar base de datos
    const dbCheck = await pool.request().query("SELECT DB_NAME() as dbname");
    console.log(`📊 Base de datos: ${dbCheck.recordset[0].dbname}\n`);
    
    // Obtener todas las columnas de imPersonal
    const columns = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'imPersonal'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log("📋 Columnas de imPersonal:");
    console.log("=".repeat(80));
    columns.recordset.forEach(col => {
      const maxLen = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`${col.COLUMN_NAME.padEnd(30)} | ${col.DATA_TYPE.padEnd(15)}${maxLen.padEnd(8)} | ${nullable}`);
    });
    
    // Verificar si existe campo Password
    const hasPassword = columns.recordset.some(c => c.COLUMN_NAME === 'Password');
    console.log(`\n✅ Campo Password: ${hasPassword ? 'EXISTE' : 'NO EXISTE'}`);
    
    // Contar registros
    const count = await pool.request().query("SELECT COUNT(*) as total FROM imPersonal");
    console.log(`📊 Total de registros: ${count.recordset[0].total}`);
    
    // Contar registros con email
    const countEmail = await pool.request().query(`
      SELECT COUNT(*) as total 
      FROM imPersonal 
      WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> ''
    `);
    console.log(`📧 Registros con email: ${countEmail.recordset[0].total}`);
    
    await pool.close();
    console.log("\n✅ Análisis completado!\n");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

checkImPersonal();
