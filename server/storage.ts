import { User, InsertUser, MenuItem, InsertMenuItem, Restaurant, InsertRestaurant, Image, InsertImage } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { users, restaurants, menuItems, images } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createUserWithRestaurant(user: InsertUser, restaurantName: string): Promise<{ user: User; restaurant: Restaurant }>;

  getRestaurants(userId: number): Promise<Restaurant[]>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;

  getMenuItems(restaurantId: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  updateMenuItemsForRestaurants(restaurantIds: number[], updates: Partial<InsertMenuItem>): Promise<void>;
  deleteMenuItem(id: number): Promise<void>;

  // New image-related methods
  getImage(id: number): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  deleteImage(id: number): Promise<void>;

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

  async createUserWithRestaurant(user: InsertUser, restaurantName: string): Promise<{ user: User; restaurant: Restaurant }> {
    // Start a transaction to ensure both user and restaurant are created or neither is
    const result = await db.transaction(async (tx) => {
      // Create the user first
      const [newUser] = await tx.insert(users).values(user).returning();

      // Create the restaurant for the new user
      const [newRestaurant] = await tx.insert(restaurants).values({
        name: restaurantName,
        userId: newUser.id,
      }).returning();

      return { user: newUser, restaurant: newRestaurant };
    });

    console.log("Created user and restaurant:", {
      user: { ...result.user, password: '[REDACTED]' },
      restaurant: result.restaurant
    });

    return result;
  }

  async getRestaurants(userId: number): Promise<Restaurant[]> {
    console.log("Getting restaurants for user:", userId);
    const userRestaurants = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.userId, userId));
    console.log("Found restaurants:", userRestaurants);
    return userRestaurants;
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    console.log("Getting restaurant:", id);
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id));
    console.log("Found restaurant:", restaurant);
    return restaurant;
  }

  async verifyRestaurantOwnership(restaurantId: number, userId: number): Promise<boolean> {
    const restaurant = await this.getRestaurant(restaurantId);
    return restaurant?.userId === userId;
  }

  async getMenuItems(restaurantId: number): Promise<MenuItem[]> {
    console.log("Getting menu items for restaurant:", restaurantId);
    // Get the restaurant first to verify it exists
    const restaurant = await this.getRestaurant(restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId));
    console.log("Found menu items:", items);
    return items;
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [menuItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id));
    return menuItem;
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    console.log("Creating restaurant:", restaurant);
    const [newRestaurant] = await db
      .insert(restaurants)
      .values(restaurant)
      .returning();
    console.log("Created restaurant:", newRestaurant);
    return newRestaurant;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    console.log("Creating menu item with data:", {
      ...item,
      price: item.price === undefined || item.price === null ? 'undefined/null' : `'${item.price}'`
    });

    // Ensure price is empty string if undefined/null/empty
    const itemToCreate = {
      ...item,
      price: item.price === undefined || item.price === null || item.price === '' ? '' : item.price,
      // Ensure courseTags is properly handled as a string array
      courseTags: Array.isArray(item.courseTags)
        ? item.courseTags
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
        : []
    };

    // Verify restaurant ownership before creating menu item
    const restaurant = await this.getRestaurant(itemToCreate.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const [menuItem] = await db.insert(menuItems).values(itemToCreate).returning();
    console.log("Created menu item in database:", menuItem);

    return menuItem;
  }

  async updateMenuItem(
    id: number,
    updates: Partial<InsertMenuItem>,
  ): Promise<MenuItem> {
    // Verify menu item exists and belongs to the restaurant
    const existingItem = await this.getMenuItem(id);
    if (!existingItem) {
      throw new Error("Menu item not found");
    }

    // Process course tags if they are being updated
    const processedUpdates = {
      ...updates,
      courseTags: Array.isArray(updates.courseTags)
        ? updates.courseTags
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
        : existingItem.courseTags
    };

    const [updated] = await db
      .update(menuItems)
      .set(processedUpdates)
      .where(eq(menuItems.id, id))
      .returning();
    return updated;
  }

  async updateMenuItemsForRestaurants(
    restaurantIds: number[],
    updates: Partial<InsertMenuItem>,
  ): Promise<void> {
    for (const restaurantId of restaurantIds) {
      // Verify restaurant exists before updating its menu items
      const restaurant = await this.getRestaurant(restaurantId);
      if (!restaurant) {
        throw new Error(`Restaurant ${restaurantId} not found`);
      }

      await db
        .update(menuItems)
        .set(updates)
        .where(eq(menuItems.restaurantId, restaurantId));
    }
  }

  async deleteMenuItem(id: number): Promise<void> {
    // Verify menu item exists before deletion
    const menuItem = await this.getMenuItem(id);
    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // New image-related method implementations
  async getImage(id: number): Promise<Image | undefined> {
    console.log("Getting image by ID:", id);
    const [image] = await db
      .select()
      .from(images)
      .where(eq(images.id, id));
    console.log("Found image:", image ? { ...image, data: '[BASE64]' } : 'null');
    return image;
  }

  async createImage(image: InsertImage): Promise<Image> {
    console.log("Creating image with data:", { ...image, data: '[BASE64]' });
    const [newImage] = await db
      .insert(images)
      .values(image)
      .returning();
    console.log("Created image:", { ...newImage, data: '[BASE64]' });
    return newImage;
  }

  async deleteImage(id: number): Promise<void> {
    console.log("Deleting image:", id);
    await db
      .delete(images)
      .where(eq(images.id, id));
    console.log("Deleted image:", id);
  }
}

export const storage = new DatabaseStorage();