import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contracts } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import solc from 'solc';

export function registerRoutes(app: Express): Server {
  // Contract CRUD operations
  app.post("/api/compile", async (req, res) => {
    try {
      const { sourceCode, contractId } = req.body;

      if (!sourceCode) {
        return res.status(400).json({ message: "Source code is required" });
      }

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

      // Get the contract name from source code
      const contractNameMatch = sourceCode.match(/contract\s+(\w+)\s*{/);
      const contractName = contractNameMatch ? contractNameMatch[1] : 'Contract';

      // Get the compiled contract
      const contract = output.contracts['Contract.sol'][contractName];

      if (contractId) {
        // Update existing contract with new compilation results
        const [updatedContract] = await db.update(contracts)
          .set({
            sourceCode,
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            updatedAt: new Date()
          })
          .where(eq(contracts.id, contractId))
          .returning();

        if (!updatedContract) {
          return res.status(404).json({ message: "Contract not found" });
        }

        res.json({
          abi: contract.abi,
          bytecode: contract.evm.bytecode.object,
          contract: updatedContract
        });
      } else {
        // Create new contract file entry
        const [savedContract] = await db.insert(contracts)
          .values({
            name: `${contractName}.sol`,
            type: 'file',
            sourceCode,
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            createdAt: new Date(),
            updatedAt: new Date()
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

  app.get("/api/contracts", async (req, res) => {
    try {
      const type = req.query.type as string;
      const name = req.query.name as string;

      let query = db.select().from(contracts);

      if (type) {
        query = query.where(eq(contracts.type, type));
      }
      if (name) {
        query = query.where(eq(contracts.name, name));
      }

      const allContracts = await query.orderBy(desc(contracts.createdAt));
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
      // First fetch the contract to check if it has compiled files
      const [contractToDelete] = await db.query.contracts.findMany({
        where: eq(contracts.id, parseInt(req.params.id)),
      });

      if (!contractToDelete) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Delete all child contracts recursively
      const children = await db.query.contracts.findMany({
        where: eq(contracts.parentId, parseInt(req.params.id)),
      });

      for (const child of children) {
        await db.delete(contracts).where(eq(contracts.id, child.id));
      }

      // Then delete the contract itself
      const [deletedContract] = await db.delete(contracts)
        .where(eq(contracts.id, parseInt(req.params.id)))
        .returning();

      if (!deletedContract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      res.json(deletedContract);
    } catch (err) {
      console.error('Delete error:', err);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}