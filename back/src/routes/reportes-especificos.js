const express = require("express");
const { getPool } = require("../config/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// 1. FACTURA DE VENTA - Total facturado por la UEP en un período
router.get("/facturacion/periodo", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const pool = await getPool();

    const query = `
      SELECT 
        YEAR(Fecha) as ano,
        MONTH(Fecha) as mes,
        COUNT(*) as cantidad_facturas,
        SUM(ImporteTotal) as total_facturado,
        AVG(ImporteTotal) as promedio_factura,
        MAX(ImporteTotal) as factura_maxima,
        MIN(ImporteTotal) as factura_minima
      FROM cbtes
      WHERE TipoCbte = 'FC' 
        AND IDStatus <> 0
        ${fechaInicio ? 'AND Fecha >= @fechaInicio' : ''}
        ${fechaFin ? 'AND Fecha <= @fechaFin' : ''}
      GROUP BY YEAR(Fecha), MONTH(Fecha)
      ORDER BY YEAR(Fecha) DESC, MONTH(Fecha) DESC
    `;

    const request = pool.request();
    if (fechaInicio) request.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) request.input("fechaFin", new Date(fechaFin));

    const result = await request.query(query);

    const total = result.recordset.reduce((sum, r) => sum + r.total_facturado, 0);
    const cantidadTotal = result.recordset.reduce((sum, r) => sum + r.cantidad_facturas, 0);

    res.json({
      resumen: {
        total_facturado: total,
        cantidad_facturas: cantidadTotal,
        promedio_general: cantidadTotal > 0 ? total / cantidadTotal : 0
      },
      detallePorMes: result.recordset
    });

  } catch (error) {
    console.error("Error en facturación por período:", error);
    res.status(500).json({ error: "Error obteniendo facturación por período" });
  }
});

// 2. FACTURA DE VENTA - Total facturado por actividad del cliente
router.get("/facturacion/actividad-cliente", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const pool = await getPool();

    const query = `
      SELECT 
        LTRIM(RTRIM(c.Descripcion)) as cliente,
        cl.IdActividad as id_actividad,
        COUNT(*) as cantidad_facturas,
        SUM(c.ImporteTotal) as total_facturado,
        AVG(c.ImporteTotal) as promedio_factura
      FROM cbtes c
      LEFT JOIN Clientes cl ON c.IdCliente = cl.IdCliente
      WHERE c.TipoCbte = 'FC' 
        AND c.IDStatus <> 0
        ${fechaInicio ? 'AND c.Fecha >= @fechaInicio' : ''}
        ${fechaFin ? 'AND c.Fecha <= @fechaFin' : ''}
      GROUP BY c.Descripcion, cl.IdActividad
      ORDER BY total_facturado DESC
    `;

    const request = pool.request();
    if (fechaInicio) request.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) request.input("fechaFin", new Date(fechaFin));

    const result = await request.query(query);

    res.json({
      detallePorCliente: result.recordset.map(r => ({
        ...r,
        cliente: (r.cliente || "").trim()
      }))
    });

  } catch (error) {
    console.error("Error en facturación por actividad:", error);
    res.status(500).json({ error: "Error obteniendo facturación por actividad" });
  }
});

// 3. FACTURA DE COMPRAS - Total facturado por cada Hospital en un período
router.get("/compras/por-hospital", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const pool = await getPool();

    // Agrupar por cliente (hospital) desde compras
    const query = `
      SELECT 
        c.IdCliente as id_hospital,
        LTRIM(RTRIM(c.Descripcion)) as hospital,
        COUNT(*) as cantidad_compras,
        SUM(c.ImporteTotal) as total_comprado,
        AVG(c.ImporteTotal) as promedio_compra,
        MAX(c.ImporteTotal) as compra_maxima
      FROM compras c
      WHERE c.IdStatus <> 0
        AND c.IdCliente IS NOT NULL
        ${fechaInicio ? 'AND c.Fecha >= @fechaInicio' : ''}
        ${fechaFin ? 'AND c.Fecha <= @fechaFin' : ''}
      GROUP BY c.IdCliente, c.Descripcion
      ORDER BY total_comprado DESC
    `;

    const request = pool.request();
    if (fechaInicio) request.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) request.input("fechaFin", new Date(fechaFin));

    const result = await request.query(query);

    const total = result.recordset.reduce((sum, r) => sum + r.total_comprado, 0);

    res.json({
      resumen: {
        total_comprado: total,
        cantidad_hospitales: result.recordset.length
      },
      detallePorHospital: result.recordset.map(r => ({
        ...r,
        hospital: (r.hospital || "").trim()
      }))
    });

  } catch (error) {
    console.error("Error en compras por hospital:", error);
    res.status(500).json({ error: "Error obteniendo compras por hospital" });
  }
});

// 4. FACTURA DE COMPRAS - Total facturado por tipo de proveedor
router.get("/compras/por-tipo-proveedor", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const pool = await getPool();

    const query = `
      SELECT 
        c.IdTipo_Prov_Categ as tipo_proveedor_id,
        c.IdProveedor as id_proveedor,
        LTRIM(RTRIM(c.Descripcion)) as proveedor,
        COUNT(*) as cantidad_compras,
        SUM(c.ImporteTotal) as total_comprado,
        AVG(c.ImporteTotal) as promedio_compra
      FROM compras c
      WHERE c.IdStatus <> 0
        ${fechaInicio ? 'AND c.Fecha >= @fechaInicio' : ''}
        ${fechaFin ? 'AND c.Fecha <= @fechaFin' : ''}
      GROUP BY c.IdTipo_Prov_Categ, c.IdProveedor, c.Descripcion
      ORDER BY total_comprado DESC
    `;

    const request = pool.request();
    if (fechaInicio) request.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) request.input("fechaFin", new Date(fechaFin));

    const result = await request.query(query);

    // Agrupar por tipo de proveedor
    const porTipo = {};
    result.recordset.forEach(r => {
      const tipo = r.tipo_proveedor_id || 0;
      if (!porTipo[tipo]) {
        porTipo[tipo] = {
          tipo_proveedor_id: tipo,
          cantidad_proveedores: 0,
          cantidad_compras: 0,
          total_comprado: 0
        };
      }
      porTipo[tipo].cantidad_proveedores++;
      porTipo[tipo].cantidad_compras += r.cantidad_compras;
      porTipo[tipo].total_comprado += r.total_comprado;
    });

    res.json({
      resumenPorTipo: Object.values(porTipo),
      detallePorProveedor: result.recordset.map(r => ({
        ...r,
        proveedor: (r.proveedor || "").trim()
      }))
    });

  } catch (error) {
    console.error("Error en compras por tipo proveedor:", error);
    res.status(500).json({ error: "Error obteniendo compras por tipo de proveedor" });
  }
});

// 5. RECIBOS - Total cobrado por la UEP en un período
router.get("/recibos/periodo", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const pool = await getPool();

    const query = `
      SELECT 
        YEAR(Fecha) as ano,
        MONTH(Fecha) as mes,
        COUNT(*) as cantidad_recibos,
        SUM(ImporteTotal) as total_cobrado,
        AVG(ImporteTotal) as promedio_recibo,
        MAX(ImporteTotal) as recibo_maximo,
        MIN(ImporteTotal) as recibo_minimo
      FROM cbtes
      WHERE TipoCbte = 'RC' 
        AND IDStatus <> 0
        ${fechaInicio ? 'AND Fecha >= @fechaInicio' : ''}
        ${fechaFin ? 'AND Fecha <= @fechaFin' : ''}
      GROUP BY YEAR(Fecha), MONTH(Fecha)
      ORDER BY YEAR(Fecha) DESC, MONTH(Fecha) DESC
    `;

    const request = pool.request();
    if (fechaInicio) request.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) request.input("fechaFin", new Date(fechaFin));

    const result = await request.query(query);

    const total = result.recordset.reduce((sum, r) => sum + r.total_cobrado, 0);
    const cantidadTotal = result.recordset.reduce((sum, r) => sum + r.cantidad_recibos, 0);

    res.json({
      resumen: {
        total_cobrado: total,
        cantidad_recibos: cantidadTotal,
        promedio_general: cantidadTotal > 0 ? total / cantidadTotal : 0
      },
      detallePorMes: result.recordset
    });

  } catch (error) {
    console.error("Error en recibos por período:", error);
    res.status(500).json({ error: "Error obteniendo recibos por período" });
  }
});

// 6. RECIBOS - Total cobrado por actividad del cliente
router.get("/recibos/actividad-cliente", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const pool = await getPool();

    const query = `
      SELECT 
        LTRIM(RTRIM(c.Descripcion)) as cliente,
        cl.IdActividad as id_actividad,
        COUNT(*) as cantidad_recibos,
        SUM(c.ImporteTotal) as total_cobrado,
        AVG(c.ImporteTotal) as promedio_recibo
      FROM cbtes c
      LEFT JOIN Clientes cl ON c.IdCliente = cl.IdCliente
      WHERE c.TipoCbte = 'RC' 
        AND c.IDStatus <> 0
        ${fechaInicio ? 'AND c.Fecha >= @fechaInicio' : ''}
        ${fechaFin ? 'AND c.Fecha <= @fechaFin' : ''}
      GROUP BY c.Descripcion, cl.IdActividad
      ORDER BY total_cobrado DESC
    `;

    const request = pool.request();
    if (fechaInicio) request.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) request.input("fechaFin", new Date(fechaFin));

    const result = await request.query(query);

    res.json({
      detallePorCliente: result.recordset.map(r => ({
        ...r,
        cliente: (r.cliente || "").trim()
      }))
    });

  } catch (error) {
    console.error("Error en recibos por actividad:", error);
    res.status(500).json({ error: "Error obteniendo recibos por actividad" });
  }
});

// 7. ORDEN DE PAGO - Total pagado por hospital y tipo de proveedor + filtro por hospital
router.get("/ordenes-pago/por-hospital-motivo", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, idHospital } = req.query;
    const pool = await getPool();

    let where = `op.IDStatus <> 0`;
    if (fechaInicio) where += ` AND op.Fecha >= @fechaInicio`;
    if (fechaFin) where += ` AND op.Fecha <= @fechaFin`;
    if (idHospital) where += ` AND op.Proveedor = @idHospital`;

    // Agrupado por tipo de proveedor (honorarios, gasto, etc.)
    const tipoQuery = `
      SELECT 
        ISNULL(tp.IDTIPO_PROV, 0) as id_tipo,
        ISNULL(LTRIM(RTRIM(tp.DESCRIPCION)), 'SIN TIPO') as tipo_proveedor,
        COUNT(*) as cantidad_ordenes,
        SUM(op.ImporteTotal) as total_pagado,
        AVG(op.ImporteTotal) as promedio_pago
      FROM OrdenPago op
      LEFT JOIN PROVEEDORES p ON p.IDPROVEEDOR = op.Proveedor
      LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
      WHERE ${where}
      GROUP BY tp.IDTIPO_PROV, tp.DESCRIPCION
      ORDER BY total_pagado DESC
    `;
    const tipoRequest = pool.request();
    if (fechaInicio) tipoRequest.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) tipoRequest.input("fechaFin", new Date(fechaFin));
    if (idHospital) tipoRequest.input("idHospital", parseInt(idHospital));
    const tipoResult = await tipoRequest.query(tipoQuery);

    // Detalle por proveedor/hospital
    const detalleQuery = `
      SELECT 
        op.Proveedor as id_proveedor,
        LTRIM(RTRIM(op.Descripcion)) as proveedor,
        ISNULL(LTRIM(RTRIM(tp.DESCRIPCION)), 'SIN TIPO') as tipo_proveedor,
        COUNT(*) as cantidad_ordenes,
        SUM(op.ImporteTotal) as total_pagado,
        AVG(op.ImporteTotal) as promedio_pago
      FROM OrdenPago op
      LEFT JOIN PROVEEDORES p ON p.IDPROVEEDOR = op.Proveedor
      LEFT JOIN TIPOS_PROVEEDORES tp ON tp.IDTIPO_PROV = p.IDTIPO_PROV
      WHERE ${where}
      GROUP BY op.Proveedor, op.Descripcion, tp.DESCRIPCION
      ORDER BY total_pagado DESC
    `;
    const detalleRequest = pool.request();
    if (fechaInicio) detalleRequest.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) detalleRequest.input("fechaFin", new Date(fechaFin));
    if (idHospital) detalleRequest.input("idHospital", parseInt(idHospital));
    const detalleResult = await detalleRequest.query(detalleQuery);

    // Lista de hospitales/proveedores para filtro
    const hospitalesQuery = `
      SELECT DISTINCT op.Proveedor as id, LTRIM(RTRIM(op.Descripcion)) as nombre
      FROM OrdenPago op WHERE op.IDStatus <> 0
      ORDER BY nombre
    `;
    const hospitalesResult = await pool.request().query(hospitalesQuery);

    const totalGeneral = tipoResult.recordset.reduce((s, r) => s + r.total_pagado, 0);
    const cantidadGeneral = tipoResult.recordset.reduce((s, r) => s + r.cantidad_ordenes, 0);

    res.json({
      resumen: {
        total_pagado: totalGeneral,
        cantidad_ordenes: cantidadGeneral
      },
      agrupadoPorTipo: tipoResult.recordset.map(r => ({
        ...r,
        tipo_proveedor: (r.tipo_proveedor || "").trim()
      })),
      detallePorProveedor: detalleResult.recordset.map(r => ({
        ...r,
        proveedor: (r.proveedor || "").trim(),
        tipo_proveedor: (r.tipo_proveedor || "").trim()
      })),
      hospitalesDisponibles: hospitalesResult.recordset.map(r => ({
        ...r,
        nombre: (r.nombre || "").trim()
      }))
    });

  } catch (error) {
    console.error("Error en órdenes de pago:", error);
    res.status(500).json({ error: "Error obteniendo órdenes de pago" });
  }
});

// 8. ANÁLISIS POR HOSPITAL - Movimientos bancarios por concepto (ban_ctas_mov -> ban_tipos_mov)
router.get("/analisis-hospital", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, idHospital, conceptos } = req.query;
    const pool = await getPool();
    
    console.log('[analisis-hospital] Request params:', { fechaInicio, fechaFin, idHospital, conceptos });

    // === MOVIMIENTOS BANCARIOS POR CONCEPTO (ban_ctas_mov -> ban_tipos_mov) ===
    // Obtener todos los conceptos bancarios disponibles
    const conceptosQuery = `
      SELECT DISTINCT b.Tipo_Movim as id_concepto, LTRIM(RTRIM(t.Descripcion)) as concepto
      FROM ban_ctas_mov b
      LEFT JOIN ban_tipos_mov t ON t.Tipo_Movim = b.Tipo_Movim
      WHERE b.IdStatus IN (1, 2)
        ${fechaInicio ? 'AND b.Fecha >= @fechaInicioC' : ''}
        ${fechaFin ? 'AND b.Fecha <= @fechaFinC' : ''}
      ORDER BY concepto
    `;
    const conceptosReq = pool.request();
    if (fechaInicio) conceptosReq.input("fechaInicioC", new Date(fechaInicio));
    if (fechaFin) conceptosReq.input("fechaFinC", new Date(fechaFin));
    const conceptosResult = await conceptosReq.query(conceptosQuery);
    const conceptosDisponibles = conceptosResult.recordset.map(r => ({ ...r, concepto: (r.concepto || "").trim() }));

    // Filtro por conceptos seleccionados (tags)
    let conceptoFilter = '';
    if (conceptos) {
      const conceptoIds = conceptos.split(',').map(Number).filter(n => !isNaN(n));
      if (conceptoIds.length > 0) {
        conceptoFilter = `AND b.Tipo_Movim IN (${conceptoIds.join(',')})`;
      }
    }

    // Movimientos bancarios individuales con su concepto
    const movBanQuery = `
      SELECT 
        b.IdTransaccion as id_movimiento,
        LTRIM(RTRIM(b.Concepto)) as hospital,
        b.Tipo_Movim as id_concepto,
        LTRIM(RTRIM(t.Descripcion)) as concepto,
        b.Importe as total,
        1 as cantidad_movimientos
      FROM ban_ctas_mov b
      LEFT JOIN ban_tipos_mov t ON t.Tipo_Movim = b.Tipo_Movim
      WHERE b.IdStatus IN (1, 2)
        ${fechaInicio ? 'AND b.Fecha >= @fechaInicioMB' : ''}
        ${fechaFin ? 'AND b.Fecha <= @fechaFinMB' : ''}
        ${conceptoFilter}
      ORDER BY b.Tipo_Movim, b.Concepto
    `;
    const movBanReq = pool.request();
    if (fechaInicio) movBanReq.input("fechaInicioMB", new Date(fechaInicio));
    if (fechaFin) movBanReq.input("fechaFinMB", new Date(fechaFin));
    const movBanResult = await movBanReq.query(movBanQuery);

    // Debug: ver qué tipos de movimientos tenemos
    const tiposUnicos = [...new Set(movBanResult.recordset.map(r => `${r.id_concepto}:${r.concepto}`))];
    console.log('[analisis-hospital] Tipos de movimientos encontrados:', tiposUnicos);

    // Agrupar por concepto con detalle de movimientos
    const conceptoMap = {};
    movBanResult.recordset.forEach(r => {
      const conceptoKey = r.id_concepto;
      if (!conceptoMap[conceptoKey]) {
        conceptoMap[conceptoKey] = {
          id_concepto: r.id_concepto,
          concepto: (r.concepto || "SIN CONCEPTO").trim(),
          total_general: 0,
          cantidad_movimientos: 0,
          hospitales: []
        };
      }
      conceptoMap[conceptoKey].hospitales.push({
        id_movimiento: r.id_movimiento,
        hospital: (r.hospital || "").trim(),
        total: r.total,
        cantidad_movimientos: r.cantidad_movimientos
      });
      conceptoMap[conceptoKey].total_general += r.total;
      conceptoMap[conceptoKey].cantidad_movimientos += r.cantidad_movimientos;
    });

    const response = {
      conceptos: Object.values(conceptoMap)
    };
    
    console.log('[analisis-hospital] Response:', {
      conceptosCount: response.conceptos.length,
      totalMovimientos: response.conceptos.reduce((sum, c) => sum + c.cantidad_movimientos, 0)
    });
    
    res.json(response);

  } catch (error) {
    console.error("Error en análisis por hospital:", error);
    res.status(500).json({ error: "Error obteniendo análisis por hospital" });
  }
});

module.exports = router;
