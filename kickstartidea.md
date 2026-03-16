ERP Analytics & Comprobantes
Documento Kickstart del Proyecto
1. Descripción General

Este proyecto consiste en el desarrollo de un módulo de análisis y gestión de comprobantes para un ERP, cuyo objetivo principal es visualizar estadísticas de facturación, compras, pagos y cobranzas, además de permitir la emisión y exportación de comprobantes.

El sistema se conectará a una base de datos existente en SQL Server, reutilizando las tablas actuales y descubriendo su estructura mediante scripts de exploración en JavaScript cuando sea necesario.

El sistema se desarrollará como una aplicación web con interfaz moderna y enfoque en reportes mensuales y estadísticas financieras.

2. Stack Tecnológico
Frontend

Next.js

React

CSS Modules

Backend

Node.js

API routes de Next.js o servicio Node dedicado

Base de datos

SQL Server

Acceso a datos

Conexión directa desde Node.js

Exploración de metadata SQL mediante scripts JS cuando sea necesario

3. Arquitectura General
Frontend (Next.js)
      │
      │ API Requests
      ▼
Backend (Node.js / Next API)
      │
      │ SQL Queries
      ▼
SQL Server Database

Responsabilidades:

Frontend

Visualización de estadísticas

Filtros por periodo

Gestión de comprobantes

Exportación de datos

Backend

Consultas SQL

Agregación de estadísticas

Exploración de metadata

Generación de archivos Excel

Base de Datos

Fuente de verdad del ERP

Tablas existentes reutilizadas

4. Módulos del Sistema
4.1 Módulo Compras
Fuente de datos

Tabla existente:

compras
Objetivo

Mostrar estadísticas de facturas de compras agrupadas por período.

Métricas principales

Total facturado por mes

Cantidad de facturas

Agrupación por tipo de proveedor

Ejemplo de reporte
Mes	Tipo proveedor	Total	Cantidad
2026-01	Servicios	$150000	12
2026-01	Insumos	$320000	20
Filtros

Año

Mes

Tipo de proveedor

4.2 Módulo Ventas
Fuente de datos

Tabla:

cbtes

(Comprobantes de venta)

Objetivo

Mostrar estadísticas de facturación de ventas.

Métricas

Total facturado por mes

Cantidad de comprobantes

Agrupación por actividad

Ejemplo
Mes	Actividad	Total	Cantidad
2026-01	Servicios	$450000	35
2026-01	Productos	$210000	18
Filtros

Año

Mes

Actividad

4.3 Módulo Cobrado
Fuente

Tabla de recibos (a determinar mediante exploración SQL).

Objetivo

Mostrar estadísticas de cobranzas.

Métricas

Total cobrado por mes

Cantidad de recibos

Relación con facturas

Ejemplo
Mes	Total cobrado	Recibos
2026-01	$350000	28
4.4 Módulo Pagado
Fuente

Pagos relacionados a compras.

Métricas

Total pagado por mes

Cantidad de pagos

Agrupación por concepto

Ejemplo
Mes	Concepto	Total
2026-01	Servicios	$180000
2026-01	Insumos	$120000
4.5 Emisión de Comprobantes

Sección dedicada a:

Visualización de comprobantes

Edición de comprobantes

Exportación de datos

Funcionalidades

Listado de comprobantes

Edición de campos permitidos

Exportación a Excel

Filtros por fecha

Búsqueda

Exportación

Formato:

Excel (.xlsx)

Columnas típicas:

| Fecha | Cliente | Tipo | Número | Total |

5. Exploración Automática de SQL

Debido a que no se conoce completamente el esquema de la base de datos, se utilizarán scripts en JavaScript para descubrir:

columnas

tipos de datos

relaciones posibles

Ejemplo de script de exploración
import sql from "mssql"

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
}

async function getTableInfo(table) {
  const pool = await sql.connect(config)

  const result = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${table}'
  `)

  console.log(result.recordset)
}

getTableInfo("cbtes")

Este tipo de scripts permitirá:

mapear tablas

identificar columnas clave

construir queries para estadísticas

6. Queries de Estadísticas (Ejemplo)
Ventas por mes
SELECT
    YEAR(fecha) as anio,
    MONTH(fecha) as mes,
    SUM(total) as total_facturado,
    COUNT(*) as cantidad
FROM cbtes
GROUP BY YEAR(fecha), MONTH(fecha)
ORDER BY anio, mes
7. Estructura Inicial del Proyecto
erp-analytics/
│
├── app/
│   ├── compras/
│   ├── ventas/
│   ├── cobrados/
│   ├── pagos/
│   └── comprobantes/
│
├── lib/
│   ├── db.js
│   ├── sqlExplorer.js
│
├── services/
│   ├── comprasService.js
│   ├── ventasService.js
│   ├── pagosService.js
│   └── cobranzasService.js
│
├── utils/
│   └── exportExcel.js
│
└── styles/
    └── modules/
8. Fases Iniciales del Proyecto
Fase 1 — Conexión y Exploración

Conexión a SQL Server

Scripts de exploración

Identificación de columnas clave

Fase 2 — APIs

Crear endpoints:

/api/compras/stats
/api/ventas/stats
/api/cobranzas/stats
/api/pagos/stats
/api/comprobantes
Fase 3 — Dashboard

Pantallas:

Compras

Ventas

Cobrado

Pagado

Con:

filtros por mes

tablas

gráficos

Fase 4 — Emisión de comprobantes

listado

edición

exportación

9. Objetivos del MVP

El MVP inicial deberá permitir:

✔ Conectarse a SQL Server
✔ Obtener estadísticas mensuales
✔ Mostrar datos en dashboard
✔ Listar comprobantes
✔ Exportar Excel