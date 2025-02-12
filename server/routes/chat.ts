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

Format all generated contracts with the following structure:
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title [Contract Name]
 * @dev [Contract Description - Detailed explanation of purpose and functionality]
 * 
 * [Additional Documentation]
 * - [Key Feature 1]
 * - [Key Feature 2]
 * - [Security Considerations]
 */

[Contract Code with inline documentation]`;

// Helper function to detect if the message is requesting contract generation
function isContractRequest(message: string): boolean {
  const contractKeywords = [
    'create contract',
    'generate contract',
    'write contract',
    'make contract',
    'new contract',
    'contract for',
    'create a contract',
    'create smart contract',
    'create a smart contract',
    'contract that',
    'contract which'
  ];

  const lowercaseMessage = message.toLowerCase();

  // Check for standard patterns
  if (contractKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
    return true;
  }

  // Check for "create [something] contract" pattern
  if (/create .+ contract/.test(lowercaseMessage)) {
    return true;
  }

  // Check for "contract [description]" at start
  if (lowercaseMessage.startsWith('contract ')) {
    return true;
  }

  return false;
}

// Helper function to extract contract specifications from the message
function extractContractSpecifications(message: string): { name: string; description: string } {
  const defaultName = 'GeneratedContract';
  let contractName = defaultName;
  let description = message;

  const lowercaseMessage = message.toLowerCase();

  // Try to extract name from various patterns
  const patterns = [
    /create (?:a |an )?(?:smart )?contract (?:called |named )?["']?([a-zA-Z0-9]+)["']?/i,
    /create ["']?([a-zA-Z0-9]+)["']? contract/i,
    /contract (?:called |named )?["']?([a-zA-Z0-9]+)["']?/i,
    /generate (?:a |an )?(?:smart )?contract (?:called |named )?["']?([a-zA-Z0-9]+)["']?/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      contractName = match[1];
      // Remove the name part from description
      description = message.replace(pattern, '').trim();
      break;
    }
  }

  // If no name found through patterns, use the first relevant word
  if (contractName === defaultName) {
    const words = message.split(' ');
    const relevantWord = words.find(word => 
      word.length > 2 && 
      !['contract', 'for', 'create', 'generate', 'write', 'make', 'new', 'the', 'smart'].includes(word.toLowerCase())
    );

    if (relevantWord) {
      contractName = relevantWord.replace(/[^a-zA-Z0-9]/g, '');
      contractName = contractName.charAt(0).toUpperCase() + contractName.slice(1);
    }
  }

  return {
    name: contractName,
    description: description
  };
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
      const { name, description } = extractContractSpecifications(message);
      contractName = name;
      const contractPrompt = `Generate a complete, secure Solidity smart contract based on this description: "${description}". 
Follow this structure:
1. Start with SPDX license and pragma directive
2. Add comprehensive NatSpec documentation including:
   - @title with contract name "${contractName}"
   - @dev with detailed contract description
   - @notice explaining contract purpose
   - @custom tags for special features
3. Document all functions with:
   - @dev explaining implementation details
   - @param for each parameter
   - @return for return values
4. Include inline comments for complex logic
5. Implement security best practices
6. Add events for important state changes
7. Use proper access control modifiers

Format the contract following Solidity style guide.`;

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
        // Get or create the root folder
        let rootFolder = await db.query.contracts.findFirst({
          where: eq(contracts.name, 'Contracts')
        });

        if (!rootFolder) {
          const [newFolder] = await db.insert(contracts).values({
            name: 'Contracts',
            type: 'folder',
            path: '',
            parentId: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          rootFolder = newFolder;
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

        // Force refresh folder by updating timestamp
        await db.update(contracts)
          .set({ updatedAt: new Date() })
          .where(eq(contracts.id, rootFolder.id));

        return res.json({
          message: `I've generated the ${contractName} contract and saved it as ${fileName}. You can find it in your file explorer.`,
          contractCode,
          contractName: fileName,
          contractId: newContract.id
        });
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