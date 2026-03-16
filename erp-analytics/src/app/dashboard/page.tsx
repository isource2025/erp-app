"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import StatsCard from "@/components/StatsCard";
import { TrendingUp, ShoppingCart, Wallet, CreditCard } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DashboardData {
  resumen: {
    ventas: { total: number; cantidad: number };
    compras: { total: number; cantidad: number };
    cobranzas: { total: number; cantidad: number };
    pagos: { total: number; cantidad: number };
  };
  ventasMensuales: { ano: number; mes: number; total: number; cantidad: number }[];
  cobranzasMensuales: { ano: number; mes: number; total: number; cantidad: number }[];
}

const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatMoney(val: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500 py-10">Error cargando datos</div>;
  }

  const chartData = data.ventasMensuales.map((v, i) => ({
    name: `${mesesCortos[v.mes - 1]} ${v.ano}`,
    Ventas: v.total,
    Cobranzas: data.cobranzasMensuales[i]?.total || 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Ventas"
          value={formatMoney(data.resumen.ventas.total)}
          subtitle={`${data.resumen.ventas.cantidad} comprobantes`}
          icon={TrendingUp}
          color="blue"
        />
        <StatsCard
          title="Total Compras"
          value={formatMoney(data.resumen.compras.total)}
          subtitle={`${data.resumen.compras.cantidad} comprobantes`}
          icon={ShoppingCart}
          color="orange"
        />
        <StatsCard
          title="Total Cobrado"
          value={formatMoney(data.resumen.cobranzas.total)}
          subtitle={`${data.resumen.cobranzas.cantidad} recibos`}
          icon={Wallet}
          color="green"
        />
        <StatsCard
          title="Total Pagado"
          value={formatMoney(data.resumen.pagos.total)}
          subtitle={`${data.resumen.pagos.cantidad} órdenes`}
          icon={CreditCard}
          color="purple"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventas vs Cobranzas (Últimos períodos)</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => formatMoney(Number(value))}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <Legend />
              <Bar dataKey="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cobranzas" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400 py-10">No hay datos para graficar</p>
        )}
      </div>
    </div>
  );
}
