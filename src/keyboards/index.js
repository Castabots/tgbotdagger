import { Markup } from 'telegraf';

export const mainKeyboard = () => {
  return Markup.keyboard([
    ['🔑 Купить ключ', '📋 Мои ключи'],
    ['👤 Профиль', 'ℹ️ Информация'],
    ['💬 Поддержка']
  ]).resize();
};

export const adminKeyboard = () => {
  return Markup.keyboard([
    ['🔑 Купить ключ', '📋 Мои ключи'],
    ['👤 Профиль', 'ℹ️ Информация'],
    ['💬 Поддержка', '⚙️ Админ-панель']
  ]).resize();
};

export const backKeyboard = () => {
  return Markup.keyboard([['◀️ Назад']]).resize();
};

export const plansKeyboard = (plans) => {
  const buttons = plans.map(plan =>
    Markup.button.callback(
      `${plan.name} - ${plan.price}₽`,
      `buy_${plan.id}`
    )
  );

  return Markup.inlineKeyboard(buttons, { columns: 1 });
};

export const adminPanelKeyboard = () => {
  return Markup.keyboard([
    ['🔍 Найти пользователя'],
    ['◀️ В главное меню']
  ]).resize();
};

export const userManageKeyboard = (userId) => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('➕ Выдать новый ключ', `admin_new_${userId}`)],
    [Markup.button.callback('🔄 Продлить ключ', `admin_extend_${userId}`)],
    [Markup.button.callback('📋 Показать ключи', `admin_keys_${userId}`)]
  ]);
};

export const extendKeyboard = (userKeys) => {
  const buttons = userKeys.map(key =>
    Markup.button.callback(
      `Продлить ${key.plan_name}`,
      `admin_extend_key_${key.id}`
    )
  );

  return Markup.inlineKeyboard(buttons, { columns: 1 });
};

export const extendDurationKeyboard = (keyId) => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('7 дней', `extend_dur_${keyId}_7`)],
    [Markup.button.callback('30 дней', `extend_dur_${keyId}_30`)],
    [Markup.button.callback('90 дней', `extend_dur_${keyId}_90`)],
    [Markup.button.callback('180 дней', `extend_dur_${keyId}_180`)],
    [Markup.button.callback('365 дней', `extend_dur_${keyId}_365`)]
  ]);
};

export const newKeyPlansKeyboard = (userId) => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('1 месяц', `admin_plan_${userId}_30`)],
    [Markup.button.callback('3 месяца', `admin_plan_${userId}_90`)],
    [Markup.button.callback('6 месяцев', `admin_plan_${userId}_180`)],
    [Markup.button.callback('12 месяцев', `admin_plan_${userId}_365`)]
  ]);
};
