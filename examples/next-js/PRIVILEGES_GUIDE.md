# HTTP-only Token с Управлением Привилегиями

## 📖 Полное руководство по работе с токенами

### 1. Срок жизни токена

**Текущая конфигурация:** 7 дней

```typescript
// examples/next-js/src/pages/api/auth/google-http-only.ts
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 дней в секундах
    path: '/',
};
```

**Как это работает:**
- Токен сохраняется в браузере как HttpOnly cookie
- Автоматически удаляется после истечения срока
- Недоступен для JavaScript (защита от XSS)
- Передается только по HTTPS в production

**Как изменить срок жизни:**
```typescript
// 1 день: 60 * 60 * 24
// 30 дней: 60 * 60 * 24 * 30
// 1 час: 60 * 60
maxAge: 60 * 60 * 24 * 30, // 30 дней
```

---

### 2. Сохранение привилегий пользователя

**Серверное хранилище привилегий:**

```typescript
// examples/next-js/src/pages/api/service/usage.ts
interface UserUsage {
  userId: string;           // Уникальный ID из Google OAuth
  email: string;            // Email пользователя
  serviceCalls: number;     // Количество оставшихся вызовов
  subscriptionTier: 'free' | 'premium';
  createdAt: Date;          // Дата создания записи
  lastCallAt: Date;         // Последнее использование сервиса
}
```

**Ключевые моменты:**
- Используем `payload.sub` из Google OAuth как уникальный идентификатор
- Привилегии хранятся на сервере (безопасно)
- Каждый пользователь начинает с 10 бесплатными вызовами
- Счетчик уменьшается при каждом использовании API

**Получение информации о привилегиях:**
```typescript
// API: GET /api/user/privileges
// Возвращает текущие привилегии пользователя
```

---

### 3. Динамическое управление привилегиями

**Ограничение: 10 вызовов сервиса**

#### Как это реализовано:

**Шаг 1:** Проверка лимита при каждом запросе
```typescript
// examples/next-js/src/pages/api/service/usage.ts
if (userUsage.serviceCalls <= 0) {
    return res.status(429).json({
        success: false,
        message: 'Service usage limit exceeded'
    });
}
```

**Шаг 2:** Уменьшение счетчика после успешного выполнения
```typescript
userUsage.serviceCalls -= 1;
userUsage.lastCallAt = new Date();
```

**Шаг 3:** Возврат информации о remaining calls
```typescript
return res.status(200).json({
    success: true,
    message: 'Service executed successfully',
    remainingCalls: userUsage.serviceCalls,
    // ...другие данные
});
```

#### Расширенные сценарии:

**Сброс лимита ежемесячно:**
```typescript
// Проверяем, нужно ли сбросить лимит
const now = new Date();
const createdAt = userUsage.createdAt;
const monthDiff = (now.getFullYear() - createdAt.getFullYear()) * 12 
                + (now.getMonth() - createdAt.getMonth());

if (monthDiff >= 1) {
    userUsage.serviceCalls = 10; // Сбрасываем до 10
    userUsage.createdAt = now;   // Обновляем дату
}
```

**Разные лимиты для разных подписок:**
```typescript
const LIMITS = {
    free: 10,
    premium: 100,
    enterprise: 1000
};

userUsage.serviceCalls = LIMITS[userUsage.subscriptionTier];
```

**Ограничение по времени (rate limiting):**
```typescript
// Максимум 10 вызовов в час
const lastCall = userUsage.lastCallAt;
const hourDiff = (new Date() - lastCall) / (1000 * 60 * 60);

if (hourDiff < 1 && userUsage.callsThisHour >= 10) {
    return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Try again in an hour.'
    });
}
```

---

## 🏗️ Архитектура системы

### Компоненты:

1. **Аутентификация** (`/api/auth/google-http-only.ts`)
   - Получает токен от Google
   - Устанавливает HttpOnly cookie
   - Срок жизни: 7 дней

2. **Проверка токена** (`/api/user-info.ts`)
   - Читает токен из cookie
   - Верифицирует через Google API
   - Возвращает информацию о пользователе

3. **Управление привилегиями** (`/api/user/privileges.ts`)
   - Возвращает текущие привилегии
   - Показывает оставшиеся вызовы
   - Отображает историю использования

4. **Использование сервиса** (`/api/service/usage.ts`)
   - Проверяет наличие лимитов
   - Уменьшает счетчик вызовов
   - Выполняет бизнес-логику
   - Возвращает результат

### Поток данных:

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Sign in with Google
       ▼
┌──────────────────────────┐
│ /api/auth/google-http    │ ← Устанавливает HttpOnly cookie
└──────┬───────────────────┘
       │ 2. Cookie set (7 days)
       ▼
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 3. Use service
       ▼
┌──────────────────────────┐
│  /api/service/usage      │
│  - Проверяет cookie      │
│  - Верифицирует токен    │
│  - Проверяет лимиты      │
│  - Уменьшает счетчик     │
│  - Выполняет логику      │
└──────┬───────────────────┘
       │ 4. Response with remaining calls
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

---

## 🔐 Безопасность

### Преимущества HttpOnly подхода:

1. **Защита от XSS**
   - JavaScript не может прочитать токен
   - Даже при XSS-уязвимости токен в безопасности

2. **HTTPS only**
   - Токен передается только по защищенному соединению
   - `secure: true` в production

3. **SameSite protection**
   - `sameSite: 'lax'` предотвращает CSRF-атаки
   - Куки не отправляются в cross-origin запросах

4. **Серверная валидация**
   - Все проверки происходят на сервере
   - Клиент не может подделать привилегии

### Production рекомендации:

**Замените in-memory хранилище на базу данных:**
```typescript
// Вместо Map используйте:
- PostgreSQL (для сложных запросов)
- MongoDB (для гибкости)
- Redis (для высокой производительности)
```

**Добавьте logging:**
```typescript
console.log(`Service used by ${userEmail}. Remaining: ${userUsage.serviceCalls}`);
// В production используйте Winston или Bunyan
```

**Реализуйте rate limiting:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100 // максимум 100 запросов за окно
});
```

---

## 🚀 Запуск демо

1. **Установите зависимости:**
```bash
cd examples/next-js
npm install
```

2. **Настройте переменные окружения:**
```bash
cp .env.local.example .env.local
# Заполните GOOGLE_CLIENT_ID и GOOGLE_SECRET
```

3. **Запустите сервер:**
```bash
npm run dev
```

4. **Откройте в браузере:**
```
http://localhost:3000
```

5. **Протестируйте:**
- Нажмите "Sign in with Google"
- Перейдите в "Dashboard with Privileges"
- Используйте сервис (осталось 10 вызовов)
- Наблюдайте за уменьшением счетчика
- Попробуйте использовать после исчерпания лимита

---

## 📊 Мониторинг и аналитика

### Логирование использования:

```typescript
// Добавьте в usage.ts
interface UsageLog {
    userId: string;
    timestamp: Date;
    action: 'service_call' | 'limit_exceeded';
    remainingCalls: number;
    userAgent: string;
    ipAddress: string;
}

// Логируйте каждое действие
const usageLog: UsageLog = {
    userId: payload.sub,
    timestamp: new Date(),
    action: userUsage.serviceCalls > 0 ? 'service_call' : 'limit_exceeded',
    remainingCalls: userUsage.serviceCalls,
    userAgent: req.headers['user-agent'] || '',
    ipAddress: req.socket.remoteAddress || ''
};

console.log(JSON.stringify(usageLog));
```

### Метрики для мониторинга:

- Количество активных пользователей
- Среднее использование сервиса на пользователя
- Процент пользователей, исчерпавших лимит
- Время до сброса лимитов
- Ошибки аутентификации

---

## 🎯 Практические примеры

### Пример 1: Ограничение по времени

```typescript
// Максимум 50 вызовов в день
const today = new Date().toDateString();
if (userUsage.lastResetDate !== today) {
    userUsage.serviceCalls = 50;
    userUsage.lastResetDate = today;
}
```

### Пример 2: Платные подписки

```typescript
const SUBSCRIPTION_LIMITS = {
    free: { calls: 10, expires: null },
    premium: { calls: 1000, expires: '30 days' },
    enterprise: { calls: Infinity, expires: null }
};

const limit = SUBSCRIPTION_LIMITS[userUsage.subscriptionTier];
if (limit.expires) {
    // Проверяем истечение срока подписки
    const expiresAt = new Date(userUsage.subscriptionStart);
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    if (new Date() > expiresAt) {
        // Подписка истекла, понижаем до free
        userUsage.subscriptionTier = 'free';
        userUsage.serviceCalls = 10;
    }
}
```

### Пример 3: Промо-коды

```typescript
// Добавляем бонусные вызовы
if (req.body.promoCode) {
    const promo = await validatePromoCode(req.body.promoCode);
    if (promo.valid) {
        userUsage.serviceCalls += promo.bonusCalls;
        await savePromoUsage(userId, req.body.promoCode);
    }
}
```

---

## 📝 Чеклист для production

- [ ] Заменить in-memory хранилище на базу данных
- [ ] Добавить миграции для схемы базы данных
- [ ] Реализовать резервное копирование
- [ ] Настроить мониторинг и алертинг
- [ ] Добавить rate limiting
- [ ] Реализовать логирование
- [ ] Настроить CORS политики
- [ ] Добавить health checks
- [ ] Реализовать восстановление пароля
- [ ] Добавить двухфакторную аутентификацию
- [ ] Настроить уведомления об истечении лимитов
- [ ] Создать панель администратора
- [ ] Реализовать API для управления подписками

---

## 🤝 Интеграция с внешними системами

### Webhook при истечении лимита:

```typescript
// Отправляем уведомление при достижении лимита
if (userUsage.serviceCalls === 0) {
    await fetch('https://your-app.com/webhooks/limit-exceeded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: userUsage.userId,
            email: userUsage.email,
            timestamp: new Date().toISOString()
        })
    });
}
```

### Интеграция с платежной системой:

```typescript
// После успешной оплаты увеличиваем лимит
app.post('/api/webhooks/payment-success', async (req, res) => {
    const { userId, plan } = req.body;
    const userUsage = await getUserUsage(userId);
    
    userUsage.subscriptionTier = plan;
    userUsage.serviceCalls = SUBSCRIPTION_LIMITS[plan];
    userUsage.subscriptionStart = new Date();
    
    await saveUserUsage(userUsage);
    
    res.status(200).json({ success: true });
});
```

---

## 📚 Дополнительные ресурсы

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OWASP Secure Cookie Practices](https://owasp.org/www-community/controls/SecureCookieAttribute)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [HTTP Cookie Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security)

---

## ❓ Часто задаваемые вопросы

**Q: Почему HttpOnly, а не localStorage?**
A: HttpOnly защищает от XSS-атак. Токен недоступен JavaScript, даже если злоумышленник внедрит вредоносный код.

**Q: Как обновить токен без перелогина?**
A: Используйте refresh token. Google OAuth предоставляет refresh_token, который можно использовать для получения нового access_token.

**Q: Что делать при компрометации токена?**
A: Немедленно отзовите токен через Google API и принудительно разлогиньте пользователя.

**Q: Как тестировать без Google OAuth?**
A: Создайте mock-реализацию, которая возвращает фиктивные токены для тестовой среды.

**Q: Можно ли использовать несколько токенов?**
A: Да, можно хранить access_token и refresh_token в разных cookies для большей безопасности.

---

## 🎉 Заключение

HTTP-only подход с управлением привилегиями обеспечивает:
- ✅ Максимальную безопасность
- ✅ Простое управление доступом
- ✅ Гибкую систему лимитов
- ✅ Легкую интеграцию с платежными системами
- ✅ Масштабируемость для production

Готовый пример в вашем проекте демонстрирует все эти возможности!