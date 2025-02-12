import OpenAI from 'openai';
import { Router } from 'express';
import { db } from "@db";
import { contracts } from "@db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System message to define the AI assistant's role
const SYSTEM_MESSAGE = `You are a helpful blockchain development assistant specializing in Solidity smart contracts. Your main tasks are:

1. Help users write and understand smart contracts
2. Provide guidance on best practices and security considerations
3. Explain contract deployment processes
4. Debug common issues
5. Answer questions about Ethereum and blockchain development

When asked to generate a smart contract:
1. Create a well-documented, secure contract following best practices
2. Include SPDX license and pragma directive
3. Add comprehensive comments explaining functionality
4. Implement proper access control and security measures
5. Return the complete contract code

Keep responses concise and focused on the user's specific needs. When providing code examples, ensure they follow security best practices and include relevant comments.`;

// Helper function to detect if the message is requesting contract generation
function isContractRequest(message: string): boolean {
  const contractKeywords = [
    'create contract',
    'generate contract',
    'write contract',
    'make contract',
    'new contract'
  ];
  return contractKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

// Helper function to extract contract name from message
function extractContractName(message: string): string {
  const defaultName = 'GeneratedContract';
  const words = message.split(' ');
  const contractWords = words.filter(word => 
    word.length > 2 && 
    !['contract', 'for', 'create', 'generate', 'write', 'make', 'new', 'the'].includes(word.toLowerCase())
  );

  if (contractWords.length === 0) return defaultName;

  // Capitalize first letter and remove special characters
  const name = contractWords[0].replace(/[^a-zA-Z0-9]/g, '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

router.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address is required' });
    }

    const isGenerateRequest = isContractRequest(message);
    let contractCode = null;
    let contractName = null;

    if (isGenerateRequest) {
      contractName = extractContractName(message);
      const contractPrompt = `Generate a complete, secure Solidity smart contract based on this description: "${message}". Name the contract "${contractName}". Include comprehensive comments and follow best practices.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: SYSTEM_MESSAGE },
          { role: "user", content: contractPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      contractCode = completion.choices[0]?.message?.content || null;

      if (contractCode) {
        try {
          // First check if root folder exists
          const rootFolderResult = await db.select().from(contracts).where(eq(contracts.name, 'Contracts')).limit(1);
          let rootFolder = rootFolderResult[0];

          // If no root folder exists, create it
          if (!rootFolder) {
            const [newRootFolder] = await db.insert(contracts).values({
              name: 'Contracts',
              type: 'folder',
              path: '',
              parentId: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }).returning();
            rootFolder = newRootFolder;
          }

          // Create the contract file with owner address
          const fileName = `${contractName}.sol`;
          const [newContract] = await db.insert(contracts).values({
            name: fileName,
            type: 'file',
            path: `/${fileName}`,
            parentId: rootFolder.id,
            sourceCode: contractCode,
            ownerAddress: walletAddress.toLowerCase(),
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();

          // Force refresh file list by invalidating cache
          await db.update(contracts)
            .set({ updatedAt: new Date() })
            .where(eq(contracts.id, rootFolder.id));

          return res.json({
            message: `I've generated the ${contractName} contract and created a new file ${fileName} in your explorer. You can now find it in your files list.`,
            contractCode,
            contractName: fileName,
            contractId: newContract.id
          });
        } catch (error) {
          console.error('Error creating contract file:', error);
          return res.status(500).json({ 
            error: 'Failed to create contract file',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response';
    res.json({ message: response });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: 'Failed to process your request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;