import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contracts } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import solc from 'solc';

// Middleware to ensure user is authenticated with MetaMask
const requireAuth = (req: any, res: any, next: any) => {
  const ownerAddress = req.headers['x-owner-address'];
  const chainId = req.headers['x-chain-id'];

  if (!ownerAddress) {
    console.error('Authentication failed: No wallet address provided');
    return res.status(401).json({ message: "Authentication required" });
  }

  // Validate ethereum address format
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!ethAddressRegex.test(ownerAddress)) {
    console.error('Authentication failed: Invalid wallet address format');
    return res.status(401).json({ message: "Invalid wallet address format" });
  }

  // Add validated data to request object
  req.ownerAddress = ownerAddress.toLowerCase(); // Normalize address
  req.chainId = chainId;
  next();
};

export function registerRoutes(app: Express): Server {
  // Add CORS headers for development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-owner-address, x-chain-id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

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
            eq(contracts.owner_address, ownerAddress)
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
            owner_address: ownerAddress,
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

  app.post("/api/contracts", async (req, res) => {
    try {
      const ownerAddress = req.ownerAddress;
      const [contract] = await db.insert(contracts)
        .values({
          name: req.body.name,
          source_code: req.body.sourceCode || '',
          owner_address: ownerAddress,
          created_at: new Date(),
          updated_at: new Date()
        })
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

      let whereClause = eq(contracts.owner_address, ownerAddress);
      if (type) {
        whereClause = and(whereClause, eq(contracts.type, type));
      }
      if (name) {
        whereClause = and(whereClause, eq(contracts.name, name));
      }

      const allContracts = await db.select()
        .from(contracts)
        .where(whereClause)
        .orderBy(desc(contracts.created_at));

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
          eq(contracts.owner_address, ownerAddress)
        ),
      });

      if (!contract) {
        console.error(`Contract not found with ID: ${req.params.id}`);
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check if source code exists
      if (!contract.source_code) {
        console.error(`Contract found but no source code for ID: ${req.params.id}`);
        return res.status(404).json({ message: "Contract source code not found" });
      }

      // Log successful retrieval
      console.log(`Successfully retrieved contract ${req.params.id} with source code`);

      res.json({
        ...contract,
        source: contract.source_code
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
          updated_at: new Date(),
        })
        .where(and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.owner_address, ownerAddress)
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
          eq(contracts.owner_address, ownerAddress)
        ),
      });

      if (!contractToDelete) {
        return res.status(404).json({ message: "Contract not found or unauthorized" });
      }

      // Delete all child contracts recursively
      const children = await db.query.contracts.findMany({
        where: eq(contracts.parentId, parseInt(req.params.id)),
      });

      for (const child of children) {
        await db.delete(contracts).where(and(
          eq(contracts.id, child.id),
          eq(contracts.owner_address, ownerAddress)
        ));
      }

      // Then delete the contract itself
      const [deletedContract] = await db.delete(contracts)
        .where(and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.owner_address, ownerAddress)
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