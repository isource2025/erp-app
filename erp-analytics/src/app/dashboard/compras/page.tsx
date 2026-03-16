"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import FilterBar from "@/components/FilterBar";
import DataTable from "@/components/DataTable";
import StatsCard from "@/components/StatsCard";
import { ShoppingCart } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ComprasData {
  detalle: { ano: number; mes: number; tipo_proveedor: string; total_facturado: number; cantidad: number }[];
  totalesMensuales: { ano: number; mes: number; total_facturado: number; cantidad: number }[];
  anosDisponibles: number[];
}

const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fmt(val: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
}

export default function ComprasPage() {
  const [data, setData] = useState<ComprasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState("");
  const [mes, setMes] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ano) params.set("ano", ano);
      if (mes) params.set("mes", mes);
      const result = await apiFetch<ComprasData>(`/api/compras/stats?${params}`);
      setData(result);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [ano, mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalGeneral = data?.totalesMensuales.reduce((s, r) => s + r.total_facturado, 0) || 0;
  const cantidadGeneral = data?.totalesMensuales.reduce((s, r) => s + r.cantidad, 0) || 0;

  // Limitar gráfico a últimos 12 meses si no hay filtros
  const chartData = (data?.totalesMensuales || [])
    .slice(0, ano || mes ? undefined : 12)
    .map(r => ({
      name: `${mesesCortos[r.mes - 1]} ${r.ano}`,
      Total: r.total_facturado,
    }))
    .reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
        <p className="text-gray-500 mt-1">Estadísticas de facturas de compras</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard title="Total Compras" value={fmt(totalGeneral)} subtitle={`${cantidadGeneral} facturas`} icon={ShoppingCart} color="orange" />
      </div>

      <FilterBar
        anos={data?.anosDisponibles || []}
        selectedAno={ano}
        selectedMes={mes}
        onAnoChange={setAno}
        onMesChange={setMes}
      />

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compras por Período</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
              <Bar dataKey="Total" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataTable
        loading={loading}
        columns={[
          { key: "ano", label: "Año", align: "center" },
          { key: "mes", label: "Mes", align: "center", render: (v) => mesesCortos[Number(v) - 1] || v },
          { key: "tipo_proveedor", label: "Tipo Proveedor" },
          { key: "total_facturado", label: "Total Facturado", align: "right", render: (v) => fmt(Number(v)) },
          { key: "cantidad", label: "Cantidad", align: "right" },
        ]}
        data={data?.detalle || []}
        emptyMessage="No hay datos de compras para los filtros seleccionados"
      />
    </div>
  );
}
