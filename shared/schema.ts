import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(),
  image: text("image").notNull(),
  category: text("category").notNull(),
  allergens: jsonb("allergens").$type<{
    milk: boolean;
    eggs: boolean;
    peanuts: boolean;
    nuts: boolean;
    shellfish: boolean;
    fish: boolean;
    soy: boolean;
    gluten: boolean;
  }>().notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertRestaurantSchema = createInsertSchema(restaurants);

// Extend the menu item schema with additional validation
export const insertMenuItemSchema = createInsertSchema(menuItems).extend({
  price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  image: z.string().min(1, "Image is required"),
  allergens: z.object({
    milk: z.boolean(),
    eggs: z.boolean(),
    peanuts: z.boolean(),
    nuts: z.boolean(),
    shellfish: z.boolean(),
    fish: z.boolean(),
    soy: z.boolean(),
    gluten: z.boolean(),
  }),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;