require("dotenv").config();
const { getPool } = require("./src/config/db");

async function setupDatabase() {
  console.log("🔧 Configurando base de datos...\n");
  
  try {
    const pool = await getPool();
    
    // 1. Verificar si el campo Password existe
    console.log("1. Verificando campo Password en imPersonal...");
    const checkColumn = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'imPersonal' AND COLUMN_NAME = 'Password'
    `);
    
    if (checkColumn.recordset.length === 0) {
      console.log("   ⚠️  Campo Password no existe. Agregando...");
      await pool.request().query(`
        ALTER TABLE imPersonal 
        ADD Password VARCHAR(255) NULL
      `);
      console.log("   ✅ Campo Password agregado exitosamente");
    } else {
      console.log("   ✅ Campo Password ya existe");
    }
    
    // 2. Verificar si existe usuario admin
    console.log("\n2. Verificando usuario admin...");
    const checkAdmin = await pool.request().query(`
      SELECT Valor, email, Password 
      FROM imPersonal 
      WHERE email = 'admin@erp.com'
    `);
    
    if (checkAdmin.recordset.length === 0) {
      console.log("   ⚠️  Usuario admin no existe. Creando...");
      
      // Obtener el próximo Valor disponible
      const maxValor = await pool.request().query(`
        SELECT ISNULL(MAX(Valor), 0) + 1 as nextValor FROM imPersonal
      `);
      const nextValor = maxValor.recordset[0].nextValor;
      
      await pool.request()
        .input("valor", nextValor)
        .input("apellidoNombre", "ADMINISTRADOR SISTEMA")
        .input("email", "admin@erp.com")
        .input("password", "admin123")
        .query(`
          INSERT INTO imPersonal (Valor, ApellidoNombre, email, Password, Estado)
          VALUES (@valor, @apellidoNombre, @email, @password, 1)
        `);
      
      console.log("   ✅ Usuario admin creado exitosamente");
      console.log(`      Email: admin@erp.com`);
      console.log(`      Password: admin123`);
      console.log(`      Valor: ${nextValor}`);
    } else {
      const admin = checkAdmin.recordset[0];
      console.log("   ✅ Usuario admin ya existe");
      console.log(`      Email: admin@erp.com`);
      console.log(`      Valor: ${admin.Valor}`);
      
      // Actualizar password si está vacío
      if (!admin.Password || admin.Password.trim() === "") {
        console.log("   ⚠️  Password vacío. Actualizando...");
        await pool.request()
          .input("valor", admin.Valor)
          .input("password", "admin123")
          .query(`
            UPDATE imPersonal 
            SET Password = @password 
            WHERE Valor = @valor
          `);
        console.log("   ✅ Password actualizado a: admin123");
      } else {
        console.log(`      Password: ${admin.Password.trim()}`);
      }
    }
    
    // 3. Mostrar resumen
    console.log("\n3. Resumen de usuarios con email:");
    const users = await pool.request().query(`
      SELECT TOP 5 Valor, ApellidoNombre, email, 
        CASE 
          WHEN Password IS NULL OR LTRIM(RTRIM(Password)) = '' THEN 'SIN PASSWORD'
          ELSE 'CON PASSWORD'
        END as PasswordStatus
      FROM imPersonal 
      WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> ''
      ORDER BY Valor DESC
    `);
    
    console.log("\n   Usuarios:");
    users.recordset.forEach(u => {
      console.log(`   - ${u.ApellidoNombre?.trim()} (${u.email?.trim()}) - ${u.PasswordStatus}`);
    });
    
    await pool.close();
    console.log("\n✅ Configuración completada exitosamente!\n");
    
  } catch (error) {
    console.error("\n❌ Error en la configuración:", error.message);
    process.exit(1);
  }
}

setupDatabase();
