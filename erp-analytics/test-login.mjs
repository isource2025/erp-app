import sql from "mssql";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

async function testLogin() {
  const pool = await sql.connect(config);
  
  console.log("Verificando estructura de imPersonal...\n");
  
  // Get sample user with email and password
  const sample = await pool.request().query(`
    SELECT TOP 5 
      Valor, 
      ApellidoNombre, 
      email, 
      Password,
      CASE 
        WHEN Password IS NULL THEN 'NULL'
        WHEN LTRIM(RTRIM(Password)) = '' THEN 'VACÍO'
        ELSE 'TIENE PASSWORD'
      END as PasswordStatus
    FROM imPersonal 
    WHERE email IS NOT NULL 
      AND LTRIM(RTRIM(email)) <> ''
    ORDER BY Valor
  `);
  
  console.log("Usuarios con email en imPersonal:");
  console.log("=".repeat(80));
  sample.recordset.forEach(r => {
    console.log(`Valor: ${r.Valor}`);
    console.log(`  Nombre: ${(r.ApellidoNombre || "").trim()}`);
    console.log(`  Email: ${(r.email || "").trim()}`);
    console.log(`  Password: ${r.PasswordStatus}`);
    if (r.Password && r.Password.trim()) {
      console.log(`  Password value: "${r.Password.trim()}"`);
    }
    console.log("");
  });
  
  // Test authentication query
  const testEmail = sample.recordset[0]?.email?.trim().toLowerCase();
  if (testEmail) {
    console.log(`\nProbando query de autenticación con email: ${testEmail}`);
    const authTest = await pool.request()
      .input("email", testEmail)
      .query(`
        SELECT 
          Valor,
          ApellidoNombre,
          email,
          Password
        FROM imPersonal
        WHERE LOWER(LTRIM(RTRIM(email))) = @email
          AND email IS NOT NULL
          AND LTRIM(RTRIM(email)) <> ''
      `);
    
    console.log(`Resultado: ${authTest.recordset.length > 0 ? "✓ Usuario encontrado" : "✗ No encontrado"}`);
    if (authTest.recordset.length > 0) {
      const user = authTest.recordset[0];
      console.log(`  Valor: ${user.Valor}`);
      console.log(`  Nombre: ${(user.ApellidoNombre || "").trim()}`);
      console.log(`  Email: ${(user.email || "").trim()}`);
      console.log(`  Tiene password: ${user.Password ? "Sí" : "No"}`);
    }
  }
  
  await pool.close();
}

testLogin().catch(console.error);
