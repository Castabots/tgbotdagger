import db from '../config/database.js';

class User {
  static create(telegramId, username, firstName) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, created_at, last_activity)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(telegramId, username, firstName, now, now);
  }

  static findByTelegramId(telegramId) {
    const stmt = db.prepare('SELECT * FROM users WHERE telegram_id = ?');
    return stmt.get(telegramId);
  }

  static updateActivity(telegramId) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare('UPDATE users SET last_activity = ? WHERE telegram_id = ?');
    return stmt.run(now, telegramId);
  }

  static getOrCreate(telegramId, username, firstName) {
    let user = this.findByTelegramId(telegramId);
    if (!user) {
      this.create(telegramId, username, firstName);
      user = this.findByTelegramId(telegramId);
    } else {
      this.updateActivity(telegramId);
    }
    return user;
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static searchByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username LIKE ?');
    return stmt.all(`%${username}%`);
  }

  static searchByTelegramId(telegramId) {
    const stmt = db.prepare('SELECT * FROM users WHERE telegram_id = ?');
    return stmt.get(telegramId);
  }
}

export default User;
