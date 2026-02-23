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
import { eq, and, ilike, asc, sql, desc } from "drizzle-orm";
import { supabase } from "./supabase";

const LOWERCASE_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'de', 'del', 'della', 'delle', 'dei', 'degli', 'di', 'da', 'du', 'des', 'la', 'le', 'les',
  'von', 'van', 'der', 'den', 'het', 'el', 'en', 'et', 'e', 'y', 'und',
]);

const KEEP_UPPER_WORDS = new Set([
  'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII',
  'NYC', 'USA', 'UK', 'EU', 'LA', 'NY', 'DC', 'US', 'CO', 'LTD', 'INC', 'LLC',
  'DJ', 'MC', 'MR', 'DR', 'ST', 'VS', 'X', 'XL', 'XXL', 'XS', 'NB',
]);

const DO_NOT_TOUCH_NAMES = new Set([
  'A_COLD_WALL*', 'A_COLD_WALL', 'GCDS', 'MSGM', 'OAMC', 'DKNY', 'MCM', 'RVCA', 'UGG',
  'COS', 'H&M', 'BOSS', '#RIKYN', 'DIOR', 'FENDI', 'AT.P.CO',
  'adidas', 'agnès b.', 'and wander', 'iets frans...', 'iets frans',
  '1017 ALYX 9SM', '4SDESIGNS', '5TATE OF MIND', '6TH NBRHD',
  'AFRM', 'AGMES', 'AKNVAS', 'AMIRI', 'ACRONYM', 'AMBUSH',
  'VTMNTS', 'SPRWMN', 'ölend', '1XBLUE', '22TOTE',
]);

function titleCaseWord(word: string, isFirst: boolean): string {
  if (word.length === 0) return word;
  const main = word;
  const suffix = '';
  if (/^([A-Za-z]\.){2,}[A-Za-z]?\.?$/.test(main)) return main.toUpperCase() + suffix;
  if (KEEP_UPPER_WORDS.has(main.toUpperCase())) return main.toUpperCase() + suffix;
  if (/^\d/.test(main)) return main + suffix;
  if (!isFirst && LOWERCASE_WORDS.has(main.toLowerCase())) return main.toLowerCase() + suffix;
  if (/^[A-Za-z]+\.[A-Za-z]/i.test(main) && !/^([A-Za-z]\.)+[A-Za-z]?\.?$/.test(main)) {
    return main.split('.').map(p => p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '').join('.') + suffix;
  }
  if (main.includes('-')) {
    return main.split('-').map(p => p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p).join('-') + suffix;
  }
  return main.charAt(0).toUpperCase() + main.slice(1).toLowerCase() + suffix;
}

function cleanBrandSymbols(name: string): string {
  let cleaned = name.replace(/[®™©°]/g, '').replace(/\*+/g, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  if (cleaned.startsWith("'") && cleaned.length <= 3) return cleaned;
  return cleaned;
}

function fixBrandName(name: string): string {
  const cleaned = cleanBrandSymbols(name);
  if (DO_NOT_TOUCH_NAMES.has(cleaned) || DO_NOT_TOUCH_NAMES.has(name)) return cleaned;
  const letters = cleaned.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (letters.length < 3) return cleaned;
  const hasAccents = /[àáâãäåæçèéêëìíîïñòóôõöùúûü]/.test(cleaned);
  const isAllCaps = letters === letters.toUpperCase() && !hasAccents;
  const isAllLower = letters === letters.toLowerCase() && !hasAccents;
  if (!isAllCaps && !isAllLower) return cleaned;
  const parts = cleaned.split(/(\s+)/);
  let wordIndex = 0;
  return parts.map((part) => {
    if (/^\s+$/.test(part)) return part;
    const isFirst = wordIndex === 0;
    wordIndex++;
    if (part === '+' || part === '&' || part === '|') return part;
    if (part.includes('/')) {
      return part.split('/').map((sub, si) => titleCaseWord(sub, isFirst && si === 0)).join('/');
    }
    return titleCaseWord(part, isFirst);
  }).join('');
}

function fixSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[®™*#&'°_]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

const KNOWN_DOMAINS: Record<string, string> = {
  "alexander wang": "alexanderwang.com",
  "ralph lauren": "ralphlauren.com",
  "tommy hilfiger": "tommyhilfiger.com",
  "calvin klein": "calvinklein.com",
  "michael kors": "michaelkors.com",
  "marc jacobs": "marcjacobs.com",
  "kate spade": "katespade.com",
  "tory burch": "toryburch.com",
  "diane von furstenberg": "dvf.com",
  "oscar de la renta": "oscardelarenta.com",
  "carolina herrera": "carolinaherrera.com",
  "helmut lang": "helmutlang.com",
  "rag & bone": "rag-bone.com",
  "acne studios": "acnestudios.com",
  "a.p.c.": "apc.fr",
  "maison margiela": "maisonmargiela.com",
  "rick owens": "rickowens.eu",
  "the row": "therow.com",
  "bottega veneta": "bottegaveneta.com",
  "saint laurent": "ysl.com",
  "louis vuitton": "louisvuitton.com",
  "gucci": "gucci.com",
  "prada": "prada.com",
  "burberry": "burberry.com",
  "givenchy": "givenchy.com",
  "balenciaga": "balenciaga.com",
  "valentino": "valentino.com",
  "fendi": "fendi.com",
  "dior": "dior.com",
  "celine": "celine.com",
  "loewe": "loewe.com",
  "chanel": "chanel.com",
  "hermès": "hermes.com",
  "versace": "versace.com",
  "dolce & gabbana": "dolcegabbana.com",
  "armani": "armani.com",
  "giorgio armani": "armani.com",
  "emporio armani": "armani.com",
  "moncler": "moncler.com",
  "stone island": "stoneisland.com",
  "off-white": "off---white.com",
  "off white": "off---white.com",
  "fear of god": "fearofgod.com",
  "amiri": "amiri.com",
  "tom ford": "tomford.com",
  "stella mccartney": "stellamccartney.com",
  "isabel marant": "isabelmarant.com",
  "nanushka": "nanushka.com",
  "ganni": "ganni.com",
  "cos": "cos.com",
  "arket": "arket.com",
  "& other stories": "stories.com",
  "zara": "zara.com",
  "massimo dutti": "massimodutti.com",
  "uniqlo": "uniqlo.com",
  "j.crew": "jcrew.com",
  "theory": "theory.com",
  "vince": "vince.com",
  "frame": "frame-store.com",
  "brunello cucinelli": "brunellocucinelli.com",
  "loro piana": "loropiana.com",
  "zegna": "zegna.com",
  "tod's": "tods.com",
  "salvatore ferragamo": "ferragamo.com",
  "jimmy choo": "jimmychoo.com",
  "christian louboutin": "christianlouboutin.com",
  "nike": "nike.com",
  "adidas": "adidas.com",
  "new balance": "newbalance.com",
  "converse": "converse.com",
  "vans": "vans.com",
  "birkenstock": "birkenstock.com",
  "ugg": "ugg.com",
  "the north face": "thenorthface.com",
  "patagonia": "patagonia.com",
  "canada goose": "canadagoose.com",
  "barbour": "barbour.com",
  "allsaints": "allsaints.com",
  "paul smith": "paulsmith.com",
  "vivienne westwood": "viviennewestwood.com",
  "alexander mcqueen": "alexandermcqueen.com",
  "etro": "etro.com",
  "missoni": "missoni.com",
  "max mara": "maxmara.com",
  "jil sander": "jilsander.com",
  "marni": "marni.com",
  "sacai": "sacai.jp",
  "issey miyake": "isseymiyake.com",
  "kenzo": "kenzo.com",
  "ami paris": "amiparis.com",
  "jacquemus": "jacquemus.com",
  "lemaire": "lemaire.fr",
  "our legacy": "ourlegacy.com",
  "stussy": "stussy.com",
  "carhartt wip": "carhartt-wip.com",
  "reformation": "thereformation.com",
  "anine bing": "aninebing.com",
  "agolde": "agolde.com",
  "khaite": "khaite.com",
  "proenza schouler": "proenzaschouler.com",
  "coach": "coach.com",
  "longchamp": "longchamp.com",
  "mulberry": "mulberry.com",
  "mcm": "mcmworldwide.com",
  "hugo boss": "hugoboss.com",
  "boss": "hugoboss.com",
  "diesel": "diesel.com",
  "dsquared2": "dsquared2.com",
  "moschino": "moschino.com",
  "balmain": "balmain.com",
  "lanvin": "lanvin.com",
  "mugler": "mugler.com",
  "rabanne": "rabanne.com",
  "chloé": "chloe.com",
  "sandro": "sandro-paris.com",
  "maje": "maje.com",
  "zadig & voltaire": "zadig-et-voltaire.com",
  "ba&sh": "ba-sh.com",
  "h&m": "hm.com",
  "a_cold_wall*": "a-cold-wall.com",
  "gcds": "gcds.com",
  "msgm": "msgm.it",
  "oamc": "oamc.com",
  "dkny": "dkny.com",
  "3.1 phillip lim": "31philliplim.com",
  "thom browne": "thombrowne.com",
  "a bathing ape": "bape.com",
  "supreme": "supremenewyork.com",
  "golden goose": "goldengoose.com",
  "common projects": "commonprojects.com",
  "everlane": "everlane.com",
  "aritzia": "aritzia.com",
  "free people": "freepeople.com",
  "madewell": "madewell.com",
  "gap": "gap.com",
  "brooks brothers": "brooksbrothers.com",
  "lululemon": "lululemon.com",
  "alo yoga": "aloyoga.com",
  "hoka": "hoka.com",
  "puma": "puma.com",
  "zimmermann": "zimmermann.com",
  "eileen fisher": "eileenfisher.com",
  "citizens of humanity": "citizensofhumanity.com",
  "mother": "motherdenim.com",
  "paige": "paige.com",
  "7 for all mankind": "7forallmankind.com",
  "veja": "veja-store.com",
  "on running": "on-running.com",
  "salomon": "salomon.com",
  "asics": "asics.com",
  "columbia": "columbia.com",
  "timberland": "timberland.com",
  "fjallraven": "fjallraven.com",
  "woolrich": "woolrich.com",
};

function guessBrandWebsite(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (KNOWN_DOMAINS[lower]) return `https://${KNOWN_DOMAINS[lower]}`;
  const cleaned = lower
    .replace(/[®™*#°]/g, '')
    .replace(/\s+/g, '')
    .replace(/[&+]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9.-]/g, '');
  if (cleaned.length < 2) return null;
  return `https://${cleaned}.com`;
}

function mapSupabaseDesigner(row: any): Designer {
  const fixedName = fixBrandName(row.name);
  const website = row.website || guessBrandWebsite(fixedName);
  return {
    id: row.id,
    name: fixedName,
    slug: fixedName !== row.name ? fixSlug(fixedName) : row.slug,
    status: row.status || "Pending",
    naturalFiberPercent: row.natural_fiber_percent ?? null,
    description: row.description ?? null,
    website,
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
