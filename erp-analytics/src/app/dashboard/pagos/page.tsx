"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import FilterBar from "@/components/FilterBar";
import DataTable from "@/components/DataTable";
import StatsCard from "@/components/StatsCard";
import { CreditCard, ArrowLeft, DollarSign, ArrowUpDown, TrendingDown, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Agrupado { id_concepto: number; concepto: string; cantidad_ordenes: number; total_pagado: number }
interface TipoProv { id_tipo: number; tipo_proveedor: string; cantidad_ordenes: number; total_pagado: number; promedio: number }
interface DetalleOP { id: number; fecha: string; ano: number; mes: number; nro_cbte: number; letra: string; proveedor: string; tipo_proveedor: string; importe: number; saldo: number }
interface Resumen { cantidad: number; total: number; promedio: number; maximo: number; minimo: number; saldo_pendiente: number }
interface PagosData {
  agrupado: Agrupado[];
  totalesMensuales: { ano: number; mes: number; total_pagado: number; cantidad: number }[];
  anosDisponibles: number[];
}
interface DetalleData { resumen: Resumen; agrupadoPorTipo: TipoProv[]; detalle: DetalleOP[] }

const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fmt(val: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
}

export default function PagosPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PagosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState("");
  const [mes, setMes] = useState("");
  const [selectedConcepto, setSelectedConcepto] = useState<Agrupado | null>(null);
  const [detalleData, setDetalleData] = useState<DetalleData | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [directProveedor, setDirectProveedor] = useState<{id: string; nombre: string} | null>(null);

  // Auto-load detail if navigated with idProveedor param
  useEffect(() => {
    const idProv = searchParams.get('idProveedor');
    const nombre = searchParams.get('nombre') || 'Proveedor';
    if (idProv) {
      setDirectProveedor({ id: idProv, nombre });
      setLoadingDetalle(true);
      const params = new URLSearchParams();
      params.set('idProveedor', idProv);
      apiFetch<DetalleData>(`/api/pagos/detalle?${params}`)
        .then(result => setDetalleData(result))
        .catch(console.error)
        .finally(() => setLoadingDetalle(false));
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ano) params.set("ano", ano);
      if (mes) params.set("mes", mes);
      const result = await apiFetch<PagosData>(`/api/pagos/stats?${params}`);
      setData(result);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [ano, mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchDetalle = async (item: Agrupado) => {
    setSelectedConcepto(item);
    setLoadingDetalle(true);
    try {
      const params = new URLSearchParams();
      if (ano) params.set("ano", ano);
      if (mes) params.set("mes", mes);
      params.set("idConcepto", String(item.id_concepto));
      const result = await apiFetch<DetalleData>(`/api/pagos/detalle?${params}`);
      setDetalleData(result);
    } catch (e) { console.error(e); }
    finally { setLoadingDetalle(false); }
  };

  const totalGeneral = data?.agrupado?.reduce((s, r) => s + r.total_pagado, 0) || 0;
  const cantidadGeneral = data?.agrupado?.reduce((s, r) => s + r.cantidad_ordenes, 0) || 0;

  const chartData = (data?.totalesMensuales || [])
    .slice(0, ano || mes ? undefined : 12)
    .map(r => ({
      name: `${mesesCortos[r.mes - 1]} ${r.ano}`,
      Total: r.total_pagado,
    }))
    .reverse();

  // Vista detalle: navegación directa desde reportes-especificos con idProveedor
  if (directProveedor && detalleData) {
    const r = detalleData.resumen;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setDirectProveedor(null); setDetalleData(null); }} className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-medium transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Volver a Conceptos
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold">{directProveedor.nombre}</h1>
          <p className="text-purple-200 mt-1">Órdenes de pago de este proveedor</p>
        </div>

        {r && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Pagado" value={fmt(r.total)} subtitle={`${r.cantidad} órdenes`} icon={DollarSign} color="purple" />
            <StatsCard title="Promedio por Orden" value={fmt(r.promedio)} subtitle={`Máx: ${fmt(r.maximo)}`} icon={ArrowUpDown} color="blue" />
            <StatsCard title="Saldo Pendiente" value={fmt(r.saldo_pendiente)} subtitle={`Mín: ${fmt(r.minimo)}`} icon={TrendingDown} color="orange" />
            <StatsCard title="Órdenes de Pago" value={String(r.cantidad)} subtitle="Comprobantes emitidos" icon={FileText} color="green" />
          </div>
        )}

        {detalleData.agrupadoPorTipo && detalleData.agrupadoPorTipo.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Por Tipo de Proveedor</h2>
            </div>
            <DataTable loading={false} columns={[
              { key: "tipo_proveedor", label: "Tipo de Proveedor" },
              { key: "cantidad_ordenes", label: "Cant. Órdenes", align: "right" },
              { key: "total_pagado", label: "Total Pagado", align: "right", render: (v) => fmt(Number(v)) },
              { key: "promedio", label: "Promedio", align: "right", render: (v) => fmt(Number(v)) },
            ]} data={detalleData.agrupadoPorTipo} emptyMessage="Sin datos" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Detalle de Órdenes de Pago</h2>
            <p className="text-sm text-gray-500">{detalleData.detalle.length} comprobantes</p>
          </div>
          <DataTable loading={loadingDetalle} columns={[
            { key: "fecha", label: "Fecha", align: "center", render: (v) => new Date(v as string).toLocaleDateString('es-AR') },
            { key: "letra", label: "Letra", align: "center" },
            { key: "nro_cbte", label: "N° Cbte", align: "center" },
            { key: "proveedor", label: "Proveedor" },
            { key: "tipo_proveedor", label: "Tipo", align: "center" },
            { key: "importe", label: "Importe", align: "right", render: (v) => fmt(Number(v)) },
            { key: "saldo", label: "Saldo", align: "right", render: (v) => fmt(Number(v)) },
          ]} data={detalleData.detalle} emptyMessage="No hay pagos" />
        </div>
      </div>
    );
  }

  // Vista detalle: concepto bancario seleccionado
  if (selectedConcepto) {
    const r = detalleData?.resumen;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedConcepto(null); setDetalleData(null); }} className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-medium transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Volver a Conceptos
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold">{selectedConcepto.concepto}</h1>
          <p className="text-purple-200 mt-1">Órdenes de pago con este concepto bancario</p>
        </div>

        {r && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Pagado" value={fmt(r.total)} subtitle={`${r.cantidad} órdenes`} icon={DollarSign} color="purple" />
            <StatsCard title="Promedio por Orden" value={fmt(r.promedio)} subtitle={`Máx: ${fmt(r.maximo)}`} icon={ArrowUpDown} color="blue" />
            <StatsCard title="Saldo Pendiente" value={fmt(r.saldo_pendiente)} subtitle={`Mín: ${fmt(r.minimo)}`} icon={TrendingDown} color="orange" />
            <StatsCard title="Órdenes de Pago" value={String(r.cantidad)} subtitle="Comprobantes emitidos" icon={FileText} color="green" />
          </div>
        )}

        {/* Agrupado por tipo de proveedor */}
        {detalleData?.agrupadoPorTipo && detalleData.agrupadoPorTipo.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Por Tipo de Proveedor</h2>
              <p className="text-sm text-gray-500">Distribución dentro de &quot;{selectedConcepto.concepto}&quot;</p>
            </div>
            <DataTable
              loading={loadingDetalle}
              columns={[
                { key: "tipo_proveedor", label: "Tipo de Proveedor" },
                { key: "cantidad_ordenes", label: "Cant. Órdenes", align: "right" },
                { key: "total_pagado", label: "Total Pagado", align: "right", render: (v) => fmt(Number(v)) },
                { key: "promedio", label: "Promedio", align: "right", render: (v) => fmt(Number(v)) },
              ]}
              data={detalleData.agrupadoPorTipo}
              emptyMessage="Sin datos"
            />
          </div>
        )}

        {/* Detalle individual */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Detalle de Órdenes de Pago</h2>
            <p className="text-sm text-gray-500">{detalleData?.detalle.length || 0} comprobantes encontrados</p>
          </div>
          <DataTable
            loading={loadingDetalle}
            columns={[
              { key: "fecha", label: "Fecha", align: "center", render: (v) => new Date(v as string).toLocaleDateString('es-AR') },
              { key: "letra", label: "Letra", align: "center" },
              { key: "nro_cbte", label: "N° Cbte", align: "center" },
              { key: "proveedor", label: "Proveedor" },
              { key: "tipo_proveedor", label: "Tipo", align: "center" },
              { key: "importe", label: "Importe", align: "right", render: (v) => fmt(Number(v)) },
              { key: "saldo", label: "Saldo", align: "right", render: (v) => fmt(Number(v)) },
            ]}
            data={detalleData?.detalle || []}
            emptyMessage="No hay pagos para este concepto"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagado</h1>
        <p className="text-gray-500 mt-1">Pagos agrupados por concepto bancario</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard title="Total Pagado" value={fmt(totalGeneral)} subtitle={`${cantidadGeneral} órdenes de pago`} icon={CreditCard} color="purple" />
      </div>

      <FilterBar
        anos={data?.anosDisponibles || []}
        selectedAno={ano}
        selectedMes={mes}
        onAnoChange={(v) => { setAno(v); setSelectedConcepto(null); }}
        onMesChange={(v) => { setMes(v); setSelectedConcepto(null); }}
      />

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pagos por Período</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
              <Bar dataKey="Total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Por Concepto Bancario</h2>
          <p className="text-sm text-gray-500">Click en una fila para ver el detalle por tipo de proveedor</p>
        </div>
        <DataTable
          loading={loading}
          columns={[
            { key: "concepto", label: "Concepto" },
            { key: "cantidad_ordenes", label: "Cant. Órdenes", align: "right" },
            { key: "total_pagado", label: "Total Pagado", align: "right", render: (v) => fmt(Number(v)) },
          ]}
          data={data?.agrupado || []}
          emptyMessage="No hay datos de pagos para los filtros seleccionados"
          onRowClick={(row) => fetchDetalle(row as unknown as Agrupado)}
        />
      </div>
    </div>
  );
}
