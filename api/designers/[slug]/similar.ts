import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const slug = req.query.slug as string;
  if (!slug) {
    return res.status(400).json({ message: "Slug is required" });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(200).json([]);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json([]);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: designer } = await supabase
      .from("designers")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    const tierLabel = designer.natural_fiber_percent != null
      ? designer.natural_fiber_percent >= 90 ? "Exceptional"
        : designer.natural_fiber_percent >= 70 ? "Excellent"
        : designer.natural_fiber_percent >= 50 ? "Good"
        : "Caution"
      : "Under Review";

    const openai = new OpenAI({ apiKey: openaiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are INTERTEXE, the definitive authority on luxury fashion material quality. Given a fashion brand, suggest 6 similar brands that a fan of this brand would love. Focus on brands with similar aesthetics, price point, and material quality. Only suggest real, well-known fashion brands. Return a JSON object with a "brands" array, where each entry has "name" (exact brand name with correct capitalization) and "reason" (one concise sentence explaining why a fan of the original brand would love this one, focusing on material quality, craftsmanship, or aesthetic).`
        },
        {
          role: "user",
          content: `Brand: ${designer.name}${designer.natural_fiber_percent != null ? `\nNatural Fiber Score: ${designer.natural_fiber_percent}% (${tierLabel} tier)` : ''}${designer.description ? `\nAbout: ${designer.description}` : ''}\n\nSuggest 6 similar luxury fashion brands.`
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
      return res.status(200).json([]);
    }

    const { data: allDesigners } = await supabase
      .from("designers")
      .select("id, name, slug, status, natural_fiber_percent, description, website, created_at");

    const designerList = allDesigners || [];

    const matched = suggestions.map(s => {
      const nameNorm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = designerList.find(d => {
        const dNorm = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return dNorm === nameNorm;
      });
      if (match) {
        return {
          id: match.id,
          name: match.name,
          slug: match.slug,
          status: match.status,
          naturalFiberPercent: match.natural_fiber_percent,
          description: match.description,
          website: match.website,
          reason: s.reason,
        };
      }
      return { name: s.name, slug: null, reason: s.reason, naturalFiberPercent: null };
    }).filter(s => s.name.toLowerCase() !== designer.name.toLowerCase()).slice(0, 6);

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json(matched);
  } catch (err: any) {
    console.error("Similar brands error:", err.message);
    return res.status(200).json([]);
  }
}
