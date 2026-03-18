"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import DataTable from "@/components/DataTable";
import StatsCard from "@/components/StatsCard";
import { Package, ArrowLeft, Users, DollarSign, ShoppingCart } from "lucide-react";

interface Agrupado { id_tipo: number; tipo_proveedor: string; cantidad: number }
interface Resumen { cantidad: number; tipos_unicos: number }
interface Detalle { id: number; proveedor: string; tipo: string; cuit: string; telefono: string; direccion: string; cant_compras: number; total_compras: number }
interface ProveedoresData { agrupado: Agrupado[]; totalProveedores: number }
interface DetalleData { resumen: Resumen; detalle: Detalle[] }

function fmt(val: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
}

export default function ProveedoresPage() {
  const [data, setData] = useState<ProveedoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<Agrupado | null>(null);
  const [detalleData, setDetalleData] = useState<DetalleData | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<ProveedoresData>(`/api/proveedores/stats`);
      setData(result);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchDetalle = async (item: Agrupado) => {
    setSelectedTipo(item);
    setLoadingDetalle(true);
    try {
      const params = new URLSearchParams();
      params.set("idTipo", String(item.id_tipo));
      const result = await apiFetch<DetalleData>(`/api/proveedores/detalle?${params}`);
      setDetalleData(result);
    } catch (e) { console.error(e); }
    finally { setLoadingDetalle(false); }
  };

  if (selectedTipo) {
    const r = detalleData?.resumen;
    const totalCompras = detalleData?.detalle.reduce((s, d) => s + d.total_compras, 0) || 0;
    const totalCantCompras = detalleData?.detalle.reduce((s, d) => s + d.cant_compras, 0) || 0;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedTipo(null); setDetalleData(null); }} className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-medium transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Volver a Tipos
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold">{selectedTipo.tipo_proveedor}</h1>
          <p className="text-purple-200 mt-1">Detalle de proveedores por tipo</p>
        </div>

        {r && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard title="Proveedores" value={String(r.cantidad)} subtitle="En este tipo" icon={Users} color="purple" />
            <StatsCard title="Total Compras" value={fmt(totalCompras)} subtitle={`${totalCantCompras} facturas`} icon={DollarSign} color="blue" />
            <StatsCard title="Promedio Compras" value={fmt(r.cantidad > 0 ? totalCompras / r.cantidad : 0)} subtitle="Por proveedor" icon={ShoppingCart} color="green" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Proveedores</h2>
            <p className="text-sm text-gray-500">{detalleData?.detalle.length || 0} proveedores encontrados</p>
          </div>
          <DataTable
            loading={loadingDetalle}
            columns={[
              { key: "proveedor", label: "Proveedor" },
              { key: "cuit", label: "CUIT", align: "center" },
              { key: "email", label: "Email", align: "center" },
              { key: "cant_compras", label: "Cant. Compras", align: "right" },
              { key: "total_compras", label: "Total Compras", align: "right", render: (v) => fmt(Number(v)) },
            ]}
            data={detalleData?.detalle || []}
            emptyMessage="No hay proveedores para este tipo"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        <p className="text-gray-500 mt-1">Proveedores agrupados por tipo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard title="Total Proveedores" value={String(data?.totalProveedores || 0)} subtitle={`${data?.agrupado?.length || 0} tipos`} icon={Package} color="purple" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Por Tipo de Proveedor</h2>
          <p className="text-sm text-gray-500">Click en una fila para ver el detalle</p>
        </div>
        <DataTable
          loading={loading}
          columns={[
            { key: "tipo_proveedor", label: "Tipo de Proveedor" },
            { key: "cantidad", label: "Cantidad", align: "right" },
          ]}
          data={data?.agrupado || []}
          emptyMessage="No hay proveedores registrados"
          onRowClick={(row) => fetchDetalle(row)}
        />
      </div>
    </div>
  );
}
