import {
  type User,
  type InsertUser,
  type Designer,
  type InsertDesigner,
  type Favorite,
  type InsertFavorite,
  type QuizResult,
  type InsertQuizResult,
  users,
  designers,
  favorites,
  quizResults,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, asc } from "drizzle-orm";
import { supabase } from "./supabase";

function mapSupabaseDesigner(row: any): Designer {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status || "Pending",
    naturalFiberPercent: row.natural_fiber_percent ?? null,
    description: row.description ?? null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function syncToSupabase(table: string, operation: "insert" | "upsert" | "delete", data: any, match?: any) {
  if (!supabase) return;
  (async () => {
    try {
      if (operation === "insert") {
        const { error } = await supabase.from(table).insert(data);
        if (error) throw error;
      } else if (operation === "upsert") {
        const { error } = await supabase.from(table).upsert(data);
        if (error) throw error;
      } else if (operation === "delete") {
        let query = supabase.from(table).delete();
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value as string);
        }
        const { error } = await query;
        if (error) throw error;
      }
      console.log(`Supabase sync: ${operation} on ${table} OK`);
    } catch (err: any) {
      console.error(`Supabase sync failed: ${operation} on ${table} -`, err.message);
    }
  })();
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getDesigners(limit?: number): Promise<Designer[]>;
  getDesignerBySlug(slug: string): Promise<Designer | undefined>;
  searchDesigners(query: string): Promise<Designer[]>;
  createDesigner(designer: InsertDesigner): Promise<Designer>;

  getFavoritesByUser(userId: string): Promise<(Favorite & { designer: Designer })[]>;
  addFavorite(fav: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, designerId: string): Promise<void>;
  isFavorited(userId: string, designerId: string): Promise<boolean>;

  saveQuizResult(result: InsertQuizResult): Promise<QuizResult>;
  getQuizResultsByUser(userId: string): Promise<QuizResult[]>;
  updateUserPersona(userId: string, persona: string): Promise<void>;
}

let designerCache: { data: Designer[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    syncToSupabase("users", "insert", {
      id: user.id,
      email: user.email,
      name: user.name,
      password: "synced-from-replit",
      username: user.username,
      subscription_tier: user.subscriptionTier || "free",
      fabric_persona: user.fabricPersona || null,
    });
    return user;
  }

  async getDesigners(limit?: number): Promise<Designer[]> {
    if (supabase) {
      try {
        if (limit) {
          const { data, error } = await supabase
            .from("designers")
            .select("*")
            .order("name", { ascending: true })
            .limit(limit);
          if (error) throw error;
          return (data || []).map(mapSupabaseDesigner);
        }

        if (designerCache && Date.now() - designerCache.timestamp < CACHE_TTL) {
          return designerCache.data;
        }

        const allDesigners: Designer[] = [];
        const PAGE_SIZE = 1000;
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("designers")
            .select("*")
            .order("name", { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          allDesigners.push(...data.map(mapSupabaseDesigner));
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        console.log(`Fetched ${allDesigners.length} designers from Supabase`);
        designerCache = { data: allDesigners, timestamp: Date.now() };
        return allDesigners;
      } catch (err: any) {
        console.error("Supabase getDesigners failed, falling back to local DB:", err.message);
      }
    }
    return db.select().from(designers).orderBy(asc(designers.name));
  }

  async getDesignerBySlug(slug: string): Promise<Designer | undefined> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("designers").select("*").eq("slug", slug).limit(1).single();
        if (error) throw error;
        if (data) return mapSupabaseDesigner(data);
      } catch (err: any) {
        console.error("Supabase getDesignerBySlug failed, falling back to local DB:", err.message);
      }
    }
    const [designer] = await db.select().from(designers).where(eq(designers.slug, slug));
    return designer;
  }

  async searchDesigners(query: string): Promise<Designer[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("designers")
          .select("*")
          .ilike("name", `%${query}%`)
          .order("name", { ascending: true })
          .limit(50);
        if (error) throw error;
        return (data || []).map(mapSupabaseDesigner);
      } catch (err: any) {
        console.error("Supabase searchDesigners failed, falling back to local DB:", err.message);
      }
    }
    return db.select().from(designers).where(ilike(designers.name, `%${query}%`)).orderBy(asc(designers.name));
  }

  async createDesigner(designer: InsertDesigner): Promise<Designer> {
    const [created] = await db.insert(designers).values(designer).returning();
    return created;
  }

  async getFavoritesByUser(userId: string): Promise<(Favorite & { designer: Designer })[]> {
    const favRows = await db.select().from(favorites).where(eq(favorites.userId, userId));
    if (favRows.length === 0) return [];

    if (supabase) {
      try {
        const designerIds = favRows.map(f => f.designerId);
        const { data: designerData, error } = await supabase
          .from("designers")
          .select("*")
          .in("id", designerIds);

        if (error) throw error;

        const designerMap = new Map<string, Designer>();
        (designerData || []).forEach(d => designerMap.set(d.id, mapSupabaseDesigner(d)));

        return favRows
          .filter(f => designerMap.has(f.designerId))
          .map(f => ({ ...f, designer: designerMap.get(f.designerId)! }));
      } catch (err: any) {
        console.error("Supabase getFavoritesByUser failed, falling back to local DB:", err.message);
      }
    }

    const rows = await db
      .select()
      .from(favorites)
      .innerJoin(designers, eq(favorites.designerId, designers.id))
      .where(eq(favorites.userId, userId));

    return rows.map((row) => ({
      ...row.favorites,
      designer: row.designers,
    }));
  }

  async addFavorite(fav: InsertFavorite): Promise<Favorite> {
    const [created] = await db.insert(favorites).values(fav).returning();
    syncToSupabase("favorites", "insert", {
      id: created.id,
      user_id: created.userId,
      designer_id: created.designerId,
    });
    return created;
  }

  async removeFavorite(userId: string, designerId: string): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.designerId, designerId)));
    syncToSupabase("favorites", "delete", null, {
      user_id: userId,
      designer_id: designerId,
    });
  }

  async isFavorited(userId: string, designerId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.designerId, designerId)));
    return !!row;
  }

  async saveQuizResult(result: InsertQuizResult): Promise<QuizResult> {
    const [created] = await db.insert(quizResults).values(result).returning();
    syncToSupabase("quiz_results", "insert", {
      id: created.id,
      user_id: created.userId || null,
      materials: created.materials,
      price_range: created.priceRange,
      synthetic_tolerance: created.syntheticTolerance,
      favorite_brands: created.favoriteBrands || [],
      profile_type: created.profileType || null,
      recommendation: created.recommendation || null,
    });
    return created;
  }

  async getQuizResultsByUser(userId: string): Promise<QuizResult[]> {
    return db.select().from(quizResults).where(eq(quizResults.userId, userId));
  }

  async updateUserPersona(userId: string, persona: string): Promise<void> {
    await db.update(users).set({ fabricPersona: persona }).where(eq(users.id, userId));
    if (supabase) {
      supabase.from("users").update({ fabric_persona: persona }).eq("id", userId)
        .then(({ error }) => {
          if (error) console.error("Supabase persona sync failed:", error.message);
          else console.log("Supabase sync: update persona OK");
        });
    }
  }
}

export const storage = new DatabaseStorage();
