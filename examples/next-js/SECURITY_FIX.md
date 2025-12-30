# 🔒 Исправление уязвимости безопасности

## Проблема

Пользователь обнаружил серьезную уязвимость: можно подделать cookie `g_state`, чтобы обмануть клиентский интерфейс и получить больше вызовов сервиса.

### Как это работало:

1. Пользователь входит в систему
2. Сервер устанавливает HttpOnly cookie с токеном
3. Клиент показывает привилегии (10 вызовов)
4. Пользователь использует сервис 10 раз
5. Клиент показывает 0 вызовов
6. **НО**: Пользователь находит cookie `g_state` со значением `{"i_l":10,...}`
7. Пользователь изменяет `i_l` с 0 на 10
8. Клиент снова показывает 10 вызовов! ❌

### Почему это произошло:

**Неправильный подход:**
```typescript
// Клиент проверял привилегии и решал, можно ли использовать сервис
if (privileges.serviceCalls > 0) {
    // Отправляем запрос
}
```

**Проблема:** Клиентские данные (включая cookies) можно подделать!

## Решение

### Правильный подход: Серверная проверка

**Новая архитектура:**

1. **Клиент НЕ проверяет привилегии** перед отправкой запроса
2. **Сервер ВСЕГДА проверяет** привилегии при получении запроса
3. **Сервер верифицирует токен** через Google OAuth на каждом запросе
4. **Сервер хранит привилегии** в защищенном хранилище

### Ключевые изменения:

#### 1. Новый защищенный API endpoint

```typescript
// examples/next-js/src/pages/api/service/secure-usage.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. Парсим cookies
    const cookies = parse(req.headers.cookie || '');
    const idToken = cookies.google_token;

    // 2. Верифицируем токен через Google (КЛЮЧЕВОЙ МОМЕНТ!)
    const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // 3. Получаем userId из верифицированного токена
    const userId = payload.sub;

    // 4. Проверяем привилегии на сервере
    let userUsage = userUsageStore.get(userId);
    
    if (userUsage.serviceCalls <= 0) {
        return res.status(429).json({
            success: false,
            message: 'Service usage limit exceeded'
        });
    }

    // 5. Уменьшаем счетчик
    userUsage.serviceCalls -= 1;
    
    // 6. Возвращаем результат
    return res.status(200).json({
        success: true,
        remainingCalls: userUsage.serviceCalls
    });
}
```

#### 2. Новый клиентский компонент

```typescript
// examples/next-js/src/pages/dashboard-secure.tsx
const handleUseService = async () => {
    // НЕ проверяем привилегии на клиенте!
    // Просто отправляем запрос на защищенный endpoint
    
    const response = await fetch('/api/service/secure-usage', { 
        method: 'POST',
        // НЕ отправляем привилегии с клиента!
        body: JSON.stringify({})
    });
    
    const result = await response.json();
    
    if (result.success) {
        // Обновляем UI после успешного выполнения
        setPrivileges(prev => ({
            ...prev,
            serviceCalls: result.remainingCalls
        }));
    } else {
        // Показываем ошибку с сервера
        alert(result.message);
    }
};
```

## Сравнение подходов

| Аспект | Старый (уязвимый) | Новый (безопасный) |
|--------|------------------|-------------------|
| **Проверка лимитов** | Клиент проверяет перед запросом | Сервер проверяет при получении |
| **Доверие к данным** | Доверяет клиентским данным | Не доверяет клиенту ничего |
| **Верификация токена** | Один раз при входе | Каждый раз при запросе |
| **Хранение привилегий** | Частично на клиенте | Только на сервере |
| **Защита от подделки** | ❌ Уязвим | ✅ Защищен |

## Почему новая версия безопаснее

### 1. Серверная проверка токена

```typescript
// Каждый запрос проверяется через Google OAuth
const ticket = await client.verifyIdToken({
    idToken: idToken,
    audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
});
```

**Преимущество:** Даже если злоумышленник подделает cookie, токен не пройдет верификацию Google.

### 2. Серверное хранение привилегий

```typescript
// Привилегии хранятся в памяти сервера (в production - в базе данных)
const userUsageStore = new Map<string, UserUsage>();
```

**Преимущество:** Клиент не может изменить привилегии, даже если подделает все cookies.

### 3. Отсутствие доверия к клиенту

```typescript
// Сервер НЕ принимает привилегии от клиента
// body: JSON.stringify({}) - пустой body
```

**Преимущество:** Клиентские данные полностью игнорируются при проверке лимитов.

## Тестирование безопасности

### Тест 1: Попытка подделки cookie

1. Войдите в систему
2. Используйте сервис 10 раз
3. Попробуйте изменить cookie `g_state` или любой другой
4. Попробуйте использовать сервис еще раз

**Результат:** ❌ Запрос будет отклонен с HTTP 429

### Тест 2: Попытка подделки токена

1. Скопируйте чужой токен
2. Попробуйте использовать его в своем браузере

**Результат:** ❌ Токен не пройдет верификацию Google (неправильный audience)

### Тест 3: Попытка обойти клиентскую проверку

1. Откройте DevTools
2. Измените JavaScript, чтобы кнопка всегда была активна
3. Попробуйте использовать сервис при 0 вызовах

**Результат:** ❌ Сервер отклонит запрос

## Production рекомендации

### 1. Замените in-memory хранилище

```typescript
// Вместо Map используйте базу данных
// PostgreSQL, MongoDB, или Redis
const userUsageStore = new Map<string, UserUsage>(); // ← Заменить
```

### 2. Добавьте rate limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов
    keyGenerator: (req) => {
        // Используем userId из верифицированного токена
        return getUserIdFromToken(req);
    }
});
```

### 3. Добавьте аудит-логи

```typescript
interface AuditLog {
    userId: string;
    action: 'service_call' | 'limit_exceeded' | 'token_verification_failed';
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    details: any;
}

// Логируйте каждое действие
console.log(JSON.stringify(auditLog));
```

### 4. Реализуйте refresh tokens

```typescript
// Для длительных сессий используйте refresh tokens
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 дней для refresh token
    path: '/',
};

res.setHeader('Set-Cookie', [
    serialize('google_refresh_token', refreshToken, cookieOptions),
]);
```

## Миграция с уязвимой версии

### Шаг 1: Замените API endpoint

```typescript
// Было: /api/service/usage
// Стало: /api/service/secure-usage
```

### Шаг 2: Обновите клиентский код

```typescript
// Было:
fetch('/api/service/usage')

// Стало:
fetch('/api/service/secure-usage')
```

### Шаг 3: Удалите клиентскую проверку

```typescript
// Было:
if (privileges.serviceCalls > 0) {
    // Отправляем запрос
}

// Стало:
// Просто отправляем запрос, сервер проверит
```

## Заключение

**Ключевой принцип безопасности:** **Никогда не доверяйте клиенту!**

- ✅ Все проверки должны быть на сервере
- ✅ Каждый запрос должен верифицировать токен
- ✅ Привилегии должны храниться на сервере
- ✅ Клиент только отображает данные с сервера

Новая реализация полностью защищена от подделки cookies и клиентских данных, потому что сервер самостоятельно проверяет все привилегии и верифицирует токен через Google OAuth на каждом запросе.