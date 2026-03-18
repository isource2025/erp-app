"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import DataTable from "@/components/DataTable";
import StatsCard from "@/components/StatsCard";
import { FileText, ShoppingCart, Wallet, CreditCard, Calendar, Building2, ChevronLeft, ChevronRight, Search, X, ExternalLink, ArrowLeft } from "lucide-react";

function fmt(val: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
}

const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Componente para tabla de análisis por hospital con scroll horizontal
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AnalisisHospitalTable({ data }: { data: any }) {
  const [search, setSearch] = useState("");
  const [scrollPos, setScrollPos] = useState(0);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(() => {
    if (!data?.detallePorHospital) return [];
    if (!search.trim()) return data.detallePorHospital;
    const q = search.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.detallePorHospital.filter((h: any) => 
      h.hospital.toLowerCase().includes(q)
    );
  }, [data, search]);

  const scrollLeft = () => {
    if (tableRef.current) {
      tableRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (tableRef.current) {
      tableRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (tableRef.current) {
      setScrollPos(tableRef.current.scrollLeft);
    }
  };

  useEffect(() => {
    const updateScrollButtons = () => {
      if (tableRef.current) {
        setScrollPos(tableRef.current.scrollLeft);
      }
    };
    const ref = tableRef.current;
    if (ref) {
      ref.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons();
      return () => ref.removeEventListener('scroll', updateScrollButtons);
    }
  }, [filteredData]);

  const canScrollLeft = scrollPos > 5;
  const canScrollRight = tableRef.current 
    ? scrollPos < (tableRef.current.scrollWidth - tableRef.current.clientWidth - 5)
    : true;

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Análisis Detallado por Hospital</h2>
        <p className="text-sm text-gray-600 mb-4">Desglose por categoría de proveedor</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar hospital..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" /> Limpiar
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Desplazar izquierda"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={scrollRight}
              disabled={!canScrollRight}
              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Desplazar derecha"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          {filteredData.length} de {data.detallePorHospital?.length || 0} hospitales
        </div>
      </div>

      {/* Tabla con scroll horizontal */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div 
          ref={tableRef}
          className="overflow-x-scroll"
          style={{ maxWidth: '100%', overflowY: 'visible' }}
        >
          <table className="w-full border-collapse" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left sticky left-0 bg-gray-50 z-20 border-r border-gray-200">Hospital</th>
                {(data.categoriasProveedor || []).map((categ: string) => (
                  <th key={categ} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap min-w-[120px]">{categ}</th>
                ))}
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right bg-blue-50 whitespace-nowrap min-w-[140px] sticky right-0 z-20 border-l border-gray-200">Total General</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={99} className="px-4 py-8 text-center text-gray-400">
                    {search ? "No hay resultados para la búsqueda" : "No hay datos de análisis por hospital"}
                  </td>
                </tr>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredData.map((h: any, i: number) => (
                  <tr 
                    key={i} 
                    onClick={() => setSelectedRow(selectedRow === i ? null : i)}
                    className={`cursor-pointer transition-colors ${
                      selectedRow === i 
                        ? 'bg-blue-100 hover:bg-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className={`px-4 py-3 text-sm font-medium sticky left-0 z-10 border-r border-gray-200 ${
                      selectedRow === i ? 'bg-blue-100' : 'bg-white'
                    }`}>{h.hospital}</td>
                    {(data.categoriasProveedor || []).map((categ: string) => (
                      <td key={categ} className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        {h.categorias[categ] ? fmt(h.categorias[categ]) : '-'}
                      </td>
                    ))}
                    <td className={`px-4 py-3 text-sm text-right font-semibold whitespace-nowrap sticky right-0 z-10 border-l border-gray-200 ${
                      selectedRow === i ? 'bg-blue-100' : 'bg-blue-50'
                    }`}>{fmt(h.total_general)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ReportesEspecificosPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("facturacion");
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [filtroHospitalOP, setFiltroHospitalOP] = useState("");

  // Estados para cada tipo de reporte
  const [facturacionPeriodo, setFacturacionPeriodo] = useState<any>(null);
  const [facturacionActividad, setFacturacionActividad] = useState<any>(null);
  const [comprasHospital, setComprasHospital] = useState<any>(null);
  const [comprasProveedor, setComprasProveedor] = useState<any>(null);
  const [recibosPeriodo, setRecibosPeriodo] = useState<any>(null);
  const [recibosActividad, setRecibosActividad] = useState<any>(null);
  const [ordenesPago, setOrdenesPago] = useState<any>(null);
  const [analisisHospital, setAnalisisHospital] = useState<any>(null);

  useEffect(() => {
    // Establecer fechas por defecto (últimos 12 meses)
    const hoy = new Date();
    const hace12Meses = new Date();
    hace12Meses.setMonth(hoy.getMonth() - 12);
    
    if (!fechaInicio) setFechaInicio(hace12Meses.toISOString().split('T')[0]);
    if (!fechaFin) setFechaFin(hoy.toISOString().split('T')[0]);
  }, []);

  const fetchData = useCallback(async () => {
    if (!fechaInicio || !fechaFin) return;
    
    setLoading(true);
    const params = new URLSearchParams();
    params.set("fechaInicio", fechaInicio);
    params.set("fechaFin", fechaFin);

    const opParams = new URLSearchParams(params);
    if (filtroHospitalOP) opParams.set("idHospital", filtroHospitalOP);

    try {
      const [fPeriodo, fActividad, cHospital, cProveedor, rPeriodo, rActividad, oPago, aHospital] = await Promise.all([
        apiFetch(`/api/reportes-especificos/facturacion/periodo?${params}`),
        apiFetch(`/api/reportes-especificos/facturacion/actividad-cliente?${params}`),
        apiFetch(`/api/reportes-especificos/compras/por-hospital?${params}`),
        apiFetch(`/api/reportes-especificos/compras/por-tipo-proveedor?${params}`),
        apiFetch(`/api/reportes-especificos/recibos/periodo?${params}`),
        apiFetch(`/api/reportes-especificos/recibos/actividad-cliente?${params}`),
        apiFetch(`/api/reportes-especificos/ordenes-pago/por-hospital-motivo?${opParams}`),
        apiFetch(`/api/reportes-especificos/analisis-hospital?${params}`)
      ]);

      setFacturacionPeriodo(fPeriodo);
      setFacturacionActividad(fActividad);
      setComprasHospital(cHospital);
      setComprasProveedor(cProveedor);
      setRecibosPeriodo(rPeriodo);
      setRecibosActividad(rActividad);
      setOrdenesPago(oPago);
      setAnalisisHospital(aHospital);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, filtroHospitalOP]);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      fetchData();
    }
  }, [fetchData, fechaInicio, fechaFin]);

  const tabs = [
    { id: "facturacion", label: "Facturación", icon: FileText },
    { id: "compras", label: "Compras", icon: ShoppingCart },
    { id: "recibos", label: "Recibos", icon: Wallet },
    { id: "ordenes-pago", label: "Órdenes de Pago", icon: CreditCard },
    { id: "analisis-hospital", label: "Análisis por Hospital", icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/dashboard/reportes')} 
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Reportes
        </button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes Específicos</h1>
        <p className="text-gray-500 mt-1">Análisis detallado por categorías</p>
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

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Cargando datos...</div>
            </div>
          ) : (
            <>
              {/* FACTURACIÓN */}
              {activeTab === "facturacion" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Facturado por la UEP</h2>
                    
                    {facturacionPeriodo && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <StatsCard
                            title="Total Facturado"
                            value={fmt(facturacionPeriodo.resumen.total_facturado)}
                            subtitle={`${facturacionPeriodo.resumen.cantidad_facturas} facturas`}
                            icon={FileText}
                            color="blue"
                          />
                          <StatsCard
                            title="Promedio por Factura"
                            value={fmt(facturacionPeriodo.resumen.promedio_general)}
                            subtitle="En el período"
                            icon={FileText}
                            color="green"
                          />
                        </div>

                        <h3 className="text-md font-semibold text-gray-800 mb-3">Facturación por Mes</h3>
                        <DataTable
                          loading={false}
                          columns={[
                            { key: "ano", label: "Año", align: "center" },
                            { key: "mes", label: "Mes", align: "center", render: (v) => mesesCortos[Number(v) - 1] || v },
                            { key: "cantidad_facturas", label: "Cant. Facturas", align: "right" },
                            { key: "total_facturado", label: "Total Facturado", align: "right", render: (v) => fmt(Number(v)) },
                            { key: "promedio_factura", label: "Promedio", align: "right", render: (v) => fmt(Number(v)) },
                          ]}
                          data={facturacionPeriodo.detallePorMes || []}
                          emptyMessage="No hay datos de facturación"
                        />
                      </>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-md font-semibold text-gray-800 mb-3">Facturación por Actividad del Cliente</h3>
                    {facturacionActividad && (
                      <DataTable
                        loading={false}
                        columns={[
                          { key: "cliente", label: "Cliente" },
                          { key: "id_actividad", label: "ID Actividad", align: "center" },
                          { key: "cantidad_facturas", label: "Cant. Facturas", align: "right" },
                          { key: "total_facturado", label: "Total Facturado", align: "right", render: (v) => fmt(Number(v)) },
                          { key: "promedio_factura", label: "Promedio", align: "right", render: (v) => fmt(Number(v)) },
                          { key: "actions", label: "Acciones", align: "center", render: (_v, row: any) => (
                            <button
                              onClick={() => router.push('/dashboard/ventas')}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                              title="Ver facturas en Ventas"
                            >
                              <ExternalLink className="w-3 h-3" /> Ver Facturas
                            </button>
                          )},
                        ]}
                        data={facturacionActividad.detallePorCliente || []}
                        emptyMessage="No hay datos de facturación por cliente"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* COMPRAS */}
              {activeTab === "compras" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Facturado por Hospital</h2>
                    
                    {comprasHospital && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <StatsCard
                            title="Total Comprado"
                            value={fmt(comprasHospital.resumen.total_comprado)}
                            subtitle={`${comprasHospital.resumen.cantidad_hospitales} hospitales`}
                            icon={ShoppingCart}
                            color="purple"
                          />
                        </div>

                        <DataTable
                          loading={false}
                          columns={[
                            { key: "hospital", label: "Hospital" },
                            { key: "cantidad_compras", label: "Cant. Compras", align: "right" },
                            { key: "total_comprado", label: "Total Comprado", align: "right", render: (v) => fmt(Number(v)) },
                            { key: "promedio_compra", label: "Promedio", align: "right", render: (v) => fmt(Number(v)) },
                            { key: "compra_maxima", label: "Máximo", align: "right", render: (v) => fmt(Number(v)) },
                            { key: "actions", label: "Acciones", align: "center", render: (_v, row: any) => (
                              <button
                                onClick={() => router.push('/dashboard/compras')}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 rounded cursor-pointer transition-colors"
                                title="Ver compras"
                              >
                                <ExternalLink className="w-3 h-3" /> Ver Compras
                              </button>
                            )},
                          ]}
                          data={comprasHospital.detallePorHospital || []}
                          emptyMessage="No hay datos de compras por hospital"
                        />
                      </>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-md font-semibold text-gray-800 mb-3">Total Facturado por Tipo de Proveedor</h3>
                    {comprasProveedor && (
                      <>
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Resumen por Tipo</h4>
                          <DataTable
                            loading={false}
                            columns={[
                              { key: "tipo_proveedor_id", label: "Tipo ID", align: "center" },
                              { key: "cantidad_proveedores", label: "Cant. Proveedores", align: "right" },
                              { key: "cantidad_compras", label: "Cant. Compras", align: "right" },
                              { key: "total_comprado", label: "Total Comprado", align: "right", render: (v) => fmt(Number(v)) },
                            ]}
                            data={comprasProveedor.resumenPorTipo || []}
                            emptyMessage="No hay datos"
                          />
                        </div>

                        <h4 className="text-sm font-medium text-gray-700 mb-2">Detalle por Proveedor</h4>
                        <DataTable
                          loading={false}
                          columns={[
                            { key: "proveedor", label: "Proveedor" },
                            { key: "tipo_proveedor_id", label: "Tipo", align: "center" },
                            { key: "cantidad_compras", label: "Cant. Compras", align: "right" },
                            { key: "total_comprado", label: "Total Comprado", align: "right", render: (v) => fmt(Number(v)) },
                            { key: "actions", label: "Acciones", align: "center", render: (_v, row: any) => (
                              <button
                                onClick={() => router.push('/dashboard/proveedores')}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 rounded cursor-pointer transition-colors"
                                title="Ver proveedor"
                              >
                                <ExternalLink className="w-3 h-3" /> Ver Proveedor
                              </button>
                            )},
                          ]}
                          data={comprasProveedor.detallePorProveedor || []}
                          emptyMessage="No hay datos de compras por proveedor"
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* RECIBOS */}
              {activeTab === "recibos" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Cobrado por la UEP</h2>
                    
                    {recibosPeriodo && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <StatsCard
                            title="Total Cobrado"
                            value={fmt(recibosPeriodo.resumen.total_cobrado)}
                            subtitle={`${recibosPeriodo.resumen.cantidad_recibos} recibos`}
                            icon={Wallet}
                            color="green"
                          />
                          <StatsCard
                            title="Promedio por Recibo"
                            value={fmt(recibosPeriodo.resumen.promedio_general)}
                            subtitle="En el período"
                            icon={Wallet}
                            color="blue"
                          />
                        </div>

                        <h3 className="text-md font-semibold text-gray-800 mb-3">Cobranzas por Mes</h3>
                        <DataTable
                          loading={false}
                          columns={[
                            { key: "ano", label: "Año", align: "center" },
                            { key: "mes", label: "Mes", align: "center", render: (v) => mesesCortos[Number(v) - 1] || v },
                            { key: "cantidad_recibos", label: "Cant. Recibos", align: "right" },
                            { key: "total_cobrado", label: "Total Cobrado", align: "right", render: (v) => fmt(Number(v)) },
                            { key: "promedio_recibo", label: "Promedio", align: "right", render: (v) => fmt(Number(v)) },
                          ]}
                          data={recibosPeriodo.detallePorMes || []}
                          emptyMessage="No hay datos de recibos"
                        />
                      </>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-md font-semibold text-gray-800 mb-3">Cobranzas por Actividad del Cliente</h3>
                    {recibosActividad && (
                      <DataTable
                        loading={false}
                        columns={[
                          { key: "cliente", label: "Cliente" },
                          { key: "id_actividad", label: "ID Actividad", align: "center" },
                          { key: "cantidad_recibos", label: "Cant. Recibos", align: "right" },
                          { key: "total_cobrado", label: "Total Cobrado", align: "right", render: (v) => fmt(Number(v)) },
                          { key: "promedio_recibo", label: "Promedio", align: "right", render: (v) => fmt(Number(v)) },
                          { key: "actions", label: "Acciones", align: "center", render: (_v, row: any) => (
                            <button
                              onClick={() => router.push('/dashboard/cobranzas')}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded cursor-pointer transition-colors"
                              title="Ver cobranzas"
                            >
                              <ExternalLink className="w-3 h-3" /> Ver Cobranzas
                            </button>
                          )},
                        ]}
                        data={recibosActividad.detallePorCliente || []}
                        emptyMessage="No hay datos de recibos por cliente"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ÓRDENES DE PAGO */}
              {activeTab === "ordenes-pago" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Órdenes de Pago</h2>
                    
                    {ordenesPago && (
                      <>
                        <div className="flex items-center gap-4 mb-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                            <StatsCard
                              title="Total Pagado"
                              value={fmt(ordenesPago.resumen.total_pagado)}
                              subtitle={`${ordenesPago.resumen.cantidad_ordenes} órdenes de pago`}
                              icon={CreditCard}
                              color="orange"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-gray-400" />
                            <select
                              value={filtroHospitalOP}
                              onChange={(e) => setFiltroHospitalOP(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
                            >
                              <option value="">Todos los hospitales</option>
                              {(ordenesPago.hospitalesDisponibles || []).map((h: any) => (
                                <option key={h.id} value={h.id}>{h.nombre}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <h3 className="text-md font-semibold text-gray-800 mb-3">Por Tipo de Proveedor</h3>
                        <DataTable
                          loading={false}
                          columns={[
                            { key: "tipo_proveedor", label: "Tipo de Proveedor" },
                            { key: "cantidad_ordenes", label: "Cant. Órdenes", align: "right" },
                            { key: "total_pagado", label: "Total Pagado", align: "right", render: (v: any) => fmt(Number(v)) },
                            { key: "promedio_pago", label: "Promedio", align: "right", render: (v: any) => fmt(Number(v)) },
                          ]}
                          data={ordenesPago.agrupadoPorTipo || []}
                          emptyMessage="No hay datos"
                        />

                        <h3 className="text-md font-semibold text-gray-800 mb-3 mt-6">Detalle por Proveedor</h3>
                        <DataTable
                          loading={false}
                          columns={[
                            { key: "proveedor", label: "Proveedor / Hospital" },
                            { key: "tipo_proveedor", label: "Tipo", align: "center" },
                            { key: "cantidad_ordenes", label: "Cant. Órdenes", align: "right" },
                            { key: "total_pagado", label: "Total Pagado", align: "right", render: (v: any) => fmt(Number(v)) },
                            { key: "promedio_pago", label: "Promedio", align: "right", render: (v: any) => fmt(Number(v)) },
                            { key: "actions", label: "Acciones", align: "center", render: (_v: any, row: any) => (
                              <button
                                onClick={() => router.push('/dashboard/pagos')}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 rounded cursor-pointer transition-colors"
                                title="Ver órdenes de pago"
                              >
                                <ExternalLink className="w-3 h-3" /> Ver Pagos
                              </button>
                            )},
                          ]}
                          data={ordenesPago.detallePorProveedor || []}
                          emptyMessage="No hay datos de órdenes de pago"
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ANÁLISIS POR HOSPITAL */}
              {activeTab === "analisis-hospital" && (
                <AnalisisHospitalTable data={analisisHospital} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
