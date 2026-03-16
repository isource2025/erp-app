"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import DataTable from "@/components/DataTable";
import StatsCard from "@/components/StatsCard";
import { FileText, ShoppingCart, Wallet, CreditCard, Calendar, Building2 } from "lucide-react";

function fmt(val: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
}

const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function ReportesEspecificosPage() {
  const [activeTab, setActiveTab] = useState<string>("facturacion");
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

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

    try {
      const [fPeriodo, fActividad, cHospital, cProveedor, rPeriodo, rActividad, oPago, aHospital] = await Promise.all([
        apiFetch(`/api/reportes-especificos/facturacion/periodo?${params}`),
        apiFetch(`/api/reportes-especificos/facturacion/actividad-cliente?${params}`),
        apiFetch(`/api/reportes-especificos/compras/por-hospital?${params}`),
        apiFetch(`/api/reportes-especificos/compras/por-tipo-proveedor?${params}`),
        apiFetch(`/api/reportes-especificos/recibos/periodo?${params}`),
        apiFetch(`/api/reportes-especificos/recibos/actividad-cliente?${params}`),
        apiFetch(`/api/reportes-especificos/ordenes-pago/por-hospital-motivo?${params}`),
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
  }, [fechaInicio, fechaFin]);

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
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Pagado por Hospital y Motivo</h2>
                    
                    {ordenesPago && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <StatsCard
                            title="Total Pagado"
                            value={fmt(ordenesPago.resumen.total_pagado)}
                            subtitle={`${ordenesPago.resumen.cantidad_ordenes} órdenes de pago`}
                            icon={CreditCard}
                            color="orange"
                          />
                        </div>

                        <DataTable
                          loading={false}
                          columns={[
                            { key: "hospital", label: "Hospital" },
                            { key: "id_motivo", label: "ID Motivo", align: "center" },
                            { key: "cantidad_ordenes", label: "Cant. Órdenes", align: "right" },
                            { key: "total_pagado", label: "Total Pagado", align: "right", render: (v) => fmt(Number(v)) },
                            { key: "promedio_pago", label: "Promedio", align: "right", render: (v) => fmt(Number(v)) },
                          ]}
                          data={ordenesPago.detallePorHospitalMotivo || []}
                          emptyMessage="No hay datos de órdenes de pago"
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ANÁLISIS POR HOSPITAL */}
              {activeTab === "analisis-hospital" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Análisis Detallado por Hospital</h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Débitos, gastos administrativos, sobreasignación, honorarios y transferencias
                    </p>
                    
                    {analisisHospital && (
                      <DataTable
                        loading={false}
                        columns={[
                          { key: "hospital", label: "Hospital" },
                          { key: "total_debitos", label: "Débitos", align: "right", render: (v) => fmt(Number(v)) },
                          { key: "total_gasto_administrativo", label: "Gasto Admin.", align: "right", render: (v) => fmt(Number(v)) },
                          { key: "total_sobreasignacion", label: "Sobreasignación", align: "right", render: (v) => fmt(Number(v)) },
                          { key: "total_honorarios", label: "Honorarios", align: "right", render: (v) => fmt(Number(v)) },
                          { key: "total_transferencias", label: "Transferencias", align: "right", render: (v) => fmt(Number(v)) },
                          { key: "total_general", label: "Total General", align: "right", render: (v) => fmt(Number(v)) },
                        ]}
                        data={analisisHospital.detallePorHospital || []}
                        emptyMessage="No hay datos de análisis por hospital"
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
