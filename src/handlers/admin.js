import User from '../models/user.js';
import Key from '../models/key.js';
import remnawave from '../services/remnawave.js';
import crypto from 'crypto';
import { PLANS } from '../config/plans.js';
import { adminPanelKeyboard, userManageKeyboard, extendDurationKeyboard, newKeyPlansKeyboard } from '../keyboards/index.js';

const ADMIN_IDS = () => process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()));

export const adminPanelHandler = async (ctx) => {
  if (!ADMIN_IDS().includes(ctx.from.id)) {
    await ctx.reply('⛔️ Доступ запрещен');
    return;
  }

  const users = User.searchByUsername('');
  let text = `⚙️ Админ-панель Dagger\n\n`;
  text += `👥 Всего пользователей: ${users.length}\n\n`;
  text += `Для поиска пользователя отправьте:\n`;
  text += `• Telegram ID\n`;
  text += `• Имя пользователя (@username)\n`;
  text += `• Или нажмите "Найти пользователя"\n`;

  await ctx.reply(text, adminPanelKeyboard());
};

export const adminFindHandler = async (ctx) => {
  if (!ADMIN_IDS().includes(ctx.from.id)) {
    await ctx.reply('⛔️ Доступ запрещен');
    return;
  }

  const query = ctx.message.text.trim().replace('@', '');

  let user = null;

  if (/^\d+$/.test(query)) {
    user = User.searchByTelegramId(parseInt(query));
  }

  if (!user) {
    const results = User.searchByUsername(query);
    if (results.length > 0) user = results[0];
  }

  if (!user) {
    await ctx.reply('❌ Пользователь не найден');
    return;
  }

  const keys = Key.findByUserId(user.id);
  const activeKeys = keys.filter(k => k.is_active === 1 && k.expires_at > Math.floor(Date.now() / 1000));

  let text = `👤 Пользователь найден:\n\n`;
  text += `🆔 Telegram ID: ${user.telegram_id}\n`;
  text += `👤 Username: ${user.username ? '@' + user.username : 'не указан'}\n`;
  text += `📛 Имя: ${user.first_name}\n`;
  text += `📅 Регистрация: ${new Date(user.created_at * 1000).toLocaleDateString('ru-RU')}\n\n`;
  text += `🔑 Ключей: ${keys.length} (активных: ${activeKeys.length})\n\n`;
  text += `Выберите действие:`;

  await ctx.reply(text, userManageKeyboard(user.telegram_id));
};

export const adminNewKeyHandler = async (ctx) => {
  const telegramId = parseInt(ctx.callbackQuery.data.replace('admin_new_', ''));
  const targetUser = User.searchByTelegramId(telegramId);

  if (!targetUser) {
    await ctx.answerCbQuery('Пользователь не найден');
    return;
  }

  await ctx.answerCbQuery();
  await ctx.reply(
    `🔑 Выдача нового ключа для @${targetUser.username || telegramId}\n\nВыберите тариф:`,
    newKeyPlansKeyboard(telegramId)
  );
};

export const adminIssueKeyHandler = async (ctx) => {
  const data = ctx.callbackQuery.data.replace('admin_plan_', '');
  const [telegramIdStr, durationStr] = data.split('_');
  const telegramId = parseInt(telegramIdStr);
  const duration = parseInt(durationStr);

  const targetUser = User.searchByTelegramId(telegramId);
  if (!targetUser) {
    await ctx.answerCbQuery('Пользователь не найден');
    return;
  }

  const plan = PLANS.find(p => p.duration === duration) || {
    name: `${duration} дней`,
    trafficGB: duration * 10,
    price: 0
  };

  await ctx.answerCbQuery();
  await ctx.editMessageText('⏳ Создаю ключ...');

  const uuid = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (duration * 24 * 60 * 60);

  try {
    const email = `${targetUser.telegram_id}_${Date.now()}@dagger.user`;
    await remnawave.createUser(email, plan.trafficGB, duration, uuid);
    const subscriptionUrl = await remnawave.getSubscriptionUrl(uuid, 'dagger_main');

    Key.create(targetUser.id, uuid, subscriptionUrl, plan.name, duration, 0, expiresAt);

    await ctx.editMessageText(
      `✅ Ключ успешно выдан!\n\n` +
      `👤 Пользователь: @${targetUser.username || telegramId}\n` +
      `📦 Тариф: ${plan.name}\n` +
      `🔗 Ссылка:\n<code>${subscriptionUrl}</code>`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Admin key creation error:', error);
    await ctx.editMessageText('❌ Ошибка при создании ключа');
  }
};

export const adminExtendHandler = async (ctx) => {
  const telegramId = parseInt(ctx.callbackQuery.data.replace('admin_extend_', ''));
  const targetUser = User.searchByTelegramId(telegramId);

  if (!targetUser) {
    await ctx.answerCbQuery('Пользователь не найден');
    return;
  }

  const keys = Key.getActiveKeys(targetUser.id);

  if (keys.length === 0) {
    await ctx.answerCbQuery('Нет активных ключей для продления');
    return;
  }

  await ctx.answerCbQuery();
  await ctx.reply(
    `🔄 Продление ключа для @${targetUser.username || telegramId}\n\nВыберите ключ:`,
    {
      reply_markup: {
        inline_keyboard: keys.map(key => [{
          text: `${key.plan_name} (осталось ${Math.ceil((key.expires_at - Date.now() / 1000) / 86400)} дн.)`,
          callback_data: `admin_select_key_${key.id}_${telegramId}`
        }])
      }
    }
  );
};

export const adminSelectKeyHandler = async (ctx) => {
  const data = ctx.callbackQuery.data.replace('admin_select_key_', '');
  const [keyIdStr, telegramIdStr] = data.split('_');
  const keyId = parseInt(keyIdStr);
  const telegramId = parseInt(telegramIdStr);

  const key = (await import('../config/database.js')).default.prepare('SELECT * FROM keys WHERE id = ?').get(keyId);

  if (!key) {
    await ctx.answerCbQuery('Ключ не найден');
    return;
  }

  await ctx.answerCbQuery();
  await ctx.reply(
    `🔄 Продление ключа "${key.plan_name}"\n\nВыберите срок продления:`,
    extendDurationKeyboard(key.id)
  );
};

export const adminDoExtendHandler = async (ctx) => {
  const data = ctx.callbackQuery.data.replace('extend_dur_', '');
  const [keyIdStr, daysStr] = data.split('_');
  const keyId = parseInt(keyIdStr);
  const days = parseInt(daysStr);

  const db = (await import('../config/database.js')).default;
  const key = db.prepare('SELECT * FROM keys WHERE id = ?').get(keyId);

  if (!key) {
    await ctx.answerCbQuery('Ключ не найден');
    return;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText('⏳ Продлеваю ключ...');

  const now = Math.floor(Date.now() / 1000);
  const newExpiry = Math.max(key.expires_at, now) + (days * 24 * 60 * 60);

  try {
    await remnawave.extendUser(key.key_uuid, days);
    Key.updateExpiry(key.key_uuid, newExpiry);

    await ctx.editMessageText(
      `✅ Ключ успешно продлён!\n\n` +
      `📦 Тариф: ${key.plan_name}\n` +
      `📅 Продлён на: ${days} дн.\n` +
      `⏰ Новая дата: ${new Date(newExpiry * 1000).toLocaleDateString('ru-RU')}`
    );
  } catch (error) {
    console.error('Admin key extension error:', error);
    await ctx.editMessageText('❌ Ошибка при продлении ключа');
  }
};
