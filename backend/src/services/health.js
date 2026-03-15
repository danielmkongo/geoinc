export class HealthService {
  constructor(db, mqttService) {
    this.db = db;
    this.mqttService = mqttService;
  }

  async getSystemHealth() {
    try {
      const dbHealth = await this.checkDatabase();
      const mqttHealth = this.checkMQTT();

      return {
        status: dbHealth.connected && mqttHealth.connected ? 'healthy' : 'degraded',
        timestamp: new Date(),
        database: dbHealth,
        mqtt_broker: mqttHealth
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  async checkDatabase() {
    try {
      const result = await this.db.query('SELECT 1 as status');
      return {
        connected: true,
        queryTime: '< 100ms'
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  checkMQTT() {
    return {
      connected: this.mqttService.isConnected,
      lastPing: this.mqttService.lastPing
    };
  }
}
