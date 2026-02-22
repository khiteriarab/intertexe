import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertQuizResultSchema, analyticsEvents } from "@shared/schema";
import OpenAI from "openai";
import { db } from "./db";
import { sql } from "drizzle-orm";

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
  // Subscription gating: AI recommendations require active subscription
  // Currently allowing all users during beta; flip requireSubscription to enforce
  app.post("/api/recommend", async (req, res) => {
    const requireSubscription = false; // Set to true to enforce paid tier
    if (requireSubscription) {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Sign in to access AI recommendations", requiresAuth: true });
      }
      const tier = req.user!.subscriptionTier || "free";
      if (tier === "free") {
        return res.status(403).json({ message: "AI recommendations require a premium subscription", requiresUpgrade: true });
      }
    }

    const { materials, priceRange, syntheticTolerance, favoriteBrands } = req.body;

    const buildFallback = () => ({
      profileType: "The Purist",
      recommendation:
        `Based on your preference for ${(materials || []).join(", ")} and a tolerance of "${syntheticTolerance || "moderate"}" synthetics, ` +
        `we recommend focusing on designers known for their dedication to natural fibers. ` +
        `Look for heavy-weight knits, structured wovens, and investment pieces that prioritize composition over trend.`,
      suggestedDesignerTypes: ["Heritage luxury brands", "Scandinavian minimalists", "Japanese artisanal labels"],
      recommendedMaterials: materials?.slice(0, 3) || ["Cashmere", "Silk", "Linen"],
      fallback: true,
    });

    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!apiKey) {
      return res.json(buildFallback());
    }

    try {
      const openai = new OpenAI({
        apiKey,
        ...(process.env.OPENAI_API_KEY ? {} : { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }),
      });

      const prompt = `You are a luxury fashion advisor specializing in material quality. 
A customer has the following preferences:
- Favorite materials: ${(materials || []).join(", ")}
- Budget per item: ${priceRange || "Not specified"}
- Synthetic content tolerance: ${syntheticTolerance || "Not specified"}
- Brands they already love: ${(favoriteBrands || []).join(", ") || "None specified"}

Provide a JSON response with exactly these fields:
{
  "profileType": "A creative name for this customer's material profile (e.g. The Purist, The Pragmatist, The Connoisseur)",
  "recommendation": "A 2-3 sentence personalized styling direction focusing on material quality",
  "suggestedDesignerTypes": ["3 types of designers to explore"],
  "recommendedMaterials": ["Top 3 materials to prioritize"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error("Recommendation: empty response from OpenAI");
        return res.json(buildFallback());
      }

      const result = JSON.parse(content);
      return res.json(result);
    } catch (err: any) {
      console.error("Recommendation error:", err.message);
      return res.json(buildFallback());
    }
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
