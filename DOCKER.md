# Docker установка Dagger Bot

## Быстрый старт

### 1. Клонируйте репозиторий
```bash
git clone https://github.com/Castabots/tgbotdagger.git
cd tgbotdagger
```

### 2. Создайте .env файл
```bash
cp .env.example .env
nano .env
```

Заполните обязательные параметры:
- `PLATEGA_MERCHANT_ID` - ваш merchant ID
- `PLATEGA_SECRET` - ваш secret key
- `WEBHOOK_URL` - ваш домен (https://your-domain.com)

### 3. Запустите через Docker Compose
```bash
docker-compose up -d
```

Готово! Бот запущен.

## Команды управления

### Просмотр логов
```bash
docker-compose logs -f
```

### Перезапуск
```bash
docker-compose restart
```

### Остановка
```bash
docker-compose stop
```

### Полное удаление
```bash
docker-compose down
```

### Обновление бота
```bash
git pull
docker-compose down
docker-compose up -d --build
```

## Без Docker Compose (только Docker)

### Сборка образа
```bash
docker build -t dagger-bot .
```

### Запуск контейнера
```bash
docker run -d \
  --name dagger-bot \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  dagger-bot
```

### Просмотр логов
```bash
docker logs -f dagger-bot
```

### Остановка
```bash
docker stop dagger-bot
docker rm dagger-bot
```

## Nginx + SSL (опционально)

Если нужен webhook, настройте Nginx на хосте:

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

Установите SSL:
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## Проверка работы

```bash
# Проверка статуса контейнера
docker ps | grep dagger-bot

# Проверка логов
docker-compose logs --tail=50

# Проверка бота в Telegram
# Отправьте /start боту
```

## База данных

База данных SQLite хранится в `./data/bot.db` и сохраняется при перезапуске контейнера.

### Backup базы
```bash
cp data/bot.db data/bot.db.backup
```

### Автоматический backup
```bash
# Создайте cron задачу
crontab -e

# Добавьте строку (backup каждый день в 3:00)
0 3 * * * cp /path/to/tgbotdagger/data/bot.db /path/to/tgbotdagger/data/bot.db.$(date +\%Y\%m\%d)
```

## Устранение проблем

### Контейнер не запускается
```bash
docker-compose logs
```

### Проверка переменных окружения
```bash
docker exec dagger-bot env
```

### Перезапуск с пересборкой
```bash
docker-compose down
docker-compose up -d --build --force-recreate
```

### Очистка всех Docker ресурсов
```bash
docker system prune -a
```

## Требования

- Docker 20.10+
- Docker Compose 2.0+
- 512 MB RAM минимум
- 1 GB свободного места

## Порты

- `3000` - HTTP сервер для webhook

Убедитесь что порт 3000 открыт в firewall:
```bash
ufw allow 3000
```
