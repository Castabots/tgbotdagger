import asyncio
import logging
from aiohttp import web
from aiogram import Bot, Dispatcher

from bot.config import BOT_TOKEN, PORT
from bot.database import init_db
from bot.handlers.common import router as common_router
from bot.handlers.purchase import router as purchase_router, process_paid_key
from bot.handlers.keys import router as keys_router
from bot.handlers.admin import router as admin_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

dp.include_router(common_router)
dp.include_router(purchase_router)
dp.include_router(keys_router)
dp.include_router(admin_router)


async def webhook_handler(request):
    try:
        data = await request.json()
        signature = request.headers.get("X-Platega-Signature", data.get("signature", ""))

        from bot.services.platega import platega
        if not platega.verify_signature(data, signature):
            return web.Response(status=400, text="Invalid signature")

        status = data.get("status", "")
        if status in ("success", "completed"):
            order_id = data.get("order_id", "")
            result = await process_paid_key(order_id)

            if result:
                telegram_id, sub_url, plan_name = result
                await bot.send_message(
                    telegram_id,
                    f"✅ Оплата прошла успешно!\n\n"
                    f"🔑 Ваш ключ активирован:\n"
                    f"📦 Тариф: {plan_name}\n\n"
                    f"🔗 Ссылка для подключения:\n<code>{sub_url}</code>\n\n"
                    f"Скопируйте и добавьте в приложение.",
                    parse_mode="HTML",
                )

        return web.Response(status=200, text="OK")
    except Exception as e:
        log.error(f"Webhook error: {e}")
        return web.Response(status=500, text="Error")


async def health(request):
    return web.Response(text="Dagger Bot is running")


async def main():
    await init_db()
    log.info("Database initialized")

    app = web.Application()
    app.router.add_post("/webhook/platega", webhook_handler)
    app.router.add_get("/", health)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", PORT)
    await site.start()
    log.info(f"Webhook server started on port {PORT}")

    log.info("Bot started")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
