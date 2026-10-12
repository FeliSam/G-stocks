import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, "hex");
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export interface JwtPayloadData {
  sub: string;
  email: string;
  isPlatformAdmin: boolean;
}

export function signSessionToken(payload: JwtPayloadData): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifySessionToken(token: string): JwtPayloadData {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayloadData;
}

export function computeRequestHash(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload ?? {})).digest("hex");
}
