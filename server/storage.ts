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

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Designers
  getDesigners(): Promise<Designer[]>;
  getDesignerBySlug(slug: string): Promise<Designer | undefined>;
  searchDesigners(query: string): Promise<Designer[]>;
  createDesigner(designer: InsertDesigner): Promise<Designer>;

  // Favorites
  getFavoritesByUser(userId: string): Promise<(Favorite & { designer: Designer })[]>;
  addFavorite(fav: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, designerId: string): Promise<void>;
  isFavorited(userId: string, designerId: string): Promise<boolean>;

  // Quiz
  saveQuizResult(result: InsertQuizResult): Promise<QuizResult>;
  getQuizResultsByUser(userId: string): Promise<QuizResult[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
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
    return user;
  }

  // Designers
  async getDesigners(): Promise<Designer[]> {
    return db.select().from(designers).orderBy(asc(designers.name));
  }

  async getDesignerBySlug(slug: string): Promise<Designer | undefined> {
    const [designer] = await db.select().from(designers).where(eq(designers.slug, slug));
    return designer;
  }

  async searchDesigners(query: string): Promise<Designer[]> {
    return db.select().from(designers).where(ilike(designers.name, `%${query}%`)).orderBy(asc(designers.name));
  }

  async createDesigner(designer: InsertDesigner): Promise<Designer> {
    const [created] = await db.insert(designers).values(designer).returning();
    return created;
  }

  // Favorites
  async getFavoritesByUser(userId: string): Promise<(Favorite & { designer: Designer })[]> {
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
    return created;
  }

  async removeFavorite(userId: string, designerId: string): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.designerId, designerId)));
  }

  async isFavorited(userId: string, designerId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.designerId, designerId)));
    return !!row;
  }

  // Quiz
  async saveQuizResult(result: InsertQuizResult): Promise<QuizResult> {
    const [created] = await db.insert(quizResults).values(result).returning();
    return created;
  }

  async getQuizResultsByUser(userId: string): Promise<QuizResult[]> {
    return db.select().from(quizResults).where(eq(quizResults.userId, userId));
  }
}

export const storage = new DatabaseStorage();
