import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contracts } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Contract CRUD operations
  app.post("/api/contracts", async (req, res) => {
    try {
      const newContract = {
        name: req.body.name,
        type: req.body.type || 'file',
        path: req.body.path || '',
        parentId: req.body.parentId || null,
        sourceCode: req.body.sourceCode || null,
        abi: req.body.abi || null,
        bytecode: req.body.bytecode || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Check if we need to create root folder first
      if (newContract.parentId) {
        const parentFolder = await db.query.contracts.findFirst({
          where: eq(contracts.id, newContract.parentId),
        });

        if (!parentFolder) {
          // Create root folder first
          const [rootFolder] = await db.insert(contracts).values({
            name: 'Contracts',
            type: 'folder',
            path: '',
            parentId: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();

          // Update the parent id to the newly created folder
          newContract.parentId = rootFolder.id;
        }
      }

      const [contract] = await db.insert(contracts)
        .values(newContract)
        .returning();

      res.json(contract);
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
        orderBy: [desc(contracts.createdAt)],
      });
      res.json(allContracts);
    } catch (err) {
      console.error('Error fetching contracts:', err);
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