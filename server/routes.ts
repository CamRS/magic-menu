import type { Express } from "express";
import { z } from "zod";
import { createServer, type Server } from "http";
import { setupAuth, requireAuth, requireApiKey } from "./auth.js";
import { storage } from "./storage";
import { insertMenuItemSchema, insertRestaurantSchema } from "@shared/schema";

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

      console.log("Original request body:", req.body);

      // Transform the request body to handle missing or empty price
      const requestBody = {
        ...req.body,
        // If price is undefined, null, or empty string, set it to empty string
        price: req.body.price === undefined || req.body.price === null || req.body.price === '' ? '' : req.body.price,
        // Ensure course tags are properly formatted
        courseTags: Array.isArray(req.body.courseTags)
          ? req.body.courseTags.map((tag: string) => tag.trim())
          : []
      };

      console.log("Transformed request body:", requestBody);

      const parsed = insertMenuItemSchema.safeParse(requestBody);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid menu item data",
          errors: parsed.error.errors
        });
      }

      console.log("Parsed data:", parsed.data);

      // Verify restaurant belongs to user
      const restaurant = await storage.getRestaurant(parsed.data.restaurantId);
      if (!restaurant || restaurant.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized access to restaurant" });
      }

      const item = await storage.createMenuItem(parsed.data);
      console.log("Created menu item:", item);

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

      // Ensure course tags are properly handled in updates
      const updateData = {
        ...req.body,
        courseTags: Array.isArray(req.body.courseTags)
          ? req.body.courseTags.map((tag: string) => tag.trim())
          : item.courseTags
      };

      const updated = await storage.updateMenuItem(item.id, updateData);
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
      const csvHeader = "Name,Description,Price,Course Tags,Custom Tags,Allergens\n";

      // Create CSV rows
      const csvRows = menuItems.map(item => {
        const allergens = Object.entries(item.allergens)
          .filter(([_, value]) => value)
          .map(([key]) => key)
          .join('; ');

        const courseTags = item.courseTags ? item.courseTags.join('; ') : '';

        // Escape fields that might contain commas
        const escapedFields = [
          item.name.replace(/"/g, '""'),
          item.description.replace(/"/g, '""'),
          item.price,
          courseTags.replace(/"/g, '""'),
          "",
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

  // Update the CSV import function to properly handle course tags
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


      // Process each row (skip header)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].map(cell => cell.trim());

        try {
          // Process course tags properly - ensure we get the full tag name
          const courseTags = row[3]
            ? row[3]
                .split(';')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
            : [];

          // Clean price value - remove currency symbol and trim
          const price = row[2].replace(/^[\$£€]/, '').trim();

          const menuItem = {
            restaurantId,
            name: row[0],
            description: row[1],
            price,
            courseTags,
            allergens: {
              milk: false,
              eggs: false,
              peanuts: false,
              nuts: false,
              shellfish: false,
              fish: false,
              soy: false,
              gluten: false,
            },
            image: '',
          };

          // Process allergens
          if (row[5]) {
            const allergensList = row[5].split(';').map(a => a.trim().toLowerCase());
            allergensList.forEach(allergen => {
              if (allergen in menuItem.allergens) {
                menuItem.allergens[allergen as keyof typeof menuItem.allergens] = true;
              }
            });
          }

          await storage.createMenuItem(menuItem);
        } catch (error) {
          console.error(`Error processing row ${i}:`, error);
          throw error;
        }
      }

      res.json({ message: "Menu items imported successfully" });
    } catch (error) {
      console.error('Error importing menu:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // New Zapier API endpoints
  app.get("/api/zapier/test", requireApiKey, async (_req, res) => {
    try {
      res.json({
        status: "success",
        message: "Zapier connection successful",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in Zapier test endpoint:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Zapier endpoint to create a menu item
  app.post("/api/zapier/menu-items", requireApiKey, async (req, res) => {
    try {
      console.log("Received request body:", req.body); // Add logging

      // Validate request format
      if (!req.body.data) {
        return res.status(400).json({
          message: "Invalid request format",
          details: "Request must include 'data' field containing stringified JSON",
          received: Object.keys(req.body)
        });
      }

      let parsedData;
      try {
        // Parse the stringified JSON data
        parsedData = typeof req.body.data === 'string'
          ? JSON.parse(req.body.data)
          : req.body.data;

        console.log("Parsed data:", parsedData); // Add logging
      } catch (parseError) {
        console.error("Error parsing data:", parseError); // Add logging
        return res.status(400).json({
          message: "Invalid JSON data format",
          error: parseError instanceof Error ? parseError.message : 'Failed to parse JSON data',
          receivedData: req.body.data
        });
      }

      // Handle array of items
      if (Array.isArray(parsedData)) {
        const results = {
          success: 0,
          failed: 0,
          errors: [] as string[]
        };

        for (const item of parsedData) {
          try {
            const menuItem = {
              name: String(item.Name || ''),
              description: String(item.Description || ''),
              restaurantId: parseInt(item.RestaurantID || '0'),
              price: String(item.Price || '0').replace(/[^\d.-]/g, ''),
              courseTags: item.Category,
              customTags: [],
              image: '',
              allergens: {
                milk: item.Allergens?.toLowerCase().includes('milk') || false,
                eggs: item.Allergens?.toLowerCase().includes('eggs') || false,
                peanuts: item.Allergens?.toLowerCase().includes('peanuts') || false,
                nuts: item.Allergens?.toLowerCase().includes('nuts') || false,
                shellfish: item.Allergens?.toLowerCase().includes('shellfish') || false,
                fish: item.Allergens?.toLowerCase().includes('fish') || false,
                soy: item.Allergens?.toLowerCase().includes('soy') || false,
                gluten: item.Allergens?.toLowerCase().includes('gluten') || false,
              }
            };

            const parsed = insertMenuItemSchema.safeParse(menuItem);
            if (!parsed.success) {
              results.failed++;
              results.errors.push(`Item '${menuItem.name}': ${parsed.error.errors.map(e => e.message).join(', ')}`);
              continue;
            }

            // Verify restaurant exists
            const restaurant = await storage.getRestaurant(menuItem.restaurantId);
            if (!restaurant) {
              results.failed++;
              results.errors.push(`Item '${menuItem.name}': Restaurant with ID ${menuItem.restaurantId} not found`);
              continue;
            }

            await storage.createMenuItem(parsed.data);
            results.success++;
          } catch (itemError) {
            results.failed++;
            results.errors.push(`Failed to process item: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
          }
        }

        return res.status(results.failed > 0 ? 207 : 201).json(results);
      }

      // If we get here, it means the data is not an array
      return res.status(400).json({
        message: "Invalid data format",
        details: "Expected an array of menu items",
        received: typeof parsedData
      });

    } catch (error) {
      console.error('Error creating menu item via Zapier:', error);
      res.status(500).json({
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Zapier endpoint to get menu items for a restaurant
  app.get("/api/zapier/menu-items/:restaurantId", requireApiKey, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }

      const items = await storage.getMenuItems(restaurantId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching menu items via Zapier:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}