import type { Express, Request } from "express";
import { z } from "zod";
import { createServer, type Server } from "http";
import { setupAuth, requireAuth, requireApiKey } from "./auth.js";
import { storage } from "./storage";
import { insertMenuItemSchema, insertRestaurantSchema } from "@shared/schema";
import { comparePasswords, hashPassword } from "./utils";
import { insertConsumerMenuItemSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import { dropboxService } from "./dropbox";
import { logger } from './logger';

// Type for multer request
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

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
      const status = req.query.status as string | undefined;

      if (isNaN(restaurantId) || restaurantId <= 0) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }

      console.log(`Fetching menu items for restaurant ${restaurantId} with status ${status || 'all'}`);
      const items = await storage.getMenuItems(restaurantId, status);
      console.log(`Found ${items.length} menu items`);

      res.json(items);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/menu-items/:id/status", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid menu item ID" });
      }

      if (!status || !["draft", "live"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const item = await storage.getMenuItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      const restaurant = await storage.getRestaurant(item.restaurantId);
      if (!restaurant || restaurant.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized access to menu item" });
      }

      const updated = await storage.updateMenuItemStatus(itemId, status as "draft" | "live");
      res.json(updated);
    } catch (error) {
      console.error('Error updating menu item status:', error);
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

  // Update the consumer menu items endpoint to handle pagination and filtering
  app.get("/api/consumer-menu-items", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const items = await storage.getConsumerMenuItems(req.user.id);
      res.json({
        items: items,
        total: items.length
      });
    } catch (error) {
      console.error('Error fetching consumer menu items:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/consumer-menu-items/upload", requireAuth, upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      // Validate file existence and type
      if (!req.file) {
        logger.error('Upload failed - No file uploaded');
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file size
      if (req.file.size > 10 * 1024 * 1024) {
        logger.error('Upload failed - File too large', { size: req.file.size });
        return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        logger.error('Upload failed - Invalid file type', { mimetype: req.file.mimetype });
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG and GIF are allowed." });
      }

      try {
        // Upload image to Dropbox
        const fileName = `menu_item_${Date.now()}${path.extname(req.file.originalname)}`;
        const imageData = req.file.buffer.toString('base64');

        logger.info('Attempting to upload to Dropbox', { fileName });

        const imageUrl = await dropboxService.uploadImage(imageData, fileName, true); // Set isConsumerUpload to true
        logger.info('Successfully uploaded to Dropbox', { imageUrl });

        // Create menu item with Dropbox URL
        const menuItem = {
          userId: req.user.id,
          name: req.file.originalname.split('.')[0],
          description: "Uploaded menu item",
          image: imageUrl,
          source: "upload",
          courseTags: [],
          allergens: {
            milk: false,
            eggs: false,
            peanuts: false,
            nuts: false,
            shellfish: false,
            fish: false,
            soy: false,
            gluten: false,
          }
        };

        const parsed = insertConsumerMenuItemSchema.safeParse(menuItem);
        if (!parsed.success) {
          logger.error('Menu item validation failed', parsed.error);
          return res.status(400).json({
            message: "Invalid menu item data",
            errors: parsed.error.errors
          });
        }

        const item = await storage.createConsumerMenuItem(parsed.data);
        logger.info('Successfully created menu item', item);
        res.status(201).json(item);
      } catch (uploadError) {
        logger.error('Error uploading to Dropbox', uploadError);
        res.status(500).json({ 
          message: "Failed to upload image",
          details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        });
      }
    } catch (error) {
      logger.error('Error handling menu item upload', error);
      res.status(500).json({ 
        message: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/consumer-menu-items", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const itemData = {
        ...req.body,
        userId: req.user.id,
      };

      const parsed = insertConsumerMenuItemSchema.safeParse(itemData);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid menu item data",
          errors: parsed.error.errors
        });
      }

      const item = await storage.createConsumerMenuItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating consumer menu item:', error);
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

      const results = {
        created: 0,
        updated: 0,
        failed: 0,
        errors: [] as string[]
      };

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
            status: 'draft' as const,
            dietary_preferences: {
              vegan: false,
              vegetarian: false,
              kosher: false,
              halal: false,
            }
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

          // Check if item with same name exists
          const existingMenuItems = await storage.getMenuItems(restaurantId);
          const existingItem = existingMenuItems.find(item =>
            item.name.toLowerCase() === menuItem.name.toLowerCase()
          );

          if (existingItem) {
            // Update existing item
            await storage.updateMenuItem(existingItem.id, {
              ...menuItem,
              id: existingItem.id,
              status: existingItem.status, // Preserve existing status
              image: existingItem.image, // Preserve existing image
              displayOrder: existingItem.displayOrder // Preserve display order
            });
            results.updated++;
          } else {
            // Create new item
            await storage.createMenuItem(menuItem);
            results.created++;
          }
        } catch (error) {
          console.error(`Error processing row ${i}:`, error);
          results.failed++;
          results.errors.push(`Row ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        message: "Menu items imported successfully",
        results: {
          created: results.created,
          updated: results.updated,
          failed: results.failed,
          errors: results.errors
        }
      });
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
      console.log("Received Zapier request with headers:", req.headers); // Add header logging
      console.log("Received request body:", req.body);

      // Validate request format
      if (!req.body.data) {
        return res.status(400).json({
          message: "Invalid request format",
          details: "Request must include 'data' field containing menu items array",
          received: Object.keys(req.body)
        });
      }

      let parsedData;
      try {
        // Parse the stringified JSON data if needed
        parsedData = typeof req.body.data === 'string'
          ? JSON.parse(req.body.data)
          : req.body.data;

        console.log("Parsed data:", parsedData);
      } catch (parseError) {
        console.error("Error parsing data:", parseError);
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
            // Process allergens as an array
            const allergensList = Array.isArray(item.Allergens)
              ? item.Allergens.map(allergen => String(allergen).toLowerCase())
              : [];

            const menuItem = {
              name: String(item.Name || ''),
              description: String(item.Description || ''),
              restaurantId: parseInt(item.RestaurantID || '0'),
              price: String(item.Price || '0').replace(/[^\d.-]/g, ''),
              courseTags: Array.isArray(item.Category) ? item.Category :
                         typeof item.Category === 'string' ? [item.Category] : [],
              customTags: [],
              image: '',
              allergens: {
                milk: allergensList.includes('milk'),
                eggs: allergensList.includes('eggs'),
                peanuts: allergensList.includes('peanuts'),
                nuts: allergensList.includes('nuts'),
                shellfish: allergensList.includes('shellfish'),
                fish: allergensList.includes('fish'),
                soy: allergensList.includes('soy'),
                gluten: allergensList.includes('gluten'),
              }
            };

            console.log("Processing menu item:", menuItem);

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
            console.error("Error processing item:", itemError);
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

  // Update user preferences
  app.patch("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const updates = {
        ...(req.body.preferredLanguage && { preferredLanguage: req.body.preferredLanguage }),
        ...(req.body.savedAllergies && { savedAllergies: req.body.savedAllergies }),
      };

      const updatedUser = await storage.updateUser(req.user.id, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user account details
  app.patch("/api/user", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const { currentPassword, newPassword, email } = req.body;

      // Verify current password
      if (!currentPassword || !(await comparePasswords(currentPassword, req.user.password))) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const updates: any = {};
      if (email) updates.email = email;
      if (newPassword) updates.password = await hashPassword(newPassword);

      const updatedUser = await storage.updateUser(req.user.id, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user account:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/menu-items/upload", requireAuth, upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      // Validate file existence and type
      if (!req.file) {
        logger.error('Upload failed - No file uploaded');
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file size
      if (req.file.size > 10 * 1024 * 1024) {
        logger.error('Upload failed - File too large', { size: req.file.size });
        return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        logger.error('Upload failed - Invalid file type', { mimetype: req.file.mimetype });
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG and GIF are allowed." });
      }

      try {
        // Get restaurant ID from form data
        const restaurantId = req.body.restaurantId || '0';

        // Create filename with restaurant ID prefix
        const fileName = `RestaurantID-${restaurantId}_menu_item_${Date.now()}${path.extname(req.file.originalname)}`;
        const imageData = req.file.buffer.toString('base64');

        logger.info('Attempting to upload to Dropbox', { fileName });

        const imageUrl = await dropboxService.uploadImage(imageData, fileName); // Not a consumer upload
        logger.info('Successfully uploaded to Dropbox', { imageUrl });

        res.status(201).json({ image: imageUrl });
      } catch (uploadError) {
        logger.error('Error uploading to Dropbox', uploadError);
        res.status(500).json({ 
          message: "Failed to upload image",
          details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        });
      }
    } catch (error) {
      logger.error('Error handling menu item upload', error);
      res.status(500).json({ 
        message: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}