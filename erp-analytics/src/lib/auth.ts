import jwt from "jsonwebtoken";
import { getPool } from "./db";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export interface UserPayload {
  valor: number;
  apellidoNombre: string;
  email: string;
  codOperador: number;
}

export function signToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

export function getUserFromRequest(req: NextRequest): UserPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<UserPayload | null> {
  const pool = await getPool();

  // Use only imPersonal table with email and Password fields
  const result = await pool.request()
    .input("email", email.trim().toLowerCase())
    .input("password", password)
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
    return null;
  }

  const user = result.recordset[0];
  const storedPassword = (user.Password || "").trim();

  // Compare passwords (case-insensitive)
  if (storedPassword.toUpperCase() !== password.toUpperCase()) {
    return null;
  }

  return {
    valor: user.Valor,
    apellidoNombre: (user.ApellidoNombre || "").trim(),
    email: (user.email || "").trim(),
    codOperador: user.Valor, // Use Valor as codOperador since we're not using imPassword
  };
}
