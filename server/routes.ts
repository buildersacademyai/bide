import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contracts } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import solc from 'solc';

// Middleware to ensure user is authenticated with MetaMask
const requireAuth = (req: any, res: any, next: any) => {
  const ownerAddress = req.headers['x-owner-address'];
  if (!ownerAddress) {
    return res.status(401).json({ message: "Authentication required" });
  }
  req.ownerAddress = ownerAddress;
  next();
};

export function registerRoutes(app: Express): Server {
  // Add authentication middleware for all contract routes
  app.use('/api/contracts', requireAuth);
  app.use('/api/compile', requireAuth);

  // Contract CRUD operations
  app.post("/api/compile", async (req, res) => {
    try {
      const { sourceCode, contractId } = req.body;
      const ownerAddress = req.ownerAddress;

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
        // Verify ownership before updating
        const existingContract = await db.query.contracts.findFirst({
          where: and(
            eq(contracts.id, contractId),
            eq(contracts.ownerAddress, ownerAddress)
          ),
        });

        if (!existingContract) {
          return res.status(404).json({ message: "Contract not found or unauthorized" });
        }

        // Update existing contract with new compilation results
        const [updatedContract] = await db.update(contracts)
          .set({
            sourceCode,
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            updatedAt: new Date()
          })
          .where(and(
            eq(contracts.id, contractId),
            eq(contracts.ownerAddress, ownerAddress)
          ))
          .returning();

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
            ownerAddress, // Add owner's address
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
      const ownerAddress = req.ownerAddress;
      const newContract = {
        name: req.body.name,
        type: req.body.type || 'file',
        path: req.body.path || '',
        parentId: req.body.parentId || null,
        sourceCode: req.body.sourceCode || null,
        abi: req.body.abi || null,
        bytecode: req.body.bytecode || null,
        ownerAddress, // Add owner's address
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Check if we need to create root folder first
      if (newContract.parentId) {
        const parentFolder = await db.query.contracts.findFirst({
          where: and(
            eq(contracts.id, newContract.parentId),
            eq(contracts.ownerAddress, ownerAddress)
          ),
        });

        if (!parentFolder) {
          // Create root folder first
          const [rootFolder] = await db.insert(contracts).values({
            name: 'Contracts',
            type: 'folder',
            path: '',
            parentId: null,
            ownerAddress,
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
      const ownerAddress = req.ownerAddress;

      let whereClause = and(eq(contracts.ownerAddress, ownerAddress));
      if (type) {
        whereClause = and(whereClause, eq(contracts.type, type));
      }
      if (name) {
        whereClause = and(whereClause, eq(contracts.name, name));
      }

      const allContracts = await db.select()
        .from(contracts)
        .where(whereClause)
        .orderBy(desc(contracts.createdAt));

      res.json(allContracts);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const ownerAddress = req.ownerAddress;
      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.ownerAddress, ownerAddress)
        ),
      });

      if (!contract) {
        console.error(`Contract not found with ID: ${req.params.id}`);
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check if source code exists
      if (!contract.sourceCode) {
        console.error(`Contract found but no source code for ID: ${req.params.id}`);
        return res.status(404).json({ message: "Contract source code not found" });
      }

      // Log successful retrieval
      console.log(`Successfully retrieved contract ${req.params.id} with source code`);

      res.json({
        ...contract,
        source: contract.sourceCode
      });
    } catch (err) {
      console.error('Error fetching contract:', err);
      res.status(500).json({ 
        message: "Failed to fetch contract",
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  app.patch("/api/contracts/:id", async (req, res) => {
    try {
      const ownerAddress = req.ownerAddress;
      const [contract] = await db
        .update(contracts)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.ownerAddress, ownerAddress)
        ))
        .returning();

      if (!contract) {
        return res.status(404).json({ message: "Contract not found or unauthorized" });
      }
      res.json(contract);
    } catch (err) {
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete("/api/contracts/:id", async (req, res) => {
    try {
      const ownerAddress = req.ownerAddress;
      // First fetch the contract to check ownership
      const [contractToDelete] = await db.query.contracts.findMany({
        where: and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.ownerAddress, ownerAddress)
        ),
      });

      if (!contractToDelete) {
        return res.status(404).json({ message: "Contract not found or unauthorized" });
      }

      // Delete all child contracts recursively
      const children = await db.query.contracts.findMany({
        where: and(
          eq(contracts.parentId, parseInt(req.params.id)),
          eq(contracts.ownerAddress, ownerAddress)
        ),
      });

      for (const child of children) {
        await db.delete(contracts).where(and(
          eq(contracts.id, child.id),
          eq(contracts.ownerAddress, ownerAddress)
        ));
      }

      // Then delete the contract itself
      const [deletedContract] = await db.delete(contracts)
        .where(and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.ownerAddress, ownerAddress)
        ))
        .returning();

      res.json(deletedContract);
    } catch (err) {
      console.error('Delete error:', err);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}