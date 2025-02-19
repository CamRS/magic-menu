import { User, InsertUser, MenuItem, InsertMenuItem, Restaurant, InsertRestaurant } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private restaurants: Map<number, Restaurant>;
  private menuItems: Map<number, MenuItem>;
  private currentUserId: number;
  private currentRestaurantId: number;
  private currentMenuItemId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.restaurants = new Map();
    this.menuItems = new Map();
    this.currentUserId = 1;
    this.currentRestaurantId = 1;
    this.currentMenuItemId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    console.log("Getting user by ID:", id);
    const user = this.users.get(id);
    console.log("Found user:", user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log("Getting user by email:", email);
    console.log("Current users in storage:", Array.from(this.users.values()));
    const user = Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
    console.log("Found user:", user);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log("Creating user:", insertUser);
    const id = this.currentUserId++;
    const user = { ...insertUser, id };
    console.log("Setting user in Map with id:", id);
    this.users.set(id, user);
    console.log("Users after creation:", Array.from(this.users.values()));
    return user;
  }

  async getRestaurants(userId: number): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values()).filter(
      (restaurant) => restaurant.userId === userId,
    );
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const id = this.currentRestaurantId++;
    const newRestaurant = { ...restaurant, id };
    this.restaurants.set(id, newRestaurant);
    return newRestaurant;
  }

  async getMenuItems(restaurantId: number): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values()).filter(
      (item) => item.restaurantId === restaurantId,
    );
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const id = this.currentMenuItemId++;
    const menuItem = { ...item, id };
    this.menuItems.set(id, menuItem);
    return menuItem;
  }

  async updateMenuItem(id: number, updates: Partial<InsertMenuItem>): Promise<MenuItem> {
    const existing = await this.getMenuItem(id);
    if (!existing) throw new Error("Menu item not found");

    const updated = { ...existing, ...updates };
    this.menuItems.set(id, updated);
    return updated;
  }

  async updateMenuItemsForRestaurants(restaurantIds: number[], updates: Partial<InsertMenuItem>): Promise<void> {
    for (const restaurantId of restaurantIds) {
      const items = await this.getMenuItems(restaurantId);
      for (const item of items) {
        await this.updateMenuItem(item.id, updates);
      }
    }
  }

  async deleteMenuItem(id: number): Promise<void> {
    this.menuItems.delete(id);
  }
}

export const storage = new MemStorage();