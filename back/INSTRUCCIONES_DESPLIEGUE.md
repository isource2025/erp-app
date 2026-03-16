# Instrucciones de Despliegue - ERP Analytics

## 🚀 Desplegar Frontend en Vercel con Backend Local

### Requisitos Previos

- ✅ Cloudflared instalado en `C:\cloudflared.exe`
- ✅ Backend corriendo localmente
- ✅ Cuenta de Vercel
- ✅ Proyecto en GitHub: `https://github.com/isource2025/erp-app.git`

---

## 📋 PASOS PARA DESPLEGAR

### PASO 1: Iniciar el Túnel Cloudflare

Desde la carpeta `back/`:

```bash
start-tunnel-permanent.bat
```

**Se abrirá una ventana con una URL como:**
```
https://random-name-1234.trycloudflare.com
```

**⚠️ IMPORTANTE:**
- **NO CIERRES** esta ventana mientras uses la aplicación
- **COPIA** la URL completa que aparece
- Esta URL cambia cada vez que reinicias el túnel

---

### PASO 2: Actualizar CORS del Backend

**Opción A - Script Automático (Recomendado):**

```bash
cd back
node update-cors-for-tunnel.js https://tu-url.trycloudflare.com
```

Este script actualiza automáticamente:
- `back/.env` → Agrega la URL del túnel a `CORS_ORIGINS`
- `back/tunnel-url.env` → Guarda la URL del túnel

**Opción B - Manual:**

Edita `back/.env`:
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,https://tu-url.trycloudflare.com
```

---

### PASO 3: Reiniciar el Backend

```bash
cd back
npm start
```

Verifica que veas:
```
🚀 Backend server running on http://localhost:5005
📊 Database: UEP
```

---

### PASO 4: Desplegar Frontend en Vercel

#### Primera vez (Nuevo Proyecto):

```bash
cd erp-analytics
npm install -g vercel
vercel login
vercel
```

Sigue las instrucciones:
- Link to existing project? **No**
- Project name: `erp-analytics` (o el que prefieras)
- Directory: `./` (carpeta actual)
- Override settings? **No**

#### Redespliegue:

```bash
cd erp-analytics
vercel --prod
```

---

### PASO 5: Configurar Variables de Entorno en Vercel

#### Desde el Dashboard:

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `erp-analytics`
3. Ve a **Settings → Environment Variables**
4. Agrega/actualiza:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://tu-url.trycloudflare.com` (la URL del túnel)
   - **Environments:** ✅ Production ✅ Preview ✅ Development

#### Desde la Terminal:

```bash
vercel env add NEXT_PUBLIC_API_URL
# Pega la URL del túnel cuando te lo pida
# Selecciona: Production, Preview, Development
```

---

### PASO 6: Redeploy en Vercel

Después de actualizar las variables de entorno:

```bash
cd erp-analytics
vercel --prod
```

O desde el dashboard:
1. Ve a **Deployments**
2. Click en **...** del último deployment
3. Click en **Redeploy**

---

## ✅ Verificación

### 1. Verificar el Túnel

Abre en el navegador: `https://tu-url.trycloudflare.com`

Deberías ver algo como:
```json
{"message":"ERP Analytics API"}
```

### 2. Verificar Vercel

Abre tu app en Vercel (ej: `https://erp-analytics.vercel.app`)

Deberías poder:
- ✅ Hacer login
- ✅ Ver el dashboard
- ✅ Ver datos de ventas, compras, cobranzas, etc.

---

## 🔄 Flujo de Trabajo Diario

### Cada vez que inicies el sistema:

```bash
# 1. Iniciar túnel (nueva ventana)
cd C:\Users\iSource\Desktop\ERPapp\back
start-tunnel-permanent.bat

# 2. Copiar nueva URL del túnel

# 3. Actualizar CORS (otra terminal)
cd C:\Users\iSource\Desktop\ERPapp\back
node update-cors-for-tunnel.js https://nueva-url.trycloudflare.com

# 4. Iniciar backend
npm start

# 5. Actualizar Vercel
vercel env add NEXT_PUBLIC_API_URL
vercel --prod
```

---

## 🛠️ Troubleshooting

### Error: "CORS policy blocked"
- ✅ Verifica que la URL del túnel esté en `CORS_ORIGINS`
- ✅ Reinicia el backend después de actualizar `.env`

### Error: "Failed to fetch"
- ✅ Verifica que el túnel esté corriendo
- ✅ Verifica que `NEXT_PUBLIC_API_URL` en Vercel sea correcta
- ✅ Haz redeploy en Vercel después de cambiar variables

### Túnel se desconecta
- ✅ No cierres la ventana del túnel
- ✅ Si se cierra, reinicia y repite todos los pasos

### Backend no responde
- ✅ Verifica que esté corriendo en puerto 5005
- ✅ Verifica conexión a base de datos SQL Server

---

## 📝 Notas

- **URL del túnel es temporal** - Cambia cada vez que reinicias
- **Mantén la ventana del túnel abierta** - Es necesaria para la conexión
- **Cloudflare Tunnel es gratuito** - No requiere cuenta
- **Base de datos remota** - 186.124.198.40:1433 (UEP)

---

## 🔗 Enlaces Útiles

- Repositorio: https://github.com/isource2025/erp-app
- Cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/
- Vercel Docs: https://vercel.com/docs
