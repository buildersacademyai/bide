import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contracts } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Contract CRUD operations
  app.post("/api/contracts", async (req, res) => {
    const contract = await db.insert(contracts).values(req.body).returning();
    res.json(contract[0]);
  });

  app.get("/api/contracts", async (_req, res) => {
    const allContracts = await db.query.contracts.findMany({
      orderBy: (contracts, { desc }) => [desc(contracts.createdAt)],
    });
    res.json(allContracts);
  });

  app.get("/api/contracts/:id", async (req, res) => {
    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, parseInt(req.params.id)),
    });
    if (!contract) {
      res.status(404).json({ message: "Contract not found" });
      return;
    }
    res.json(contract);
  });

  app.patch("/api/contracts/:id", async (req, res) => {
    const contract = await db
      .update(contracts)
      .set(req.body)
      .where(eq(contracts.id, parseInt(req.params.id)))
      .returning();
    res.json(contract[0]);
  });

  const httpServer = createServer(app);
  return httpServer;
}
