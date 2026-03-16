# Configuración Final - ERP Analytics con Base de Datos UEP

## ✅ Estado del Sistema

El sistema está completamente funcional y conectado a la base de datos **UEP** local.

## 🔧 Configuración Actual

### Backend (Puerto 5005)
**Ubicación:** `c:\Users\iSource\Desktop\ERPapp\back`

**Configuración (.env):**
```env
PORT=5005
USE_HTTPS=false
DB_USER=sa
DB_PASSWORD=isource
DB_NAME=UEP
DB_SERVER=186.124.198.40
DB_PORT=1433
JWT_SECRET=erp_analytics_jwt_secret_2024_secure_key
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,https://aclysa.vercel.app,https://*.vercel.app
```

### Frontend (Puerto 3001)
**Ubicación:** `c:\Users\iSource\Desktop\ERPapp\erp-analytics`

**Configuración (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5005
```

## 🔐 Credenciales de Acceso

**Usuario Administrador:**
- Email: `admin@uep.com`
- Password: `admin123`
- Valor: `900009`

## 📊 Base de Datos UEP

### Cambios Realizados
1. ✅ Campo `Password` agregado a tabla `imPersonal`
2. ✅ Usuario administrador creado

### Estructura de imPersonal
- **Valor** (int, NOT NULL) - ID único del usuario
- **ApellidoNombre** (varchar(40), NOT NULL) - Nombre completo
- **email** (varchar(40), NULL) - Email para login
- **Password** (varchar(50), NULL) - Password para autenticación
- Otros campos: Domicilio, Telefono, Celular, CUIT, etc.

## 🚀 Cómo Iniciar el Sistema

### 1. Iniciar Backend
```bash
cd c:\Users\iSource\Desktop\ERPapp\back
npm start
```

**Salida esperada:**
```
🚀 Backend server running on http://localhost:5005
📊 Database: UEP
```

### 2. Iniciar Frontend
```bash
cd c:\Users\iSource\Desktop\ERPapp\erp-analytics
npm run dev
```

**Salida esperada:**
```
▲ Next.js 16.1.6 (Turbopack)
- Local:         http://localhost:3001
✓ Ready in 1026ms
```

### 3. Acceder a la Aplicación
- Abrir navegador en: **http://localhost:3001**
- Usar credenciales: `admin@uep.com` / `admin123`

## 📡 Endpoints API Disponibles

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `GET /api/auth/me` - Obtener usuario actual (requiere token)

### Dashboard y Estadísticas
- `GET /api/dashboard` - Resumen general
- `GET /api/ventas/stats?ano=2024&mes=3` - Estadísticas de ventas
- `GET /api/compras/stats?ano=2024&mes=3` - Estadísticas de compras
- `GET /api/cobranzas/stats?ano=2024&mes=3` - Estadísticas de cobranzas
- `GET /api/pagos/stats?ano=2024&mes=3` - Estadísticas de pagos

### Comprobantes
- `GET /api/comprobantes?page=1&limit=50` - Listado paginado
- `GET /api/comprobantes/export?ano=2024` - Exportar a Excel

## 🔍 Cambios Importantes Realizados

### 1. Backend Separado
- Se movió toda la lógica del backend a la carpeta `back/`
- Servidor Express independiente en puerto 5005
- Todas las rutas API migradas del frontend al backend

### 2. Frontend Simplificado
- Se eliminó la carpeta `src/app/api/` del frontend
- El frontend ahora solo consume APIs del backend
- Configurado `API_URL` en `src/lib/api.ts` para apuntar al backend

### 3. Base de Datos
- Migrada de `iSource` a `UEP`
- Campo `Password` agregado a `imPersonal`
- Usuario admin creado para testing

## 🛠️ Scripts Útiles

### Backend

```bash
# Verificar estructura de imPersonal
node check-impersonal-uep.js

# Configurar DB (agregar Password y crear admin)
node setup-uep-db.js

# Probar login con admin
node test-login-uep.js

# Probar conexión a DB
node test-connection.js
```

## 📝 Notas Técnicas

### Conexión a Base de Datos
- La base de datos UEP está en el servidor `186.124.198.40:1433`
- Se usa el puerto 1433 (instancia por defecto)
- No se usa `DB_INSTANCE` porque con `DB_PORT` definido, la lógica de Aclysa ignora la instancia

### Autenticación
- JWT con expiración de 8 horas
- Passwords en texto plano (case-insensitive)
- Token almacenado en localStorage del navegador

### CORS
- Configurado para permitir orígenes: localhost:3000, 3001, 3002 y Vercel

## 🐛 Troubleshooting

### Error: "Error de inicio de sesión del usuario ''"
**Causa:** El frontend está intentando usar rutas API locales en lugar del backend.
**Solución:** Verificar que `API_URL` en `src/lib/api.ts` esté configurado correctamente.

### Error: "Failed to connect to database"
**Causa:** Backend no puede conectarse a la base de datos.
**Solución:** Verificar credenciales en `.env` y que SQL Server esté accesible.

### Error: "Port 3000 is in use"
**Causa:** Otra instancia de Next.js está corriendo.
**Solución:** El frontend automáticamente usa el puerto 3001.

## 📊 Datos de Prueba

La base de datos UEP contiene:
- **481 registros** en `imPersonal`
- **1 usuario con email** (admin@uep.com)
- Tablas disponibles: cbtes, compras, Recibos, OrdenPago, Clientes, PROVEEDORES, etc.

## ✅ Checklist de Verificación

- [x] Backend corriendo en puerto 5005
- [x] Frontend corriendo en puerto 3001
- [x] Base de datos UEP accesible
- [x] Campo Password existe en imPersonal
- [x] Usuario admin creado
- [x] Login funcionando
- [x] Endpoints API respondiendo
- [x] Frontend apuntando al backend correcto

---

**Sistema listo para usar** 🚀

Para soporte o modificaciones, revisar:
- `README.md` - Documentación general
- `back/src/routes/` - Rutas API del backend
- `erp-analytics/src/` - Código del frontend
