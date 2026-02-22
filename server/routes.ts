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

  // ─── Similar Brands (AI) ──────────────────
  const similarCache = new Map<string, { data: any; ts: number }>();
  const SIMILAR_TTL = 1000 * 60 * 60;

  app.get("/api/designers/:slug/similar", async (req, res) => {
    try {
      const slug = req.params.slug;
      const cached = similarCache.get(slug);
      if (cached && Date.now() - cached.ts < SIMILAR_TTL) {
        return res.json(cached.data);
      }

      const designer = await storage.getDesignerBySlug(slug);
      if (!designer) return res.status(404).json({ message: "Designer not found" });

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const tierLabel = designer.naturalFiberPercent != null
        ? designer.naturalFiberPercent >= 90 ? "Exceptional" : designer.naturalFiberPercent >= 70 ? "Excellent" : designer.naturalFiberPercent >= 50 ? "Good" : "Caution"
        : "Under Review";

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `You are INTERTEXE, the definitive authority on luxury fashion material quality. Given a fashion brand, suggest 6 similar brands that a fan of this brand would love. Focus on brands with similar aesthetics, price point, and material quality. Only suggest real, well-known fashion brands. Return a JSON object with a "brands" array, where each entry has "name" (exact brand name with correct capitalization) and "reason" (one concise sentence explaining why a fan of the original brand would love this one, focusing on material quality, craftsmanship, or aesthetic).`
          },
          {
            role: "user",
            content: `Brand: ${designer.name}${designer.naturalFiberPercent != null ? `\nNatural Fiber Score: ${designer.naturalFiberPercent}% (${tierLabel} tier)` : ''}${designer.description ? `\nAbout: ${designer.description}` : ''}\n\nSuggest 6 similar luxury fashion brands.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || '{"brands":[]}';
      let suggestions: Array<{ name: string; reason: string }> = [];
      try {
        const parsed = JSON.parse(content);
        suggestions = parsed.brands || [];
      } catch {
        console.error("Failed to parse AI similar brands response");
        return res.json([]);
      }

      const allDesigners = await storage.getDesigners();
      const matched = suggestions.map(s => {
        const nameNorm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = allDesigners.find(d => {
          const dNorm = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return dNorm === nameNorm;
        });
        return match ? { ...match, reason: s.reason } : { name: s.name, slug: null, reason: s.reason, naturalFiberPercent: null };
      }).filter(s => s.name.toLowerCase() !== designer.name.toLowerCase()).slice(0, 6);

      similarCache.set(slug, { data: matched, ts: Date.now() });
      return res.json(matched);
    } catch (err: any) {
      console.error("Similar brands error:", err.message);
      return res.json([]);
    }
  });

  // ─── Reviews ─────────────────────────────
  app.get("/api/reviews/:designerSlug", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByDesigner(req.params.designerSlug);
      return res.json(reviews);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
    try {
      const userId = (req.user as any).id;
      const { designerSlug, rating, fabricQuality, title, body, productName } = req.body;
      if (!designerSlug || typeof designerSlug !== "string") {
        return res.status(400).json({ message: "Designer slug required" });
      }
      if (!rating || typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return res.status(400).json({ message: "Rating must be an integer 1-5" });
      }
      if (fabricQuality != null && (typeof fabricQuality !== "number" || fabricQuality < 1 || fabricQuality > 5 || !Number.isInteger(fabricQuality))) {
        return res.status(400).json({ message: "Fabric quality must be an integer 1-5" });
      }
      if (title && typeof title === "string" && title.length > 200) {
        return res.status(400).json({ message: "Title must be under 200 characters" });
      }
      if (body && typeof body === "string" && body.length > 2000) {
        return res.status(400).json({ message: "Review must be under 2000 characters" });
      }
      const existing = await storage.getUserReviewForDesigner(userId, designerSlug);
      if (existing) {
        return res.status(409).json({ message: "You've already reviewed this designer" });
      }
      const review = await storage.createReview({
        userId,
        designerSlug,
        rating,
        fabricQuality: fabricQuality || null,
        title: title ? String(title).slice(0, 200) : null,
        body: body ? String(body).slice(0, 2000) : null,
        productName: productName ? String(productName).slice(0, 100) : null,
      });
      await trackEvent("review_created", userId, { designerSlug, rating });
      return res.status(201).json(review);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/reviews/:reviewId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
    try {
      const userId = (req.user as any).id;
      await storage.deleteReview(req.params.reviewId, userId);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/reviews/:reviewId/helpful", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
    try {
      const userId = (req.user as any).id;
      await storage.voteHelpful(req.params.reviewId, userId);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
