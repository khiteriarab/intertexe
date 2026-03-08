import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { authTokens, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;

export async function storeToken(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL);
  await db.insert(authTokens).values({ token, userId, expiresAt });
  return token;
}

export async function getUserFromToken(authHeader: string | null): Promise<any | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const [entry] = await db.select().from(authTokens).where(eq(authTokens.token, token)).limit(1);
    if (!entry || entry.expiresAt < new Date()) {
      if (entry) {
        db.delete(authTokens).where(eq(authTokens.token, token)).catch(() => {});
      }
      return null;
    }
    const [user] = await db.select().from(users).where(eq(users.id, entry.userId)).limit(1);
    return user || null;
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user || null;
}

export async function getUserByUsername(username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return user || null;
}

export async function createUser(data: { username: string; email: string; password: string; name: string | null }) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}
