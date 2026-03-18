"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import FilterBar from "@/components/FilterBar";
import DataTable from "@/components/DataTable";
import StatsCard from "@/components/StatsCard";
import { TrendingUp, ArrowLeft, DollarSign, Users, FileText, ArrowUpDown, TrendingDown, Download, ShoppingCart } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Agrupado { id_actividad: number; actividad: string; total_facturado: number; cantidad: number }
interface Resumen { cantidad: number; total: number; promedio: number; maximo: number; minimo: number; saldo_pendiente: number; total_neto: number; total_iva: number; clientes_unicos: number }
interface Detalle { id: number; fecha: string; ano: number; mes: number; nro_cbte: number; letra: string; cliente: string; importe: number; neto: number; iva: number; saldo: number }
interface VentasData {
  agrupado: Agrupado[];
  totalesMensuales: { ano: number; mes: number; total_facturado: number; cantidad: number }[];
  anosDisponibles: number[];
}
interface DetalleData { resumen: Resumen; detalle: Detalle[] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ComprasRelacionadasData { factura: any; comprasRelacionadas: any[]; resumen: { cantidad_compras: number; total_compras: number; margen: number } }

const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fmt(val: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
}

export default function VentasPage() {
  const [data, setData] = useState<VentasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState("");
  const [mes, setMes] = useState("");
  const [selectedActividad, setSelectedActividad] = useState<Agrupado | null>(null);
  const [detalleData, setDetalleData] = useState<DetalleData | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Detalle | null>(null);
  const [comprasData, setComprasData] = useState<ComprasRelacionadasData | null>(null);
  const [loadingCompras, setLoadingCompras] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ano) params.set("ano", ano);
      if (mes) params.set("mes", mes);
      const result = await apiFetch<VentasData>(`/api/ventas/stats?${params}`);
      setData(result);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [ano, mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchDetalle = async (item: Agrupado) => {
    setSelectedActividad(item);
    setSelectedFactura(null);
    setComprasData(null);
    setLoadingDetalle(true);
    try {
      const params = new URLSearchParams();
      if (ano) params.set("ano", ano);
      if (mes) params.set("mes", mes);
      params.set("idActividad", String(item.id_actividad));
      const result = await apiFetch<DetalleData>(`/api/ventas/detalle?${params}`);
      setDetalleData(result);
    } catch (e) { console.error(e); }
    finally { setLoadingDetalle(false); }
  };

  const fetchComprasRelacionadas = async (factura: Detalle) => {
    setSelectedFactura(factura);
    setLoadingCompras(true);
    try {
      const result = await apiFetch<ComprasRelacionadasData>(`/api/ventas/compras-relacionadas?idTransaccion=${factura.id}`);
      setComprasData(result);
    } catch (e) { console.error(e); }
    finally { setLoadingCompras(false); }
  };

  const exportExcel = async (idTransaccion: number) => {
    try {
      const token = localStorage.getItem("token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";
      const response = await fetch(`${apiUrl}/api/ventas/compras-relacionadas/export?idTransaccion=${idTransaccion}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Error exportando");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Compras_FC_${idTransaccion}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const totalGeneral = data?.agrupado?.reduce((s, r) => s + r.total_facturado, 0) || 0;
  const cantidadGeneral = data?.agrupado?.reduce((s, r) => s + r.cantidad, 0) || 0;

  const chartData = (data?.totalesMensuales || [])
    .slice(0, ano || mes ? undefined : 12)
    .map(r => ({
      name: `${mesesCortos[r.mes - 1]} ${r.ano}`,
      Total: r.total_facturado,
    }))
    .reverse();

  // NIVEL 3: Compras relacionadas a una factura
  if (selectedFactura) {
    const cr = comprasData?.resumen;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedFactura(null); setComprasData(null); }} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Volver a Facturas
          </button>
        </div>

        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold">FC {(selectedFactura.letra || "").trim()} {selectedFactura.nro_cbte}</h1>
          <p className="text-indigo-200 mt-1">{selectedFactura.cliente} - {new Date(selectedFactura.fecha).toLocaleDateString('es-AR')} - Total: {fmt(selectedFactura.importe)}</p>
        </div>

        {cr && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Importe Factura" value={fmt(selectedFactura.importe)} subtitle="Factura de venta" icon={FileText} color="blue" />
            <StatsCard title="Total Compras" value={fmt(cr.total_compras)} subtitle={`${cr.cantidad_compras} compras vinculadas`} icon={ShoppingCart} color="orange" />
            <StatsCard title="Margen" value={fmt(cr.margen)} subtitle={selectedFactura.importe > 0 ? `${((cr.margen / selectedFactura.importe) * 100).toFixed(1)}% del total` : ''} icon={DollarSign} color={cr.margen >= 0 ? "green" : "purple"} />
            <div className="flex items-center justify-center">
              <button
                onClick={() => exportExcel(selectedFactura.id)}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <Download className="w-5 h-5" /> Exportar Excel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Compras Relacionadas</h2>
            <p className="text-sm text-gray-500">{comprasData?.comprasRelacionadas.length || 0} compras vinculadas a esta factura</p>
          </div>
          <DataTable
            loading={loadingCompras}
            columns={[
              { key: "fecha", label: "Fecha", align: "center", render: (v) => new Date(v as string).toLocaleDateString('es-AR') },
              { key: "letra", label: "Letra", align: "center" },
              { key: "nro_cbte", label: "N° Cbte", align: "center" },
              { key: "proveedor", label: "Proveedor" },
              { key: "tipo_proveedor", label: "Tipo", align: "center" },
              { key: "categoria", label: "Categoría", align: "center" },
              { key: "importe", label: "Total", align: "right", render: (v) => fmt(Number(v)) },
              { key: "iva", label: "IVA", align: "right", render: (v) => fmt(Number(v)) },
              { key: "saldo", label: "Saldo", align: "right", render: (v) => fmt(Number(v)) },
            ]}
            data={comprasData?.comprasRelacionadas || []}
            emptyMessage="No hay compras vinculadas a esta factura"
          />
        </div>
      </div>
    );
  }

  // NIVEL 2: Detalle de facturas por actividad
  if (selectedActividad) {
    const r = detalleData?.resumen;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedActividad(null); setDetalleData(null); }} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Volver a Actividades
          </button>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold">{selectedActividad.actividad}</h1>
          <p className="text-blue-200 mt-1">Detalle de facturación por actividad</p>
        </div>

        {r && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Facturado" value={fmt(r.total)} subtitle={`${r.cantidad} facturas`} icon={DollarSign} color="blue" />
            <StatsCard title="Promedio por Factura" value={fmt(r.promedio)} subtitle={`Máx: ${fmt(r.maximo)}`} icon={ArrowUpDown} color="green" />
            <StatsCard title="Saldo Pendiente" value={fmt(r.saldo_pendiente)} subtitle={`Mín: ${fmt(r.minimo)}`} icon={TrendingDown} color="orange" />
            <StatsCard title="Clientes Únicos" value={String(r.clientes_unicos)} subtitle={`Neto: ${fmt(r.total_neto)} | IVA: ${fmt(r.total_iva)}`} icon={Users} color="purple" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Facturas</h2>
            <p className="text-sm text-gray-500">{detalleData?.detalle.length || 0} comprobantes encontrados - Click en una factura para ver compras relacionadas</p>
          </div>
          <DataTable
            loading={loadingDetalle}
            columns={[
              { key: "fecha", label: "Fecha", align: "center", render: (v) => new Date(v as string).toLocaleDateString('es-AR') },
              { key: "letra", label: "Letra", align: "center" },
              { key: "nro_cbte", label: "N° Cbte", align: "center" },
              { key: "cliente", label: "Cliente" },
              { key: "neto", label: "Neto", align: "right", render: (v) => fmt(Number(v)) },
              { key: "iva", label: "IVA", align: "right", render: (v) => fmt(Number(v)) },
              { key: "importe", label: "Total", align: "right", render: (v) => fmt(Number(v)) },
              { key: "saldo", label: "Saldo", align: "right", render: (v) => fmt(Number(v)) },
            ]}
            data={detalleData?.detalle || []}
            emptyMessage="No hay facturas para esta actividad"
            onRowClick={(row) => fetchComprasRelacionadas(row)}
          />
        </div>
      </div>
    );
  }

  // NIVEL 1: Vista agrupada por actividad
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        <p className="text-gray-500 mt-1">Facturación agrupada por actividad de cliente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard title="Total Facturado" value={fmt(totalGeneral)} subtitle={`${cantidadGeneral} comprobantes`} icon={TrendingUp} color="blue" />
      </div>

      <FilterBar
        anos={data?.anosDisponibles || []}
        selectedAno={ano}
        selectedMes={mes}
        onAnoChange={(v) => { setAno(v); setSelectedActividad(null); }}
        onMesChange={(v) => { setMes(v); setSelectedActividad(null); }}
      />

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Facturación por Período</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
              <Bar dataKey="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Por Actividad</h2>
          <p className="text-sm text-gray-500">Click en una fila para ver el detalle</p>
        </div>
        <DataTable
          loading={loading}
          columns={[
            { key: "actividad", label: "Actividad" },
            { key: "total_facturado", label: "Total Facturado", align: "right", render: (v) => fmt(Number(v)) },
            { key: "cantidad", label: "Cantidad", align: "right" },
          ]}
          data={data?.agrupado || []}
          emptyMessage="No hay datos de ventas para los filtros seleccionados"
          onRowClick={(row) => fetchDetalle(row)}
        />
      </div>
    </div>
  );
}
