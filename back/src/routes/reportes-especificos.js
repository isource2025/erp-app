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

// 7. ORDEN DE PAGO - Total pagado por cada Hospital por motivo de pago
router.get("/ordenes-pago/por-hospital-motivo", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const pool = await getPool();

    const query = `
      SELECT 
        op.Proveedor as id_hospital,
        LTRIM(RTRIM(op.Descripcion)) as hospital,
        op.idmotivo as id_motivo,
        COUNT(*) as cantidad_ordenes,
        SUM(op.ImporteTotal) as total_pagado,
        AVG(op.ImporteTotal) as promedio_pago
      FROM OrdenPago op
      WHERE op.IDStatus <> 0
        ${fechaInicio ? 'AND op.Fecha >= @fechaInicio' : ''}
        ${fechaFin ? 'AND op.Fecha <= @fechaFin' : ''}
      GROUP BY op.Proveedor, op.Descripcion, op.idmotivo
      ORDER BY total_pagado DESC
    `;

    const request = pool.request();
    if (fechaInicio) request.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) request.input("fechaFin", new Date(fechaFin));

    const result = await request.query(query);

    const total = result.recordset.reduce((sum, r) => sum + r.total_pagado, 0);

    res.json({
      resumen: {
        total_pagado: total,
        cantidad_ordenes: result.recordset.reduce((sum, r) => sum + r.cantidad_ordenes, 0)
      },
      detallePorHospitalMotivo: result.recordset.map(r => ({
        ...r,
        hospital: (r.hospital || "").trim()
      }))
    });

  } catch (error) {
    console.error("Error en órdenes de pago:", error);
    res.status(500).json({ error: "Error obteniendo órdenes de pago" });
  }
});

// 8. ANÁLISIS POR HOSPITAL - Débitos, gastos administrativos, sobreasignación, honorarios, transferencias
router.get("/analisis-hospital", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, idHospital } = req.query;
    const pool = await getPool();

    // Obtener compras por hospital con categorización
    const query = `
      SELECT 
        c.IdCliente as id_hospital,
        LTRIM(RTRIM(c.Descripcion)) as hospital,
        SUM(CASE WHEN c.IdTipo_Prov_Categ = 1 THEN c.ImporteTotal ELSE 0 END) as total_debitos,
        SUM(CASE WHEN c.IdTipo_Prov_Categ = 2 THEN c.ImporteTotal ELSE 0 END) as total_gasto_administrativo,
        SUM(CASE WHEN c.IdTipo_Prov_Categ = 3 THEN c.ImporteTotal ELSE 0 END) as total_sobreasignacion,
        SUM(CASE WHEN c.IdTipo_Prov_Categ = 4 THEN c.ImporteTotal ELSE 0 END) as total_honorarios,
        SUM(CASE WHEN c.IdTipo_Prov_Categ = 5 THEN c.ImporteTotal ELSE 0 END) as total_transferencias,
        SUM(c.ImporteTotal) as total_general,
        COUNT(*) as cantidad_compras
      FROM compras c
      WHERE c.IdStatus <> 0
        AND c.IdCliente IS NOT NULL
        ${fechaInicio ? 'AND c.Fecha >= @fechaInicio' : ''}
        ${fechaFin ? 'AND c.Fecha <= @fechaFin' : ''}
        ${idHospital ? 'AND c.IdCliente = @idHospital' : ''}
      GROUP BY c.IdCliente, c.Descripcion
      ORDER BY total_general DESC
    `;

    const request = pool.request();
    if (fechaInicio) request.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) request.input("fechaFin", new Date(fechaFin));
    if (idHospital) request.input("idHospital", parseInt(idHospital));

    const result = await request.query(query);

    res.json({
      detallePorHospital: result.recordset.map(r => ({
        ...r,
        hospital: (r.hospital || "").trim()
      }))
    });

  } catch (error) {
    console.error("Error en análisis por hospital:", error);
    res.status(500).json({ error: "Error obteniendo análisis por hospital" });
  }
});

module.exports = router;
