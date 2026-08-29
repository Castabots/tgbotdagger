import db from '../config/database.js';

class Payment {
  static create(userId, paymentId, amount, planName) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      INSERT INTO payments (user_id, payment_id, amount, plan_name, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);
    return stmt.run(userId, paymentId, amount, planName, now);
  }

  static findByPaymentId(paymentId) {
    const stmt = db.prepare('SELECT * FROM payments WHERE payment_id = ?');
    return stmt.get(paymentId);
  }

  static updateStatus(paymentId, status) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      UPDATE payments
      SET status = ?, completed_at = ?
      WHERE payment_id = ?
    `);
    return stmt.run(status, now, paymentId);
  }

  static getUserPayments(userId) {
    const stmt = db.prepare(`
      SELECT * FROM payments
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `);
    return stmt.all(userId);
  }
}

export default Payment;
