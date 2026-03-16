require("dotenv").config();
const { getPool } = require("./src/config/db");

async function checkTablesStructure() {
  console.log("🔍 Verificando estructura de tablas para reportes...\n");
  
  try {
    const pool = await getPool();
    
    // Verificar columnas de cbtes (facturas y recibos)
    console.log("📋 Columnas de tabla 'cbtes' (Facturas FC y Recibos RC):");
    const cbtesCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'cbtes'
      ORDER BY ORDINAL_POSITION
    `);
    cbtesCols.recordset.forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    
    // Verificar columnas de compras
    console.log("\n📋 Columnas de tabla 'compras':");
    const comprasCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'compras'
      ORDER BY ORDINAL_POSITION
    `);
    comprasCols.recordset.forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    
    // Verificar columnas de OrdenPago
    console.log("\n📋 Columnas de tabla 'OrdenPago':");
    const ordenPagoCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'OrdenPago'
      ORDER BY ORDINAL_POSITION
    `);
    ordenPagoCols.recordset.forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    
    // Verificar si existe tabla Clientes
    console.log("\n📋 Columnas de tabla 'Clientes':");
    const clientesCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Clientes'
      ORDER BY ORDINAL_POSITION
    `);
    if (clientesCols.recordset.length > 0) {
      clientesCols.recordset.slice(0, 15).forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    } else {
      console.log("  No existe tabla Clientes");
    }
    
    // Verificar si existe tabla PROVEEDORES
    console.log("\n📋 Columnas de tabla 'PROVEEDORES':");
    const provCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PROVEEDORES'
      ORDER BY ORDINAL_POSITION
    `);
    if (provCols.recordset.length > 0) {
      provCols.recordset.slice(0, 15).forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    } else {
      console.log("  No existe tabla PROVEEDORES");
    }
    
    // Muestra de datos de facturas
    console.log("\n📊 Muestra de facturas (FC):");
    const facturas = await pool.request().query(`
      SELECT TOP 3
        Fecha,
        NroCbte,
        LTRIM(RTRIM(Descripcion)) as cliente,
        ImporteTotal
      FROM cbtes
      WHERE TipoCbte = 'FC' AND IDStatus <> 0
      ORDER BY Fecha DESC
    `);
    facturas.recordset.forEach(f => {
      console.log(`  ${f.Fecha.toLocaleDateString('es-AR')} - FC ${f.NroCbte} - ${f.cliente} - $${f.ImporteTotal?.toLocaleString('es-AR')}`);
    });
    
    // Muestra de datos de compras
    console.log("\n📊 Muestra de compras:");
    const compras = await pool.request().query(`
      SELECT TOP 3
        Fecha,
        NroComprobante,
        LTRIM(RTRIM(Proveedor)) as proveedor,
        ImporteTotal
      FROM compras
      WHERE IDStatus <> 0
      ORDER BY Fecha DESC
    `);
    compras.recordset.forEach(c => {
      console.log(`  ${c.Fecha.toLocaleDateString('es-AR')} - ${c.NroComprobante} - ${c.proveedor} - $${c.ImporteTotal?.toLocaleString('es-AR')}`);
    });
    
    // Muestra de órdenes de pago
    console.log("\n📊 Muestra de órdenes de pago:");
    const ordenes = await pool.request().query(`
      SELECT TOP 3 *
      FROM OrdenPago
      ORDER BY IdOrdenPago DESC
    `);
    if (ordenes.recordset.length > 0) {
      console.log("Columnas disponibles:", Object.keys(ordenes.recordset[0]).join(', '));
      ordenes.recordset.forEach(o => {
        console.log(`  ID: ${o.IdOrdenPago}`);
      });
    } else {
      console.log("  No hay órdenes de pago");
    }
    
    await pool.close();
    console.log("\n✅ Verificación completada!\n");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

checkTablesStructure();
