# Dagger Bot

Telegram бот для продажи ключей доступа с интеграцией Platega (платежи) и Remnawave (управление ключами).

## Возможности

- 🔑 Покупка ключей доступа через Platega
- 📋 Управление купленными ключами
- 👤 Профиль пользователя
- 💬 Поддержка пользователей
- ⚙️ Админ-панель для управления пользователями

## Требования

- Node.js 18+ 
- Ubuntu/Debian сервер (или другой Linux)
- Домен с SSL сертификатом (для webhook)
- Аккаунты в Platega и Remnawave

## Быстрая установка на чистый сервер

### 1. Подключитесь к серверу

```bash
ssh root@your-server-ip
```

### 2. Установите Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v  # Проверка версии
```

### 3. Установите PM2 (менеджер процессов)

```bash
npm install -g pm2
```

### 4. Создайте пользователя для бота (опционально, для безопасности)

```bash
adduser daggerbot
usermod -aG sudo daggerbot
su - daggerbot
```

### 5. Клонируйте проект

```bash
cd ~
git clone <url-вашего-репозитория> dagger-bot
cd dagger-bot
```

Или загрузите файлы вручную:

```bash
mkdir -p ~/dagger-bot
cd ~/dagger-bot
# Загрузите все файлы проекта
```

### 6. Установите зависимости

```bash
npm install
```

### 7. Настройте переменные окружения

```bash
cp .env.example .env
nano .env
```

Заполните все параметры в `.env`:

```env
# Telegram Bot
BOT_TOKEN=ваш_токен_от_BotFather
ADMIN_IDS=ваш_telegram_id
SUPPORT_URL=https://t.me/ваш_канал_поддержки

# Payment Provider (Platega)
PLATEGA_API_URL=https://app.platega.io/api/v1
PLATEGA_MERCHANT_ID=ваш_merchant_id
PLATEGA_SECRET=ваш_secret_key

# Remnawave API
REMNAWAVE_API_URL=https://panel.daggervpn.ru/api
REMNAWAVE_API_TOKEN=ваш_api_токен

# Server settings
PORT=3000
WEBHOOK_URL=https://your-domain.com
```

**Как получить данные:**

- `BOT_TOKEN`: Создайте бота через [@BotFather](https://t.me/BotFather)
- `ADMIN_IDS`: Ваш Telegram ID (узнать можно через [@userinfobot](https://t.me/userinfobot))
- `PLATEGA_MERCHANT_ID` и `PLATEGA_SECRET`: Получите в личном кабинете Platega
- `REMNAWAVE_API_TOKEN`: Получите в панели Remnawave

### 8. Создайте директорию для базы данных

```bash
mkdir -p data
```

### 9. Запустите бота

```bash
pm2 start src/index.js --name dagger-bot
pm2 save
pm2 startup
```

### 10. Настройте Nginx (для webhook)

Установите Nginx:

```bash
sudo apt install nginx
```

Создайте конфигурацию:

```bash
sudo nano /etc/nginx/sites-available/dagger-bot
```

Добавьте:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/dagger-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 11. Установите SSL сертификат (обязательно для webhook)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 12. Настройте webhook в Platega

В личном кабинете Platega укажите URL для webhook:

```
https://your-domain.com/webhook/platega
```

## Управление ботом

### Просмотр логов

```bash
pm2 logs dagger-bot
```

### Перезапуск бота

```bash
pm2 restart dagger-bot
```

### Остановка бота

```bash
pm2 stop dagger-bot
```

### Удаление бота из PM2

```bash
pm2 delete dagger-bot
```

## Структура проекта

```
dagger-bot/
├── src/
│   ├── config/
│   │   ├── database.js      # Настройка SQLite базы данных
│   │   └── plans.js         # Тарифные планы
│   ├── models/
│   │   ├── user.js          # Модель пользователя
│   │   ├── key.js           # Модель ключа
│   │   └── payment.js       # Модель платежа
│   ├── services/
│   │   ├── platega.js       # Интеграция с Platega
│   │   └── remnawave.js     # Интеграция с Remnawave
│   ├── handlers/
│   │   ├── common.js        # Общие обработчики
│   │   ├── purchase.js      # Покупка ключей
│   │   ├── keys.js          # Управление ключами
│   │   └── admin.js         # Админ-панель
│   ├── keyboards/
│   │   └── index.js         # Клавиатуры бота
│   ├── routes/
│   │   └── webhook.js       # Webhook для платежей
│   └── index.js             # Главный файл
├── data/
│   └── bot.db               # База данных (создается автоматически)
├── .env                     # Переменные окружения
├── .env.example             # Пример переменных окружения
├── package.json
└── README.md
```

## Функционал бота

### Для пользователей

- **🔑 Купить ключ** - выбор тарифа и оплата через Platega
- **📋 Мои ключи** - просмотр купленных ключей и ссылок для подключения
- **👤 Профиль** - информация о пользователе и статистика
- **ℹ️ Информация** - описание сервиса
- **💬 Поддержка** - ссылка на канал поддержки

### Для администраторов

- **🔍 Найти пользователя** - поиск по Telegram ID или username
- **➕ Выдать новый ключ** - бесплатная выдача ключа пользователю
- **🔄 Продлить ключ** - продление существующего ключа на выбранный срок
- **📋 Показать ключи** - просмотр всех ключей пользователя

## Тарифные планы

Редактируйте файл `src/config/plans.js` для изменения тарифов:

```javascript
export const PLANS = [
  {
    id: 'plan_1m',
    name: '1 месяц',
    duration: 30,
    trafficGB: 100,
    price: 200,
    description: '30 дней доступа\n100 ГБ трафика'
  },
  // добавьте свои планы
];
```

## API документация Platega

Полная документация: https://docs.platega.io/

Основные эндпоинты:
- `POST /api/v1/payments` - создание платежа
- `GET /api/v1/payments/{id}` - получение статуса платежа
- Webhook приходит на `POST /webhook/platega`

## Безопасность

- ✅ Проверка подписи webhook от Platega
- ✅ Разделение прав администратора
- ✅ Хранение токенов в `.env`
- ✅ SQLite база данных с индексами
- ⚠️ Убедитесь, что `.env` добавлен в `.gitignore`
- ⚠️ Используйте SSL сертификат для webhook

## Устранение проблем

### Бот не отвечает

```bash
pm2 logs dagger-bot
```

Проверьте логи на ошибки.

### Webhook не работает

1. Проверьте SSL сертификат: `sudo certbot certificates`
2. Проверьте Nginx: `sudo nginx -t`
3. Проверьте логи Nginx: `sudo tail -f /var/log/nginx/error.log`
4. Убедитесь, что порт 3000 открыт: `netstat -tuln | grep 3000`

### База данных не создается

```bash
mkdir -p data
chmod 755 data
```

### Ошибки установки зависимостей

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Обновление бота

```bash
cd ~/dagger-bot
git pull  # если используете git
npm install  # если обновились зависимости
pm2 restart dagger-bot
```

## Backup базы данных

```bash
# Создание backup
cp data/bot.db data/bot.db.backup

# Автоматический backup каждый день
crontab -e
```

Добавьте:

```
0 3 * * * cp ~/dagger-bot/data/bot.db ~/dagger-bot/data/bot.db.$(date +\%Y\%m\%d)
```

## Поддержка

По вопросам работы бота обращайтесь в техподдержку.

## Лицензия

MIT
