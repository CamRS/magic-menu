import { User, InsertUser, MenuItem, InsertMenuItem, Restaurant, InsertRestaurant, Image, InsertImage, ConsumerMenuItem, InsertConsumerMenuItem, consumerMenuItems } from "@shared/schema";
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

  getMenuItems(restaurantId: number, status?: string): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  updateMenuItemsForRestaurants(restaurantIds: number[], updates: Partial<InsertMenuItem>): Promise<void>;
  deleteMenuItem(id: number): Promise<void>;

  getImage(id: number): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  deleteImage(id: number): Promise<void>;

  // New methods for consumer menu items
  getConsumerMenuItems(userId: number): Promise<ConsumerMenuItem[]>;
  getConsumerMenuItem(id: number): Promise<ConsumerMenuItem | undefined>;
  createConsumerMenuItem(item: InsertConsumerMenuItem): Promise<ConsumerMenuItem>;
  updateConsumerMenuItem(id: number, item: Partial<InsertConsumerMenuItem>): Promise<ConsumerMenuItem>;
  deleteConsumerMenuItem(id: number): Promise<void>;

  getMenuItemsByStatus(restaurantId: number, status: string): Promise<MenuItem[]>;
  updateMenuItemStatus(id: number, status: string): Promise<MenuItem>;
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

  async getMenuItems(restaurantId: number, status?: string): Promise<MenuItem[]> {
    console.log("Getting menu items for restaurant:", restaurantId, status ? `with status: ${status}` : '');
    const restaurant = await this.getRestaurant(restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Create base query
    let query = db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId));

    // Add status filter if provided
    if (status) {
      query = query.where(and(
        eq(menuItems.restaurantId, restaurantId),
        eq(menuItems.status, status)
      ));
    }

    const items = await query;
    console.log(`Found ${items.length} menu items for restaurant ${restaurantId}`, 
      items.length ? items : "No items found");
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

    const restaurant = await this.getRestaurant(item.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const itemToCreate = {
      ...item,
      price: item.price === undefined || item.price === null || item.price === '' ? '' : item.price,
      courseTags: Array.isArray(item.courseTags)
        ? item.courseTags
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
        : []
    };

    const [menuItem] = await db
      .insert(menuItems)
      .values(itemToCreate)
      .returning();

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

  // New consumer menu items methods
  async getConsumerMenuItems(userId: number): Promise<ConsumerMenuItem[]> {
    console.log("Getting consumer menu items for user:", userId);
    const items = await db
      .select()
      .from(consumerMenuItems)
      .where(eq(consumerMenuItems.userId, userId));
    console.log("Found consumer menu items:", items);
    return items;
  }

  async getConsumerMenuItem(id: number): Promise<ConsumerMenuItem | undefined> {
    console.log("Getting consumer menu item:", id);
    const [item] = await db
      .select()
      .from(consumerMenuItems)
      .where(eq(consumerMenuItems.id, id));
    console.log("Found consumer menu item:", item);
    return item;
  }

  async createConsumerMenuItem(item: InsertConsumerMenuItem): Promise<ConsumerMenuItem> {
    console.log("Creating consumer menu item with data:", {
      ...item,
      image: item.image ? '[IMAGE DATA]' : undefined
    });

    const [menuItem] = await db
      .insert(consumerMenuItems)
      .values(item)
      .returning();

    console.log("Created consumer menu item:", menuItem);
    return menuItem;
  }

  async updateConsumerMenuItem(
    id: number,
    updates: Partial<InsertConsumerMenuItem>,
  ): Promise<ConsumerMenuItem> {
    console.log("Updating consumer menu item:", id);
    const [updated] = await db
      .update(consumerMenuItems)
      .set(updates)
      .where(eq(consumerMenuItems.id, id))
      .returning();
    console.log("Updated consumer menu item:", updated);
    return updated;
  }

  async deleteConsumerMenuItem(id: number): Promise<void> {
    console.log("Deleting consumer menu item:", id);
    await db
      .delete(consumerMenuItems)
      .where(eq(consumerMenuItems.id, id));
    console.log("Deleted consumer menu item:", id);
  }

  async getMenuItemsByStatus(restaurantId: number, status: string): Promise<MenuItem[]> {
    console.log(`Getting ${status} menu items for restaurant:`, restaurantId);
    const restaurant = await this.getRestaurant(restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const items = await db
      .select()
      .from(menuItems)
      .where(and(
        eq(menuItems.restaurantId, restaurantId),
        eq(menuItems.status, status)
      ));
    console.log(`Found ${status} menu items:`, items);
    return items;
  }

  async updateMenuItemStatus(id: number, status: string): Promise<MenuItem> {
    console.log("Updating menu item status:", id, status);
    const menuItem = await this.getMenuItem(id);
    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    const [updated] = await db
      .update(menuItems)
      .set({ status })
      .where(eq(menuItems.id, id))
      .returning();
    console.log("Updated menu item:", updated);
    return updated;
  }
}

export const storage = new DatabaseStorage();