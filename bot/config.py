import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_IDS = [int(x.strip()) for x in os.getenv("ADMIN_IDS", "").split(",")]
SUPPORT_URL = os.getenv("SUPPORT_URL")

PLATEGA_API_URL = os.getenv("PLATEGA_API_URL")
PLATEGA_MERCHANT_ID = os.getenv("PLATEGA_MERCHANT_ID")
PLATEGA_SECRET = os.getenv("PLATEGA_SECRET")

REMNAWAVE_API_URL = os.getenv("REMNAWAVE_API_URL")
REMNAWAVE_API_TOKEN = os.getenv("REMNAWAVE_API_TOKEN")

PORT = int(os.getenv("PORT", 3000))
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")

PLANS = [
    {
        "id": "plan_1m",
        "name": "1 месяц",
        "duration": 30,
        "traffic_gb": 100,
        "price": 200,
        "description": "30 дней доступа | 100 ГБ трафика",
    },
    {
        "id": "plan_3m",
        "name": "3 месяца",
        "duration": 90,
        "traffic_gb": 300,
        "price": 500,
        "description": "90 дней доступа | 300 ГБ трафика | Выгода 100₽",
    },
    {
        "id": "plan_6m",
        "name": "6 месяцев",
        "duration": 180,
        "traffic_gb": 600,
        "price": 900,
        "description": "180 дней доступа | 600 ГБ трафика | Выгода 300₽",
    },
    {
        "id": "plan_12m",
        "name": "12 месяцев",
        "duration": 365,
        "traffic_gb": 1200,
        "price": 1500,
        "description": "365 дней доступа | 1200 ГБ трафика | Выгода 900₽",
    },
]
