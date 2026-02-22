import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { Express, Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";
import { analyticsEvents } from "@shared/schema";
import { db } from "./db";
import { sendWelcomeEmail } from "./resend";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

const tokenStore = new Map<string, { userId: string; expiresAt: number }>();

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore) {
    if (data.expiresAt < now) tokenStore.delete(token);
  }
}

setInterval(cleanExpiredTokens, 60 * 60 * 1000);

const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;

async function getUserFromToken(req: Request): Promise<User | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const entry = tokenStore.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    if (entry) tokenStore.delete(token);
    return null;
  }

  const user = await storage.getUser(entry.userId);
  return user || null;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
      password: string;
      name: string | null;
      subscriptionTier: string;
    }
  }
}

export function setupAuth(app: Express) {
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    const user = await getUserFromToken(req);
    if (user) {
      (req as any).tokenUser = user;
    }
    next();
  });

  function getAuthUser(req: Request): User | null {
    if ((req as any).tokenUser) return (req as any).tokenUser;
    return null;
  }

  function isAuth(req: Request): boolean {
    return !!getAuthUser(req);
  }

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name, username: providedUsername } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const username = providedUsername || email;

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const user = await storage.createUser({
        username,
        email,
        password: await hashPassword(password),
        name: name || null,
      });

      sendWelcomeEmail(email, name).catch(() => {});
      db.insert(analyticsEvents).values({ event: "signup", userId: user.id }).catch(() => {});

      const token = generateToken();
      tokenStore.set(token, { userId: user.id, expiresAt: Date.now() + TOKEN_TTL });

      const { password: _, ...safeUser } = user;
      return res.status(201).json({ ...safeUser, token });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      if (!user || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = generateToken();
      tokenStore.set(token, { userId: user.id, expiresAt: Date.now() + TOKEN_TTL });

      const { password: _, ...safeUser } = user;
      return res.json({ ...safeUser, token });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      tokenStore.delete(authHeader.slice(7));
    }
    return res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const { password: _, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.isAuthenticated = () => isAuth(req);
    (req as any).user = getAuthUser(req);
    next();
  });
}
