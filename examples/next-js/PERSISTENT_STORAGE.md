# 💾 Постоянное хранение данных (Persistent Storage)

## Проблема

Вы обнаружили, что при logout/перезагрузке сервера счетчик использований сбрасывается. Это происходит потому, что мы использовали **in-memory хранилище** (Map), которое хранит данные только в оперативной памяти.

### Почему это происходит:

```typescript
// Старая реализация
const userUsageStore = new Map<string, UserUsage>();
```

**Проблемы:**
- Данные хранятся только в памяти процесса
- При перезагрузке сервера память очищается
- При logout данные не сохраняются
- Не подходит для production

## Решение: Постоянное хранение

### Вариант 1: Файловое хранилище (для демонстрации)

Создал [`persistent-usage.ts`](examples/next-js/src/pages/api/service/persistent-usage.ts) - API с сохранением в файл:

```typescript
// Файл для постоянного хранения
const STORAGE_FILE = path.join(process.cwd(), 'data', 'usage-storage.json');

// Загружаем данные из файла при старте
function loadFromFile(): void {
  if (fs.existsSync(STORAGE_FILE)) {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    const jsonData = JSON.parse(data);
    // Восстанавливаем Map из файла
    userUsageStore = new Map<string, UserUsage>(Object.entries(jsonData));
  }
}

// Сохраняем данные в файл
function saveToFile(): void {
  const jsonData = Object.fromEntries(userUsageStore);
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(jsonData, null, 2));
}
```

**Как это работает:**
1. При старте сервера загружаем данные из файла
2. При каждом изменении сохраняем в файл
3. Данные сохраняются между перезагрузками
4. Данные сохраняются после logout

### Вариант 2: База данных (для production)

**Рекомендуемые базы данных:**

#### PostgreSQL (реляционная)
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Создание таблицы
await pool.query(`
  CREATE TABLE IF NOT EXISTS user_usage (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    service_calls INTEGER NOT NULL,
    subscription_tier VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    last_call_at TIMESTAMP NOT NULL,
    version INTEGER NOT NULL
  )
`);

// Получение данных
const result = await pool.query(
  'SELECT * FROM user_usage WHERE user_id = $1',
  [userId]
);

// Сохранение данных
await pool.query(`
  INSERT INTO user_usage (user_id, email, service_calls, subscription_tier, created_at, last_call_at, version)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    service_calls = EXCLUDED.service_calls,
    last_call_at = EXCLUDED.last_call_at,
    version = EXCLUDED.version
`, [userId, email, serviceCalls, subscriptionTier, createdAt, lastCallAt, version]);
```

#### MongoDB (документная)
```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('myapp');
const collection = db.collection('user_usage');

// Получение данных
const userUsage = await collection.findOne({ userId });

// Сохранение данных
await collection.updateOne(
  { userId },
  { 
    $set: {
      serviceCalls: newServiceCalls,
      lastCallAt: new Date(),
      version: { $inc: 1 }
    }
  },
  { upsert: true }
);
```

#### Redis (ключ-значение, для кэширования)
```typescript
import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL,
});

await client.connect();

// Сохранение данных
await client.hSet(`user:${userId}`, {
  serviceCalls: serviceCalls.toString(),
  lastCallAt: new Date().toISOString(),
  version: version.toString()
});

// Получение данных
const data = await client.hGetAll(`user:${userId}`);
```

## Миграция на постоянное хранилище

### Шаг 1: Выберите хранилище

**Для демонстрации:**
- Используйте файловое хранилище (уже реализовано)

**Для production:**
- PostgreSQL - если нужны сложные запросы и связи
- MongoDB - если нужна гибкость схемы
- Redis - для высокой производительности (кэширование)

### Шаг 2: Обновите API

Замените:
```typescript
// Было:
const userUsageStore = new Map<string, UserUsage>();

// Стало:
import { getUserUsage, saveUserUsage } from '../lib/database';
```

### Шаг 3: Настройте окружение

Добавьте переменные окружения в `.env.local`:

```bash
# Для PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/myapp"

# Для MongoDB
MONGODB_URI="mongodb://localhost:27017/myapp"

# Для Redis
REDIS_URL="redis://localhost:6379"
```

## Сравнение подходов

| Хранилище | Скорость | Надежность | Сложность | Production |
|-----------|----------|------------|-----------|------------|
| **In-memory (Map)** | ⚡️ Очень быстро | ❌ Ненадежно | 🟢 Просто | ❌ Нет |
| **Файловое** | 🟢 Быстро | 🟢 Надежно | 🟢 Просто | ⚠️ Для малых проектов |
| **PostgreSQL** | 🟢 Быстро | 🟢 Очень надежно | 🟡 Средне | ✅ Да |
| **MongoDB** | 🟢 Быстро | 🟢 Надежно | 🟡 Средне | ✅ Да |
| **Redis** | ⚡️ Очень быстро | 🟢 Надежно | 🟡 Средне | ✅ Да (кэш) |

## Рекомендации для production

### 1. Используйте базу данных

```typescript
// Рекомендуемая конфигурация:
- Основное хранилище: PostgreSQL или MongoDB
- Кэш: Redis для часто запрашиваемых данных
- Резервное копирование: Автоматическое ежедневное
```

### 2. Реализуйте миграции

```typescript
// Создайте файл миграции
export async function migrateUserUsage() {
  // Перенесите данные из in-memory в базу данных
  const allUsers = Array.from(userUsageStore.values());
  
  for (const user of allUsers) {
    await saveToDatabase(user);
  }
  
  console.log(`Migrated ${allUsers.length} users to database`);
}
```

### 3. Добавьте индексы

```sql
-- Для PostgreSQL
CREATE INDEX idx_user_usage_email ON user_usage(email);
CREATE INDEX idx_user_usage_created_at ON user_usage(created_at);

-- Для MongoDB
db.user_usage.createIndex({ "email": 1 });
db.user_usage.createIndex({ "createdAt": 1 });
```

### 4. Реализуйте бэкапы

```typescript
// Автоматическое резервное копирование
import cron from 'node-cron';

// Каждый день в 2:00
cron.schedule('0 2 * * *', async () => {
  console.log('Starting backup...');
  
  const backupData = await getAllUsersFromDatabase();
  const backupFile = `backup-${Date.now()}.json`;
  
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  
  console.log(`Backup saved to ${backupFile}`);
});
```

## Тестирование постоянного хранения

### Тест 1: Перезагрузка сервера

1. Используйте сервис несколько раз
2. Остановите сервер (Ctrl+C)
3. Запустите сервер снова
4. Проверьте, что счетчик сохранился

**Результат:** ✅ Данные сохраняются

### Тест 2: Logout/Login

1. Используйте сервис несколько раз
2. Нажмите Logout
3. Войдите снова
4. Проверьте, что счетчик сохранился

**Результат:** ✅ Данные сохраняются

### Тест 3: Множественные пользователи

1. Войдите под разными аккаунтами
2. Используйте сервис под каждым
3. Проверьте, что данные не смешиваются

**Результат:** ✅ Данные изолированы

## Заключение

### Что нужно сделать:

1. **Для демонстрации:** Используйте файловое хранилище (уже реализовано)
2. **Для production:** Перейдите на базу данных (PostgreSQL/MongoDB)
3. **Для производительности:** Добавьте Redis для кэширования

### Ключевые преимущества постоянного хранения:

- ✅ Данные сохраняются после перезагрузки
- ✅ Данные сохраняются после logout
- ✅ Поддержка множества пользователей
- ✅ Масштабируемость
- ✅ Надежность

**Готовый пример:** [`persistent-usage.ts`](examples/next-js/src/pages/api/service/persistent-usage.ts) уже реализует файловое хранилище. Просто замените endpoint в клиентском коде с `/api/service/secure-usage` на `/api/service/persistent-usage`.