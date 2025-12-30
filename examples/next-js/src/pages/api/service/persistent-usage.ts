import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// In-memory хранилище для демонстрации (в production используйте базу данных)
interface UserUsage {
  userId: string;
  email: string;
  serviceCalls: number;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  createdAt: Date;
  lastCallAt: Date;
  version: number;
}

// Файл для постоянного хранения (для демонстрации)
const STORAGE_FILE = path.join(process.cwd(), 'data', 'usage-storage.json');

// In-memory кэш
let userUsageStore = new Map<string, UserUsage>();

// Загружаем данные из файла при старте
function loadFromFile(): void {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8');
      const jsonData = JSON.parse(data);
      
      // Восстанавливаем Map из JSON
      userUsageStore = new Map<string, UserUsage>();
      Object.entries(jsonData).forEach(([key, value]: [string, any]) => {
        userUsageStore.set(key, {
          ...value,
          createdAt: new Date(value.createdAt),
          lastCallAt: new Date(value.lastCallAt)
        });
      });
      
      console.log(`Loaded ${userUsageStore.size} user records from storage`);
    }
  } catch (error) {
    console.error('Failed to load storage file:', error);
  }
}

// Сохраняем данные в файл
function saveToFile(): void {
  try {
    // Создаем директорию, если ее нет
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Конвертируем Map в JSON
    const jsonData = Object.fromEntries(userUsageStore);
    
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(jsonData, null, 2));
    console.log(`Saved ${userUsageStore.size} user records to storage`);
  } catch (error) {
    console.error('Failed to save storage file:', error);
  }
}

// Загружаем данные при импорте модуля
loadFromFile();

type SuccessResponse = {
  success: true;
  message: string;
  remainingCalls: number;
  serverVersion: number;
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

    // Верифицируем токен
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
      saveToFile(); // Сохраняем нового пользователя
    }

    // Проверяем, не истек ли лимит
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
    userUsage.version += 1;

    // Сохраняем изменения
    saveToFile();
    
    console.log(`Service used by ${userEmail}. Remaining calls: ${userUsage.serviceCalls}, Version: ${userUsage.version}`);

    return res.status(200).json({
      success: true,
      message: 'Service executed successfully',
      remainingCalls: userUsage.serviceCalls,
      serverVersion: userUsage.version,
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
    saveToFile();
  }
}

// Функция для обновления подписки (после оплаты)
export async function updateUserSubscription(userId: string, newTier: 'premium' | 'enterprise'): Promise<void> {
  const userUsage = userUsageStore.get(userId);
  if (userUsage) {
    userUsage.subscriptionTier = newTier;
    
    // Устанавливаем новые лимиты в зависимости от подписки
    const limits = {
      free: 10,
      premium: 100,
      enterprise: 1000
    };
    
    userUsage.serviceCalls = limits[newTier];
    userUsage.version += 1;
    userUsage.lastCallAt = new Date();
    saveToFile();
    
    console.log(`User ${userId} upgraded to ${newTier} with ${limits[newTier]} calls`);
  }
}

// Функция для получения всех пользователей (для админ-панели)
export function getAllUsers(): UserUsage[] {
  return Array.from(userUsageStore.values());
}