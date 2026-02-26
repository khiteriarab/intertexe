import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  fabricPersona: text("fabric_persona"),
});

export const designers = pgTable("designers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("live"),
  naturalFiberPercent: integer("natural_fiber_percent"),
  description: text("description"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  designerId: uuid("designer_id").notNull().references(() => designers.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizResults = pgTable("quiz_results", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  materials: text("materials").array().notNull(),
  priceRange: text("price_range").notNull(),
  syntheticTolerance: text("synthetic_tolerance").notNull(),
  favoriteBrands: text("favorite_brands").array().notNull(),
  profileType: text("profile_type"),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brandSlug: text("brand_slug").notNull(),
  brandName: text("brand_name").notNull(),
  name: text("name").notNull(),
  productId: text("product_id").notNull().unique(),
  url: text("url").notNull(),
  imageUrl: text("image_url"),
  price: text("price"),
  composition: text("composition"),
  naturalFiberPercent: integer("natural_fiber_percent"),
  category: text("category").notNull().default("dresses"),
  approved: text("approved").notNull().default("yes"),
  matchingSetId: text("matching_set_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productFavorites = pgTable("product_favorites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  productId: text("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  event: text("event").notNull(),
  userId: uuid("user_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  name: true,
});

export const insertDesignerSchema = createInsertSchema(designers).omit({
  id: true,
  createdAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertQuizResultSchema = createInsertSchema(quizResults).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertProductFavoriteSchema = createInsertSchema(productFavorites).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Designer = typeof designers.$inferSelect;
export type InsertDesigner = z.infer<typeof insertDesignerSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type QuizResult = typeof quizResults.$inferSelect;
export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductFavorite = typeof productFavorites.$inferSelect;
export type InsertProductFavorite = z.infer<typeof insertProductFavoriteSchema>;
export * from "./models/chat";
