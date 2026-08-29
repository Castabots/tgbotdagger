from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from bot.config import PLANS


def main_kb():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🔑 Купить ключ"), KeyboardButton(text="📋 Мои ключи")],
            [KeyboardButton(text="👤 Профиль"), KeyboardButton(text="ℹ️ Информация")],
            [KeyboardButton(text="💬 Поддержка")],
        ],
        resize_keyboard=True,
    )


def admin_kb():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🔑 Купить ключ"), KeyboardButton(text="📋 Мои ключи")],
            [KeyboardButton(text="👤 Профиль"), KeyboardButton(text="ℹ️ Информация")],
            [KeyboardButton(text="💬 Поддержка"), KeyboardButton(text="⚙️ Админ")],
        ],
        resize_keyboard=True,
    )


def admin_panel_kb():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🔍 Найти пользователя")],
            [KeyboardButton(text="◀️ Назад")],
        ],
        resize_keyboard=True,
    )


def plans_kb():
    buttons = []
    for plan in PLANS:
        star = "⭐️ " if plan["id"] == "plan_3m" else ""
        buttons.append([
            InlineKeyboardButton(
                text=f"{star}{plan['name']} — {plan['price']}₽",
                callback_data=f"buy:{plan['id']}",
            )
        ])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def confirm_kb(plan_id: str, price: int):
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=f"✅ Оплатить {price}₽", callback_data=f"pay:{plan_id}")],
            [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel")],
        ]
    )


def admin_user_kb(telegram_id: int):
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="➕ Выдать ключ", callback_data=f"adm_new:{telegram_id}")],
            [InlineKeyboardButton(text="🔄 Продлить ключ", callback_data=f"adm_ext:{telegram_id}")],
            [InlineKeyboardButton(text="📋 Показать ключи", callback_data=f"adm_keys:{telegram_id}")],
        ]
    )


def admin_plans_kb(telegram_id: int):
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="1 месяц", callback_data=f"adm_plan:{telegram_id}:30")],
            [InlineKeyboardButton(text="3 месяца", callback_data=f"adm_plan:{telegram_id}:90")],
            [InlineKeyboardButton(text="6 месяцев", callback_data=f"adm_plan:{telegram_id}:180")],
            [InlineKeyboardButton(text="12 месяцев", callback_data=f"adm_plan:{telegram_id}:365")],
        ]
    )


def extend_duration_kb(key_id: int):
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="7 дней", callback_data=f"ext_do:{key_id}:7")],
            [InlineKeyboardButton(text="30 дней", callback_data=f"ext_do:{key_id}:30")],
            [InlineKeyboardButton(text="90 дней", callback_data=f"ext_do:{key_id}:90")],
            [InlineKeyboardButton(text="180 дней", callback_data=f"ext_do:{key_id}:180")],
            [InlineKeyboardButton(text="365 дней", callback_data=f"ext_do:{key_id}:365")],
        ]
    )
