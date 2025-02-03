import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contracts } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Contract CRUD operations
  app.post("/api/contracts", async (req, res) => {
    try {
      console.log('Creating contract with data:', req.body);

      if (!req.body.name || !req.body.type || !req.body.path) {
        return res.status(400).json({ 
          message: "Missing required fields: name, type, and path are required" 
        });
      }

      const contract = await db.insert(contracts).values(req.body).returning();
      console.log('Contract created:', contract[0]);
      res.json(contract[0]);
    } catch (err) {
      console.error('Error creating contract:', err);
      res.status(500).json({ 
        message: "Failed to create contract",
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  app.get("/api/contracts", async (_req, res) => {
    try {
      const allContracts = await db.query.contracts.findMany({
        orderBy: (contracts, { desc }) => [desc(contracts.createdAt)],
      });
      res.json(allContracts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const contract = await db.query.contracts.findFirst({
        where: eq(contracts.id, parseInt(req.params.id)),
      });
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.patch("/api/contracts/:id", async (req, res) => {
    try {
      const contract = await db
        .update(contracts)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, parseInt(req.params.id)))
        .returning();

      if (!contract.length) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract[0]);
    } catch (err) {
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete("/api/contracts/:id", async (req, res) => {
    try {
      // First delete all child contracts recursively
      const children = await db.query.contracts.findMany({
        where: eq(contracts.parentId, parseInt(req.params.id)),
      });

      for (const child of children) {
        await db.delete(contracts).where(eq(contracts.id, child.id));
      }

      // Then delete the contract itself
      const contract = await db
        .delete(contracts)
        .where(eq(contracts.id, parseInt(req.params.id)))
        .returning();

      if (!contract.length) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract[0]);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}