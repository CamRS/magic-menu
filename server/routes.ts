import type { Express } from "express";
import { z } from "zod";
import { createServer, type Server } from "http";
import { setupAuth, requireAuth } from "./auth.js";
import { storage } from "./storage";
import { insertMenuItemSchema, insertRestaurantSchema, courseTypes } from "@shared/schema";

// Helper function to parse CSV data
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Handle escaped quotes
        currentCell += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of cell
      currentRow.push(currentCell);
      currentCell = '';
    } else if (char === '\n' && !insideQuotes) {
      // End of row
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  // Handle last cell and row
  if (currentCell) {
    currentRow.push(currentCell);
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

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
      if (isNaN(restaurantId) || restaurantId <= 0) {
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
  app.get("/api/restaurants", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);
      const restaurants = await storage.getRestaurants(req.user.id);
      res.json(restaurants);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/restaurants", requireAuth, async (req, res) => {
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

  app.post("/api/menu-items", requireAuth, async (req, res) => {
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

  app.patch("/api/menu-items/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/menu-items/:id", requireAuth, async (req, res) => {
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
  app.get("/api/restaurants/:id/menu/export", requireAuth, async (req, res) => {
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

  // Add new CSV import endpoint
  app.post("/api/restaurants/:id/menu/import", requireAuth, async (req, res) => {
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

      // Check if csv data is present in request body
      if (!req.body.csvData) {
        return res.status(400).json({ message: "No CSV data provided" });
      }

      const rows = parseCSV(req.body.csvData);
      if (rows.length < 2) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      // Verify header row - case insensitive comparison
      const expectedHeaders = ["Name", "Description", "Price", "Course Type", "Custom Tags", "Allergens"];
      const headers = rows[0].map(header => header.trim());
      const headersMatch = expectedHeaders.every(expected => 
        headers.some(header => header.toLowerCase() === expected.toLowerCase())
      );

      if (!headersMatch) {
        return res.status(400).json({ 
          message: "Invalid CSV format. Please use the template from the export function.",
          expected: expectedHeaders,
          received: headers
        });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Process each row (skip header)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].map(cell => cell.trim());
        if (row.length !== expectedHeaders.length) {
          results.failed++;
          results.errors.push(`Row ${i}: Invalid number of columns`);
          continue;
        }

        try {
          const customTags = row[4] ? row[4].split(';').map(tag => tag.trim()).filter(Boolean) : [];

          // Initialize allergens object with all false
          const allergens = {
            milk: false,
            eggs: false,
            peanuts: false,
            nuts: false,
            shellfish: false,
            fish: false,
            soy: false,
            gluten: false,
          };

          // Process allergens string
          const allergensList = row[5] ? row[5].split(';').map(a => a.trim().toLowerCase()) : [];
          for (const allergen of allergensList) {
            if (allergen in allergens) {
              allergens[allergen as keyof typeof allergens] = true;
            }
          }

          // Clean price value - remove currency symbol and trim
          const price = row[2].replace(/^[\$£€]/, '').trim();

          const menuItem = {
            restaurantId,
            name: row[0],
            description: row[1],
            price,
            courseType: row[3].trim(),
            customTags,
            allergens,
            image: '', // Default empty string for image
          };

          const parsed = insertMenuItemSchema.safeParse(menuItem);
          if (!parsed.success) {
            results.failed++;
            results.errors.push(`Row ${i}: ${parsed.error.errors.map(e => e.message).join(', ')}`);
            continue;
          }

          await storage.createMenuItem(parsed.data);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${i}: Failed to process row - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error('Error importing menu:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}