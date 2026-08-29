import User from '../models/user.js';
import Key from '../models/key.js';
import { mainKeyboard, adminKeyboard } from '../keyboards/index.js';

export const isAdmin = (userId) => {
  const adminIds = process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()));
  return adminIds.includes(userId);
};

export const startHandler = async (ctx) => {
  const telegramId = ctx.from.id;
  const username = ctx.from.username || null;
  const firstName = ctx.from.first_name || 'User';

  User.getOrCreate(telegramId, username, firstName);

  const keyboard = isAdmin(telegramId) ? adminKeyboard() : mainKeyboard();

  await ctx.reply(
    `👋 Добро пожаловать в Dagger!\n\n` +
    `Здесь вы можете приобрести ключи доступа и управлять своими подписками.\n\n` +
    `Выберите действие из меню ниже:`,
    keyboard
  );
};

export const profileHandler = async (ctx) => {
  const telegramId = ctx.from.id;
  const user = User.findByTelegramId(telegramId);

  if (!user) {
    await ctx.reply('Пользователь не найден. Используйте /start');
    return;
  }

  const activeKeys = Key.getActiveKeys(user.id);
  const allKeys = Key.findByUserId(user.id);

  const createdDate = new Date(user.created_at * 1000).toLocaleDateString('ru-RU');

  await ctx.reply(
    `👤 Ваш профиль:\n\n` +
    `🆔 ID: ${user.telegram_id}\n` +
    `👤 Имя: ${user.first_name}\n` +
    `📅 Регистрация: ${createdDate}\n\n` +
    `📊 Статистика:\n` +
    `🔑 Активных ключей: ${activeKeys.length}\n` +
    `📋 Всего ключей: ${allKeys.length}`
  );
};

export const infoHandler = async (ctx) => {
  await ctx.reply(
    `ℹ️ Информация о сервисе Dagger\n\n` +
    `🔐 Мы предоставляем безопасные ключи доступа для обхода блокировок.\n\n` +
    `⚡️ Особенности:\n` +
    `• Высокая скорость соединения\n` +
    `• Стабильная работа 24/7\n` +
    `• Техподдержка\n` +
    `• Несколько тарифных планов\n\n` +
    `📱 Совместимость:\n` +
    `• iOS, Android\n` +
    `• Windows, macOS, Linux\n\n` +
    `💡 После покупки вы получите ссылку для подключения, которую нужно добавить в приложение.`
  );
};

export const supportHandler = async (ctx) => {
  await ctx.reply(
    `💬 Поддержка\n\n` +
    `Если у вас возникли вопросы или проблемы, обращайтесь в нашу службу поддержки:\n\n` +
    `${process.env.SUPPORT_URL}\n\n` +
    `Мы работаем ежедневно и ответим вам в ближайшее время!`
  );
};

export const backHandler = async (ctx) => {
  const telegramId = ctx.from.id;
  const keyboard = isAdmin(telegramId) ? adminKeyboard() : mainKeyboard();

  await ctx.reply('Главное меню:', keyboard);
};
