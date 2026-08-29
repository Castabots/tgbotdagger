import uuid as uuid_mod
import time
from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery

from bot.config import ADMIN_IDS, PLANS
from bot.keyboards import main_kb, admin_kb, plans_kb, confirm_kb
from bot.database import get_db
from bot.services.platega import platega
from bot.services.remnawave import remnawave

router = Router()


def get_kb(user_id: int):
    return admin_kb() if user_id in ADMIN_IDS else main_kb()


@router.message(F.text == "🔑 Купить ключ")
async def buy_menu(message: Message):
    await message.answer(
        "🔑 Тарифные планы\n\nВыберите план:",
        reply_markup=plans_kb(),
    )


@router.callback_query(F.data.startswith("buy:"))
async def buy_plan(cb: CallbackQuery):
    plan_id = cb.data.split(":")[1]
    plan = next((p for p in PLANS if p["id"] == plan_id), None)
    if not plan:
        await cb.answer("План не найден", show_alert=True)
        return

    await cb.message.edit_text(
        f"🛒 Подтверждение покупки\n\n"
        f"📦 Тариф: {plan['name']}\n"
        f"📅 Срок: {plan['duration']} дней\n"
        f"📊 Трафик: {plan['traffic_gb']} ГБ\n"
        f"💰 Стоимость: {plan['price']}₽\n\n"
        f"Оплатить?",
        reply_markup=confirm_kb(plan["id"], plan["price"]),
    )
    await cb.answer()


@router.callback_query(F.data == "cancel")
async def cancel(cb: CallbackQuery):
    await cb.message.delete()
    await cb.message.answer("Отменено.", reply_markup=get_kb(cb.from_user.id))
    await cb.answer()


@router.callback_query(F.data.startswith("pay:"))
async def do_pay(cb: CallbackQuery):
    plan_id = cb.data.split(":")[1]
    plan = next((p for p in PLANS if p["id"] == plan_id), None)
    if not plan:
        await cb.answer("Ошибка", show_alert=True)
        return

    await cb.answer()
    await cb.message.edit_text("⏳ Создаю платеж...")

    uid = cb.from_user.id
    now = int(time.time())
    order_id = f"DG-{now}-{uuid_mod.uuid4().hex[:8]}"

    async with get_db() as db:
        cur = await db.execute("SELECT id FROM users WHERE telegram_id = ?", (uid,))
        row = await cur.fetchone()
        if not row:
            await db.execute(
                "INSERT INTO users (telegram_id, username, first_name, created_at, last_activity) VALUES (?,?,?,?,?)",
                (uid, cb.from_user.username, cb.from_user.first_name, now, now),
            )
            cur = await db.execute("SELECT id FROM users WHERE telegram_id = ?", (uid,))
            row = await cur.fetchone()
        user_id = row[0]

        await db.execute(
            "INSERT INTO payments (user_id, payment_id, amount, plan_name, status, created_at) VALUES (?,?,?,?,?,?)",
            (user_id, order_id, plan["price"], plan["name"], "pending", now),
        )
        await db.commit()

    try:
        result = await platega.create_payment(order_id, plan["price"], f"Dagger — {plan['name']}", user_id)
        pay_url = result.get("payment_url") or result.get("url", "")

        from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

        await cb.message.edit_text(
            f"💳 Оплата создана!\n\n"
            f"Перейдите по ссылке для оплаты:\n{pay_url}\n\n"
            f"После оплаты ключ будет активирован автоматически.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="💳 Перейти к оплате", url=pay_url)]
            ]),
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        await cb.message.edit_text("❌ Ошибка при создании платежа. Попробуйте позже.")


async def process_paid_key(order_id: str):
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM payments WHERE payment_id = ? AND status = 'pending'", (order_id,)
        )
        payment = await cur.fetchone()
        if not payment:
            return

        payment_id = payment[0]
        user_id = payment[1]
        plan_name = payment[3]

        await db.execute(
            "UPDATE payments SET status = 'completed', completed_at = ? WHERE id = ?",
            (int(time.time()), payment_id),
        )

        plan = next((p for p in PLANS if p["name"] == plan_name), None)
        if not plan:
            return

        cur2 = await db.execute("SELECT telegram_id FROM users WHERE id = ?", (user_id,))
        urow = await cur2.fetchone()
        if not urow:
            return

        telegram_id = urow[0]
        key_uuid = str(uuid_mod.uuid4())
        sub_id = f"dg{uuid_mod.uuid4().hex[:8]}"
        now = int(time.time())
        expires_at = now + plan["duration"] * 86400

        try:
            email = f"{telegram_id}_{now}@dagger.user"
            await remnawave.create_user(email, plan["traffic_gb"], plan["duration"], sub_id)
        except Exception:
            pass

        sub_url = remnawave.get_subscription_url(sub_id, "dagger_main")

        await db.execute(
            "INSERT INTO keys (user_id, key_uuid, subscription_url, plan_name, plan_duration, price, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?)",
            (user_id, key_uuid, sub_url, plan["name"], plan["duration"], plan["price"], now, expires_at),
        )
        await db.commit()

        return telegram_id, sub_url, plan["name"]
