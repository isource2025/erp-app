"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch, apiDownload } from "@/lib/api";
import FilterBar from "@/components/FilterBar";
import DataTable from "@/components/DataTable";
import { FileText, Download, ChevronLeft, ChevronRight } from "lucide-react";

interface Comprobante {
  IdTransaccion: number;
  Fecha: string;
  Cliente: string;
  TipoCbte: string;
  Letra_Cbte: string;
  IdSucursal: number;
  NroCbte: number;
  ImporteNeto: number;
  ImporteTotal: number;
  Iva21: number;
  Saldo: number;
  Ano: number;
  Mes: number;
  IDStatus: number;
}

interface ComprobantesData {
  comprobantes: Comprobante[];
  total: number;
  page: number;
  totalPages: number;
}

const tiposCbte = [
  { value: "", label: "Todos los tipos" },
  { value: "FC", label: "Factura" },
  { value: "RC", label: "Recibo" },
  { value: "NC", label: "Nota de Crédito" },
  { value: "ND", label: "Nota de Débito" },
];

function fmt(val: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(val);
}

function fmtDate(val: string) {
  if (!val) return "";
  return new Date(val).toLocaleDateString("es-AR");
}

function getTipoLabel(tipo: string) {
  return tiposCbte.find((t) => t.value === tipo)?.label || tipo;
}

export default function ComprobantesPage() {
  const [data, setData] = useState<ComprobantesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState("");
  const [mes, setMes] = useState("");
  const [tipo, setTipo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [anos, setAnos] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  // Get available years on mount
  useEffect(() => {
    apiFetch<{ anosDisponibles: number[] }>("/api/ventas/stats")
      .then((r) => setAnos(r.anosDisponibles))
      .catch(console.error);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ano) params.set("ano", ano);
      if (mes) params.set("mes", mes);
      if (tipo) params.set("tipo", tipo);
      if (busqueda) params.set("busqueda", busqueda);
      params.set("page", String(page));
      params.set("limit", "50");
      const result = await apiFetch<ComprobantesData>(`/api/comprobantes?${params}`);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [ano, mes, tipo, busqueda, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [ano, mes, tipo, busqueda]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (ano) params.set("ano", ano);
      if (mes) params.set("mes", mes);
      if (tipo) params.set("tipo", tipo);
      if (busqueda) params.set("busqueda", busqueda);
      await apiDownload(`/api/comprobantes/export?${params}`);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comprobantes</h1>
          <p className="text-gray-500 mt-1">
            Listado y gestión de comprobantes
            {data ? ` — ${data.total} registros` : ""}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          {exporting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Exportar Excel
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <FilterBar
          anos={anos}
          selectedAno={ano}
          selectedMes={mes}
          onAnoChange={setAno}
          onMesChange={setMes}
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          showBusqueda
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {tiposCbte.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        loading={loading}
        columns={[
          {
            key: "Fecha",
            label: "Fecha",
            render: (v) => fmtDate(v),
          },
          { key: "Cliente", label: "Cliente" },
          {
            key: "TipoCbte",
            label: "Tipo",
            align: "center",
            render: (v) => (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  v === "FC"
                    ? "bg-blue-100 text-blue-700"
                    : v === "RC"
                    ? "bg-green-100 text-green-700"
                    : v === "NC"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                <FileText className="w-3 h-3" />
                {getTipoLabel(v)}
              </span>
            ),
          },
          {
            key: "NroCbte",
            label: "Número",
            align: "center",
            render: (v, row) => `${row.IdSucursal}-${String(v).padStart(8, "0")}`,
          },
          { key: "Letra_Cbte", label: "Letra", align: "center" },
          {
            key: "ImporteNeto",
            label: "Neto",
            align: "right",
            render: (v) => fmt(Number(v)),
          },
          {
            key: "Iva21",
            label: "IVA",
            align: "right",
            render: (v) => fmt(Number(v)),
          },
          {
            key: "ImporteTotal",
            label: "Total",
            align: "right",
            render: (v) => <span className="font-semibold">{fmt(Number(v))}</span>,
          },
          {
            key: "Saldo",
            label: "Saldo",
            align: "right",
            render: (v) => (
              <span className={Number(v) !== 0 ? "text-red-600 font-medium" : "text-green-600"}>
                {fmt(Math.abs(Number(v)))}
              </span>
            ),
          },
        ]}
        data={(data?.comprobantes as unknown as Record<string, unknown>[]) || []}
        emptyMessage="No hay comprobantes para los filtros seleccionados"
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
          <span className="text-sm text-gray-500">
            Página {data.page} de {data.totalPages} ({data.total} registros)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
