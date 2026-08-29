import axios from 'axios';

class RemnavaveService {
  constructor() {
    this.apiUrl = process.env.REMNAWAVE_API_URL;
    this.apiToken = process.env.REMNAWAVE_API_TOKEN;
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createUser(email, trafficLimitGB, expiryDays, subId) {
    try {
      const expiryDate = Math.floor(Date.now() / 1000) + (expiryDays * 24 * 60 * 60);

      const response = await this.client.post('/users', {
        username: email,
        traffic_limit_bytes: trafficLimitGB * 1024 * 1024 * 1024,
        expiry_time: expiryDate,
        sub_id: subId
      });

      return response.data;
    } catch (error) {
      console.error('Error creating user in Remnawave:', error.response?.data || error.message);
      throw error;
    }
  }

  async getUserByUuid(uuid) {
    try {
      const response = await this.client.get(`/users/${uuid}`);
      return response.data;
    } catch (error) {
      console.error('Error getting user from Remnawave:', error.response?.data || error.message);
      throw error;
    }
  }

  async extendUser(uuid, additionalDays) {
    try {
      const user = await this.getUserByUuid(uuid);
      const currentExpiry = user.expiry_time;
      const newExpiry = currentExpiry + (additionalDays * 24 * 60 * 60);

      const response = await this.client.put(`/users/${uuid}`, {
        expiry_time: newExpiry
      });

      return response.data;
    } catch (error) {
      console.error('Error extending user in Remnawave:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteUser(uuid) {
    try {
      await this.client.delete(`/users/${uuid}`);
      return true;
    } catch (error) {
      console.error('Error deleting user from Remnawave:', error.response?.data || error.message);
      throw error;
    }
  }

  async getSubscriptionUrl(uuid, subId) {
    return `${process.env.REMNAWAVE_API_URL.replace('/api', '')}/sub/${subId}/${uuid}`;
  }
}

export default new RemnavaveService();
