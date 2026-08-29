import uuid as uuid_mod
import time
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from bot.config import ADMIN_IDS, PLANS
from bot.keyboards import admin_panel_kb, admin_user_kb, admin_plans_kb, extend_duration_kb, admin_kb
from bot.database import get_db
from bot.services.remnawave import remnawave

router = Router()


@router.message(F.text == "⚙️ Админ")
async def admin_panel(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        return

    async with get_db() as db:
        cur = await db.execute("SELECT COUNT(*) FROM users")
        count = (await cur.fetchone())[0]

    await message.answer(
        f"⚙️ Админ-панель\n\n"
        f"👥 Всего пользователей: {count}\n\n"
        f"Отправьте Telegram ID или @username для поиска:",
        reply_markup=admin_panel_kb(),
    )


@router.message(F.text == "🔍 Найти пользователя")
async def find_prompt(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        return
    await message.answer("Отправьте Telegram ID или @username:")


@router.message(F.text.regexp(r"^(@?\w+|\d+)$"))
async def admin_find(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        return

    query = message.text.strip().lstrip("@")

    async with get_db() as db:
        if query.isdigit():
            cur = await db.execute("SELECT * FROM users WHERE telegram_id = ?", (int(query),))
        else:
            cur = await db.execute("SELECT * FROM users WHERE username LIKE ?", (f"%{query}%",))

        user = await cur.fetchone()

    if not user:
        await message.answer("❌ Пользователь не найден")
        return

    telegram_id = user[1]
    username = user[2]
    first_name = user[3]
    created = time.strftime("%d.%m.%Y", time.localtime(user[4]))

    async with get_db() as db:
        cur = await db.execute("SELECT COUNT(*) FROM keys WHERE user_id = ?", (user[0],))
        total_keys = (await cur.fetchone())[0]
        now = int(time.time())
        cur2 = await db.execute(
            "SELECT COUNT(*) FROM keys WHERE user_id = ? AND is_active = 1 AND expires_at > ?",
            (user[0], now),
        )
        active_keys = (await cur2.fetchone())[0]

    await message.answer(
        f"👤 Пользователь:\n\n"
        f"🆔 ID: {telegram_id}\n"
        f"📛 Username: @{username or 'нет'}\n"
        f"👤 Имя: {first_name}\n"
        f"📅 Регистрация: {created}\n\n"
        f"🔑 Ключей: {total_keys} (активных: {active_keys})\n\n"
        f"Выберите действие:",
        reply_markup=admin_user_kb(telegram_id),
    )


@router.callback_query(F.data.startswith("adm_new:"))
async def admin_new_key(cb: CallbackQuery):
    if cb.from_user.id not in ADMIN_IDS:
        await cb.answer("⛔️", show_alert=True)
        return

    telegram_id = int(cb.data.split(":")[1])
    await cb.answer()
    await cb.message.answer(
        f"➕ Выдача ключа для {telegram_id}\n\nВыберите тариф:",
        reply_markup=admin_plans_kb(telegram_id),
    )


@router.callback_query(F.data.startswith("adm_plan:"))
async def admin_issue_key(cb: CallbackQuery):
    if cb.from_user.id not in ADMIN_IDS:
        await cb.answer("⛔️", show_alert=True)
        return

    parts = cb.data.split(":")
    telegram_id = int(parts[1])
    duration = int(parts[2])

    plan = next((p for p in PLANS if p["duration"] == duration), None)
    if not plan:
        plan = {"name": f"{duration} дней", "traffic_gb": duration * 10, "price": 0, "duration": duration}

    await cb.answer()
    await cb.message.edit_text("⏳ Создаю ключ...")

    async with get_db() as db:
        cur = await db.execute("SELECT id FROM users WHERE telegram_id = ?", (telegram_id,))
        row = await cur.fetchone()
        if not row:
            await cb.message.edit_text("❌ Пользователь не найден в базе")
            return

        user_id = row[0]
        key_uuid = str(uuid_mod.uuid4())
        sub_id = f"dg{uuid_mod.uuid4().hex[:8]}"
        now = int(time.time())
        expires_at = now + duration * 86400

        try:
            email = f"{telegram_id}_{now}@dagger.user"
            await remnawave.create_user(email, plan["traffic_gb"], duration, sub_id)
        except Exception as e:
            print(f"Remnawave error: {e}")

        sub_url = remnawave.get_subscription_url(sub_id, "dagger_main")

        await db.execute(
            "INSERT INTO keys (user_id, key_uuid, subscription_url, plan_name, plan_duration, price, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?)",
            (user_id, key_uuid, sub_url, plan["name"], duration, 0, now, expires_at),
        )
        await db.commit()

    await cb.message.edit_text(
        f"✅ Ключ выдан!\n\n"
        f"👤 Пользователь: {telegram_id}\n"
        f"📦 Тариф: {plan['name']}\n"
        f"🔗 Ссылка:\n<code>{sub_url}</code>",
        parse_mode="HTML",
    )

    try:
        await cb.bot.send_message(
            telegram_id,
            f"🎁 Вам выдан ключ доступа!\n\n"
            f"📦 Тариф: {plan['name']}\n"
            f"🔗 Ссылка для подключения:\n<code>{sub_url}</code>",
            parse_mode="HTML",
        )
    except Exception:
        pass


@router.callback_query(F.data.startswith("adm_ext:"))
async def admin_extend(cb: CallbackQuery):
    if cb.from_user.id not in ADMIN_IDS:
        await cb.answer("⛔️", show_alert=True)
        return

    telegram_id = int(cb.data.split(":")[1])
    now = int(time.time())

    async with get_db() as db:
        cur = await db.execute("SELECT id FROM users WHERE telegram_id = ?", (telegram_id,))
        row = await cur.fetchone()
        if not row:
            await cb.answer("Пользователь не найден", show_alert=True)
            return

        user_id = row[0]
        cur2 = await db.execute(
            "SELECT id, plan_name, expires_at FROM keys WHERE user_id = ? AND is_active = 1 AND expires_at > ?",
            (user_id, now),
        )
        keys = await cur2.fetchall()

    if not keys:
        await cb.answer("Нет активных ключей", show_alert=True)
        return

    await cb.answer()
    buttons = []
    for k in keys:
        days_left = (k[2] - now) // 86400
        buttons.append([InlineKeyboardButton(
            text=f"{k[1]} ({days_left}д осталось)",
            callback_data=f"adm_selkey:{k[0]}"
        )])

    await cb.message.answer(
        f"🔄 Продление ключа для {telegram_id}\n\nВыберите ключ:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
    )


@router.callback_query(F.data.startswith("adm_selkey:"))
async def admin_select_key(cb: CallbackQuery):
    if cb.from_user.id not in ADMIN_IDS:
        await cb.answer("⛔️", show_alert=True)
        return

    key_id = int(cb.data.split(":")[1])
    await cb.answer()
    await cb.message.edit_text(
        "Выберите срок продления:",
        reply_markup=extend_duration_kb(key_id),
    )


@router.callback_query(F.data.startswith("ext_do:"))
async def admin_do_extend(cb: CallbackQuery):
    if cb.from_user.id not in ADMIN_IDS:
        await cb.answer("⛔️", show_alert=True)
        return

    parts = cb.data.split(":")
    key_id = int(parts[1])
    days = int(parts[2])

    await cb.answer()
    await cb.message.edit_text("⏳ Продлеваю...")

    async with get_db() as db:
        cur = await db.execute("SELECT key_uuid, plan_name, expires_at FROM keys WHERE id = ?", (key_id,))
        key = await cur.fetchone()
        if not key:
            await cb.message.edit_text("❌ Ключ не найден")
            return

        key_uuid = key[0]
        plan_name = key[1]
        old_expiry = key[2]
        now = int(time.time())
        new_expiry = max(old_expiry, now) + days * 86400

        try:
            await remnawave.extend_user(key_uuid, days)
        except Exception as e:
            print(f"Remnawave extend error: {e}")

        await db.execute("UPDATE keys SET expires_at = ? WHERE id = ?", (new_expiry, key_id))
        await db.commit()

    new_date = time.strftime("%d.%m.%Y", time.localtime(new_expiry))
    await cb.message.edit_text(
        f"✅ Ключ продлён!\n\n"
        f"📦 Тариф: {plan_name}\n"
        f"➕ Добавлено: {days} дн.\n"
        f"📅 Новая дата: {new_date}"
    )


@router.callback_query(F.data.startswith("adm_keys:"))
async def admin_show_keys(cb: CallbackQuery):
    if cb.from_user.id not in ADMIN_IDS:
        await cb.answer("⛔️", show_alert=True)
        return

    telegram_id = int(cb.data.split(":")[1])
    now = int(time.time())

    async with get_db() as db:
        cur = await db.execute("SELECT id FROM users WHERE telegram_id = ?", (telegram_id,))
        row = await cur.fetchone()
        if not row:
            await cb.answer("Не найден", show_alert=True)
            return

        cur2 = await db.execute(
            "SELECT plan_name, subscription_url, expires_at, is_active FROM keys WHERE user_id = ? ORDER BY created_at DESC",
            (row[0],),
        )
        keys = await cur2.fetchall()

    if not keys:
        await cb.answer("Нет ключей", show_alert=True)
        return

    await cb.answer()
    text = f"📋 Ключи пользователя {telegram_id}:\n\n"
    for k in keys:
        active = "✅" if k[3] and k[2] > now else "⛔️"
        days = max(0, (k[2] - now) // 86400)
        text += f"{active} {k[0]} | {days}д | <code>{k[1]}</code>\n\n"

    await cb.message.answer(text, parse_mode="HTML")
