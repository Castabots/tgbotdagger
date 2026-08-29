import time
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.utils.markdown import code

from bot.config import ADMIN_IDS
from bot.keyboards import main_kb, admin_kb
from bot.database import get_db

router = Router()


def get_kb(user_id: int):
    return admin_kb() if user_id in ADMIN_IDS else main_kb()


@router.message(F.text == "📋 Мои ключи")
async def my_keys(message: Message):
    uid = message.from_user.id

    async with get_db() as db:
        cur = await db.execute("SELECT id FROM users WHERE telegram_id = ?", (uid,))
        row = await cur.fetchone()
        if not row:
            await message.answer("Используйте /start")
            return

        user_id = row[0]
        cur2 = await db.execute(
            "SELECT * FROM keys WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
        )
        keys = await cur2.fetchall()

    if not keys:
        await message.answer("📋 У вас пока нет ключей.\n\nНажмите «Купить ключ» для приобретения.")
        return

    now = int(time.time())
    text = "📋 Ваши ключи:\n\n"

    for k in keys:
        key_id = k[0]
        sub_url = k[2]
        plan_name = k[3]
        expires_at = k[8]
        is_active = k[9]

        if is_active and expires_at > now:
            remaining = expires_at - now
            days = remaining // 86400
            hours = (remaining % 86400) // 3600
            status = f"⏰ Осталось: {days}д {hours}ч" if days > 0 else f"⏰ Осталось: {hours}ч"
            text += f"✅ {plan_name}\n{status}\n{code(sub_url)}\n\n"
        elif is_active:
            text += f"⛔️ {plan_name}\nИстёк\n\n"
        else:
            text += f"❌ {plan_name}\nНеактивен\n\n"

    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    from bot.config import PLANS

    buttons = []
    for k in keys:
        if k[8] > now and k[9]:
            buttons.append([InlineKeyboardButton(
                text=f"🔗 {k[3]}",
                url=k[2],
            )])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None
    await message.answer(text, reply_markup=kb)
