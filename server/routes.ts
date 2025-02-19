import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertMenuItemSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Menu item routes
  app.get("/api/menu-items", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const items = await storage.getMenuItems(req.user.id);
    res.json(items);
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    const item = await storage.getMenuItem(parseInt(req.params.id));
    if (!item) return res.status(404).send("Menu item not found");
    res.json(item);
  });

  app.post("/api/menu-items", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    const parsed = insertMenuItemSchema.safeParse({
      ...req.body,
      userId: req.user.id,
    });
    
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    
    const item = await storage.createMenuItem(parsed.data);
    res.status(201).json(item);
  });

  app.patch("/api/menu-items/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    const item = await storage.getMenuItem(parseInt(req.params.id));
    if (!item) return res.status(404).send("Menu item not found");
    if (item.userId !== req.user.id) return res.sendStatus(403);
    
    const updated = await storage.updateMenuItem(item.id, req.body);
    res.json(updated);
  });

  app.delete("/api/menu-items/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    const item = await storage.getMenuItem(parseInt(req.params.id));
    if (!item) return res.status(404).send("Menu item not found");
    if (item.userId !== req.user.id) return res.sendStatus(403);
    
    await storage.deleteMenuItem(item.id);
    res.sendStatus(204);
  });

  const httpServer = createServer(app);
  return httpServer;
}
