require("dotenv").config();
const { getPool } = require("./src/config/db");

async function createAdminUser() {
  console.log("👤 Creando nuevo usuario admin en imPersonal...\n");
  
  try {
    const pool = await getPool();
    
    // Verificar base de datos actual
    const dbCheck = await pool.request().query("SELECT DB_NAME() as dbname");
    console.log(`📊 Base de datos: ${dbCheck.recordset[0].dbname}\n`);
    
    // Verificar si existe el email
    const checkEmail = await pool.request()
      .input("email", "admin@uep.com")
      .query(`
        SELECT Valor, ApellidoNombre, email, Password 
        FROM imPersonal 
        WHERE LOWER(LTRIM(RTRIM(email))) = @email
      `);
    
    if (checkEmail.recordset.length > 0) {
      const existing = checkEmail.recordset[0];
      console.log("⚠️  Usuario con email admin@uep.com ya existe:");
      console.log(`   Valor: ${existing.Valor}`);
      console.log(`   Nombre: ${existing.ApellidoNombre?.trim()}`);
      console.log(`   Email: ${existing.email?.trim()}`);
      console.log(`   Password: ${existing.Password?.trim() || 'SIN PASSWORD'}\n`);
      
      // Actualizar password si está vacío
      if (!existing.Password || existing.Password.trim() === "") {
        console.log("📝 Actualizando password...");
        await pool.request()
          .input("valor", existing.Valor)
          .input("password", "admin123")
          .query(`
            UPDATE imPersonal 
            SET Password = @password 
            WHERE Valor = @valor
          `);
        console.log("✅ Password actualizado a: admin123\n");
      }
      
      console.log("✅ Usuario admin listo para usar:");
      console.log(`   Email: admin@uep.com`);
      console.log(`   Password: ${existing.Password?.trim() || 'admin123'}`);
      
    } else {
      console.log("📝 Creando nuevo usuario admin...\n");
      
      // Obtener el próximo Valor disponible
      const maxValor = await pool.request().query(`
        SELECT ISNULL(MAX(Valor), 0) + 1 as nextValor FROM imPersonal
      `);
      const nextValor = maxValor.recordset[0].nextValor;
      
      // Crear usuario
      await pool.request()
        .input("valor", nextValor)
        .input("apellidoNombre", "ADMINISTRADOR UEP")
        .input("email", "admin@uep.com")
        .input("password", "admin123")
        .input("estado", 1)
        .query(`
          INSERT INTO imPersonal (Valor, ApellidoNombre, email, Password, Estado)
          VALUES (@valor, @apellidoNombre, @email, @password, @estado)
        `);
      
      console.log("✅ Usuario admin creado exitosamente!\n");
      console.log("📋 Detalles del usuario:");
      console.log(`   Valor: ${nextValor}`);
      console.log(`   Nombre: ADMINISTRADOR UEP`);
      console.log(`   Email: admin@uep.com`);
      console.log(`   Password: admin123`);
      console.log(`   Estado: Activo (1)`);
    }
    
    // Mostrar resumen de usuarios con email
    console.log("\n📊 Resumen de usuarios con email en UEP:");
    console.log("=".repeat(60));
    const users = await pool.request().query(`
      SELECT TOP 10 Valor, ApellidoNombre, email, 
        CASE 
          WHEN Password IS NULL OR LTRIM(RTRIM(Password)) = '' THEN 'SIN PASSWORD'
          ELSE 'CON PASSWORD'
        END as PasswordStatus
      FROM imPersonal 
      WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> ''
      ORDER BY Valor DESC
    `);
    
    users.recordset.forEach(u => {
      console.log(`${u.Valor.toString().padEnd(10)} | ${(u.ApellidoNombre?.trim() || '').padEnd(30)} | ${(u.email?.trim() || '').padEnd(30)} | ${u.PasswordStatus}`);
    });
    
    await pool.close();
    console.log("\n✅ Proceso completado!\n");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nDetalles:", error);
    process.exit(1);
  }
}

createAdminUser();
