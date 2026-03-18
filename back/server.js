require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const authRoutes = require("./src/routes/auth");
const statsRoutes = require("./src/routes/stats");
const comprobantesRoutes = require("./src/routes/comprobantes");
const reportesRoutes = require("./src/routes/reportes");
const reportesEspecificosRoutes = require("./src/routes/reportes-especificos");

const app = express();
const PORT = process.env.PORT || 5005;
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map(o => o.trim()) || ["http://localhost:3000"];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como Postman, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(o => origin.endsWith('.vercel.app'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", statsRoutes);
app.use("/api/comprobantes", comprobantesRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/reportes-especificos", reportesEspecificosRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("API de iMedicWS funcionando correctamente");
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Catch-all para debug
app.use((req, res, next) => {
  console.log(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Not found", path: req.url, method: req.method });
});

// Configuración HTTPS
let server;
if (USE_HTTPS) {
  try {
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, 'certs/server.key')),
      cert: fs.readFileSync(path.join(__dirname, 'certs/server.cert'))
    };
    server = https.createServer(httpsOptions, app);
    console.log('🔒 Servidor configurado con HTTPS');
  } catch (error) {
    console.error('❌ Error al cargar certificados SSL:', error.message);
    console.log('⚠️ Usando HTTP en su lugar');
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
  console.log('🌐 Servidor configurado con HTTP');
}

server.listen(PORT, () => {
  const protocol = USE_HTTPS ? 'https' : 'http';
  console.log(`🚀 Backend server running on ${protocol}://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME}`);
  console.log(`🔗 CORS Origins: ${process.env.CORS_ORIGINS}`);
});
