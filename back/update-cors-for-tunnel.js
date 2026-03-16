/**
 * Script para actualizar CORS_ORIGINS cuando cambia la URL del tunnel
 * Uso: node update-cors-for-tunnel.js <NUEVA_URL_DEL_TUNNEL>
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const tunnelUrlPath = path.join(__dirname, 'tunnel-url.env');

// Leer argumentos
const newTunnelUrl = process.argv[2];

if (!newTunnelUrl) {
  console.log('❌ Uso: node update-cors-for-tunnel.js https://nombre.trycloudflare.com');
  process.exit(1);
}

console.log(`📝 Actualizando CORS para túnel: ${newTunnelUrl}`);

// Leer archivo .env
let envContent = fs.readFileSync(envPath, 'utf-8');

// Reemplazar línea CORS_ORIGINS
const corsRegex = /CORS_ORIGINS=.*/;
const baseOrigins = 'http://localhost:3000,http://localhost:3001,http://localhost:3002';
const newCorsLine = `CORS_ORIGINS=${baseOrigins},${newTunnelUrl}`;

envContent = envContent.replace(corsRegex, newCorsLine);

// Guardar archivo .env
fs.writeFileSync(envPath, envContent);

// Actualizar tunnel-url.env
const tunnelEnv = `TUNNEL_PUBLIC_URL=${newTunnelUrl}\n`;
fs.writeFileSync(tunnelUrlPath, tunnelEnv);

console.log('✅ CORS actualizado en .env');
console.log('✅ tunnel-url.env actualizado');
console.log('');
console.log('Ahora reinicia el backend:');
console.log('  npm start');
