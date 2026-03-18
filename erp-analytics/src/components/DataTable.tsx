"use client";

import { useState, useMemo } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Column {
  key: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: Record<string, unknown>) => React.ReactNode;
  align?: "left" | "right" | "center";
  filterable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowClick?: (row: any) => void;
  pageSize?: number;
}

function isDateString(val: unknown): boolean {
  if (typeof val !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}/.test(val);
}

function detectDateColumn(data: unknown[], key: string): boolean {
  for (let i = 0; i < Math.min(data.length, 5); i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = data[i] as any;
    if (row[key] && isDateString(row[key])) return true;
  }
  return false;
}

function detectFilterableColumns(data: unknown[], columns: Column[]): string[] {
  const filterable: string[] = [];
  for (const col of columns) {
    if (col.filterable === false) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueVals = new Set(data.slice(0, 100).map((r: any) => {
      const v = r[col.key];
      if (v === null || v === undefined) return "";
      if (typeof v === "number") return null;
      if (isDateString(v)) return null;
      return String(v).trim();
    }).filter(v => v !== null));
    if (uniqueVals.size > 1 && uniqueVals.size <= 20) {
      filterable.push(col.key);
    }
  }
  return filterable;
}

export default function DataTable({ columns, data, loading, emptyMessage = "No hay datos", onRowClick, pageSize = 50 }: DataTableProps) {
  const [search, setSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);

  const dateColumn = useMemo(() => {
    if (!data.length) return null;
    for (const col of columns) {
      if (detectDateColumn(data, col.key)) return col.key;
    }
    return null;
  }, [data, columns]);

  const filterableColumns = useMemo(() => detectFilterableColumns(data, columns), [data, columns]);

  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    for (const key of filterableColumns) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vals = [...new Set(data.map((r: any) => String(r[key] ?? "").trim()))].filter(Boolean).sort();
      opts[key] = vals;
    }
    return opts;
  }, [data, filterableColumns]);

  const filteredData = useMemo(() => {
    let result = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.key];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    if (dateColumn && (fechaDesde || fechaHasta)) {
      result = result.filter((row) => {
        const val = row[dateColumn];
        if (!val || !isDateString(val)) return true;
        const d = new Date(val as string);
        if (fechaDesde && d < new Date(fechaDesde)) return false;
        if (fechaHasta && d > new Date(fechaHasta + "T23:59:59")) return false;
        return true;
      });
    }

    for (const [key, filterVal] of Object.entries(columnFilters)) {
      if (!filterVal) continue;
      result = result.filter((row) => String(row[key] ?? "").trim() === filterVal);
    }

    return result;
  }, [data, search, fechaDesde, fechaHasta, columnFilters, dateColumn, columns]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePageIndex = Math.min(page, totalPages - 1);
  const pagedData = filteredData.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);

  const hasActiveFilters = search || fechaDesde || fechaHasta || Object.values(columnFilters).some(Boolean);

  const clearFilters = () => {
    setSearch("");
    setFechaDesde("");
    setFechaHasta("");
    setColumnFilters({});
    setPage(0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {data.length > 0 && (
        <div className="p-3 border-b border-gray-200 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en todas las columnas..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {dateColumn && (
              <>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => { setFechaDesde(e.target.value); setPage(0); }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Fecha desde"
                />
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => { setFechaHasta(e.target.value); setPage(0); }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Fecha hasta"
                />
              </>
            )}

            {filterableColumns.map((key) => {
              const col = columns.find((c) => c.key === key);
              return (
                <select
                  key={key}
                  value={columnFilters[key] || ""}
                  onChange={(e) => { setColumnFilters({ ...columnFilters, [key]: e.target.value }); setPage(0); }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px]"
                  title={`Filtrar por ${col?.label || key}`}
                >
                  <option value="">{col?.label || key}: Todos</option>
                  {(filterOptions[key] || []).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              );
            })}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
                title="Limpiar filtros"
              >
                <X className="w-4 h-4" /> Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{filteredData.length} de {data.length} registros{hasActiveFilters ? " (filtrado)" : ""}</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, safePageIndex - 1))}
                  disabled={safePageIndex === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Pág. {safePageIndex + 1} de {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, safePageIndex + 1))}
                  disabled={safePageIndex >= totalPages - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pagedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                  {hasActiveFilters ? "No hay resultados para los filtros aplicados" : emptyMessage}
                </td>
              </tr>
            ) : (
              pagedData.map((row, i) => (
                <tr key={i} className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick && onRowClick(row)}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
