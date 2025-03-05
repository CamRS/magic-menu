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
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  getRestaurants(userId: number): Promise<Restaurant[]>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;

  getMenuItems(restaurantId: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  updateMenuItemsForRestaurants(restaurantIds: number[], updates: Partial<InsertMenuItem>): Promise<void>;
  deleteMenuItem(id: number): Promise<void>;

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
    const result = await db.transaction(async (tx) => {
      const [newUser] = await tx.insert(users).values(user).returning();
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

    const itemToCreate = {
      ...item,
      price: item.price === undefined || item.price === null || item.price === '' ? '' : item.price,
      courseTags: Array.isArray(item.courseTags)
        ? item.courseTags
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
        : []
    };

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
    const existingItem = await this.getMenuItem(id);
    if (!existingItem) {
      throw new Error("Menu item not found");
    }

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
    const menuItem = await this.getMenuItem(id);
    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

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

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    console.log("Updating user:", id, "with data:", {
      ...updates,
      password: updates.password ? '[REDACTED]' : undefined
    });

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    console.log("Updated user:", {
      ...updatedUser,
      password: '[REDACTED]'
    });

    return updatedUser;
  }
}

export const storage = new DatabaseStorage();