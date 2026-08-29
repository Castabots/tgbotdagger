import crypto from 'crypto';
import User from '../models/user.js';
import Key from '../models/key.js';
import Payment from '../models/payment.js';
import remnawave from '../services/remnawave.js';
import platega from '../services/platega.js';
import { PLANS, SUB_ID } from '../config/plans.js';
import { plansKeyboard, backKeyboard } from '../keyboards/index.js';

export const buyHandler = async (ctx) => {
  const plansText = '🔑 Тарифные планы\n\nВыберите план для покупки:';

  await ctx.reply(plansText, {
    reply_markup: {
      inline_keyboard: [
        ...PLANS.map((plan) => {
          const isPopular = plan.id === 'plan_3m';
          return [{
            text: `${isPopular ? '⭐️ ' : ''}${plan.name} — ${plan.price}₽`,
            callback_data: `buy_${plan.id}`
          }];
        })
      ]
    }
  });
};

export const buyPlanHandler = async (ctx) => {
  const planId = ctx.callbackQuery.data.replace('buy_', '');
  const plan = PLANS.find(p => p.id === planId);

  if (!plan) {
    await ctx.answerCbQuery('План не найден');
    return;
  }

  await ctx.answerCbQuery();

  const confirmText =
    `🛒 Подтверждение покупки\n\n` +
    `📦 Тариф: ${plan.name}\n` +
    `📅 Срок действия: ${plan.duration} дней\n` +
    `📊 Трафик: ${plan.trafficGB} ГБ\n` +
    `💰 Стоимость: ${plan.price}₽\n\n` +
    `Оплатить?`;

  await ctx.editMessageText(confirmText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: `✅ Оплатить ${plan.price}₽`, callback_data: `pay_${plan.id}` }],
        [{ text: '❌ Отмена', callback_data: 'menu_back' }]
      ]
    }
  });
};

export const payHandler = async (ctx) => {
  const planId = ctx.callbackQuery.data.replace('pay_', '');
  const plan = PLANS.find(p => p.id === planId);
  const telegramId = ctx.from.id;
  const user = User.getOrCreate(telegramId, ctx.from.username, ctx.from.first_name);

  await ctx.answerCbQuery();
  await ctx.editMessageText('⏳ Создаю платеж...');

  const orderId = `DG-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  try {
    Payment.create(user.id, orderId, plan.price, plan.name);

    const paymentResult = await platega.createPayment(
      orderId,
      plan.price,
      `Dagger — ${plan.name}`,
      user.id
    );

    await ctx.editMessageText(
      `💳 Для оплаты перейдите по ссылке:\n\n` +
      `${paymentResult.payment_url}\n\n` +
      `После оплаты ключ будет активирован автоматически.`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '💳 Открыть страницу оплаты', url: paymentResult.payment_url }
          ]]
        }
      }
    );
  } catch (error) {
    console.error('Payment creation error:', error);
    await ctx.editMessageText(
      '❌ Ошибка при создании платежа. Попробуйте позже или обратитесь в поддержку.'
    );
  }
};

export const processPaidKey = async (orderId) => {
  const payment = Payment.findByPaymentId(orderId);
  if (!payment) {
    console.error('Payment not found:', orderId);
    return;
  }

  if (payment.status === 'completed') return;

  Payment.updateStatus(orderId, 'completed');

  const plan = PLANS.find(p => p.name === payment.plan_name);
  const user = User.findById(payment.user_id);

  const uuid = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (plan.duration * 24 * 60 * 60);

  try {
    const email = `${user.telegram_id}@dagger.user`;

    await remnawave.createUser(email, plan.trafficGB, plan.duration, uuid);

    const subscriptionUrl = await remnawave.getSubscriptionUrl(uuid, SUB_ID);

    Key.create(
      user.id,
      uuid,
      subscriptionUrl,
      plan.name,
      plan.duration,
      plan.price,
      expiresAt
    );

    console.log(`Key created for user ${user.telegram_id}: ${uuid}`);
  } catch (error) {
    console.error('Error provisioning key:', error);
  }
};
