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

// 8. ANÁLISIS POR HOSPITAL - Desglose por categoría de proveedor (TIPOS_PROV_CATEG)
router.get("/analisis-hospital", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, idHospital } = req.query;
    const pool = await getPool();

    // Obtener las categorías de proveedor que existen en los datos
    const categQuery = `
      SELECT DISTINCT 
        ISNULL(c.IdTipo_Prov_Categ, 0) as id_categ,
        ISNULL(LTRIM(RTRIM(tc.DESCRIPCION)), 'SIN CATEGORÍA') as categoria
      FROM compras c
      LEFT JOIN TIPOS_PROV_CATEG tc ON tc.IDTIPO_PROV_CATEG = c.IdTipo_Prov_Categ
      WHERE c.IdStatus <> 0
        ${fechaInicio ? 'AND c.Fecha >= @fechaInicio1' : ''}
        ${fechaFin ? 'AND c.Fecha <= @fechaFin1' : ''}
      ORDER BY id_categ
    `;
    const categRequest = pool.request();
    if (fechaInicio) categRequest.input("fechaInicio1", new Date(fechaInicio));
    if (fechaFin) categRequest.input("fechaFin1", new Date(fechaFin));
    const categResult = await categRequest.query(categQuery);
    const categorias = categResult.recordset;

    // Obtener datos desglosados por hospital y categoría de proveedor
    const query = `
      SELECT 
        c.IdCliente as id_hospital,
        LTRIM(RTRIM(c.Descripcion)) as hospital,
        ISNULL(c.IdTipo_Prov_Categ, 0) as id_categ,
        ISNULL(LTRIM(RTRIM(tc.DESCRIPCION)), 'SIN CATEGORÍA') as categoria,
        SUM(c.ImporteTotal) as total,
        COUNT(*) as cantidad
      FROM compras c
      LEFT JOIN TIPOS_PROV_CATEG tc ON tc.IDTIPO_PROV_CATEG = c.IdTipo_Prov_Categ
      WHERE c.IdStatus <> 0
        AND c.IdCliente IS NOT NULL
        ${fechaInicio ? 'AND c.Fecha >= @fechaInicio' : ''}
        ${fechaFin ? 'AND c.Fecha <= @fechaFin' : ''}
        ${idHospital ? 'AND c.IdCliente = @idHospital' : ''}
      GROUP BY c.IdCliente, c.Descripcion, c.IdTipo_Prov_Categ, tc.DESCRIPCION
      ORDER BY c.Descripcion, c.IdTipo_Prov_Categ
    `;

    const request = pool.request();
    if (fechaInicio) request.input("fechaInicio", new Date(fechaInicio));
    if (fechaFin) request.input("fechaFin", new Date(fechaFin));
    if (idHospital) request.input("idHospital", parseInt(idHospital));

    const result = await request.query(query);

    // Pivotar datos: agrupar por hospital con columnas dinámicas por categoría
    const hospitalMap = {};
    result.recordset.forEach(r => {
      const key = r.id_hospital;
      if (!hospitalMap[key]) {
        hospitalMap[key] = {
          id_hospital: r.id_hospital,
          hospital: (r.hospital || "").trim(),
          total_general: 0,
          cantidad_total: 0,
          categorias: {}
        };
      }
      const categKey = (r.categoria || "SIN CATEGORÍA").trim();
      hospitalMap[key].categorias[categKey] = (hospitalMap[key].categorias[categKey] || 0) + r.total;
      hospitalMap[key].total_general += r.total;
      hospitalMap[key].cantidad_total += r.cantidad;
    });

    res.json({
      categoriasProveedor: categorias.map(c => c.categoria.trim()),
      detallePorHospital: Object.values(hospitalMap)
    });

  } catch (error) {
    console.error("Error en análisis por hospital:", error);
    res.status(500).json({ error: "Error obteniendo análisis por hospital" });
  }
});

module.exports = router;
