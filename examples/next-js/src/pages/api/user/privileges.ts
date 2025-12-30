import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import { OAuth2Client } from 'google-auth-library';
import { getUserUsageStats } from '../service/persistent-usage';

type PrivilegesResponse = {
  userId: string;
  email: string;
  privileges: {
    serviceCalls: number;
    subscriptionTier: 'free' | 'premium' | 'enterprise';
    createdAt: Date;
    lastCallAt: Date | null;
    version?: number;
  };
};

type ErrorResponse = {
  message: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PrivilegesResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Парсим cookies из запроса
    const cookies = parse(req.headers.cookie || '');
    const idToken = cookies.google_token;

    if (!idToken) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Верифицируем токен
    const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const userId = payload.sub;
    const userEmail = payload.email || '';

    // Получаем информацию о привилегиях
    const userUsage = await getUserUsageStats(userId);

    if (!userUsage) {
      // Если пользователь еще не использовал сервис, возвращаем начальные значения
      return res.status(200).json({
        userId,
        email: userEmail,
        privileges: {
          serviceCalls: 10, // Начальное количество
          subscriptionTier: 'free',
          createdAt: new Date(),
          lastCallAt: null
        }
      });
    }

    return res.status(200).json({
      userId: userUsage.userId,
      email: userUsage.email,
      privileges: {
        serviceCalls: userUsage.serviceCalls,
        subscriptionTier: userUsage.subscriptionTier,
        createdAt: userUsage.createdAt,
        lastCallAt: userUsage.lastCallAt,
        version: userUsage.version
      }
    });

  } catch (error) {
    console.error('Privileges error:', error);
    
    const errorMessage = error instanceof Error
      ? error.message
      : 'Internal server error';

    return res.status(500).json({
      message: 'Failed to get user privileges',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}