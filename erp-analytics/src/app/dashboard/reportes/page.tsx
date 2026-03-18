"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import DataTable from "@/components/DataTable";
import StatsCard from "@/components/StatsCard";
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, FileText, DollarSign, ShoppingCart, Wallet, CreditCard, ClipboardList, ArrowRight } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart
} from "recharts";

interface EstadisticasData {
  total: number;
  promedio: number;
  max: number;
  min: number;
  desviacionEstandar: number;
  coeficienteVariacion: number;
  cantidadPeriodos: number;
}

interface DatosPeriodo {
  periodo: string;
  valor: number;
  cantidad: number;
}

interface Proyeccion {
  mes: number;
  valor: number;
}

interface ReportesData {
  periodo: {
    inicio: string;
    fin: string;
  };
  ventas: {
    datos: DatosPeriodo[];
    estadisticas: EstadisticasData;
    tendencia: string;
    proyecciones: Proyeccion[];
  };
  cobranzas: {
    datos: DatosPeriodo[];
    estadisticas: EstadisticasData;
    tendencia: string;
    proyecciones: Proyeccion[];
  };
  compras: {
    datos: DatosPeriodo[];
    estadisticas: EstadisticasData;
    tendencia: string;
    proyecciones: Proyeccion[];
  };
  analisisEficiencia: {
    datos: { periodo: string; ventas: number; cobranzas: number; eficiencia: number }[];
    promedioEficiencia: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ActividadAgrupada { id_actividad: number; actividad: string; total_facturado?: number; total_cobrado?: number; cantidad: number; promedio: number; clientes_unicos: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TotalesAgrupados { ventas: any; cobranzas: any; compras: any; pagos: any }

function fmt(val: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
}

function formatPeriodo(periodo: string) {
  const [ano, mes] = periodo.split('-');
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${meses[parseInt(mes) - 1]} ${ano}`;
}

export default function ReportesPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [factActividad, setFactActividad] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cobActividad, setCobActividad] = useState<any>(null);
  const [totales, setTotales] = useState<TotalesAgrupados | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.set("fechaInicio", fechaInicio);
      if (fechaFin) params.set("fechaFin", fechaFin);
      const [result, fAct, cAct, tot] = await Promise.all([
        apiFetch<ReportesData>(`/api/reportes/analisis?${params}`),
        apiFetch(`/api/reportes/facturacion-por-actividad?${params}`),
        apiFetch(`/api/reportes/cobranzas-por-actividad?${params}`),
        apiFetch<TotalesAgrupados>(`/api/reportes/totales-agrupados?${params}`),
      ]);
      setData(result);
      setFactActividad(fAct);
      setCobActividad(cAct);
      setTotales(tot);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { 
    const hoy = new Date();
    const hace12Meses = new Date();
    hace12Meses.setMonth(hoy.getMonth() - 12);
    
    if (!fechaInicio) setFechaInicio(hace12Meses.toISOString().split('T')[0]);
    if (!fechaFin) setFechaFin(hoy.toISOString().split('T')[0]);
  }, []);

  useEffect(() => { 
    if (fechaInicio && fechaFin) {
      fetchData(); 
    }
  }, [fetchData, fechaInicio, fechaFin]);

  const getTendenciaIcon = (tendencia: string) => {
    if (tendencia === "creciente") return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (tendencia === "decreciente") return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-600" />;
  };

  const getTendenciaColor = (tendencia: string) => {
    if (tendencia === "creciente") return "text-green-600";
    if (tendencia === "decreciente") return "text-red-600";
    return "text-gray-600";
  };

  // Preparar datos para gráfico de tendencias con proyecciones
  const prepararDatosConProyecciones = (datos: DatosPeriodo[], proyecciones: Proyeccion[], label: string) => {
    const datosHistoricos = datos.map(d => ({
      periodo: formatPeriodo(d.periodo),
      [label]: d.valor,
      tipo: 'real'
    }));

    const ultimoPeriodo = datos[datos.length - 1];
    if (!ultimoPeriodo) return datosHistoricos;

    const [ano, mes] = ultimoPeriodo.periodo.split('-');
    const datosProyectados = proyecciones.map((p, i) => {
      const nuevaFecha = new Date(parseInt(ano), parseInt(mes) - 1 + p.mes);
      const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      return {
        periodo: `${meses[nuevaFecha.getMonth()]} ${nuevaFecha.getFullYear()}`,
        [label]: null,
        [`${label}_proyectado`]: p.valor,
        tipo: 'proyeccion'
      };
    });

    return [...datosHistoricos, ...datosProyectados];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando análisis...</div>
      </div>
    );
  }

  if (!data) return null;

  const datosVentasConProyeccion = prepararDatosConProyecciones(data.ventas.datos, data.ventas.proyecciones, 'Ventas');
  const datosCobranzasConProyeccion = prepararDatosConProyecciones(data.cobranzas.datos, data.cobranzas.proyecciones, 'Cobranzas');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
        <p className="text-gray-500 mt-1">Análisis estadístico y proyecciones</p>
      </div>

      {/* Banner Reportes Específicos */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/reportes-especificos')}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <ClipboardList className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Reportes Específicos</h2>
            </div>
            <p className="text-indigo-100 text-sm mb-4 max-w-2xl">
              Accede a reportes detallados por hospital, facturación, órdenes de pago, honorarios y análisis específicos de compras y ventas.
            </p>
            <button className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
              Ver Reportes Específicos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">Desde:</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Hasta:</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Resumen de tendencias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Tendencia Ventas</h3>
            {getTendenciaIcon(data.ventas.tendencia)}
          </div>
          <p className={`text-2xl font-bold ${getTendenciaColor(data.ventas.tendencia)}`}>
            {data.ventas.tendencia.charAt(0).toUpperCase() + data.ventas.tendencia.slice(1)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Promedio: {fmt(data.ventas.estadisticas.promedio)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Tendencia Cobranzas</h3>
            {getTendenciaIcon(data.cobranzas.tendencia)}
          </div>
          <p className={`text-2xl font-bold ${getTendenciaColor(data.cobranzas.tendencia)}`}>
            {data.cobranzas.tendencia.charAt(0).toUpperCase() + data.cobranzas.tendencia.slice(1)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Promedio: {fmt(data.cobranzas.estadisticas.promedio)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Eficiencia de Cobranza</h3>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {data.analisisEficiencia.promedioEficiencia.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500 mt-1">Promedio del período</p>
        </div>
      </div>

      {/* Estadísticas detalladas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Ventas"
          value={fmt(data.ventas.estadisticas.total)}
          subtitle={`${data.ventas.estadisticas.cantidadPeriodos} períodos`}
          icon={FileText}
          color="blue"
        />
        <StatsCard
          title="Total Cobrado"
          value={fmt(data.cobranzas.estadisticas.total)}
          subtitle={`${data.cobranzas.estadisticas.cantidadPeriodos} períodos`}
          icon={FileText}
          color="green"
        />
        <StatsCard
          title="Total Compras"
          value={fmt(data.compras.estadisticas.total)}
          subtitle={`${data.compras.estadisticas.cantidadPeriodos} períodos`}
          icon={FileText}
          color="purple"
        />
      </div>

      {/* Gráfico de ventas con proyección */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventas - Histórico y Proyección</h2>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={datosVentasConProyeccion}>
            <defs>
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProyeccion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
            <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
            <Legend />
            <Area type="monotone" dataKey="Ventas" stroke="#3b82f6" fill="url(#colorVentas)" name="Ventas Reales" />
            <Area type="monotone" dataKey="Ventas_proyectado" stroke="#10b981" strokeDasharray="5 5" fill="url(#colorProyeccion)" name="Proyección" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de cobranzas con proyección */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cobranzas - Histórico y Proyección</h2>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={datosCobranzasConProyeccion}>
            <defs>
              <linearGradient id="colorCobranzas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProyeccionCob" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
            <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
            <Legend />
            <Area type="monotone" dataKey="Cobranzas" stroke="#10b981" fill="url(#colorCobranzas)" name="Cobranzas Reales" />
            <Area type="monotone" dataKey="Cobranzas_proyectado" stroke="#f59e0b" strokeDasharray="5 5" fill="url(#colorProyeccionCob)" name="Proyección" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de eficiencia de cobranza */}
      {data.analisisEficiencia.datos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Eficiencia de Cobranza por Período</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.analisisEficiencia.datos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} tickFormatter={formatPeriodo} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip 
                formatter={(v: any) => `${Number(v).toFixed(1)}%`} 
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} 
              />
              <Legend />
              <Line type="monotone" dataKey="eficiencia" stroke="#8b5cf6" strokeWidth={2} name="% Eficiencia" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-500 mt-4 text-center">
            La eficiencia de cobranza mide el porcentaje de ventas que se cobran en cada período
          </p>
        </div>
      )}

      {/* Totales Agrupados del Período */}
      {totales && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Totales del Período</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Ventas" value={fmt(totales.ventas?.total || 0)} subtitle={`${totales.ventas?.cantidad || 0} facturas | Prom: ${fmt(totales.ventas?.promedio || 0)}`} icon={DollarSign} color="blue" />
            <StatsCard title="Cobranzas" value={fmt(totales.cobranzas?.total || 0)} subtitle={`${totales.cobranzas?.cantidad || 0} recibos | Prom: ${fmt(totales.cobranzas?.promedio || 0)}`} icon={Wallet} color="green" />
            <StatsCard title="Compras" value={fmt(totales.compras?.total || 0)} subtitle={`${totales.compras?.cantidad || 0} facturas | Prom: ${fmt(totales.compras?.promedio || 0)}`} icon={ShoppingCart} color="orange" />
            <StatsCard title="Pagos" value={fmt(totales.pagos?.total || 0)} subtitle={`${totales.pagos?.cantidad || 0} órdenes | Prom: ${fmt(totales.pagos?.promedio || 0)}`} icon={CreditCard} color="purple" />
          </div>
        </div>
      )}

      {/* Facturación por Actividad */}
      {factActividad && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Facturación por Actividad de Cliente</h2>
            <p className="text-sm text-gray-500">Total: {fmt(factActividad.resumen?.total || 0)} en {factActividad.resumen?.cantidad || 0} facturas</p>
          </div>
          <DataTable
            loading={false}
            columns={[
              { key: "actividad", label: "Actividad" },
              { key: "total_facturado", label: "Total Facturado", align: "right", render: (v) => fmt(Number(v)) },
              { key: "cantidad", label: "Cantidad", align: "right" },
              { key: "promedio", label: "Promedio", align: "right", render: (v) => fmt(Number(v)) },
              { key: "clientes_unicos", label: "Clientes", align: "right" },
            ]}
            data={factActividad.agrupado || []}
            emptyMessage="No hay datos de facturación por actividad"
          />
        </div>
      )}

      {/* Cobranzas por Actividad */}
      {cobActividad && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Cobranzas por Actividad de Cliente</h2>
            <p className="text-sm text-gray-500">Total: {fmt(cobActividad.resumen?.total || 0)} en {cobActividad.resumen?.cantidad || 0} recibos</p>
          </div>
          <DataTable
            loading={false}
            columns={[
              { key: "actividad", label: "Actividad" },
              { key: "total_cobrado", label: "Total Cobrado", align: "right", render: (v) => fmt(Number(v)) },
              { key: "cantidad", label: "Cantidad", align: "right" },
              { key: "promedio", label: "Promedio", align: "right", render: (v) => fmt(Number(v)) },
              { key: "clientes_unicos", label: "Clientes", align: "right" },
            ]}
            data={cobActividad.agrupado || []}
            emptyMessage="No hay datos de cobranzas por actividad"
          />
        </div>
      )}

      {/* Tabla de estadísticas comparativas */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas Comparativas</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Métrica</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ventas</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Cobranzas</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Compras</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-gray-600">Promedio</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.ventas.estadisticas.promedio)}</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.cobranzas.estadisticas.promedio)}</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.compras.estadisticas.promedio)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-gray-600">Máximo</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.ventas.estadisticas.max)}</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.cobranzas.estadisticas.max)}</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.compras.estadisticas.max)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-gray-600">Mínimo</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.ventas.estadisticas.min)}</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.cobranzas.estadisticas.min)}</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.compras.estadisticas.min)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-gray-600">Desviación Estándar</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.ventas.estadisticas.desviacionEstandar)}</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.cobranzas.estadisticas.desviacionEstandar)}</td>
                <td className="py-3 px-4 text-sm text-right">{fmt(data.compras.estadisticas.desviacionEstandar)}</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-sm text-gray-600">Coef. Variación</td>
                <td className="py-3 px-4 text-sm text-right">{data.ventas.estadisticas.coeficienteVariacion.toFixed(2)}%</td>
                <td className="py-3 px-4 text-sm text-right">{data.cobranzas.estadisticas.coeficienteVariacion.toFixed(2)}%</td>
                <td className="py-3 px-4 text-sm text-right">{data.compras.estadisticas.coeficienteVariacion.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
