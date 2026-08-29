import express from 'express';
import platega from '../services/platega.js';
import { processPaidKey } from '../handlers/purchase.js';
import User from '../models/user.js';
import Key from '../models/key.js';

const router = express.Router();

router.post('/webhook/platega', async (req, res) => {
  try {
    const signature = req.headers['x-platega-signature'] || req.body.signature;
    const data = req.body;

    if (!platega.verifyWebhook(data, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    if (data.status === 'success' || data.status === 'completed') {
      await processPaidKey(data.order_id);

      const payment = (await import('../models/payment.js')).default.findByPaymentId(data.order_id);
      if (payment) {
        const user = User.findById(payment.user_id);
        const keys = Key.findByUserId(user.id);
        const newKey = keys[keys.length - 1];

        if (newKey && global.bot) {
          await global.bot.telegram.sendMessage(
            user.telegram_id,
            `✅ Оплата прошла успешно!\n\n` +
            `🔑 Ваш ключ активирован:\n` +
            `📦 Тариф: ${payment.plan_name}\n\n` +
            `🔗 Ссылка для подключения:\n<code>${newKey.subscription_url}</code>\n\n` +
            `Скопируйте ссылку и добавьте её в ваше приложение.`,
            { parse_mode: 'HTML' }
          );
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Error');
  }
});

router.get('/payment/success', async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Оплата успешна</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          text-align: center;
          max-width: 400px;
        }
        h1 { color: #4CAF50; }
        p { color: #666; line-height: 1.6; }
        .icon { font-size: 60px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✅</div>
        <h1>Оплата успешна!</h1>
        <p>Ваш ключ активирован и отправлен вам в бота.</p>
        <p>Вернитесь в Telegram, чтобы получить ссылку для подключения.</p>
      </div>
    </body>
    </html>
  `);
});

router.get('/payment/fail', async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ошибка оплаты</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          text-align: center;
          max-width: 400px;
        }
        h1 { color: #f44336; }
        p { color: #666; line-height: 1.6; }
        .icon { font-size: 60px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">❌</div>
        <h1>Ошибка оплаты</h1>
        <p>К сожалению, оплата не прошла.</p>
        <p>Пожалуйста, попробуйте снова или обратитесь в поддержку.</p>
      </div>
    </body>
    </html>
  `);
});

export default router;
