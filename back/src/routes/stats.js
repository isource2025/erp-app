const express = require("express");
const { getPool } = require("../config/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Dashboard
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    const ventasTotal = await pool.request().query(`
      SELECT ISNULL(SUM(ImporteTotal), 0) as total, COUNT(*) as cantidad
      FROM cbtes WHERE TipoCbte = 'FC' AND IDStatus <> 0
    `);

    const comprasTotal = await pool.request().query(`
      SELECT ISNULL(SUM(ImporteTotal), 0) as total, COUNT(*) as cantidad
      FROM compras WHERE IdStatus <> 0
    `);

    const cobranzasTotal = await pool.request().query(`
      SELECT ISNULL(SUM(ImporteTotal), 0) as total, COUNT(*) as cantidad
      FROM cbtes WHERE TipoCbte = 'RC' AND IDStatus <> 0
    `);

    const pagosTotal = await pool.request().query(`
      SELECT ISNULL(SUM(ImporteTotal), 0) as total, COUNT(*) as cantidad
      FROM OrdenPago WHERE IDStatus <> 0
    `);

    const ventasMensuales = await pool.request().query(`
      SELECT TOP 12 
        CASE WHEN Ano = 0 OR Ano IS NULL THEN YEAR(Fecha) ELSE Ano END as ano,
        CASE WHEN Mes = 0 OR Mes IS NULL THEN MONTH(Fecha) ELSE Mes END as mes,
        SUM(ImporteTotal) as total, 
        COUNT(*) as cantidad
      FROM cbtes WHERE TipoCbte = 'FC' AND IDStatus <> 0
      GROUP BY 
        CASE WHEN Ano = 0 OR Ano IS NULL THEN YEAR(Fecha) ELSE Ano END,
        CASE WHEN Mes = 0 OR Mes IS NULL THEN MONTH(Fecha) ELSE Mes END
      ORDER BY ano DESC, mes DESC
    `);

    const cobranzasMensuales = await pool.request().query(`
      SELECT TOP 12 
        CASE WHEN Ano = 0 OR Ano IS NULL THEN YEAR(Fecha) ELSE Ano END as ano,
        CASE WHEN Mes = 0 OR Mes IS NULL THEN MONTH(Fecha) ELSE Mes END as mes,
        SUM(ImporteTotal) as total, 
        COUNT(*) as cantidad
      FROM cbtes WHERE TipoCbte = 'RC' AND IDStatus <> 0
      GROUP BY 
        CASE WHEN Ano = 0 OR Ano IS NULL THEN YEAR(Fecha) ELSE Ano END,
        CASE WHEN Mes = 0 OR Mes IS NULL THEN MONTH(Fecha) ELSE Mes END
      ORDER BY ano DESC, mes DESC
    `);

    res.json({
      resumen: {
        ventas: ventasTotal.recordset[0],
        compras: comprasTotal.recordset[0],
        cobranzas: cobranzasTotal.recordset[0],
        pagos: pagosTotal.recordset[0],
      },
      ventasMensuales: ventasMensuales.recordset.reverse(),
      cobranzasMensuales: cobranzasMensuales.recordset.reverse(),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Error obteniendo datos del dashboard" });
  }
});

// Ventas stats
router.get("/ventas/stats", authMiddleware, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    const pool = await getPool();

    let query = `
      SELECT c.Ano as ano, c.Mes as mes, ISNULL(a.Descripcion, 'Sin Actividad') as actividad,
        SUM(c.ImporteTotal) as total_facturado, COUNT(*) as cantidad
      FROM cbtes c
      LEFT JOIN Clientes cl ON cl.IdCliente = c.IdCliente
      LEFT JOIN Actividades a ON a.IdActividad = cl.IdActividad
      WHERE c.TipoCbte = 'FC' AND c.IDStatus <> 0
    `;

    const request = pool.request();
    if (ano) {
      query += ` AND c.Ano = @ano`;
      request.input("ano", parseInt(ano));
    }
    if (mes) {
      query += ` AND c.Mes = @mes`;
      request.input("mes", parseInt(mes));
    }

    query += ` GROUP BY c.Ano, c.Mes, a.Descripcion ORDER BY c.Ano DESC, c.Mes DESC`;
    const result = await request.query(query);

    let totalQuery = `
      SELECT c.Ano as ano, c.Mes as mes, SUM(c.ImporteTotal) as total_facturado, COUNT(*) as cantidad
      FROM cbtes c WHERE c.TipoCbte = 'FC' AND c.IDStatus <> 0
    `;
    const totalRequest = pool.request();
    if (ano) {
      totalQuery += ` AND c.Ano = @ano`;
      totalRequest.input("ano", parseInt(ano));
    }
    if (mes) {
      totalQuery += ` AND c.Mes = @mes`;
      totalRequest.input("mes", parseInt(mes));
    }
    totalQuery += ` GROUP BY c.Ano, c.Mes ORDER BY c.Ano DESC, c.Mes DESC`;
    const totalResult = await totalRequest.query(totalQuery);

    const yearsResult = await pool.request().query(`
      SELECT DISTINCT Ano as ano FROM cbtes WHERE TipoCbte = 'FC' ORDER BY Ano DESC
    `);

    res.json({
      detalle: result.recordset.map(r => ({ ...r, actividad: (r.actividad || "").trim() })),
      totalesMensuales: totalResult.recordset,
      anosDisponibles: yearsResult.recordset.map(r => r.ano),
    });
  } catch (error) {
    console.error("Ventas stats error:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas de ventas" });
  }
});

// Compras stats
router.get("/compras/stats", authMiddleware, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    const pool = await getPool();

    let query = `
      SELECT c.Ano as ano, c.Mes as mes, ISNULL(tp.DESCRIPCION, 'Sin Tipo') as tipo_proveedor,
        SUM(c.ImporteTotal) as total_facturado, COUNT(*) as cantidad
      FROM compras c
      LEFT JOIN PROVEEDORES p ON p.IDPROVEEDOR = c.IdProveedor
      LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
      WHERE c.IdStatus <> 0
    `;

    const request = pool.request();
    if (ano) {
      query += ` AND c.Ano = @ano`;
      request.input("ano", parseInt(ano));
    }
    if (mes) {
      query += ` AND c.Mes = @mes`;
      request.input("mes", parseInt(mes));
    }

    query += ` GROUP BY c.Ano, c.Mes, tp.DESCRIPCION ORDER BY c.Ano DESC, c.Mes DESC`;
    const result = await request.query(query);

    let totalQuery = `SELECT c.Ano as ano, c.Mes as mes, SUM(c.ImporteTotal) as total_facturado, COUNT(*) as cantidad
      FROM compras c WHERE c.IdStatus <> 0`;
    const totalRequest = pool.request();
    if (ano) {
      totalQuery += ` AND c.Ano = @ano`;
      totalRequest.input("ano", parseInt(ano));
    }
    if (mes) {
      totalQuery += ` AND c.Mes = @mes`;
      totalRequest.input("mes", parseInt(mes));
    }
    totalQuery += ` GROUP BY c.Ano, c.Mes ORDER BY c.Ano DESC, c.Mes DESC`;
    const totalResult = await totalRequest.query(totalQuery);

    const yearsResult = await pool.request().query(`SELECT DISTINCT Ano as ano FROM compras ORDER BY Ano DESC`);

    res.json({
      detalle: result.recordset.map(r => ({ ...r, tipo_proveedor: (r.tipo_proveedor || "").trim() })),
      totalesMensuales: totalResult.recordset,
      anosDisponibles: yearsResult.recordset.map(r => r.ano),
    });
  } catch (error) {
    console.error("Compras stats error:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas de compras" });
  }
});

// Cobranzas stats
router.get("/cobranzas/stats", authMiddleware, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    const pool = await getPool();

    // Calcular año y mes desde la fecha si Ano/Mes están en 0
    let query = `SELECT 
      CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END as ano,
      CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END as mes,
      SUM(c.ImporteTotal) as total_cobrado, 
      COUNT(*) as cantidad_recibos
      FROM cbtes c WHERE c.TipoCbte = 'RC' AND c.IDStatus <> 0`;
    const request = pool.request();
    if (ano) {
      query += ` AND (CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END) = @ano`;
      request.input("ano", parseInt(ano));
    }
    if (mes) {
      query += ` AND (CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END) = @mes`;
      request.input("mes", parseInt(mes));
    }
    query += ` GROUP BY 
      CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END,
      CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END
      ORDER BY ano DESC, mes DESC`;
    const result = await request.query(query);

    // Detalle individual de cada recibo con fecha (calcular año/mes desde fecha si están en 0)
    let detalleQuery = `SELECT 
      c.IdTransaccion as id,
      c.Fecha as fecha,
      CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END as ano,
      CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END as mes,
      c.NroCbte as numero_recibo,
      LTRIM(RTRIM(c.Descripcion)) as cliente,
      c.ImporteTotal as importe,
      c.Saldo as saldo
      FROM cbtes c 
      WHERE c.TipoCbte = 'RC' AND c.IDStatus <> 0`;
    const detalleRequest = pool.request();
    if (ano) {
      detalleQuery += ` AND (CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END) = @ano`;
      detalleRequest.input("ano", parseInt(ano));
    }
    if (mes) {
      detalleQuery += ` AND (CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END) = @mes`;
      detalleRequest.input("mes", parseInt(mes));
    }
    detalleQuery += ` ORDER BY c.Fecha DESC, c.IdTransaccion DESC`;
    const detalleResult = await detalleRequest.query(detalleQuery);

    const yearsResult = await pool.request().query(`
      SELECT DISTINCT CASE WHEN Ano = 0 OR Ano IS NULL THEN YEAR(Fecha) ELSE Ano END as ano 
      FROM cbtes 
      WHERE TipoCbte = 'RC' 
      ORDER BY ano DESC
    `);

    res.json({
      totalesMensuales: result.recordset,
      detalle: detalleResult.recordset.map(r => ({ ...r, cliente: (r.cliente || "").trim() })),
      anosDisponibles: yearsResult.recordset.map(r => r.ano),
    });
  } catch (error) {
    console.error("Cobranzas stats error:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas de cobranzas" });
  }
});

// Pagos stats
router.get("/pagos/stats", authMiddleware, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    const pool = await getPool();

    let query = `SELECT op.Ano as ano, op.Mes as mes, LTRIM(RTRIM(op.Descripcion)) as concepto,
      SUM(op.ImporteTotal) as total_pagado, COUNT(*) as cantidad
      FROM OrdenPago op WHERE op.IDStatus <> 0`;
    const request = pool.request();
    if (ano) {
      query += ` AND op.Ano = @ano`;
      request.input("ano", parseInt(ano));
    }
    if (mes) {
      query += ` AND op.Mes = @mes`;
      request.input("mes", parseInt(mes));
    }
    query += ` GROUP BY op.Ano, op.Mes, op.Descripcion ORDER BY op.Ano DESC, op.Mes DESC`;
    const result = await request.query(query);

    let totalQuery = `SELECT op.Ano as ano, op.Mes as mes, SUM(op.ImporteTotal) as total_pagado, COUNT(*) as cantidad
      FROM OrdenPago op WHERE op.IDStatus <> 0`;
    const totalRequest = pool.request();
    if (ano) {
      totalQuery += ` AND op.Ano = @ano`;
      totalRequest.input("ano", parseInt(ano));
    }
    if (mes) {
      totalQuery += ` AND op.Mes = @mes`;
      totalRequest.input("mes", parseInt(mes));
    }
    totalQuery += ` GROUP BY op.Ano, op.Mes ORDER BY op.Ano DESC, op.Mes DESC`;
    const totalResult = await totalRequest.query(totalQuery);

    const yearsResult = await pool.request().query(`SELECT DISTINCT Ano as ano FROM OrdenPago ORDER BY Ano DESC`);

    res.json({
      detalle: result.recordset.map(r => ({ ...r, concepto: (r.concepto || "").trim() })),
      totalesMensuales: totalResult.recordset,
      anosDisponibles: yearsResult.recordset.map(r => r.ano),
    });
  } catch (error) {
    console.error("Pagos stats error:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas de pagos" });
  }
});

module.exports = router;
