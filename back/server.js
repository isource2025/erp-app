require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth");
const statsRoutes = require("./src/routes/stats");
const comprobantesRoutes = require("./src/routes/comprobantes");
const reportesRoutes = require("./src/routes/reportes");
const reportesEspecificosRoutes = require("./src/routes/reportes-especificos");

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", statsRoutes);
app.use("/api/comprobantes", comprobantesRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/reportes-especificos", reportesEspecificosRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME}`);
});
