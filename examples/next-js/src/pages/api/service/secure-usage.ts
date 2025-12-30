import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import { OAuth2Client } from 'google-auth-library';

// In-memory хранилище для демонстрации (в production используйте базу данных)
interface UserUsage {
  userId: string;
  email: string;
  serviceCalls: number;
  subscriptionTier: 'free' | 'premium';
  createdAt: Date;
  lastCallAt: Date;
  // Добавляем поле для отслеживания поддельных запросов
  version: number;
}

const userUsageStore = new Map<string, UserUsage>();

type SuccessResponse = {
  success: true;
  message: string;
  remainingCalls: number;
  serverVersion: number; // Добавляем версию для клиента
  userInfo: {
    name?: string;
    email?: string;
    picture?: string;
  };
};

type ErrorResponse = {
  success: false;
  message: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method Not Allowed' 
    });
  }

  try {
    // Парсим cookies из запроса
    const cookies = parse(req.headers.cookie || '');
    const idToken = cookies.google_token;

    if (!idToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    // Верифицируем токен - это КЛЮЧЕВОЙ момент безопасности
    const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.sub) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    const userId = payload.sub;
    const userEmail = payload.email;

    // Получаем или создаем запись об использовании
    let userUsage = userUsageStore.get(userId);
    
    if (!userUsage) {
      userUsage = {
        userId,
        email: userEmail,
        serviceCalls: 10, // Начальное количество вызовов
        subscriptionTier: 'free',
        createdAt: new Date(),
        lastCallAt: new Date(),
        version: 1
      };
      userUsageStore.set(userId, userUsage);
    }

    // 🔒 КЛЮЧЕВАЯ ПРОВЕРКА: всегда проверяем лимит на сервере
    if (userUsage.serviceCalls <= 0) {
      console.warn(`User ${userEmail} tried to exceed limit. Current: ${userUsage.serviceCalls}`);
      return res.status(429).json({
        success: false,
        message: 'Service usage limit exceeded. Please upgrade your subscription or wait for reset.'
      });
    }

    // Уменьшаем счетчик использований
    userUsage.serviceCalls -= 1;
    userUsage.lastCallAt = new Date();
    userUsage.version += 1; // Увеличиваем версию при каждом изменении

    // В production здесь была бы реальная бизнес-логика сервиса
    // Например, вызов внешнего API, обработка данных и т.д.
    
    console.log(`Service used by ${userEmail}. Remaining calls: ${userUsage.serviceCalls}, Version: ${userUsage.version}`);

    return res.status(200).json({
      success: true,
      message: 'Service executed successfully',
      remainingCalls: userUsage.serviceCalls,
      serverVersion: userUsage.version, // Отправляем версию клиенту
      userInfo: {
        name: payload.name,
        email: payload.email,
        picture: payload.picture
      }
    });

  } catch (error) {
    console.error('Service usage error:', error);
    
    const errorMessage = error instanceof Error
      ? error.message
      : 'Internal server error';

    return res.status(500).json({
      success: false,
      message: 'Service execution failed',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

// Вспомогательная функция для получения информации о использовании
export async function getUserUsageStats(userId: string): Promise<UserUsage | null> {
  return userUsageStore.get(userId) || null;
}

// Функция для сброса лимитов (для админ-панели)
export async function resetUserUsage(userId: string, newLimit: number = 10): Promise<void> {
  const userUsage = userUsageStore.get(userId);
  if (userUsage) {
    userUsage.serviceCalls = newLimit;
    userUsage.version += 1;
    userUsage.lastCallAt = new Date();
  }
}
