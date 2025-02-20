import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { storage } from "./storage";
import { insertMenuItemSchema, insertRestaurantSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Public routes (no authentication required)
  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }

      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      res.json(restaurant);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/menu-items", async (req, res) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }

      const items = await storage.getMenuItems(restaurantId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Protected routes (authentication required)
  app.get("/api/restaurants", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);
      const restaurants = await storage.getRestaurants(req.user.id);
      res.json(restaurants);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/restaurants", async (req, res) => {
    try {
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
    } catch (error) {
      console.error('Error creating restaurant:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/menu-items", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const parsed = insertMenuItemSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid menu item data",
          errors: parsed.error.errors 
        });
      }

      // Verify restaurant belongs to user
      const restaurant = await storage.getRestaurant(parsed.data.restaurantId);
      if (!restaurant || restaurant.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized access to restaurant" });
      }

      const item = await storage.createMenuItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating menu item:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/menu-items/:id", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid menu item ID" });
      }

      const item = await storage.getMenuItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      const restaurant = await storage.getRestaurant(item.restaurantId);
      if (!restaurant || restaurant.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized access to menu item" });
      }

      const updated = await storage.updateMenuItem(item.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating menu item:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/menu-items/:id", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid menu item ID" });
      }

      const item = await storage.getMenuItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      const restaurant = await storage.getRestaurant(item.restaurantId);
      if (!restaurant || restaurant.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized access to menu item" });
      }

      await storage.deleteMenuItem(item.id);
      res.sendStatus(204);
    } catch (error) {
      console.error('Error deleting menu item:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add new CSV export endpoint
  app.get("/api/restaurants/:id/menu/export", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const restaurantId = parseInt(req.params.id);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }

      // Verify restaurant belongs to user
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized access to restaurant" });
      }

      const menuItems = await storage.getMenuItems(restaurantId);

      // Create CSV header
      const csvHeader = "Name,Description,Price,Course Type,Custom Tags,Allergens\n";

      // Create CSV rows
      const csvRows = menuItems.map(item => {
        const allergens = Object.entries(item.allergens)
          .filter(([_, value]) => value)
          .map(([key]) => key)
          .join('; ');

        const customTags = item.customTags ? item.customTags.join('; ') : '';

        // Escape fields that might contain commas
        const escapedFields = [
          item.name.replace(/"/g, '""'),
          item.description.replace(/"/g, '""'),
          item.price,
          item.courseType.replace(/"/g, '""'),
          customTags.replace(/"/g, '""'),
          allergens
        ].map(field => `"${field}"`);

        return escapedFields.join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${restaurant.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_menu.csv`);

      res.send(csv);
    } catch (error) {
      console.error('Error exporting menu:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}