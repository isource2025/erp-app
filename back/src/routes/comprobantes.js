const express = require("express");
const XLSX = require("xlsx");
const { getPool } = require("../config/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Get comprobantes
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { ano, mes, tipo, busqueda, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pool = await getPool();

    let whereClause = "WHERE 1=1";
    const request = pool.request();

    if (ano) {
      whereClause += ` AND c.Ano = @ano`;
      request.input("ano", parseInt(ano));
    }
    if (mes) {
      whereClause += ` AND c.Mes = @mes`;
      request.input("mes", parseInt(mes));
    }
    if (tipo) {
      whereClause += ` AND c.TipoCbte = @tipo`;
      request.input("tipo", tipo);
    }
    if (busqueda) {
      whereClause += ` AND (c.Descripcion LIKE @busqueda OR CAST(c.NroCbte AS VARCHAR) LIKE @busqueda)`;
      request.input("busqueda", `%${busqueda}%`);
    }

    const countQuery = `SELECT COUNT(*) as total FROM cbtes c ${whereClause}`;
    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;

    const dataQuery = `
      SELECT c.IdTransaccion, c.Fecha, LTRIM(RTRIM(c.Descripcion)) as Cliente,
        LTRIM(RTRIM(c.TipoCbte)) as TipoCbte, c.Letra_Cbte, c.IdSucursal, c.NroCbte,
        c.ImporteNeto, c.ImporteTotal, c.Iva21, c.Saldo, c.Ano, c.Mes, c.IDStatus
      FROM cbtes c ${whereClause}
      ORDER BY c.Fecha DESC, c.IdTransaccion DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const dataRequest = pool.request();
    if (ano) dataRequest.input("ano", parseInt(ano));
    if (mes) dataRequest.input("mes", parseInt(mes));
    if (tipo) dataRequest.input("tipo", tipo);
    if (busqueda) dataRequest.input("busqueda", `%${busqueda}%`);
    dataRequest.input("offset", offset);
    dataRequest.input("limit", parseInt(limit));

    const dataResult = await dataRequest.query(dataQuery);

    res.json({
      comprobantes: dataResult.recordset.map(r => ({
        ...r,
        Cliente: (r.Cliente || "").trim(),
        TipoCbte: (r.TipoCbte || "").trim(),
        Letra_Cbte: (r.Letra_Cbte || "").trim(),
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Comprobantes error:", error);
    res.status(500).json({ error: "Error obteniendo comprobantes" });
  }
});

// Export comprobantes
router.get("/export", authMiddleware, async (req, res) => {
  try {
    const { ano, mes, tipo, busqueda } = req.query;
    const pool = await getPool();

    let whereClause = "WHERE 1=1";
    const request = pool.request();

    if (ano) {
      whereClause += ` AND c.Ano = @ano`;
      request.input("ano", parseInt(ano));
    }
    if (mes) {
      whereClause += ` AND c.Mes = @mes`;
      request.input("mes", parseInt(mes));
    }
    if (tipo) {
      whereClause += ` AND c.TipoCbte = @tipo`;
      request.input("tipo", tipo);
    }
    if (busqueda) {
      whereClause += ` AND (c.Descripcion LIKE @busqueda OR CAST(c.NroCbte AS VARCHAR) LIKE @busqueda)`;
      request.input("busqueda", `%${busqueda}%`);
    }

    const query = `
      SELECT c.Fecha, LTRIM(RTRIM(c.Descripcion)) as Cliente,
        LTRIM(RTRIM(c.TipoCbte)) as Tipo, LTRIM(RTRIM(c.Letra_Cbte)) as Letra,
        c.IdSucursal as Sucursal, c.NroCbte as Numero,
        c.ImporteNeto as Neto, c.Iva21 as IVA, c.ImporteTotal as Total, c.Saldo
      FROM cbtes c ${whereClause}
      ORDER BY c.Fecha DESC
    `;

    const result = await request.query(query);

    const data = result.recordset.map(r => ({
      Fecha: r.Fecha ? new Date(r.Fecha).toLocaleDateString("es-AR") : "",
      Cliente: (r.Cliente || "").trim(),
      Tipo: (r.Tipo || "").trim(),
      Letra: (r.Letra || "").trim(),
      Sucursal: r.Sucursal,
      Numero: r.Numero,
      Neto: r.Neto,
      IVA: r.IVA,
      Total: r.Total,
      Saldo: r.Saldo,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws["!cols"] = [
      { wch: 12 }, { wch: 40 }, { wch: 6 }, { wch: 6 },
      { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Comprobantes");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="comprobantes_${ano || "todos"}_${mes || "todos"}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Error exportando comprobantes" });
  }
});

module.exports = router;
