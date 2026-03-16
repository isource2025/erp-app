const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: "Token inválido" });
  }

  req.user = user;
  next();
}

module.exports = { authMiddleware, verifyToken };
