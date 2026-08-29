import User from '../models/user.js';
import Key from '../models/key.js';
import { backKeyboard } from '../keyboards/index.js';

const formatExpiry = (expiresAt) => {
  const now = Math.floor(Date.now() / 1000);
  const diff = expiresAt - now;

  if (diff <= 0) return '⛔️ Истёк';

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);

  if (days > 0) return `${days} дн. ${hours} ч.`;
  return `${hours} ч.`;
};

const maskUrl = (url) => {
  if (!url) return '';
  if (url.length <= 30) return url;
  return url.substring(0, 20) + '...' + url.substring(url.length - 5);
};

export const myKeysHandler = async (ctx) => {
  const telegramId = ctx.from.id;
  const user = User.findByTelegramId(telegramId);

  if (!user) {
    await ctx.reply('Пользователь не найден. Используйте /start');
    return;
  }

  const keys = Key.findByUserId(user.id);

  if (keys.length === 0) {
    await ctx.reply(
      '📋 У вас пока нет ключей.\n\nНажмите "Купить ключ" для приобретения.'
    );
    return;
  }

  let text = '📋 Ваши ключи:\n\n';

  for (const key of keys) {
    const isActive = key.is_active === 1;
    const status = isActive ? '✅' : '⛔️';
    const expiry = formatExpiry(key.expires_at);

    text += `${status} ${key.plan_name}\n` +
            `📅 Осталось: ${expiry}\n` +
            `🔗 ${maskUrl(key.subscription_url)}\n`;

    if (isActive) {
      text += `👇 Ссылка для подключения:\n`;
      text += `<code>${key.subscription_url}</code>\n`;
    }

    text += `\n`;
  }

  const buttons = [];
  keys.forEach((key, index) => {
    if (key.is_active === 1) {
      buttons.push([{
        text: `🔗 Скопировать ключ #${index + 1}`,
        callback_data: `copy_key_${key.id}`
      }]);
    }
  });

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...buttons,
        [{ text: '💳 Купить ещё', callback_data: 'menu_buy' }]
      ]
    }
  });
};

export const copyKeyHandler = async (ctx) => {
  const keyId = parseInt(ctx.callbackQuery.data.replace('copy_key_', ''));
  const stmt = (await import('../config/database.js')).default.prepare('SELECT * FROM keys WHERE id = ?');
  const key = stmt.get(keyId);

  if (!key) {
    await ctx.answerCbQuery('Ключ не найден');
    return;
  }

  await ctx.answerCbQuery('Ссылка скопирована');
  await ctx.reply(
    `🔗 Ссылка для подключения:\n<code>${key.subscription_url}</code>`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '📋 Скопировать ссылку',
            url: key.subscription_url
          }
        ]]
      }
    }
  );
};
