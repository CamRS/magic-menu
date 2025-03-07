import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  userType: text("user_type").notNull().default("consumer"),
  preferredLanguage: text("preferred_language").default("en"),
  savedAllergies: jsonb("saved_allergies").$type<string[]>().default([]),
});

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
});

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  data: text("data").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  name: text("name").notNull(),
  name_original: text("name_original").default(""),
  description: text("description").notNull(),
  price: text("price").default(""),
  image: text("image").default(''),
  imageId: integer("image_id").references(() => images.id),
  courseTags: text("course_type").array().default([]).notNull(),
  course_original: text("course_original").default(""),
  displayOrder: integer("display_order").default(0),
  status: text("status").notNull().default("draft"),
  allergens: jsonb("allergens").$type<{
    milk: boolean;
    eggs: boolean;
    peanuts: boolean;
    nuts: boolean;
    shellfish: boolean;
    fish: boolean;
    soy: boolean;
    gluten: boolean;
  }>().notNull().default({
    milk: false,
    eggs: false,
    peanuts: false,
    nuts: false,
    shellfish: false,
    fish: false,
    soy: false,
    gluten: false,
  }),
  dietary_preferences: jsonb("dietary_preferences").$type<{
    vegan: boolean;
    vegetarian: boolean;
    kosher: boolean;
    halal: boolean;
  }>().notNull().default({
    vegan: false,
    vegetarian: false,
    kosher: false,
    halal: false,
  }),
});

// New table for consumer-uploaded menus
export const consumerMenuItems = pgTable("consumer_menu_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  name_original: text("name_original").default(""),
  description: text("description").notNull(),
  price: text("price").default(""),
  image: text("image").default(''),
  imageId: integer("image_id").references(() => images.id),
  courseTags: text("course_type").array().default([]).notNull(),
  course_original: text("course_original").default(""),
  displayOrder: integer("display_order").default(0),
  status: text("status").notNull().default("draft"),
  allergens: jsonb("allergens").$type<{
    milk: boolean;
    eggs: boolean;
    peanuts: boolean;
    nuts: boolean;
    shellfish: boolean;
    fish: boolean;
    soy: boolean;
    gluten: boolean;
  }>().notNull().default({
    milk: false,
    eggs: false,
    peanuts: false,
    nuts: false,
    shellfish: false,
    fish: false,
    soy: false,
    gluten: false,
  }),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  source: text("source").notNull().default("upload"),
});

export const insertUserSchema = createInsertSchema(users).extend({
  userType: z.enum(["consumer", "restaurant"]).default("consumer"),
  preferredLanguage: z.string().default("en"),
  savedAllergies: z.array(z.string()).default([]),
});
export const insertRestaurantSchema = createInsertSchema(restaurants);
export const insertImageSchema = createInsertSchema(images);

export const insertMenuItemSchema = createInsertSchema(menuItems).extend({
  price: z.string().optional().default(""),
  description: z.string().min(1, "Description is required"),
  image: z.string().optional().default(''),
  imageId: z.number().optional(),
  name_original: z.string().optional().default(""),
  course_original: z.string().optional().default(""),
  courseTags: z.array(z.string()).default([]),
  displayOrder: z.number().optional().default(0),
  status: z.enum(["draft", "live"]).default("draft"),
  allergens: z.object({
    milk: z.boolean().default(false),
    eggs: z.boolean().default(false),
    peanuts: z.boolean().default(false),
    nuts: z.boolean().default(false),
    shellfish: z.boolean().default(false),
    fish: z.boolean().default(false),
    soy: z.boolean().default(false),
    gluten: z.boolean().default(false),
  }).default({
    milk: false,
    eggs: false,
    peanuts: false,
    nuts: false,
    shellfish: false,
    fish: false,
    soy: false,
    gluten: false,
  }),
  dietary_preferences: z.object({
    vegan: z.boolean().default(false),
    vegetarian: z.boolean().default(false),
    kosher: z.boolean().default(false),
    halal: z.boolean().default(false),
  }).default({
    vegan: false,
    vegetarian: false,
    kosher: false,
    halal: false,
  }),
});

export const insertConsumerMenuItemSchema = createInsertSchema(consumerMenuItems).extend({
  price: z.string().optional().default(""),
  description: z.string().min(1, "Description is required"),
  image: z.string().optional().default(''),
  imageId: z.number().optional(),
  name_original: z.string().optional().default(""),
  course_original: z.string().optional().default(""),
  courseTags: z.array(z.string()).default([]),
  displayOrder: z.number().optional().default(0),
  status: z.enum(["draft", "live"]).default("draft"),
  source: z.string().default("upload"),
  allergens: z.object({
    milk: z.boolean().default(false),
    eggs: z.boolean().default(false),
    peanuts: z.boolean().default(false),
    nuts: z.boolean().default(false),
    shellfish: z.boolean().default(false),
    fish: z.boolean().default(false),
    soy: z.boolean().default(false),
    gluten: z.boolean().default(false),
  }).default({
    milk: false,
    eggs: false,
    peanuts: false,
    nuts: false,
    shellfish: false,
    fish: false,
    soy: false,
    gluten: false,
  }),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Image = typeof images.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type ConsumerMenuItem = typeof consumerMenuItems.$inferSelect;
export type InsertConsumerMenuItem = z.infer<typeof insertConsumerMenuItemSchema>;