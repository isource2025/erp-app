const fetch = require('node-fetch');

async function testLogin() {
  console.log("🔐 Probando login con usuario admin...\n");
  
  try {
    const response = await fetch('http://localhost:5005/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@erp.com',
        password: 'admin123',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Login exitoso!");
      console.log("\nDatos del usuario:");
      console.log(`  Valor: ${data.user.valor}`);
      console.log(`  Nombre: ${data.user.apellidoNombre}`);
      console.log(`  Email: ${data.user.email}`);
      console.log(`\n🔑 Token JWT generado (primeros 50 caracteres):`);
      console.log(`  ${data.token.substring(0, 50)}...`);
      
      // Probar endpoint /me con el token
      console.log("\n📋 Probando endpoint /api/auth/me...");
      const meResponse = await fetch('http://localhost:5005/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.token}`,
        },
      });
      
      const meData = await meResponse.json();
      if (meResponse.ok) {
        console.log("✅ Endpoint /me funciona correctamente");
        console.log(`  Usuario autenticado: ${meData.user.apellidoNombre}`);
      } else {
        console.log("❌ Error en /me:", meData);
      }
      
    } else {
      console.log("❌ Error en login:", data);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testLogin();
