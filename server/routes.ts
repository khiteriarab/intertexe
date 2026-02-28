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
import { supabaseAdmin } from "./supabase";
import { sendWelcomeEmail } from "./resend";

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

  app.post("/api/supabase-signup", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase admin not configured" });
      }

      let userId: string;

      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: { data: { name: name || "" } },
      });

      if (signUpError) {
        if (signUpError.message.includes("already been registered") || signUpError.message.includes("already registered")) {
          return res.status(400).json({ message: "Email already registered" });
        }

        const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (adminError) {
          if (adminError.message.includes("already been registered")) {
            return res.status(400).json({ message: "Email already registered" });
          }
          return res.status(400).json({ message: "Unable to create account. Please try again." });
        }

        if (!adminData.user) {
          return res.status(500).json({ message: "Failed to create user" });
        }
        userId = adminData.user.id;
      } else {
        if (!signUpData.user) {
          return res.status(500).json({ message: "Failed to create user" });
        }
        userId = signUpData.user.id;

        if (signUpData.user.identities?.length === 0) {
          return res.status(400).json({ message: "Email already registered" });
        }

        await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });
      }

      const username = email.split("@")[0] + "_" + userId.slice(0, 6);

      await supabaseAdmin.from("users").upsert({
        id: userId,
        email,
        name: name || null,
        username,
        password: "supabase-auth",
        subscription_tier: "free",
        fabric_persona: null,
      });

      sendWelcomeEmail(email, name).catch(() => {});
      trackEvent("signup", userId).catch(() => {});

      return res.status(201).json({
        id: userId,
        email,
        name: name || null,
        username,
        subscriptionTier: "free",
        fabricPersona: null,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ─── Designers ─────────────────────────────
  app.get("/api/designers", async (req, res) => {
    try {
      const q = req.query.q as string | undefined;
      const names = req.query.names as string | undefined;
      const slugs = req.query.slugs as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      if (slugs) {
        const slugList = slugs.split(',').map(s => s.trim()).filter(Boolean);
        const results = await Promise.all(
          slugList.map(s => storage.getDesignerBySlug(s))
        );
        return res.json(results.filter(Boolean));
      }
      if (names) {
        const nameList = names.split(',').map(n => n.trim()).filter(Boolean);
        const all = await storage.getDesigners();
        const matched = nameList
          .map(n => all.find(d => d.name.toLowerCase() === n.toLowerCase()))
          .filter(Boolean);
        return res.json(matched);
      }
      const list = q ? await storage.searchDesigners(q) : await storage.getDesigners(limit);
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

  // ─── Product Favorites ─────────────────────
  app.get("/api/product-favorites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const productIds = await storage.getProductFavorites(req.user!.id);
      return res.json({ productIds });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/product-favorites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { productId } = req.body;
      if (!productId) return res.status(400).json({ message: "productId required" });
      await storage.addProductFavorite(req.user!.id, productId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/product-favorites/:productId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      await storage.removeProductFavorite(req.user!.id, req.params.productId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/product-favorites/sync", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { productIds } = req.body;
      if (!Array.isArray(productIds)) return res.status(400).json({ message: "productIds array required" });
      const merged = await storage.syncProductFavorites(req.user!.id, productIds);
      return res.json({ productIds: merged });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ─── Price Alerts ──────────────────────────────
  app.get("/api/price-alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const alerts = await storage.getPriceAlerts(req.user!.id);
      return res.json({ alerts });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/price-alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { productId, savedPrice } = req.body;
      if (!productId || !savedPrice) return res.status(400).json({ message: "productId and savedPrice required" });
      await storage.savePriceAlert(req.user!.id, productId, savedPrice);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/price-alerts/bulk", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ message: "items array required" });
      await storage.bulkSavePriceAlerts(req.user!.id, items);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/price-alerts/:productId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      await storage.removePriceAlert(req.user!.id, req.params.productId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ─── Recents ──────────────────────────────────
  app.get("/api/recents", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const items = await storage.getRecents(req.user!.id, limit);
      return res.json({ recents: items });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/recents", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { productId, productUrl, brandName } = req.body;
      if (!productId) return res.status(400).json({ message: "productId required" });
      await storage.addRecent(req.user!.id, productId, productUrl, brandName);
      return res.json({ success: true });
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
      } catch (e) {
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

  // ─── Products ────────────────────────────
  app.get("/api/products", async (req, res) => {
    try {
      const { category, fiber } = req.query;
      const fiberTerms = typeof fiber === "string" ? fiber.split(",").map(f => f.trim()).filter(Boolean) : [];
      let result;

      if (fiberTerms.length === 1) {
        if (category) {
          result = await db.execute(
            sql`SELECT * FROM products WHERE approved = 'yes' AND category = ${category} AND LOWER(composition) LIKE LOWER(${`%${fiberTerms[0]}%`}) ORDER BY natural_fiber_percent DESC`
          );
        } else {
          result = await db.execute(
            sql`SELECT * FROM products WHERE approved = 'yes' AND LOWER(composition) LIKE LOWER(${`%${fiberTerms[0]}%`}) ORDER BY natural_fiber_percent DESC`
          );
        }
      } else if (fiberTerms.length > 1) {
        const allResult = await db.execute(
          sql`SELECT * FROM products WHERE approved = 'yes' ORDER BY natural_fiber_percent DESC`
        );
        const rows = (allResult.rows || []).filter((r: any) => {
          const comp = (r.composition || "").toLowerCase();
          const matchesFiber = fiberTerms.some(t => comp.includes(t.toLowerCase()));
          const matchesCat = category ? r.category === category : true;
          return matchesFiber && matchesCat;
        });
        result = { rows };
      } else if (category) {
        result = await db.execute(
          sql`SELECT * FROM products WHERE approved = 'yes' AND category = ${category} ORDER BY natural_fiber_percent DESC`
        );
      } else {
        result = await db.execute(
          sql`SELECT * FROM products WHERE approved = 'yes' ORDER BY natural_fiber_percent DESC`
        );
      }
      const mapped = (result.rows || []).map((r: any) => ({
        id: r.id,
        brandSlug: r.brand_slug,
        brandName: r.brand_name,
        name: r.name,
        productId: r.product_id,
        url: r.url,
        imageUrl: r.image_url,
        price: r.price,
        composition: r.composition,
        naturalFiberPercent: r.natural_fiber_percent,
        category: r.category,
      }));
      return res.json(mapped);
    } catch (err: any) {
      return res.json([]);
    }
  });

  app.post("/api/products/by-ids", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.json([]);
      const uuidIds = ids.filter((id: string) => /^[0-9a-f-]{36}$/i.test(id));
      const numericIds = ids.filter((id: string) => /^\d+$/.test(id));
      let rows: any[] = [];
      if (uuidIds.length > 0) {
        const r = await db.execute(sql`SELECT * FROM products WHERE id = ANY(${uuidIds}::uuid[])`);
        rows.push(...(r.rows || []));
      }
      if (numericIds.length > 0) {
        const r = await db.execute(sql`SELECT * FROM products WHERE id = ANY(${numericIds.map(Number)}::bigint[])`);
        rows.push(...(r.rows || []));
      }
      const mapped = rows.map((r: any) => ({
        id: r.id,
        brandSlug: r.brand_slug,
        brandName: r.brand_name,
        name: r.name,
        productId: r.product_id,
        url: r.url,
        imageUrl: r.image_url,
        price: r.price,
        composition: r.composition,
        naturalFiberPercent: r.natural_fiber_percent,
        category: r.category,
      }));
      return res.json(mapped);
    } catch (err: any) {
      return res.json([]);
    }
  });

  app.get("/api/products/:brandSlug", async (req, res) => {
    try {
      const { brandSlug } = req.params;
      const result = await db.execute(
        sql`SELECT * FROM products WHERE brand_slug = ${brandSlug} AND approved = 'yes' ORDER BY natural_fiber_percent DESC`
      );
      const rows = (result.rows || []).map((r: any) => ({
        id: r.id,
        brandSlug: r.brand_slug,
        brandName: r.brand_name,
        name: r.name,
        productId: r.product_id,
        url: r.url,
        imageUrl: r.image_url,
        price: r.price,
        composition: r.composition,
        naturalFiberPercent: r.natural_fiber_percent,
        category: r.category,
        matchingSetId: r.matching_set_id || null,
      }));
      return res.json(rows);
    } catch (err: any) {
      return res.json([]);
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

  app.get("/sitemap.xml", async (_req, res) => {
    const baseUrl = "https://www.intertexe.com";

    const staticPages = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/shop", priority: "0.9", changefreq: "daily" },
      { path: "/designers", priority: "0.9", changefreq: "weekly" },
      { path: "/designers/all", priority: "0.8", changefreq: "weekly" },
      { path: "/materials", priority: "0.8", changefreq: "weekly" },
      { path: "/quiz", priority: "0.7", changefreq: "monthly" },
      { path: "/chat", priority: "0.6", changefreq: "monthly" },
      { path: "/just-in", priority: "0.8", changefreq: "daily" },
      { path: "/about", priority: "0.4", changefreq: "monthly" },
      { path: "/contact", priority: "0.3", changefreq: "monthly" },
      { path: "/privacy", priority: "0.2", changefreq: "yearly" },
      { path: "/terms", priority: "0.2", changefreq: "yearly" },
    ];

    const materialPages = [
      "cashmere", "silk", "wool", "cotton", "linen", "viscose",
      "linen-dresses", "linen-tops", "silk-dresses", "silk-tops",
      "cotton-dresses", "cotton-tops", "cashmere-sweaters",
      "wool-sweaters", "viscose-dresses",
    ].map(slug => ({ path: `/materials/${slug}`, priority: "0.7", changefreq: "weekly" }));

    let brandPages: { path: string; priority: string; changefreq: string }[] = [];
    try {
      const result = await supabaseAdmin
        .from("designers")
        .select("slug")
        .order("name");
      if (result.data) {
        brandPages = result.data
          .filter((d: any) => d.slug && d.slug.length > 1)
          .map((d: any) => ({ path: `/designers/${d.slug}`, priority: "0.6", changefreq: "weekly" }));
      }
    } catch (e) {}

    const allPages = [...staticPages, ...materialPages, ...brandPages];
    const today = new Date().toISOString().split("T")[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${baseUrl}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  app.post("/api/admin/sync-rakuten", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const brands = [
        { slug: "diesel", name: "Diesel" },
        { slug: "a-l-c-", name: "A.L.C." },
      ];
      const results: Record<string, any> = {};

      for (const brand of brands) {
        const { data: products, error } = await supabaseAdmin
          .from("products")
          .select("id, name, price, url, composition, natural_fiber_percent")
          .eq("brand_slug", brand.slug);

        if (error || !products) {
          results[brand.slug] = { error: error?.message || "No products" };
          continue;
        }

        let priceUpdated = 0, failed = 0;
        for (const p of products) {
          const murlMatch = p.url?.match(/murl=([^&]+)/);
          const actualUrl = murlMatch ? decodeURIComponent(murlMatch[1]) : null;
          if (!actualUrl) { failed++; continue; }

          try {
            const scrapeRes = await fetch(actualUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
              signal: AbortSignal.timeout(8000),
            });
            if (scrapeRes.status !== 200) { failed++; continue; }
            const html = await scrapeRes.text();

            let newPrice: string | null = null;
            const jsonLd = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
            if (jsonLd) {
              try {
                const data = JSON.parse(jsonLd[1]);
                if (data.offers?.price) newPrice = "$" + parseFloat(data.offers.price).toFixed(2);
              } catch (e) {}
            }

            if (newPrice && newPrice !== p.price) {
              await supabaseAdmin.from("products").update({ price: newPrice }).eq("id", p.id);
              priceUpdated++;
            }
          } catch (e) { failed++; }

          await new Promise(r => setTimeout(r, 300));
        }

        results[brand.slug] = { total: products.length, priceUpdated, failed };
      }

      return res.json({ success: true, results });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  async function webResearch(brandName: string, productName: string, tagPrice: string, brandWebsite?: string | null): Promise<any> {
    try {
      let websiteContent = "";
      if (brandWebsite) {
        try {
          const url = brandWebsite.startsWith("http") ? brandWebsite : `https://${brandWebsite}`;
          const siteRes = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
            signal: AbortSignal.timeout(5000),
          });
          if (siteRes.ok) {
            const html = await siteRes.text();
            websiteContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000);
          }
        } catch {}
      }
      const scanOpenai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const aiRes = await scanOpenai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `You are INTERTEXE's fashion intelligence analyst. Analyze: Brand: ${brandName}, Product: ${productName || "unknown"}, Price: ${tagPrice || "not visible"}. ${websiteContent ? "Brand website: " + websiteContent : ""} Return JSON: {"composition":"likely composition","naturalFiberPercent":number or null,"priceRange":"range","otherRetailers":["up to 4"],"qualityNotes":"2-3 sentences","sustainabilityNotes":"1-2 sentences or null","verdict":"honest 1-2 sentence verdict"}. Be direct. Return ONLY valid JSON.` }],
        max_tokens: 700,
      });
      const content = aiRes.choices[0]?.message?.content || "";
      return JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch { return null; }
  }

  app.post("/api/scan-tag", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ error: "Image data required" });

      const scanOpenai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const visionRes = await scanOpenai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: 'Read this clothing tag/label photo. Extract brand name, product name, price, and any material composition visible. Return JSON: {"brandName":"","productName":"","price":"","composition":"","category":"tops/bottoms/dresses/outerwear/other"}. Nulls for missing. ONLY valid JSON.' },
            { type: "image_url", image_url: { url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}` } },
          ],
        }],
        max_tokens: 400,
      });

      let tagInfo;
      try {
        tagInfo = JSON.parse(visionRes.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}");
      } catch { return res.status(500).json({ error: "Could not read this tag." }); }

      const brandName = tagInfo.brandName || "Unknown";
      const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      if (!supabaseAdmin) return res.status(500).json({ error: "Database not configured" });

      const [productResult, designerResult, fuzzyDesignerResult] = await Promise.all([
        supabaseAdmin.from("products").select("*").eq("approved", "yes").eq("brand_slug", brandSlug).limit(12),
        supabaseAdmin.from("designers").select("*").eq("slug", brandSlug).limit(1),
        supabaseAdmin.from("designers").select("*").ilike("name", `%${brandName}%`).limit(1),
      ]);

      let designerInfo = designerResult.data?.[0] || fuzzyDesignerResult.data?.[0] || null;
      let products = productResult.data || [];
      let matched = !!(designerInfo || products.length);

      if (!products.length) {
        const { data } = await supabaseAdmin.from("products").select("*").eq("approved", "yes")
          .or(`brand_name.ilike.%${brandName}%,brand_slug.ilike.%${brandSlug}%`).limit(12);
        if (data?.length) { products = data; matched = true; }
      }

      const totalFiber = products.reduce((s: number, p: any) => s + (p.natural_fiber_percent || 0), 0);
      const avgFiber = products.length ? Math.round(totalFiber / products.length) : null;
      const brandRating = avgFiber === null ? null : avgFiber >= 95 ? "Exceptional" : avgFiber >= 85 ? "Excellent" : avgFiber >= 70 ? "Good" : "Caution";

      const detectedCategory = tagInfo.category || "";
      const categoryKeywords: Record<string, string[]> = {
        dresses: ["dress", "gown", "midi", "maxi", "mini dress"],
        tops: ["top", "blouse", "shirt", "tee", "camisole", "tank"],
        bottoms: ["pant", "trouser", "skirt", "jean", "short"],
        outerwear: ["jacket", "coat", "blazer", "cardigan", "sweater", "knit"],
        knitwear: ["sweater", "knit", "cardigan", "pullover"],
      };
      const searchTerms = categoryKeywords[detectedCategory] || [];
      let altQuery = supabaseAdmin.from("products").select("*").eq("approved", "yes")
        .gte("natural_fiber_percent", 80).neq("brand_slug", brandSlug)
        .order("natural_fiber_percent", { ascending: false });
      if (searchTerms.length > 0) {
        altQuery = altQuery.or(searchTerms.map(t => `name.ilike.%${t}%`).join(","));
      }
      const { data: altData } = await altQuery.limit(6);

      const webIntel = await webResearch(brandName, tagInfo.productName || "", tagInfo.price || "", designerInfo?.website);

      res.json({
        tagInfo: { brandName, productName: tagInfo.productName || "", price: tagInfo.price || "", composition: tagInfo.composition || "", confidence: "high", rawText: "From tag scan" },
        products: products.slice(0, 12),
        matched,
        brandStats: matched && avgFiber !== null ? { avgFiber, rating: brandRating, productCount: products.length } : null,
        designerInfo: designerInfo ? { name: designerInfo.name, slug: designerInfo.slug, logo_url: designerInfo.logo_url, website: designerInfo.website, description: designerInfo.description, rating: designerInfo.rating, hasProducts: products.length > 0 } : null,
        webIntel,
        betterAlternatives: (altData || []).slice(0, 6),
      });
    } catch (err) {
      console.error("Scan tag error:", err);
      res.status(500).json({ error: "Failed to analyze this tag" });
    }
  });

  app.post("/api/scan-url", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "Product URL required" });
      try { new URL(url); } catch { return res.status(400).json({ error: "Invalid URL" }); }

      const extractUrlInfo = (rawUrl: string) => {
        try {
          const parsed = new URL(rawUrl);
          const hostname = parsed.hostname.replace("www.", "");
          const brandMap: Record<string, string> = {
            "nordstrom.com": "Nordstrom", "net-a-porter.com": "Net-a-Porter", "ssense.com": "SSENSE",
            "farfetch.com": "Farfetch", "mytheresa.com": "Mytheresa", "shopbop.com": "Shopbop",
            "saksfifthavenue.com": "Saks Fifth Avenue", "revolve.com": "Revolve", "asos.com": "ASOS",
            "zara.com": "Zara", "everlane.com": "Everlane", "thereformation.com": "Reformation",
            "cos.com": "COS", "arket.com": "Arket", "khaite.com": "Khaite",
            "aninebing.com": "Anine Bing", "toteme.com": "Totême", "vince.com": "Vince",
            "sandro-paris.com": "Sandro", "maje.com": "Maje", "ba-sh.com": "ba&sh",
            "sezane.com": "Sézane", "reiss.com": "Reiss", "theory.com": "Theory",
            "eileenfisher.com": "Eileen Fisher", "filippa-k.com": "Filippa K",
            "nanushka.com": "Nanushka", "acnestudios.com": "Acne Studios", "therow.com": "The Row",
            "alcltd.com": "A.L.C.", "agolde.com": "AGOLDE", "rag-bone.com": "Rag & Bone",
            "ganni.com": "Ganni", "isabelmarant.com": "Isabel Marant", "allsaints.com": "AllSaints",
            "diesel.com": "Diesel", "onequince.com": "Quince", "massimodutti.com": "Massimo Dutti",
            "proenzaschouler.com": "Proenza Schouler", "stellamccartney.com": "Stella McCartney",
            "loewe.com": "Loewe", "chloe.com": "Chloé", "maxmara.com": "Max Mara",
            "bergdorfgoodman.com": "Bergdorf Goodman", "stories.com": "& Other Stories", "hm.com": "H&M",
            "frame-store.com": "Frame", "clubmonaco.com": "Club Monaco",
          };
          const retailer = brandMap[hostname] || hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);
          const pathParts = parsed.pathname.split("/").filter(Boolean);
          const productSlug = pathParts.filter(p => !["products", "s", "p", "shop", "collections", "en", "us", "en-us", "womens", "women", "clothing"].includes(p.toLowerCase())).pop() || "";
          const product = productSlug.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()).trim();
          const isMultiBrand = ["nordstrom.com", "net-a-porter.com", "ssense.com", "farfetch.com", "mytheresa.com", "shopbop.com", "saksfifthavenue.com", "bergdorfgoodman.com", "revolve.com", "asos.com"].includes(hostname);
          return { brand: isMultiBrand ? "" : retailer, product, retailer };
        } catch { return { brand: "", product: "", retailer: "" }; }
      };

      const urlInfo = extractUrlInfo(url);

      let pageContent = "";
      try {
        const pageRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          signal: AbortSignal.timeout(10000),
          redirect: "follow",
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
          let structuredData = "";
          if (jsonLdMatch) {
            structuredData = jsonLdMatch.map(m => m.replace(/<\/?script[^>]*>/gi, "").trim()).join("\n").slice(0, 3000);
          }
          const ogTags: string[] = [];
          const metaMatches = html.matchAll(/<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi);
          for (const m of metaMatches) ogTags.push(`og:${m[1]}=${m[2]}`);
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          const titleText = titleMatch ? titleMatch[1].trim() : "";
          const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
          pageContent = [
            titleText ? `Title: ${titleText}` : "",
            ogTags.length ? `Meta: ${ogTags.join(", ")}` : "",
            structuredData ? `Structured data: ${structuredData}` : "",
            bodyText ? `Page text: ${bodyText}` : "",
          ].filter(Boolean).join("\n\n");
        }
      } catch {}

      const scanOpenai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const promptContent = pageContent
        ? `URL: ${url}\n\n${pageContent}`
        : `URL: ${url}\nRetailer: ${urlInfo.retailer}\nBrand (from URL): ${urlInfo.brand || "unknown — determine from URL structure"}\nProduct (from URL path): ${urlInfo.product || "unknown"}\n\nThe page could not be scraped. Use your knowledge of this brand/retailer and the URL structure to extract what you can.`;

      const extractRes = await scanOpenai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: 'Extract product info from the URL and any available page content. Return JSON: {"brandName":"","productName":"","price":"","composition":"","category":"tops/bottoms/dresses/outerwear/knitwear/other","retailer":""}. Use null for genuinely unknown fields. For multi-brand retailers, identify the specific brand from the URL/content. ONLY valid JSON.' },
          { role: "user", content: promptContent }
        ],
        max_tokens: 400,
      });
      let pageInfo;
      try {
        pageInfo = JSON.parse(extractRes.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}");
      } catch { return res.status(500).json({ error: "Could not parse product details." }); }

      const brandName = pageInfo.brandName || urlInfo.brand || "Unknown";
      const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      if (!supabaseAdmin) return res.status(500).json({ error: "Database not configured" });

      const [productResult, designerResult, fuzzyDesignerResult] = await Promise.all([
        supabaseAdmin.from("products").select("*").eq("approved", "yes").eq("brand_slug", brandSlug).limit(12),
        supabaseAdmin.from("designers").select("*").eq("slug", brandSlug).limit(1),
        supabaseAdmin.from("designers").select("*").ilike("name", `%${brandName}%`).limit(1),
      ]);

      let designerInfo = designerResult.data?.[0] || fuzzyDesignerResult.data?.[0] || null;
      let products = productResult.data || [];
      let matched = !!(designerInfo || products.length);

      if (!products.length) {
        const { data } = await supabaseAdmin.from("products").select("*").eq("approved", "yes")
          .or(`brand_name.ilike.%${brandName}%,brand_slug.ilike.%${brandSlug}%`).limit(12);
        if (data?.length) { products = data; matched = true; }
      }

      const totalFiber = products.reduce((s: number, p: any) => s + (p.natural_fiber_percent || 0), 0);
      const avgFiber = products.length ? Math.round(totalFiber / products.length) : null;
      const brandRating = avgFiber === null ? null : avgFiber >= 95 ? "Exceptional" : avgFiber >= 85 ? "Excellent" : avgFiber >= 70 ? "Good" : "Caution";

      const detectedCategory = pageInfo.category || "";
      const categoryKeywords: Record<string, string[]> = {
        dresses: ["dress", "gown", "midi", "maxi", "mini dress"],
        tops: ["top", "blouse", "shirt", "tee", "camisole", "tank"],
        bottoms: ["pant", "trouser", "skirt", "jean", "short"],
        outerwear: ["jacket", "coat", "blazer", "cardigan", "sweater", "knit"],
        knitwear: ["sweater", "knit", "cardigan", "pullover"],
      };
      const searchTerms = categoryKeywords[detectedCategory] || [];
      let altQuery = supabaseAdmin.from("products").select("*").eq("approved", "yes")
        .gte("natural_fiber_percent", 80).neq("brand_slug", brandSlug)
        .order("natural_fiber_percent", { ascending: false });
      if (searchTerms.length > 0) {
        altQuery = altQuery.or(searchTerms.map(t => `name.ilike.%${t}%`).join(","));
      }
      const { data: altData } = await altQuery.limit(6);

      const webIntel = await webResearch(brandName, pageInfo.productName || "", pageInfo.price || "", designerInfo?.website);
      if (webIntel && pageInfo.composition) {
        webIntel.composition = pageInfo.composition;
        const naturalFibers = ["cotton","silk","wool","linen","cashmere","hemp","flax","merino","alpaca","mohair"];
        let totalNatural = 0;
        for (const f of naturalFibers) { const m = pageInfo.composition.toLowerCase().match(new RegExp(`(\\d+)%\\s*${f}`)); if (m) totalNatural += parseInt(m[1]); }
        if (totalNatural > 0) webIntel.naturalFiberPercent = Math.min(totalNatural, 100);
      }

      res.json({
        tagInfo: {
          brandName,
          productName: pageInfo.productName || urlInfo.product || "",
          price: pageInfo.price || "",
          composition: pageInfo.composition || "",
          confidence: pageContent ? "high" : "medium",
          rawText: `From ${pageInfo.retailer || urlInfo.retailer || new URL(url).hostname}`,
        },
        products: products.slice(0, 12),
        matched,
        brandStats: matched && avgFiber !== null ? { avgFiber, rating: brandRating, productCount: products.length } : null,
        designerInfo: designerInfo ? { name: designerInfo.name, slug: designerInfo.slug, logo_url: designerInfo.logo_url, website: designerInfo.website, description: designerInfo.description, rating: designerInfo.rating, hasProducts: products.length > 0 } : null,
        webIntel,
        betterAlternatives: (altData || []).slice(0, 6),
      });
    } catch (err) {
      console.error("Scan URL error:", err);
      res.status(500).json({ error: "Failed to analyze this product" });
    }
  });

  return httpServer;
}
