import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contracts } from "@db/schema";
import { eq, and } from "drizzle-orm";
import solc from 'solc';
import { authenticate, login, type AuthRequest } from './auth';

export function registerRoutes(app: Express): Server {
  // Add CORS headers for development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Auth routes
  app.post("/api/login", async (req, res) => {
    try {
      const { wallet_address } = req.body;
      if (!wallet_address) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      const { user, token } = await login(wallet_address);
      res.json({ user, token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Protected routes
  app.use('/api/contracts', authenticate);
  app.use('/api/compile', authenticate);

  // Contract CRUD operations
  app.post("/api/compile", async (req: AuthRequest, res) => {
    try {
      const { sourceCode, contractId } = req.body;
      const ownerId = req.user?.id;

      if (!sourceCode) {
        return res.status(400).json({ message: "Source code is required" });
      }

      // Compile contract
      const input = {
        language: 'Solidity',
        sources: {
          'Contract.sol': { content: sourceCode },
        },
        settings: {
          outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
        },
      };

      const output = JSON.parse(solc.compile(JSON.stringify(input)));

      if (output.errors) {
        const errors = output.errors.filter((e: any) => e.severity === 'error');
        if (errors.length > 0) {
          return res.status(400).json({ errors: output.errors });
        }
      }

      // Get contract name from source
      const contractNameMatch = sourceCode.match(/contract\s+(\w+)\s*{/);
      const contractName = contractNameMatch ? contractNameMatch[1] : 'Contract';

      // Get the compiled contract
      const contract = output.contracts['Contract.sol'][contractName];

      if (contractId) {
        // Update existing contract
        const [updatedContract] = await db.update(contracts)
          .set({
            source_code: sourceCode,
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            updated_at: new Date()
          })
          .where(and(
            eq(contracts.id, contractId),
            eq(contracts.owner_id, ownerId!)
          ))
          .returning();

        res.json({
          abi: contract.abi,
          bytecode: contract.evm.bytecode.object,
          contract: updatedContract
        });
      } else {
        // Create new contract
        const [savedContract] = await db.insert(contracts)
          .values({
            name: `${contractName}.sol`,
            source_code: sourceCode,
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            owner_id: ownerId!,
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning();

        res.json({
          abi: contract.abi,
          bytecode: contract.evm.bytecode.object,
          contract: savedContract
        });
      }
    } catch (err) {
      console.error('Compilation error:', err);
      res.status(500).json({
        message: "Failed to compile contract",
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Get user's contracts
  app.get("/api/contracts", async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const type = req.query.type as string;

      let query = db.select().from(contracts).where(eq(contracts.owner_id, userId!));

      if (type) {
        query = query.where(eq(contracts.type, type));
      }

      const userContracts = await query.orderBy(contracts.created_at);
      res.json(userContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Create contract
  app.post("/api/contracts", async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const [contract] = await db.insert(contracts)
        .values({
          ...req.body,
          owner_id: userId!,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();

      res.json(contract);
    } catch (error) {
      console.error('Error creating contract:', error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  // Get single contract
  app.get("/api/contracts/:id", async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.owner_id, userId!)
        ),
      });

      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      res.json(contract);
    } catch (error) {
      console.error('Error fetching contract:', error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  // Update contract
  app.patch("/api/contracts/:id", async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const [contract] = await db
        .update(contracts)
        .set({
          ...req.body,
          updated_at: new Date(),
        })
        .where(and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.owner_id, userId!)
        ))
        .returning();

      if (!contract) {
        return res.status(404).json({ message: "Contract not found or unauthorized" });
      }
      res.json(contract);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  // Delete contract
  app.delete("/api/contracts/:id", async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const [contract] = await db.delete(contracts)
        .where(and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.owner_id, userId!)
        ))
        .returning();

      if (!contract) {
        return res.status(404).json({ message: "Contract not found or unauthorized" });
      }

      res.json(contract);
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}