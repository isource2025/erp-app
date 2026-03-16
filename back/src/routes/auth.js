const express = require("express");
const jwt = require("jsonwebtoken");
const { getPool } = require("../config/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son requeridos" });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input("email", email.trim().toLowerCase())
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

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = result.recordset[0];
    const storedPassword = (user.Password || "").trim();

    if (storedPassword.toUpperCase() !== password.toUpperCase()) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      {
        valor: user.Valor,
        apellidoNombre: (user.ApellidoNombre || "").trim(),
        email: (user.email || "").trim(),
        codOperador: user.Valor,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        valor: user.Valor,
        apellidoNombre: (user.ApellidoNombre || "").trim(),
        email: (user.email || "").trim(),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get current user
router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
