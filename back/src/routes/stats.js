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

// Ventas stats - agrupado por actividad
router.get("/ventas/stats", authMiddleware, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    const pool = await getPool();

    // Agrupación por actividad
    let query = `
      SELECT 
        ISNULL(a.IdActividad, 0) as id_actividad,
        ISNULL(LTRIM(RTRIM(a.Descripcion)), 'Sin Actividad') as actividad,
        SUM(c.ImporteTotal) as total_facturado, 
        COUNT(*) as cantidad
      FROM cbtes c
      LEFT JOIN Clientes cl ON cl.IdCliente = c.IdCliente
      LEFT JOIN Actividades a ON a.IdActividad = cl.IdActividad
      WHERE c.TipoCbte = 'FC' AND c.IDStatus <> 0
    `;
    const request = pool.request();
    if (ano) { query += ` AND c.Ano = @ano`; request.input("ano", parseInt(ano)); }
    if (mes) { query += ` AND c.Mes = @mes`; request.input("mes", parseInt(mes)); }
    query += ` GROUP BY a.IdActividad, a.Descripcion ORDER BY total_facturado DESC`;
    const result = await request.query(query);

    // Totales mensuales para gráfico
    let totalQuery = `
      SELECT c.Ano as ano, c.Mes as mes, SUM(c.ImporteTotal) as total_facturado, COUNT(*) as cantidad
      FROM cbtes c WHERE c.TipoCbte = 'FC' AND c.IDStatus <> 0
    `;
    const totalRequest = pool.request();
    if (ano) { totalQuery += ` AND c.Ano = @ano`; totalRequest.input("ano", parseInt(ano)); }
    if (mes) { totalQuery += ` AND c.Mes = @mes`; totalRequest.input("mes", parseInt(mes)); }
    totalQuery += ` GROUP BY c.Ano, c.Mes ORDER BY c.Ano DESC, c.Mes DESC`;
    const totalResult = await totalRequest.query(totalQuery);

    const yearsResult = await pool.request().query(`
      SELECT DISTINCT Ano as ano FROM cbtes WHERE TipoCbte = 'FC' ORDER BY Ano DESC
    `);

    res.json({
      agrupado: result.recordset.map(r => ({ ...r, actividad: (r.actividad || "").trim() })),
      totalesMensuales: totalResult.recordset,
      anosDisponibles: yearsResult.recordset.map(r => r.ano),
    });
  } catch (error) {
    console.error("Ventas stats error:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas de ventas" });
  }
});

// Ventas detalle por actividad
router.get("/ventas/detalle", authMiddleware, async (req, res) => {
  try {
    const { ano, mes, idActividad } = req.query;
    const pool = await getPool();

    // Filtro reutilizable
    let where = `c.TipoCbte = 'FC' AND c.IDStatus <> 0`;
    const request = pool.request();
    const resumenReq = pool.request();
    if (ano) { where += ` AND c.Ano = @ano`; request.input("ano", parseInt(ano)); resumenReq.input("ano", parseInt(ano)); }
    if (mes) { where += ` AND c.Mes = @mes`; request.input("mes", parseInt(mes)); resumenReq.input("mes", parseInt(mes)); }
    if (idActividad !== undefined) {
      where += ` AND cl.IdActividad = @idActividad`;
      request.input("idActividad", parseInt(idActividad));
      resumenReq.input("idActividad", parseInt(idActividad));
    }

    // Detalle
    const detalleQuery = `
      SELECT 
        c.IdTransaccion as id, c.Fecha as fecha, c.Ano as ano, c.Mes as mes,
        c.NroCbte as nro_cbte, c.Letra_Cbte as letra,
        LTRIM(RTRIM(c.Descripcion)) as cliente,
        c.ImporteTotal as importe, c.ImporteNeto as neto, c.Iva21 as iva, c.Saldo as saldo
      FROM cbtes c LEFT JOIN Clientes cl ON cl.IdCliente = c.IdCliente
      WHERE ${where} ORDER BY c.Fecha DESC, c.IdTransaccion DESC`;
    const result = await request.query(detalleQuery);

    // Resumen
    const resumenQuery = `
      SELECT 
        COUNT(*) as cantidad,
        ISNULL(SUM(c.ImporteTotal), 0) as total,
        ISNULL(AVG(c.ImporteTotal), 0) as promedio,
        ISNULL(MAX(c.ImporteTotal), 0) as maximo,
        ISNULL(MIN(c.ImporteTotal), 0) as minimo,
        ISNULL(SUM(c.Saldo), 0) as saldo_pendiente,
        ISNULL(SUM(c.ImporteNeto), 0) as total_neto,
        ISNULL(SUM(c.Iva21), 0) as total_iva,
        COUNT(DISTINCT c.IdCliente) as clientes_unicos
      FROM cbtes c LEFT JOIN Clientes cl ON cl.IdCliente = c.IdCliente
      WHERE ${where}`;
    const resumenResult = await resumenReq.query(resumenQuery);

    res.json({
      resumen: resumenResult.recordset[0],
      detalle: result.recordset.map(r => ({ ...r, cliente: (r.cliente || "").trim() }))
    });
  } catch (error) {
    console.error("Ventas detalle error:", error);
    res.status(500).json({ error: "Error obteniendo detalle de ventas" });
  }
});

// Compras stats - agrupado por tipo de proveedor
router.get("/compras/stats", authMiddleware, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    const pool = await getPool();

    // Agrupación por tipo de proveedor
    let query = `
      SELECT 
        ISNULL(tp.IDTIPO_PROV, 0) as id_tipo,
        ISNULL(LTRIM(RTRIM(tp.DESCRIPCION)), 'Sin Tipo') as tipo_proveedor,
        SUM(c.ImporteTotal) as total_facturado, 
        COUNT(*) as cantidad
      FROM compras c
      LEFT JOIN PROVEEDORES p ON p.IDPROVEEDOR = c.IdProveedor
      LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
      WHERE c.IdStatus <> 0
    `;
    const request = pool.request();
    if (ano) { query += ` AND c.Ano = @ano`; request.input("ano", parseInt(ano)); }
    if (mes) { query += ` AND c.Mes = @mes`; request.input("mes", parseInt(mes)); }
    query += ` GROUP BY tp.IDTIPO_PROV, tp.DESCRIPCION ORDER BY total_facturado DESC`;
    const result = await request.query(query);

    // Totales mensuales para gráfico
    let totalQuery = `SELECT c.Ano as ano, c.Mes as mes, SUM(c.ImporteTotal) as total_facturado, COUNT(*) as cantidad
      FROM compras c WHERE c.IdStatus <> 0`;
    const totalRequest = pool.request();
    if (ano) { totalQuery += ` AND c.Ano = @ano`; totalRequest.input("ano", parseInt(ano)); }
    if (mes) { totalQuery += ` AND c.Mes = @mes`; totalRequest.input("mes", parseInt(mes)); }
    totalQuery += ` GROUP BY c.Ano, c.Mes ORDER BY c.Ano DESC, c.Mes DESC`;
    const totalResult = await totalRequest.query(totalQuery);

    const yearsResult = await pool.request().query(`SELECT DISTINCT Ano as ano FROM compras ORDER BY Ano DESC`);

    res.json({
      agrupado: result.recordset.map(r => ({ ...r, tipo_proveedor: (r.tipo_proveedor || "").trim() })),
      totalesMensuales: totalResult.recordset,
      anosDisponibles: yearsResult.recordset.map(r => r.ano),
    });
  } catch (error) {
    console.error("Compras stats error:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas de compras" });
  }
});

// Compras detalle por tipo de proveedor
router.get("/compras/detalle", authMiddleware, async (req, res) => {
  try {
    const { ano, mes, idTipo } = req.query;
    const pool = await getPool();

    let where = `c.IdStatus <> 0`;
    const request = pool.request();
    const resumenReq = pool.request();
    if (ano) { where += ` AND c.Ano = @ano`; request.input("ano", parseInt(ano)); resumenReq.input("ano", parseInt(ano)); }
    if (mes) { where += ` AND c.Mes = @mes`; request.input("mes", parseInt(mes)); resumenReq.input("mes", parseInt(mes)); }
    if (idTipo !== undefined) {
      if (parseInt(idTipo) === 0) {
        where += ` AND (p.IDTIPO_PROV IS NULL OR p.IDTIPO_PROV = 0)`;
      } else {
        where += ` AND p.IDTIPO_PROV = @idTipo`;
        request.input("idTipo", parseInt(idTipo));
        resumenReq.input("idTipo", parseInt(idTipo));
      }
    }

    const detalleQuery = `
      SELECT 
        c.idtransaccion as id, c.Fecha as fecha, c.Ano as ano, c.Mes as mes,
        c.NroCbte as nro_cbte, c.Letra_Cbte as letra,
        LTRIM(RTRIM(c.Descripcion)) as proveedor,
        c.ImporteTotal as importe, c.IVA as iva, c.Importe_Saldo as saldo
      FROM compras c LEFT JOIN PROVEEDORES p ON p.IDPROVEEDOR = c.IdProveedor
      WHERE ${where} ORDER BY c.Fecha DESC, c.idtransaccion DESC`;
    const result = await request.query(detalleQuery);

    const resumenQuery = `
      SELECT 
        COUNT(*) as cantidad,
        ISNULL(SUM(c.ImporteTotal), 0) as total,
        ISNULL(AVG(c.ImporteTotal), 0) as promedio,
        ISNULL(MAX(c.ImporteTotal), 0) as maximo,
        ISNULL(MIN(c.ImporteTotal), 0) as minimo,
        ISNULL(SUM(c.Importe_Saldo), 0) as saldo_pendiente,
        ISNULL(SUM(c.IVA), 0) as total_iva,
        COUNT(DISTINCT c.IdProveedor) as proveedores_unicos
      FROM compras c LEFT JOIN PROVEEDORES p ON p.IDPROVEEDOR = c.IdProveedor
      WHERE ${where}`;
    const resumenResult = await resumenReq.query(resumenQuery);

    res.json({
      resumen: resumenResult.recordset[0],
      detalle: result.recordset.map(r => ({ ...r, proveedor: (r.proveedor || "").trim() }))
    });
  } catch (error) {
    console.error("Compras detalle error:", error);
    res.status(500).json({ error: "Error obteniendo detalle de compras" });
  }
});

// Cobranzas stats - agrupado por actividad de cliente
router.get("/cobranzas/stats", authMiddleware, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    const pool = await getPool();

    // Agrupación por actividad
    let query = `SELECT 
      ISNULL(a.IdActividad, 0) as id_actividad,
      ISNULL(LTRIM(RTRIM(a.Descripcion)), 'Sin Actividad') as actividad,
      SUM(c.ImporteTotal) as total_cobrado, 
      COUNT(*) as cantidad
      FROM cbtes c
      LEFT JOIN Clientes cl ON cl.IdCliente = c.IdCliente
      LEFT JOIN Actividades a ON a.IdActividad = cl.IdActividad
      WHERE c.TipoCbte = 'RC' AND c.IDStatus <> 0`;
    const request = pool.request();
    if (ano) {
      query += ` AND (CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END) = @ano`;
      request.input("ano", parseInt(ano));
    }
    if (mes) {
      query += ` AND (CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END) = @mes`;
      request.input("mes", parseInt(mes));
    }
    query += ` GROUP BY a.IdActividad, a.Descripcion ORDER BY total_cobrado DESC`;
    const result = await request.query(query);

    // Totales mensuales para gráfico
    let totalQuery = `SELECT 
      CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END as ano,
      CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END as mes,
      SUM(c.ImporteTotal) as total_cobrado, 
      COUNT(*) as cantidad_recibos
      FROM cbtes c WHERE c.TipoCbte = 'RC' AND c.IDStatus <> 0`;
    const totalRequest = pool.request();
    if (ano) {
      totalQuery += ` AND (CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END) = @ano`;
      totalRequest.input("ano", parseInt(ano));
    }
    if (mes) {
      totalQuery += ` AND (CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END) = @mes`;
      totalRequest.input("mes", parseInt(mes));
    }
    totalQuery += ` GROUP BY 
      CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END,
      CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END
      ORDER BY ano DESC, mes DESC`;
    const totalResult = await totalRequest.query(totalQuery);

    const yearsResult = await pool.request().query(`
      SELECT DISTINCT CASE WHEN Ano = 0 OR Ano IS NULL THEN YEAR(Fecha) ELSE Ano END as ano 
      FROM cbtes WHERE TipoCbte = 'RC' ORDER BY ano DESC
    `);

    res.json({
      agrupado: result.recordset.map(r => ({ ...r, actividad: (r.actividad || "").trim() })),
      totalesMensuales: totalResult.recordset,
      anosDisponibles: yearsResult.recordset.map(r => r.ano),
    });
  } catch (error) {
    console.error("Cobranzas stats error:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas de cobranzas" });
  }
});

// Cobranzas detalle por actividad
router.get("/cobranzas/detalle", authMiddleware, async (req, res) => {
  try {
    const { ano, mes, idActividad } = req.query;
    const pool = await getPool();

    let where = `c.TipoCbte = 'RC' AND c.IDStatus <> 0`;
    const request = pool.request();
    const resumenReq = pool.request();
    if (ano) {
      where += ` AND (CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END) = @ano`;
      request.input("ano", parseInt(ano)); resumenReq.input("ano", parseInt(ano));
    }
    if (mes) {
      where += ` AND (CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END) = @mes`;
      request.input("mes", parseInt(mes)); resumenReq.input("mes", parseInt(mes));
    }
    if (idActividad !== undefined) {
      where += ` AND cl.IdActividad = @idActividad`;
      request.input("idActividad", parseInt(idActividad));
      resumenReq.input("idActividad", parseInt(idActividad));
    }

    const detalleQuery = `SELECT 
      c.IdTransaccion as id, c.Fecha as fecha,
      CASE WHEN c.Ano = 0 OR c.Ano IS NULL THEN YEAR(c.Fecha) ELSE c.Ano END as ano,
      CASE WHEN c.Mes = 0 OR c.Mes IS NULL THEN MONTH(c.Fecha) ELSE c.Mes END as mes,
      c.NroCbte as numero_recibo, LTRIM(RTRIM(c.Descripcion)) as cliente,
      c.ImporteTotal as importe, c.Saldo as saldo
      FROM cbtes c LEFT JOIN Clientes cl ON cl.IdCliente = c.IdCliente
      WHERE ${where} ORDER BY c.Fecha DESC, c.IdTransaccion DESC`;
    const result = await request.query(detalleQuery);

    const resumenQuery = `SELECT 
      COUNT(*) as cantidad,
      ISNULL(SUM(c.ImporteTotal), 0) as total,
      ISNULL(AVG(c.ImporteTotal), 0) as promedio,
      ISNULL(MAX(c.ImporteTotal), 0) as maximo,
      ISNULL(MIN(c.ImporteTotal), 0) as minimo,
      ISNULL(SUM(c.Saldo), 0) as saldo_pendiente,
      COUNT(DISTINCT c.IdCliente) as clientes_unicos
      FROM cbtes c LEFT JOIN Clientes cl ON cl.IdCliente = c.IdCliente
      WHERE ${where}`;
    const resumenResult = await resumenReq.query(resumenQuery);

    res.json({
      resumen: resumenResult.recordset[0],
      detalle: result.recordset.map(r => ({ ...r, cliente: (r.cliente || "").trim() }))
    });
  } catch (error) {
    console.error("Cobranzas detalle error:", error);
    res.status(500).json({ error: "Error obteniendo detalle de cobranzas" });
  }
});

// Pagos stats - agrupado por concepto bancario (ban_tipos_mov via ban_ctas_mov)
router.get("/pagos/stats", authMiddleware, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    const pool = await getPool();

    // Agrupación por tipo_movim (concepto bancario)
    let where = `op.IDStatus <> 0`;
    const request = pool.request();
    if (ano) { where += ` AND op.Ano = @ano`; request.input("ano", parseInt(ano)); }
    if (mes) { where += ` AND op.Mes = @mes`; request.input("mes", parseInt(mes)); }

    const query = `
      SELECT 
        b.Tipo_Movim as id_concepto,
        LTRIM(RTRIM(t.Descripcion)) as concepto,
        COUNT(DISTINCT b.IdTransacion_OP) as cantidad_ordenes,
        SUM(b.Importe) as total_pagado
      FROM ban_ctas_mov b
      INNER JOIN OrdenPago op ON op.IdTransacion = b.IdTransacion_OP
      LEFT JOIN ban_tipos_mov t ON t.Tipo_Movim = b.Tipo_Movim
      WHERE b.IdTransacion_OP IS NOT NULL AND b.IdTransacion_OP > 0 AND ${where}
      GROUP BY b.Tipo_Movim, t.Descripcion
      ORDER BY total_pagado DESC
    `;
    const result = await request.query(query);

    // Totales mensuales para gráfico
    let totalQuery = `SELECT op.Ano as ano, op.Mes as mes, SUM(op.ImporteTotal) as total_pagado, COUNT(*) as cantidad
      FROM OrdenPago op WHERE op.IDStatus <> 0`;
    const totalRequest = pool.request();
    if (ano) { totalQuery += ` AND op.Ano = @ano`; totalRequest.input("ano", parseInt(ano)); }
    if (mes) { totalQuery += ` AND op.Mes = @mes`; totalRequest.input("mes", parseInt(mes)); }
    totalQuery += ` GROUP BY op.Ano, op.Mes ORDER BY op.Ano DESC, op.Mes DESC`;
    const totalResult = await totalRequest.query(totalQuery);

    const yearsResult = await pool.request().query(`SELECT DISTINCT Ano as ano FROM OrdenPago ORDER BY Ano DESC`);

    res.json({
      agrupado: result.recordset.map(r => ({ ...r, concepto: (r.concepto || "").trim() })),
      totalesMensuales: totalResult.recordset,
      anosDisponibles: yearsResult.recordset.map(r => r.ano),
    });
  } catch (error) {
    console.error("Pagos stats error:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas de pagos" });
  }
});

// Pagos detalle por concepto bancario - drill-down muestra OPs con ese tipo_movim, agrupadas por tipo de proveedor
router.get("/pagos/detalle", authMiddleware, async (req, res) => {
  try {
    const { ano, mes, idConcepto, idProveedor } = req.query;
    const pool = await getPool();

    let where = `op.IDStatus <> 0`;
    const request = pool.request();
    const resumenReq = pool.request();
    if (ano) { where += ` AND op.Ano = @ano`; request.input("ano", parseInt(ano)); resumenReq.input("ano", parseInt(ano)); }
    if (mes) { where += ` AND op.Mes = @mes`; request.input("mes", parseInt(mes)); resumenReq.input("mes", parseInt(mes)); }

    // Si se filtra por concepto bancario, solo OPs que tengan ese tipo_movim en ban_ctas_mov
    if (idConcepto !== undefined) {
      where += ` AND op.IdTransacion IN (
        SELECT DISTINCT IdTransacion_OP FROM ban_ctas_mov 
        WHERE Tipo_Movim = @idConcepto AND IdTransacion_OP IS NOT NULL AND IdTransacion_OP > 0
      )`;
      request.input("idConcepto", parseInt(idConcepto));
      resumenReq.input("idConcepto", parseInt(idConcepto));
    }

    if (idProveedor !== undefined) {
      where += ` AND op.Proveedor = @idProveedor`;
      request.input("idProveedor", parseInt(idProveedor));
      resumenReq.input("idProveedor", parseInt(idProveedor));
    }

    // Agrupación por tipo de proveedor
    const agrupadoQuery = `
      SELECT 
        ISNULL(tp.IDTIPO_PROV, 0) as id_tipo,
        ISNULL(LTRIM(RTRIM(tp.DESCRIPCION)), 'Sin Tipo') as tipo_proveedor,
        COUNT(*) as cantidad_ordenes,
        ISNULL(SUM(op.ImporteTotal), 0) as total_pagado,
        ISNULL(AVG(op.ImporteTotal), 0) as promedio
      FROM OrdenPago op
      LEFT JOIN PROVEEDORES p ON p.IDPROVEEDOR = op.Proveedor
      LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
      WHERE ${where}
      GROUP BY tp.IDTIPO_PROV, tp.DESCRIPCION
      ORDER BY total_pagado DESC
    `;
    const agrupadoResult = await request.query(agrupadoQuery);

    // Detalle individual de OPs
    const detalleReq = pool.request();
    let detalleWhere = where.replace(/@ano/g, '@ano2').replace(/@mes/g, '@mes2').replace(/@idConcepto/g, '@idConcepto2').replace(/@idProveedor/g, '@idProveedor2');
    if (ano) detalleReq.input("ano2", parseInt(ano));
    if (mes) detalleReq.input("mes2", parseInt(mes));
    if (idConcepto !== undefined) detalleReq.input("idConcepto2", parseInt(idConcepto));
    if (idProveedor !== undefined) detalleReq.input("idProveedor2", parseInt(idProveedor));

    const detalleQuery = `SELECT 
      op.IdTransacion as id, op.Fecha as fecha, op.Ano as ano, op.Mes as mes,
      op.NroCbte as nro_cbte, op.Letra_Cbte as letra,
      LTRIM(RTRIM(op.Descripcion)) as proveedor,
      ISNULL(LTRIM(RTRIM(tp.DESCRIPCION)), 'Sin Tipo') as tipo_proveedor,
      op.ImporteTotal as importe, op.Saldo as saldo
      FROM OrdenPago op
      LEFT JOIN PROVEEDORES p ON p.IDPROVEEDOR = op.Proveedor
      LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
      WHERE ${detalleWhere} ORDER BY op.Fecha DESC, op.IdTransacion DESC`;
    const detalleResult = await detalleReq.query(detalleQuery);

    const resumenQuery = `SELECT 
      COUNT(*) as cantidad,
      ISNULL(SUM(op.ImporteTotal), 0) as total,
      ISNULL(AVG(op.ImporteTotal), 0) as promedio,
      ISNULL(MAX(op.ImporteTotal), 0) as maximo,
      ISNULL(MIN(op.ImporteTotal), 0) as minimo,
      ISNULL(SUM(op.Saldo), 0) as saldo_pendiente
      FROM OrdenPago op WHERE ${where}`;
    const resumenResult = await resumenReq.query(resumenQuery);

    res.json({
      resumen: resumenResult.recordset[0],
      agrupadoPorTipo: agrupadoResult.recordset.map(r => ({ ...r, tipo_proveedor: (r.tipo_proveedor || "").trim() })),
      detalle: detalleResult.recordset.map(r => ({ ...r, proveedor: (r.proveedor || "").trim(), tipo_proveedor: (r.tipo_proveedor || "").trim() }))
    });
  } catch (error) {
    console.error("Pagos detalle error:", error);
    res.status(500).json({ error: "Error obteniendo detalle de pagos" });
  }
});

// Proveedores stats - agrupado por tipo de proveedor
router.get("/proveedores/stats", authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    const query = `
      SELECT 
        ISNULL(tp.IDTIPO_PROV, 0) as id_tipo,
        ISNULL(LTRIM(RTRIM(tp.DESCRIPCION)), 'Sin Tipo') as tipo_proveedor,
        COUNT(*) as cantidad
      FROM PROVEEDORES p
      LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
      GROUP BY tp.IDTIPO_PROV, tp.DESCRIPCION
      ORDER BY cantidad DESC
    `;
    const result = await pool.request().query(query);

    const totalResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM PROVEEDORES
    `);

    res.json({
      agrupado: result.recordset.map(r => ({ ...r, tipo_proveedor: (r.tipo_proveedor || "").trim() })),
      totalProveedores: totalResult.recordset[0].total,
    });
  } catch (error) {
    console.error("Proveedores stats error:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas de proveedores" });
  }
});

// Proveedores detalle por tipo
router.get("/proveedores/detalle", authMiddleware, async (req, res) => {
  try {
    const { idTipo } = req.query;
    const pool = await getPool();

    let where = `1=1`;
    const request = pool.request();
    const resumenReq = pool.request();
    if (idTipo !== undefined) {
      if (parseInt(idTipo) === 0) {
        where += ` AND (p.IDTIPO_PROV IS NULL OR p.IDTIPO_PROV = 0)`;
      } else {
        where += ` AND p.IDTIPO_PROV = @idTipo`;
        request.input("idTipo", parseInt(idTipo));
        resumenReq.input("idTipo", parseInt(idTipo));
      }
    }

    const detalleQuery = `
      SELECT 
        p.IDPROVEEDOR as id,
        LTRIM(RTRIM(p.DESCRIPCION)) as proveedor,
        ISNULL(LTRIM(RTRIM(tp.DESCRIPCION)), 'Sin Tipo') as tipo,
        ISNULL(p.NRO_CUIT, '') as cuit,
        ISNULL(p.EMAIL, '') as email,
        ISNULL(p.CALLE, '') as direccion,
        (SELECT COUNT(*) FROM compras c WHERE c.IdProveedor = p.IDPROVEEDOR AND c.IdStatus <> 0) as cant_compras,
        (SELECT ISNULL(SUM(c.ImporteTotal), 0) FROM compras c WHERE c.IdProveedor = p.IDPROVEEDOR AND c.IdStatus <> 0) as total_compras
      FROM PROVEEDORES p
      LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
      WHERE ${where}
      ORDER BY p.DESCRIPCION`;
    const result = await request.query(detalleQuery);

    const resumenQuery = `
      SELECT 
        COUNT(*) as cantidad,
        COUNT(DISTINCT p.IDTIPO_PROV) as tipos_unicos
      FROM PROVEEDORES p
      LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
      WHERE ${where}`;
    const resumenResult = await resumenReq.query(resumenQuery);

    res.json({
      resumen: resumenResult.recordset[0],
      detalle: result.recordset.map(r => ({ ...r, proveedor: (r.proveedor || "").trim(), tipo: (r.tipo || "").trim() }))
    });
  } catch (error) {
    console.error("Proveedores detalle error:", error);
    res.status(500).json({ error: "Error obteniendo detalle de proveedores" });
  }
});

// Compras relacionadas a una factura de venta
router.get("/ventas/compras-relacionadas", authMiddleware, async (req, res) => {
  try {
    const { idTransaccion } = req.query;
    const pool = await getPool();

    if (!idTransaccion) {
      return res.status(400).json({ error: "Se requiere idTransaccion" });
    }

    // Datos de la factura de venta
    const facturaQuery = `
      SELECT 
        c.IdTransaccion as id, c.Fecha as fecha, c.NroCbte as nro_cbte, c.Letra_Cbte as letra,
        LTRIM(RTRIM(c.Descripcion)) as cliente, c.ImporteTotal as importe,
        c.ImporteNeto as neto, c.Iva21 as iva, c.Saldo as saldo
      FROM cbtes c WHERE c.IdTransaccion = @idTransaccion`;
    const factura = await pool.request()
      .input("idTransaccion", parseInt(idTransaccion))
      .query(facturaQuery);

    // Compras vinculadas
    const comprasQuery = `
      SELECT 
        co.idtransaccion as id, co.Fecha as fecha, co.NroCbte as nro_cbte, co.Letra_Cbte as letra,
        LTRIM(RTRIM(co.Descripcion)) as proveedor,
        LTRIM(RTRIM(tp.DESCRIPCION)) as tipo_proveedor,
        LTRIM(RTRIM(tc.DESCRIPCION)) as categoria,
        co.ImporteTotal as importe, co.IVA as iva, co.Importe_Saldo as saldo
      FROM compras co
      LEFT JOIN PROVEEDORES p ON p.IDPROVEEDOR = co.IdProveedor
      LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
      LEFT JOIN TIPOS_PROV_CATEG tc ON tc.IDTIPO_PROV_CATEG = co.IdTipo_Prov_Categ
      WHERE co.IdTransaccionFacturaVta = @idTransaccion AND co.IdStatus <> 0
      ORDER BY co.Fecha DESC`;
    const compras = await pool.request()
      .input("idTransaccion", parseInt(idTransaccion))
      .query(comprasQuery);

    const totalCompras = compras.recordset.reduce((s, r) => s + (r.importe || 0), 0);

    res.json({
      factura: factura.recordset[0] ? { ...factura.recordset[0], cliente: (factura.recordset[0].cliente || "").trim() } : null,
      comprasRelacionadas: compras.recordset.map(r => ({
        ...r,
        proveedor: (r.proveedor || "").trim(),
        tipo_proveedor: (r.tipo_proveedor || "").trim(),
        categoria: (r.categoria || "").trim()
      })),
      resumen: {
        cantidad_compras: compras.recordset.length,
        total_compras: totalCompras,
        margen: factura.recordset[0] ? factura.recordset[0].importe - totalCompras : 0
      }
    });
  } catch (error) {
    console.error("Compras relacionadas error:", error);
    res.status(500).json({ error: "Error obteniendo compras relacionadas" });
  }
});

// Export Excel de compras relacionadas a una factura
router.get("/ventas/compras-relacionadas/export", authMiddleware, async (req, res) => {
  try {
    const { idTransaccion } = req.query;
    const pool = await getPool();
    const XLSX = require("xlsx");

    if (!idTransaccion) {
      return res.status(400).json({ error: "Se requiere idTransaccion" });
    }

    const facturaQ = await pool.request()
      .input("idTransaccion", parseInt(idTransaccion))
      .query(`SELECT c.NroCbte, c.Letra_Cbte, LTRIM(RTRIM(c.Descripcion)) as cliente, c.ImporteTotal FROM cbtes c WHERE c.IdTransaccion = @idTransaccion`);

    const comprasQ = await pool.request()
      .input("idTransaccion", parseInt(idTransaccion))
      .query(`
        SELECT co.Fecha as Fecha, co.Letra_Cbte as Letra, co.NroCbte as NroCbte,
          LTRIM(RTRIM(co.Descripcion)) as Proveedor,
          ISNULL(LTRIM(RTRIM(tp.DESCRIPCION)),'') as TipoProveedor,
          ISNULL(LTRIM(RTRIM(tc.DESCRIPCION)),'') as Categoria,
          co.ImporteTotal as Total, co.IVA as IVA, co.Importe_Saldo as Saldo
        FROM compras co
        LEFT JOIN PROVEEDORES p ON p.IDPROVEEDOR = co.IdProveedor
        LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
        LEFT JOIN TIPOS_PROV_CATEG tc ON tc.IDTIPO_PROV_CATEG = co.IdTipo_Prov_Categ
        WHERE co.IdTransaccionFacturaVta = @idTransaccion AND co.IdStatus <> 0
        ORDER BY co.Fecha DESC`);

    const factura = facturaQ.recordset[0];
    const rows = comprasQ.recordset.map(r => ({
      Fecha: r.Fecha ? new Date(r.Fecha).toLocaleDateString('es-AR') : '',
      Letra: (r.Letra || '').trim(),
      'Nro Cbte': r.NroCbte,
      Proveedor: (r.Proveedor || '').trim(),
      'Tipo Proveedor': (r.TipoProveedor || '').trim(),
      Categoría: (r.Categoria || '').trim(),
      Total: r.Total,
      IVA: r.IVA,
      Saldo: r.Saldo
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Compras Relacionadas");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `Compras_FC_${factura ? (factura.Letra_Cbte || '').trim() + factura.NroCbte : idTransaccion}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (error) {
    console.error("Export compras relacionadas error:", error);
    res.status(500).json({ error: "Error exportando compras relacionadas" });
  }
});

module.exports = router;
