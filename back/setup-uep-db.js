require("dotenv").config();
const { getPool } = require("./src/config/db");

async function setupUEPDatabase() {
  console.log("🔧 Configurando base de datos UEP...\n");
  
  try {
    const pool = await getPool();
    
    // Verificar base de datos actual
    const dbCheck = await pool.request().query("SELECT DB_NAME() as dbname");
    console.log(`📊 Base de datos: ${dbCheck.recordset[0].dbname}\n`);
    
    // 1. Verificar si existe el campo Password
    console.log("1. Verificando campo Password en imPersonal...");
    const checkPassword = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'imPersonal' AND COLUMN_NAME = 'Password'
    `);
    
    if (checkPassword.recordset.length === 0) {
      console.log("   ⚠️  Campo Password no existe. Agregando...");
      await pool.request().query(`
        ALTER TABLE imPersonal 
        ADD Password VARCHAR(50) NULL
      `);
      console.log("   ✅ Campo Password agregado exitosamente");
    } else {
      console.log("   ✅ Campo Password ya existe");
    }
    
    // 2. Verificar si existe usuario admin
    console.log("\n2. Verificando usuario admin...");
    const checkAdmin = await pool.request()
      .input("email", "admin@uep.com")
      .query(`
        SELECT Valor, ApellidoNombre, email, Password 
        FROM imPersonal 
        WHERE LOWER(LTRIM(RTRIM(email))) = @email
      `);
    
    if (checkAdmin.recordset.length === 0) {
      console.log("   ⚠️  Usuario admin no existe. Creando...");
      
      // Obtener el próximo Valor disponible
      const maxValor = await pool.request().query(`
        SELECT ISNULL(MAX(Valor), 0) + 1 as nextValor FROM imPersonal
      `);
      const nextValor = maxValor.recordset[0].nextValor;
      
      // Crear usuario admin (sin Estado porque no existe en UEP)
      await pool.request()
        .input("valor", nextValor)
        .input("apellidoNombre", "ADMINISTRADOR UEP")
        .input("email", "admin@uep.com")
        .input("password", "admin123")
        .query(`
          INSERT INTO imPersonal (Valor, ApellidoNombre, email, Password)
          VALUES (@valor, @apellidoNombre, @email, @password)
        `);
      
      console.log("   ✅ Usuario admin creado exitosamente");
      console.log(`      Email: admin@uep.com`);
      console.log(`      Password: admin123`);
      console.log(`      Valor: ${nextValor}`);
      
    } else {
      const admin = checkAdmin.recordset[0];
      console.log("   ℹ️  Usuario admin ya existe:");
      console.log(`      Valor: ${admin.Valor}`);
      console.log(`      Nombre: ${admin.ApellidoNombre?.trim()}`);
      console.log(`      Email: ${admin.email?.trim()}`);
      
      // Actualizar password si está vacío
      if (!admin.Password || admin.Password.trim() === "") {
        console.log("   📝 Actualizando password...");
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
    
    // 3. Mostrar resumen de usuarios
    console.log("\n3. Resumen de usuarios con email:\n");
    const users = await pool.request().query(`
      SELECT TOP 10 
        Valor, 
        ApellidoNombre, 
        email,
        CASE 
          WHEN Password IS NULL OR LTRIM(RTRIM(Password)) = '' THEN 'SIN PASSWORD'
          ELSE 'CON PASSWORD'
        END as PasswordStatus
      FROM imPersonal 
      WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> ''
      ORDER BY Valor DESC
    `);
    
    console.log("   Usuarios:");
    users.recordset.forEach(u => {
      const nombre = (u.ApellidoNombre?.trim() || 'SIN NOMBRE').padEnd(30);
      const email = (u.email?.trim() || '').padEnd(30);
      console.log(`   - ${nombre} (${email}) - ${u.PasswordStatus}`);
    });
    
    await pool.close();
    console.log("\n✅ Configuración completada exitosamente!\n");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nDetalles:", error);
    process.exit(1);
  }
}

setupUEPDatabase();
