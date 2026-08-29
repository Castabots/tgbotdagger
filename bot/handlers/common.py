import time
from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message

from bot.config import ADMIN_IDS, SUPPORT_URL
from bot.keyboards import main_kb, admin_kb
from bot.database import get_db

router = Router()


def get_kb(user_id: int):
    return admin_kb() if user_id in ADMIN_IDS else main_kb()


@router.message(CommandStart())
async def cmd_start(message: Message):
    uid = message.from_user.id
    now = int(time.time())

    async with await get_db() as db:
        existing = await db.execute("SELECT id FROM users WHERE telegram_id = ?", (uid,))
        row = await existing.fetchone()
        if not row:
            await db.execute(
                "INSERT INTO users (telegram_id, username, first_name, created_at, last_activity) VALUES (?,?,?,?,?)",
                (uid, message.from_user.username, message.from_user.first_name, now, now),
            )
        else:
            await db.execute("UPDATE users SET last_activity = ? WHERE telegram_id = ?", (now, uid))
        await db.commit()

    await message.answer(
        "👋 Добро пожаловать в Dagger!\n\n"
        "Здесь вы можете приобрести ключи доступа и управлять подписками.\n\n"
        "Выберите действие:",
        reply_markup=get_kb(uid),
    )


@router.message(F.text == "👤 Профиль")
async def profile(message: Message):
    uid = message.from_user.id

    async with await get_db() as db:
        cur = await db.execute("SELECT * FROM users WHERE telegram_id = ?", (uid,))
        user = await cur.fetchone()
        if not user:
            await message.answer("Используйте /start")
            return

        user_id = user[0]
        now = int(time.time())
        cur2 = await db.execute(
            "SELECT COUNT(*) FROM keys WHERE user_id = ? AND is_active = 1 AND expires_at > ?",
            (user_id, now),
        )
        active = (await cur2.fetchone())[0]

        cur3 = await db.execute("SELECT COUNT(*) FROM keys WHERE user_id = ?", (user_id,))
        total = (await cur3.fetchone())[0]

    created = time.strftime("%d.%m.%Y", time.localtime(user[4]))

    await message.answer(
        f"👤 Ваш профиль:\n\n"
        f"🆔 ID: {uid}\n"
        f"📛 Имя: {user[3]}\n"
        f"📅 Регистрация: {created}\n\n"
        f"🔑 Активных ключей: {active}\n"
        f"📋 Всего ключей: {total}",
    )


@router.message(F.text == "ℹ️ Информация")
async def info(message: Message):
    await message.answer(
        "ℹ️ Информация о сервисе Dagger\n\n"
        "🔐 Безопасные ключи доступа для обхода блокировок.\n\n"
        "⚡️ Особенности:\n"
        "• Высокая скорость\n"
        "• Стабильная работа 24/7\n"
        "• Техподдержка\n"
        "• Несколько тарифов\n\n"
        "📱 Совместимость:\n"
        "• iOS, Android, Windows, macOS, Linux\n\n"
        "💡 После покупки вы получите ссылку для подключения."
    )


@router.message(F.text == "💬 Поддержка")
async def support(message: Message):
    await message.answer(
        f"💬 Поддержка\n\n"
        f"Обращайтесь:\n{SUPPORT_URL}\n\n"
        f"Ответим в ближайшее время!"
    )


@router.message(F.text == "◀️ Назад")
async def back(message: Message):
    await message.answer("Главное меню:", reply_markup=get_kb(message.from_user.id))
