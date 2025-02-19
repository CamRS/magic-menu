import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { storage } from "./storage";
import { insertMenuItemSchema, insertRestaurantSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Restaurant routes
  app.get("/api/restaurants", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const restaurants = await storage.getRestaurants(req.user.id);
    res.json(restaurants);
  });

  app.post("/api/restaurants", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const parsed = insertRestaurantSchema.safeParse({
      ...req.body,
      userId: req.user.id,
    });

    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const restaurant = await storage.createRestaurant(parsed.data);
    res.status(201).json(restaurant);
  });

  // Menu item routes
  app.get("/api/menu-items", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const restaurantId = parseInt(req.query.restaurantId as string);
    const items = await storage.getMenuItems(restaurantId);
    res.json(items);
  });

  app.post("/api/menu-items", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const parsed = insertMenuItemSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    // Verify restaurant belongs to user
    const restaurant = await storage.getRestaurant(parsed.data.restaurantId);
    if (!restaurant || restaurant.userId !== req.user.id) {
      return res.sendStatus(403);
    }

    const item = await storage.createMenuItem(parsed.data);
    res.status(201).json(item);
  });

  app.patch("/api/menu-items/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const item = await storage.getMenuItem(parseInt(req.params.id));
    if (!item) return res.status(404).send("Menu item not found");

    const restaurant = await storage.getRestaurant(item.restaurantId);
    if (!restaurant || restaurant.userId !== req.user.id) {
      return res.sendStatus(403);
    }

    const updated = await storage.updateMenuItem(item.id, req.body);
    res.json(updated);
  });

  app.patch("/api/menu-items/bulk-update", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { restaurantIds, updates } = req.body;

    // Verify all restaurants belong to user
    for (const id of restaurantIds) {
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant || restaurant.userId !== req.user.id) {
        return res.sendStatus(403);
      }
    }

    await storage.updateMenuItemsForRestaurants(restaurantIds, updates);
    res.sendStatus(200);
  });

  app.delete("/api/menu-items/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const item = await storage.getMenuItem(parseInt(req.params.id));
    if (!item) return res.status(404).send("Menu item not found");

    const restaurant = await storage.getRestaurant(item.restaurantId);
    if (!restaurant || restaurant.userId !== req.user.id) {
      return res.sendStatus(403);
    }

    await storage.deleteMenuItem(item.id);
    res.sendStatus(204);
  });

  const httpServer = createServer(app);
  return httpServer;
}