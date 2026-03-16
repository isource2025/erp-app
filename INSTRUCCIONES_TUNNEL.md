# Configuración de Túnel Cloudflare para ERP Analytics

Este documento explica cómo conectar el backend local con Vercel usando Cloudflare Tunnel.

## Requisitos Previos

1. **Cloudflared instalado** en `C:\cloudflared.exe`
2. **Backend corriendo** en `http://localhost:5005`
3. **Cuenta de Vercel** con el proyecto desplegado

## Pasos para Configurar el Túnel

### PASO 1: Iniciar el Túnel Cloudflare

Desde la carpeta `back/`, ejecuta:

```bash
start-tunnel-permanent.bat
```

Esto abrirá una ventana que mostrará una URL como:
```
https://nombre-aleatorio.trycloudflare.com
```

**⚠️ IMPORTANTE: NO CIERRES ESTA VENTANA**

Copia la URL completa que aparece.

### PASO 2: Actualizar CORS en el Backend

Opción A - **Script Automático (Recomendado)**:
```bash
node update-cors-for-tunnel.js https://tu-nueva-url.trycloudflare.com
```

Opción B - **Manual**:

1. Edita `back/.env` y actualiza la línea `CORS_ORIGINS`:
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,https://tu-nueva-url.trycloudflare.com
```

2. Edita `back/tunnel-url.env`:
```env
TUNNEL_PUBLIC_URL=https://tu-nueva-url.trycloudflare.com
```

### PASO 3: Reiniciar el Backend

```bash
cd back
npm start
```

### PASO 4: Actualizar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona el proyecto `erp-analytics`
3. Ve a **Settings → Environment Variables**
4. Actualiza o crea la variable:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://tu-nueva-url.trycloudflare.com`
   - **Environments:** Production, Preview, Development

### PASO 5: Redeploy en Vercel

Desde el dashboard de Vercel:
1. Ve a **Deployments**
2. Click en los tres puntos del último deployment
3. Click en **Redeploy**

O desde la terminal:
```bash
cd erp-analytics
vercel --prod
```

## Resumen Rápido

```
1️⃣ start-tunnel-permanent.bat  → Copia nueva URL
2️⃣ node update-cors-for-tunnel.js <URL>  → Actualiza CORS automáticamente
3️⃣ npm start en back/  → Reinicia backend
4️⃣ Actualiza NEXT_PUBLIC_API_URL en Vercel
5️⃣ Redeploy en Vercel
```

## Verificación

Para verificar que todo funciona:

1. Abre la URL del túnel en el navegador: `https://tu-url.trycloudflare.com`
2. Deberías ver un mensaje del backend
3. Desde Vercel, la app debería poder conectarse al backend local

## Notas Importantes

- La URL del túnel **cambia cada vez** que reinicias `start-tunnel-permanent.bat`
- Mantén la ventana del túnel **siempre abierta** mientras uses la aplicación
- Si reinicias el túnel, debes repetir todos los pasos
- El túnel es **gratuito** pero la URL es temporal

## Troubleshooting

**Error de CORS:**
- Verifica que la URL del túnel esté en `CORS_ORIGINS` del `.env`
- Reinicia el backend después de actualizar el `.env`

**Túnel no conecta:**
- Verifica que cloudflared.exe esté en `C:\cloudflared.exe`
- Verifica que el backend esté corriendo en puerto 5005

**Vercel no conecta:**
- Verifica que `NEXT_PUBLIC_API_URL` esté actualizada en Vercel
- Haz redeploy después de cambiar variables de entorno
