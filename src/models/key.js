import db from '../config/database.js';

class Key {
  static create(userId, keyUuid, subscriptionUrl, planName, planDuration, price, expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      INSERT INTO keys (user_id, key_uuid, subscription_url, plan_name, plan_duration, price, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(userId, keyUuid, subscriptionUrl, planName, planDuration, price, now, expiresAt);
  }

  static findByUserId(userId) {
    const stmt = db.prepare(`
      SELECT * FROM keys
      WHERE user_id = ? AND is_active = 1
      ORDER BY created_at DESC
    `);
    return stmt.all(userId);
  }

  static findByUuid(uuid) {
    const stmt = db.prepare('SELECT * FROM keys WHERE key_uuid = ?');
    return stmt.get(uuid);
  }

  static updateExpiry(uuid, newExpiresAt) {
    const stmt = db.prepare('UPDATE keys SET expires_at = ? WHERE key_uuid = ?');
    return stmt.run(newExpiresAt, uuid);
  }

  static deactivate(uuid) {
    const stmt = db.prepare('UPDATE keys SET is_active = 0 WHERE key_uuid = ?');
    return stmt.run(uuid);
  }

  static getActiveKeys(userId) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      SELECT * FROM keys
      WHERE user_id = ? AND is_active = 1 AND expires_at > ?
      ORDER BY expires_at ASC
    `);
    return stmt.all(userId, now);
  }

  static getExpiredKeys(userId) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      SELECT * FROM keys
      WHERE user_id = ? AND expires_at <= ?
      ORDER BY expires_at DESC
    `);
    return stmt.all(userId, now);
  }
}

export default Key;
