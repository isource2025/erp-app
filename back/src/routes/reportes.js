const express = require("express");
const { getPool } = require("../config/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Función para calcular regresión lineal simple
function calcularRegresionLineal(datos) {
  const n = datos.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  datos.forEach((punto, i) => {
    const x = i;
    const y = punto.valor;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercepto = (sumY - pendiente * sumX) / n;

  return { pendiente, intercepto };
}

// Función para proyectar valores futuros
function proyectarValores(regresion, datosActuales, mesesProyeccion) {
  if (!regresion) return [];
  
  const proyecciones = [];
  const ultimoIndice = datosActuales.length - 1;
  
  for (let i = 1; i <= mesesProyeccion; i++) {
    const x = ultimoIndice + i;
    const valorProyectado = regresion.pendiente * x + regresion.intercepto;
    proyecciones.push({
      mes: i,
      valor: Math.max(0, valorProyectado) // No permitir valores negativos
    });
  }
  
  return proyecciones;
}

// Endpoint principal de reportes
router.get("/analisis", authMiddleware, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tipo } = req.query;
    const pool = await getPool();

    // Validar fechas
    const inicio = fechaInicio ? new Date(fechaInicio) : new Date(new Date().setMonth(new Date().getMonth() - 12));
    const fin = fechaFin ? new Date(fechaFin) : new Date();

    // Obtener datos de ventas por mes
    const ventasQuery = `
      SELECT 
        YEAR(Fecha) as ano,
        MONTH(Fecha) as mes,
        SUM(ImporteTotal) as total,
        COUNT(*) as cantidad
      FROM cbtes
      WHERE TipoCbte = 'FC' 
        AND IDStatus <> 0
        AND Fecha >= @inicio
        AND Fecha <= @fin
      GROUP BY YEAR(Fecha), MONTH(Fecha)
      ORDER BY YEAR(Fecha), MONTH(Fecha)
    `;
    
    const ventasResult = await pool.request()
      .input("inicio", inicio)
      .input("fin", fin)
      .query(ventasQuery);

    // Obtener datos de cobranzas por mes
    const cobranzasQuery = `
      SELECT 
        YEAR(Fecha) as ano,
        MONTH(Fecha) as mes,
        SUM(ImporteTotal) as total,
        COUNT(*) as cantidad
      FROM cbtes
      WHERE TipoCbte = 'RC' 
        AND IDStatus <> 0
        AND Fecha >= @inicio
        AND Fecha <= @fin
      GROUP BY YEAR(Fecha), MONTH(Fecha)
      ORDER BY YEAR(Fecha), MONTH(Fecha)
    `;
    
    const cobranzasResult = await pool.request()
      .input("inicio", inicio)
      .input("fin", fin)
      .query(cobranzasQuery);

    // Obtener datos de compras por mes
    const comprasQuery = `
      SELECT 
        YEAR(Fecha) as ano,
        MONTH(Fecha) as mes,
        SUM(ImporteTotal) as total,
        COUNT(*) as cantidad
      FROM compras
      WHERE IDStatus <> 0
        AND Fecha >= @inicio
        AND Fecha <= @fin
      GROUP BY YEAR(Fecha), MONTH(Fecha)
      ORDER BY YEAR(Fecha), MONTH(Fecha)
    `;
    
    const comprasResult = await pool.request()
      .input("inicio", inicio)
      .input("fin", fin)
      .query(comprasQuery);

    // Preparar datos para análisis
    const ventasData = ventasResult.recordset.map(r => ({
      periodo: `${r.ano}-${String(r.mes).padStart(2, '0')}`,
      valor: r.total,
      cantidad: r.cantidad
    }));

    const cobranzasData = cobranzasResult.recordset.map(r => ({
      periodo: `${r.ano}-${String(r.mes).padStart(2, '0')}`,
      valor: r.total,
      cantidad: r.cantidad
    }));

    const comprasData = comprasResult.recordset.map(r => ({
      periodo: `${r.ano}-${String(r.mes).padStart(2, '0')}`,
      valor: r.total,
      cantidad: r.cantidad
    }));

    // Calcular estadísticas
    const calcularEstadisticas = (datos) => {
      if (datos.length === 0) return null;
      
      const valores = datos.map(d => d.valor);
      const total = valores.reduce((a, b) => a + b, 0);
      const promedio = total / valores.length;
      const max = Math.max(...valores);
      const min = Math.min(...valores);
      
      // Desviación estándar
      const varianza = valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length;
      const desviacionEstandar = Math.sqrt(varianza);
      
      // Coeficiente de variación
      const coeficienteVariacion = (desviacionEstandar / promedio) * 100;
      
      return {
        total,
        promedio,
        max,
        min,
        desviacionEstandar,
        coeficienteVariacion,
        cantidadPeriodos: datos.length
      };
    };

    const estadisticasVentas = calcularEstadisticas(ventasData);
    const estadisticasCobranzas = calcularEstadisticas(cobranzasData);
    const estadisticasCompras = calcularEstadisticas(comprasData);

    // Calcular tendencias y proyecciones
    const regresionVentas = calcularRegresionLineal(ventasData);
    const regresionCobranzas = calcularRegresionLineal(cobranzasData);
    const regresionCompras = calcularRegresionLineal(comprasData);

    const proyeccionesVentas = proyectarValores(regresionVentas, ventasData, 3);
    const proyeccionesCobranzas = proyectarValores(regresionCobranzas, cobranzasData, 3);
    const proyeccionesCompras = proyectarValores(regresionCompras, comprasData, 3);

    // Calcular tendencia (crecimiento/decrecimiento)
    const calcularTendencia = (regresion) => {
      if (!regresion) return "neutral";
      if (regresion.pendiente > 0) return "creciente";
      if (regresion.pendiente < 0) return "decreciente";
      return "estable";
    };

    // Análisis de eficiencia de cobranza
    const eficienciaCobranza = ventasData.map((v, i) => {
      const cobranza = cobranzasData[i];
      if (!cobranza) return null;
      return {
        periodo: v.periodo,
        ventas: v.valor,
        cobranzas: cobranza.valor,
        eficiencia: cobranza.valor / v.valor * 100
      };
    }).filter(e => e !== null);

    const promedioEficiencia = eficienciaCobranza.length > 0
      ? eficienciaCobranza.reduce((sum, e) => sum + e.eficiencia, 0) / eficienciaCobranza.length
      : 0;

    res.json({
      periodo: {
        inicio: inicio.toISOString().split('T')[0],
        fin: fin.toISOString().split('T')[0]
      },
      ventas: {
        datos: ventasData,
        estadisticas: estadisticasVentas,
        tendencia: calcularTendencia(regresionVentas),
        proyecciones: proyeccionesVentas
      },
      cobranzas: {
        datos: cobranzasData,
        estadisticas: estadisticasCobranzas,
        tendencia: calcularTendencia(regresionCobranzas),
        proyecciones: proyeccionesCobranzas
      },
      compras: {
        datos: comprasData,
        estadisticas: estadisticasCompras,
        tendencia: calcularTendencia(regresionCompras),
        proyecciones: proyeccionesCompras
      },
      analisisEficiencia: {
        datos: eficienciaCobranza,
        promedioEficiencia
      }
    });

  } catch (error) {
    console.error("Reportes error:", error);
    res.status(500).json({ error: "Error generando reporte de análisis" });
  }
});

// Endpoint para comparación de períodos
router.get("/comparacion", authMiddleware, async (req, res) => {
  try {
    const { periodo1Inicio, periodo1Fin, periodo2Inicio, periodo2Fin } = req.query;
    const pool = await getPool();

    const compararPeriodo = async (inicio, fin, label) => {
      const ventasQuery = `
        SELECT SUM(ImporteTotal) as total, COUNT(*) as cantidad
        FROM cbtes
        WHERE TipoCbte = 'FC' AND IDStatus <> 0
          AND Fecha >= @inicio AND Fecha <= @fin
      `;
      
      const cobranzasQuery = `
        SELECT SUM(ImporteTotal) as total, COUNT(*) as cantidad
        FROM cbtes
        WHERE TipoCbte = 'RC' AND IDStatus <> 0
          AND Fecha >= @inicio AND Fecha <= @fin
      `;

      const ventas = await pool.request()
        .input("inicio", new Date(inicio))
        .input("fin", new Date(fin))
        .query(ventasQuery);

      const cobranzas = await pool.request()
        .input("inicio", new Date(inicio))
        .input("fin", new Date(fin))
        .query(cobranzasQuery);

      return {
        label,
        ventas: ventas.recordset[0].total || 0,
        cantidadVentas: ventas.recordset[0].cantidad || 0,
        cobranzas: cobranzas.recordset[0].total || 0,
        cantidadCobranzas: cobranzas.recordset[0].cantidad || 0
      };
    };

    const periodo1 = await compararPeriodo(periodo1Inicio, periodo1Fin, "Período 1");
    const periodo2 = await compararPeriodo(periodo2Inicio, periodo2Fin, "Período 2");

    const variacionVentas = periodo1.ventas > 0 
      ? ((periodo2.ventas - periodo1.ventas) / periodo1.ventas * 100)
      : 0;

    const variacionCobranzas = periodo1.cobranzas > 0
      ? ((periodo2.cobranzas - periodo1.cobranzas) / periodo1.cobranzas * 100)
      : 0;

    res.json({
      periodo1,
      periodo2,
      variaciones: {
        ventas: variacionVentas,
        cobranzas: variacionCobranzas
      }
    });

  } catch (error) {
    console.error("Comparación error:", error);
    res.status(500).json({ error: "Error en comparación de períodos" });
  }
});

module.exports = router;
