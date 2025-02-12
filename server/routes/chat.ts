import OpenAI from 'openai';
import { Router } from 'express';

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

Keep responses concise and focused on the user's specific needs. When providing code examples, ensure they follow security best practices and include relevant comments.`;

router.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
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
