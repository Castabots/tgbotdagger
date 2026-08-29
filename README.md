# Dagger Bot - Docker установка

## Быстрый старт на сервере

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/Castabots/tgbotdagger.git
cd tgbotdagger

# 2. Создайте .env файл
cp .env.example .env
nano .env

# 3. Запустите
docker-compose up -d

# 4. Проверьте логи
docker-compose logs -f
```

## Что настроить в .env

```env
PLATEGA_MERCHANT_ID=ваш_merchant_id
PLATEGA_SECRET=ваш_secret_key
WEBHOOK_URL=https://ваш-домен.com
```

## Команды

```bash
# Просмотр логов
docker-compose logs -f

# Перезапуск
docker-compose restart

# Остановка
docker-compose stop

# Обновление
git pull && docker-compose up -d --build
```

## Готово!
Бот запущен и работает.
