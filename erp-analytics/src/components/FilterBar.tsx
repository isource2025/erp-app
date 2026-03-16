"use client";

import { Search } from "lucide-react";

interface FilterBarProps {
  anos: number[];
  selectedAno: string;
  selectedMes: string;
  onAnoChange: (ano: string) => void;
  onMesChange: (mes: string) => void;
  busqueda?: string;
  onBusquedaChange?: (val: string) => void;
  showBusqueda?: boolean;
}

const meses = [
  { value: "", label: "Todos los meses" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export default function FilterBar({
  anos,
  selectedAno,
  selectedMes,
  onAnoChange,
  onMesChange,
  busqueda,
  onBusquedaChange,
  showBusqueda = false,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select
        value={selectedAno}
        onChange={(e) => onAnoChange(e.target.value)}
        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Todos los años</option>
        {anos.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <select
        value={selectedMes}
        onChange={(e) => onMesChange(e.target.value)}
        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {meses.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {showBusqueda && onBusquedaChange && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda || ""}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar por cliente o número..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}
