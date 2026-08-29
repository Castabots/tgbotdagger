import axios from 'axios';
import crypto from 'crypto';

class PlategaService {
  constructor() {
    this.apiUrl = process.env.PLATEGA_API_URL;
    this.merchantId = process.env.PLATEGA_MERCHANT_ID;
    this.secret = process.env.PLATEGA_SECRET;
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  generateSignature(data) {
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&') + this.secret;
    return crypto.createHash('sha256').update(signString).digest('hex');
  }

  async createPayment(orderId, amount, description, userId) {
    try {
      const paymentData = {
        merchant_id: this.merchantId,
        order_id: orderId,
        amount: amount,
        currency: 'RUB',
        description: description,
        success_url: `${process.env.WEBHOOK_URL}/payment/success`,
        fail_url: `${process.env.WEBHOOK_URL}/payment/fail`,
        callback_url: `${process.env.WEBHOOK_URL}/webhook/platega`,
        custom_fields: {
          user_id: userId.toString()
        }
      };

      paymentData.signature = this.generateSignature(paymentData);

      const response = await this.client.post('/payments', paymentData);
      return response.data;
    } catch (error) {
      console.error('Error creating payment in Platega:', error.response?.data || error.message);
      throw error;
    }
  }

  verifyWebhook(data, receivedSignature) {
    const calculatedSignature = this.generateSignature(data);
    return calculatedSignature === receivedSignature;
  }

  async getPaymentStatus(paymentId) {
    try {
      const response = await this.client.get(`/payments/${paymentId}`, {
        params: {
          merchant_id: this.merchantId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting payment status:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new PlategaService();
