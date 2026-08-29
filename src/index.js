import 'dotenv/config';
import { Telegraf } from 'telegraf';
import express from 'express';
import webhookRouter from './routes/webhook.js';
import {
  startHandler,
  profileHandler,
  infoHandler,
  supportHandler,
  backHandler
} from './handlers/common.js';
import {
  buyHandler,
  buyPlanHandler,
  payHandler
} from './handlers/purchase.js';
import {
  myKeysHandler,
  copyKeyHandler
} from './handlers/keys.js';
import {
  adminPanelHandler,
  adminFindHandler,
  adminNewKeyHandler,
  adminIssueKeyHandler,
  adminExtendHandler,
  adminSelectKeyHandler,
  adminDoExtendHandler
} from './handlers/admin.js';

const bot = new Telegraf(process.env.BOT_TOKEN);
global.bot = bot;

bot.start(startHandler);

bot.hears('🔑 Купить ключ', buyHandler);
bot.hears('📋 Мои ключи', myKeysHandler);
bot.hears('👤 Профиль', profileHandler);
bot.hears('ℹ️ Информация', infoHandler);
bot.hears('💬 Поддержка', supportHandler);
bot.hears('◀️ Назад', backHandler);
bot.hears('◀️ В главное меню', backHandler);

bot.hears('⚙️ Админ-панель', adminPanelHandler);
bot.hears('🔍 Найти пользователя', async (ctx) => {
  await ctx.reply('Отправьте Telegram ID или @username пользователя:');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;

  if (text.startsWith('/')) return;

  const menuButtons = [
    '🔑 Купить ключ', '📋 Мои ключи', '👤 Профиль',
    'ℹ️ Информация', '💬 Поддержка', '◀️ Назад',
    '⚙️ Админ-панель', '🔍 Найти пользователя', '◀️ В главное меню'
  ];

  if (menuButtons.includes(text)) return;

  const adminIds = process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()));
  if (adminIds.includes(ctx.from.id)) {
    await adminFindHandler(ctx);
  }
});

bot.action(/^buy_/, buyPlanHandler);
bot.action(/^pay_/, payHandler);
bot.action('menu_back', async (ctx) => {
  await ctx.answerCbQuery();
  await buyHandler(ctx);
});
bot.action('menu_buy', async (ctx) => {
  await ctx.answerCbQuery();
  await buyHandler(ctx);
});

bot.action(/^copy_key_/, copyKeyHandler);

bot.action(/^admin_new_/, adminNewKeyHandler);
bot.action(/^admin_plan_/, adminIssueKeyHandler);
bot.action(/^admin_extend_\d+$/, adminExtendHandler);
bot.action(/^admin_select_key_/, adminSelectKeyHandler);
bot.action(/^extend_dur_/, adminDoExtendHandler);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', webhookRouter);

app.get('/', (req, res) => {
  res.send('Dagger Bot is running');
});

const PORT = process.env.PORT || 3000;

async function main() {
  await bot.launch();
  console.log('✅ Bot started');

  app.listen(PORT, () => {
    console.log(`✅ Webhook server listening on port ${PORT}`);
  });
}

main().catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
