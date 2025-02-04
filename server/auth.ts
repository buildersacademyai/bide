import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.REPL_ID || 'dev-secret';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    wallet_address: string;
  };
}

export async function createToken(userId: number, walletAddress: string): Promise<string> {
  return jwt.sign(
    { id: userId, wallet_address: walletAddress },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      wallet_address: string;
    };

    // Verify user exists in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user to request object
    req.user = {
      id: decoded.id,
      wallet_address: decoded.wallet_address,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export async function login(walletAddress: string): Promise<{
  user: { id: number; wallet_address: string };
  token: string;
}> {
  // Find or create user
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.wallet_address, walletAddress.toLowerCase()))
    .limit(1);

  if (!user) {
    // Create new user
    [user] = await db
      .insert(users)
      .values({
        wallet_address: walletAddress.toLowerCase(),
        email: `${walletAddress.toLowerCase()}@placeholder.com`, // Placeholder email
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
  }

  const token = await createToken(user.id, user.wallet_address);

  return {
    user: {
      id: user.id,
      wallet_address: user.wallet_address,
    },
    token,
  };
}
