import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertQuizResultSchema, analyticsEvents } from "@shared/schema";
import { assignPersona } from "@shared/personas";
import OpenAI from "openai";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { registerChatRoutes } from "./replit_integrations/chat";

async function trackEvent(event: string, userId?: string, metadata?: Record<string, any>) {
  try {
    await db.insert(analyticsEvents).values({
      event,
      userId: userId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (err) {
    console.error("Analytics tracking error:", err);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  registerChatRoutes(app);

  // ─── Designers ─────────────────────────────
  app.get("/api/designers", async (req, res) => {
    try {
      const q = req.query.q as string | undefined;
      const list = q ? await storage.searchDesigners(q) : await storage.getDesigners();
      return res.json(list);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/designers/:slug", async (req, res) => {
    try {
      const designer = await storage.getDesignerBySlug(req.params.slug);
      if (!designer) return res.status(404).json({ message: "Designer not found" });
      return res.json(designer);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ─── Favorites ─────────────────────────────
  app.get("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const favs = await storage.getFavoritesByUser(req.user!.id);
      return res.json(favs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { designerId } = req.body;
      if (!designerId) return res.status(400).json({ message: "designerId is required" });

      const already = await storage.isFavorited(req.user!.id, designerId);
      if (already) return res.status(409).json({ message: "Already favorited" });

      const fav = await storage.addFavorite({ userId: req.user!.id, designerId });
      trackEvent("favorite_saved", req.user!.id, { designerId });
      return res.status(201).json(fav);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/favorites/:designerId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      await storage.removeFavorite(req.user!.id, req.params.designerId);
      return res.json({ message: "Removed" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/favorites/check/:designerId", async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ favorited: false });
    try {
      const favorited = await storage.isFavorited(req.user!.id, req.params.designerId);
      return res.json({ favorited });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ─── Quiz ──────────────────────────────────
  app.post("/api/quiz", async (req, res) => {
    try {
      const parsed = insertQuizResultSchema.safeParse({
        ...req.body,
        userId: req.isAuthenticated() ? req.user!.id : null,
      });
      if (!parsed.success) return res.status(400).json({ message: "Invalid quiz data" });

      const result = await storage.saveQuizResult(parsed.data);

      if (parsed.data.userId && parsed.data.profileType) {
        const persona = assignPersona({
          materials: parsed.data.materials,
          syntheticTolerance: parsed.data.syntheticTolerance || "Depends on the piece",
        });
        storage.updateUserPersona(parsed.data.userId, persona.id).catch((err) =>
          console.error("Failed to update user persona on quiz save:", err.message)
        );
      }

      trackEvent("quiz_completed", parsed.data.userId || undefined, {
        materials: parsed.data.materials,
        profileType: parsed.data.profileType,
      });
      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/quiz/results", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const results = await storage.getQuizResultsByUser(req.user!.id);
      return res.json(results);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ─── AI Recommendations ────────────────────
  app.post("/api/recommend", async (req, res) => {
    const { materials, priceRange, syntheticTolerance, favoriteBrands } = req.body;

    const persona = assignPersona({
      materials: materials || [],
      syntheticTolerance: syntheticTolerance || "Depends on the piece",
      priceRange: priceRange || undefined,
    });

    const result = {
      profileType: persona.name,
      personaId: persona.id,
      recommendation: persona.description,
      coreValue: persona.coreValue,
      buysFor: persona.buysFor,
      suggestedDesignerTypes: persona.suggestedDesignerTypes,
      recommendedMaterials: persona.recommendedMaterials,
    };

    if (req.isAuthenticated()) {
      storage.updateUserPersona(req.user!.id, persona.id).catch((err) =>
        console.error("Failed to update user persona:", err.message)
      );
    }

    return res.json(result);
  });

  // ─── Analytics ────────────────────────────
  app.get("/api/analytics/summary", async (req, res) => {
    try {
      const result = await db.execute(
        sql`SELECT event, COUNT(*)::int as count FROM analytics_events GROUP BY event ORDER BY count DESC`
      );
      return res.json(result.rows || []);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
