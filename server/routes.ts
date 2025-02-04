import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { contracts } from "@db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import solc from 'solc';

// Middleware to verify wallet ownership
const verifyWalletOwnership = (req: any, res: any, next: any) => {
  const walletAddress = req.headers['x-wallet-address'];
  if (!walletAddress) {
    return res.status(401).json({ message: "Wallet address not provided" });
  }
  req.walletAddress = walletAddress.toLowerCase();
  next();
};

export function registerRoutes(app: Express): Server {
  // Apply wallet verification middleware to contract routes
  app.use('/api/contracts', verifyWalletOwnership);

  app.post("/api/compile", async (req, res) => {
    try {
      const { sourceCode, contractId } = req.body;
      const walletAddress = req.walletAddress;

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

      const contractNameMatch = sourceCode.match(/contract\s+(\w+)\s*{/);
      const contractName = contractNameMatch ? contractNameMatch[1] : 'Contract';
      const contract = output.contracts['Contract.sol'][contractName];

      if (contractId) {
        // Verify ownership before updating
        const existingContract = await db.query.contracts.findFirst({
          where: and(
            eq(contracts.id, contractId),
            eq(contracts.ownerAddress, walletAddress)
          ),
        });

        if (!existingContract) {
          return res.status(403).json({ message: "Not authorized to modify this contract" });
        }

        const [updatedContract] = await db.update(contracts)
          .set({
            sourceCode,
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            updatedAt: new Date()
          })
          .where(eq(contracts.id, contractId))
          .returning();

        res.json({
          abi: contract.abi,
          bytecode: contract.evm.bytecode.object,
          contract: updatedContract
        });
      } else {
        const [savedContract] = await db.insert(contracts)
          .values({
            name: `${contractName}.sol`,
            type: 'file',
            sourceCode,
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            ownerAddress: walletAddress,
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
      const walletAddress = req.walletAddress;
      const newContract = {
        name: req.body.name,
        type: req.body.type || 'file',
        path: req.body.path || '',
        parentId: req.body.parentId || null,
        sourceCode: req.body.sourceCode || null,
        abi: req.body.abi || null,
        bytecode: req.body.bytecode || null,
        ownerAddress: req.body.type === 'file' ? walletAddress : null, // Only set owner for files
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (newContract.parentId) {
        const parentFolder = await db.query.contracts.findFirst({
          where: eq(contracts.id, newContract.parentId),
        });

        if (!parentFolder) {
          const [rootFolder] = await db.insert(contracts).values({
            name: 'Contracts',
            type: 'folder',
            path: '',
            parentId: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();

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
      const walletAddress = req.walletAddress;
      const type = req.query.type as string;
      const name = req.query.name as string;

      let queryConditions = [];

      // If type is specified, add it to conditions
      if (type) {
        queryConditions.push(
          type === 'file' 
            ? and(
                eq(contracts.type, 'file'),
                eq(contracts.ownerAddress, walletAddress)
              )
            : eq(contracts.type, type)
        );
      } else {
        // If no type specified, show all folders and owned files
        queryConditions.push(
          or(
            eq(contracts.type, 'folder'),
            and(
              eq(contracts.type, 'file'),
              eq(contracts.ownerAddress, walletAddress)
            )
          )
        );
      }

      if (name) {
        queryConditions.push(eq(contracts.name, name));
      }

      const allContracts = await db.select()
        .from(contracts)
        .where(and(...queryConditions))
        .orderBy(desc(contracts.createdAt));

      res.json(allContracts);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const walletAddress = req.walletAddress;
      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.ownerAddress, walletAddress)
        ),
      });

      if (!contract) {
        console.error(`Contract not found or unauthorized for ID: ${req.params.id}`);
        return res.status(404).json({ message: "Contract not found or unauthorized" });
      }

      if (!contract.sourceCode) {
        console.error(`Contract found but no source code for ID: ${req.params.id}`);
        return res.status(404).json({ message: "Contract source code not found" });
      }

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
      const walletAddress = req.walletAddress;
      // Verify ownership before updating
      const existingContract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.ownerAddress, walletAddress)
        ),
      });

      if (!existingContract) {
        return res.status(403).json({ message: "Not authorized to modify this contract" });
      }

      const [updatedContract] = await db.update(contracts)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, parseInt(req.params.id)))
        .returning();

      res.json(updatedContract);
    } catch (err) {
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete("/api/contracts/:id", async (req, res) => {
    try {
      const walletAddress = req.walletAddress;
      // Verify ownership before deleting
      const contractToDelete = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, parseInt(req.params.id)),
          eq(contracts.ownerAddress, walletAddress)
        ),
      });

      if (!contractToDelete) {
        return res.status(403).json({ message: "Not authorized to delete this contract" });
      }

      // Delete all child contracts recursively
      const children = await db.query.contracts.findMany({
        where: eq(contracts.parentId, parseInt(req.params.id)),
      });

      for (const child of children) {
        await db.delete(contracts).where(eq(contracts.id, child.id));
      }

      const [deletedContract] = await db.delete(contracts)
        .where(eq(contracts.id, parseInt(req.params.id)))
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