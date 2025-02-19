import { User, InsertUser, MenuItem, InsertMenuItem, Restaurant, InsertRestaurant } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, restaurants, menuItems } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getRestaurants(userId: number): Promise<Restaurant[]>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;

  getMenuItems(restaurantId: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  updateMenuItemsForRestaurants(restaurantIds: number[], updates: Partial<InsertMenuItem>): Promise<void>;
  deleteMenuItem(id: number): Promise<void>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    console.log("Getting user by ID:", id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    console.log("Found user:", user ? { ...user, password: '[REDACTED]' } : 'null');
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log("Getting user by email:", email);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    console.log("Found user:", user ? { ...user, password: '[REDACTED]' } : 'null');
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log("Creating user with data:", { ...insertUser, password: '[REDACTED]' });
    const [user] = await db.insert(users).values(insertUser).returning();
    console.log("Created user:", { ...user, password: '[REDACTED]' });
    return user;
  }

  async getRestaurants(userId: number): Promise<Restaurant[]> {
    return await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.userId, userId));
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id));
    return restaurant;
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [newRestaurant] = await db
      .insert(restaurants)
      .values(restaurant)
      .returning();
    return newRestaurant;
  }

  async getMenuItems(restaurantId: number): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId));
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [menuItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id));
    return menuItem;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [menuItem] = await db.insert(menuItems).values(item).returning();
    return menuItem;
  }

  async updateMenuItem(
    id: number,
    updates: Partial<InsertMenuItem>,
  ): Promise<MenuItem> {
    const [updated] = await db
      .update(menuItems)
      .set(updates)
      .where(eq(menuItems.id, id))
      .returning();
    return updated;
  }

  async updateMenuItemsForRestaurants(
    restaurantIds: number[],
    updates: Partial<InsertMenuItem>,
  ): Promise<void> {
    for (const restaurantId of restaurantIds) {
      await db
        .update(menuItems)
        .set(updates)
        .where(eq(menuItems.restaurantId, restaurantId));
    }
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }
}

export const storage = new DatabaseStorage();