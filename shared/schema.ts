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
  image: text("image").default(''),
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
});

export const insertUserSchema = createInsertSchema(users);
export const insertRestaurantSchema = createInsertSchema(restaurants);

export const insertMenuItemSchema = createInsertSchema(menuItems).extend({
  price: z.string().min(1, "Price is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().optional().default(''),
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