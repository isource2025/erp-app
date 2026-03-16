# ERP Analytics

Sistema ERP Analytics para gestión y análisis de datos financieros con reportes estadísticos y proyecciones.

## 📁 Estructura del Proyecto

- **back/** - Backend API (Node.js + Express + SQL Server)
- **erp-analytics/** - Frontend (Next.js + React + TypeScript)

## 🚀 Inicio Rápido

### Desarrollo Local

#### Backend
```bash
cd back
npm install
cp .env.example .env
# Edita .env con tus credenciales de base de datos
npm start
```

#### Frontend
```bash
cd erp-analytics
npm install
cp .env.example .env.local
# Edita .env.local con la URL del backend
npm run dev
```

Accede a: `http://localhost:3001`

### Despliegue en Vercel con Backend Local

Para desplegar el frontend en Vercel conectado a tu backend local, sigue las instrucciones en:

📖 **[INSTRUCCIONES_TUNNEL.md](./INSTRUCCIONES_TUNNEL.md)**

O la versión corta en:

📖 **[back/INSTRUCCIONES_DESPLIEGUE.md](./back/INSTRUCCIONES_DESPLIEGUE.md)**

**Resumen rápido:**
```bash
# 1. Iniciar túnel Cloudflare
cd back
start-tunnel-permanent.bat

# 2. Actualizar CORS con la URL del túnel
node update-cors-for-tunnel.js https://tu-url.trycloudflare.com

# 3. Reiniciar backend
npm start

# 4. Desplegar en Vercel
cd ../erp-analytics
vercel --prod
```

## 📊 Módulos Principales

- **Dashboard** - Vista general con métricas clave y gráficos comparativos
- **Ventas** - Análisis de facturación por período
- **Compras** - Gestión y análisis de compras
- **Cobrado** - Seguimiento detallado de cobranzas con recibos
- **Pagado** - Órdenes de pago y análisis
- **Comprobantes** - Listado, filtrado y exportación a Excel
- **Reportes** - Análisis estadístico con proyecciones (regresión lineal)
- **Reportes Específicos** - Reportes detallados por:
  - Facturación por período y actividad del cliente
  - Compras por hospital y tipo de proveedor
  - Recibos por período y actividad
  - Órdenes de pago por hospital y motivo
  - Análisis por hospital (débitos, gastos, honorarios, etc.)

## 🛠️ Tecnologías

### Backend
- Express.js
- mssql (SQL Server)
- JWT para autenticación
- XLSX para exportación a Excel
- bcrypt para passwords

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Recharts para gráficos
- Tailwind CSS
- Lucide React para iconos

## 📋 Requisitos

- Node.js 18+
- SQL Server (remoto o local)
- npm o yarn
- Cloudflared (para despliegue en Vercel)

## 🔐 Configuración de Base de Datos

El sistema se conecta a SQL Server usando las siguientes tablas:

- `cbtes` - Comprobantes (facturas, recibos, notas de crédito)
- `compras` - Facturas de compras
- `OrdenPago` - Órdenes de pago
- `Clientes` - Información de clientes
- `PROVEEDORES` - Información de proveedores
- `imPersonal` - Usuarios del sistema

Ver documentación completa de tablas en el código fuente.

## 📝 Licencia

Uso interno - Todos los derechos reservados
