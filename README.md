# Dagger Bot

## Установка на сервер (Docker)

```bash
git clone https://github.com/Castabots/tgbotdagger.git
cd tgbotdagger
cp .env.example .env
nano .env  # заполните WEBHOOK_URL
docker-compose up -d
```

## Команды

```bash
docker-compose logs -f     # логи
docker-compose restart     # перезапуск
docker-compose down        # остановка
git pull && docker-compose up -d --build  # обновление
```

## Без Docker

```bash
pip install -r requirements.txt
python -m bot
```
