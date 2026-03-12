import mqtt from 'mqtt';
import dotenv from 'dotenv';
import db from '../db/connection.js';

dotenv.config();

export class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.lastPing = null;
    this.wsManager = null;
    this.listeners = {};
  }

  async connect(wsManager = null) {
    this.wsManager = wsManager;
    
    const brokerUrl = `mqtt://${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`;
    
    const options = {
      clientId: process.env.MQTT_CLIENT_ID,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 4000,
    };

    if (process.env.MQTT_USERNAME) {
      options.username = process.env.MQTT_USERNAME;
      options.password = process.env.MQTT_PASSWORD;
    }

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        console.log('✅ MQTT Connected');
        this.isConnected = true;
        this.lastPing = new Date();
        
        // Subscribe to topics
        this.subscribeToTopics();
        resolve();
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message.toString());
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT Error:', error);
        this.isConnected = false;
      });

      this.client.on('disconnect', () => {
        console.log('🔌 MQTT Disconnected');
        this.isConnected = false;
      });

      setTimeout(() => reject(new Error('MQTT connection timeout')), 5000);
    });
  }

  subscribeToTopics() {
    const deviceTopic = process.env.DEVICE_TOPIC_PREFIX;
    
    this.client.subscribe([
      `${deviceTopic}/telemetry/data`,
      `${deviceTopic}/device/status`,
      `${deviceTopic}/device/online`,
      `${deviceTopic}/system/alerts`,
      `${deviceTopic}/system/errors`,
      `${deviceTopic}/actuator/feedback`
    ], (error) => {
      if (error) {
        console.error('❌ Subscription error:', error);
      } else {
        console.log('✅ Subscribed to device topics');
      }
    });
  }

  async handleMessage(topic, message) {
    try {
      const data = JSON.parse(message);
      
      if (topic.includes('telemetry/data')) {
        await this.handleSensorData(data);
      } else if (topic.includes('device/status')) {
        await this.handleDeviceStatus(data);
      } else if (topic.includes('system/alerts')) {
        await this.handleAlert(data);
      }
      
      // Broadcast to WebSocket clients
      if (this.wsManager) {
        this.wsManager.broadcast({
          type: 'mqtt_message',
          topic,
          data,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Message handling error:', error);
    }
  }

  async handleSensorData(data) {
    try {
      // Insert reading into database
      const { temperature, humidity, soil_temperature, heater_status, humidifier_status, linear_actuator_status, timestamp } = data;

      await db.query(
        `INSERT OR IGNORE INTO readings (device_id, temperature, humidity, soil_temperature, heater_status, humidifier_status, linear_actuator_status, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [1, temperature, humidity, soil_temperature ?? null, heater_status, humidifier_status, linear_actuator_status, new Date(timestamp * 1000).toISOString()]
      );

      // Update device last_update
      await db.query(
        'UPDATE devices SET last_update = CURRENT_TIMESTAMP, online = 1 WHERE id = ?',
        [1]
      );

      // Check for alert thresholds
      if (temperature !== null) {
        const tempHigh = temperature > 39.0;
        const tempLow = temperature < 36.0;

        if (tempHigh || tempLow) {
          const alertType = tempHigh ? 'TEMPERATURE_HIGH' : 'TEMPERATURE_LOW';
          const threshold = tempHigh ? 39.0 : 36.0;
          
          await this.createAlert(1, alertType, temperature, threshold);
        }
      }

      console.log('✅ Sensor data stored:', { temperature, humidity, soil_temperature });

      // Broadcast to WebSocket clients
      if (this.wsManager) {
        this.wsManager.broadcast({
          type: 'sensor_update',
          deviceId: 1,
          data: { temperature, humidity, soil_temperature, heater_status, humidifier_status, linear_actuator_status },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Sensor data handling error:', error);
    }
  }

  async handleDeviceStatus(data) {
    try {
      // Insert or update actuator state
      const { heater, humidifier, linear_actuator } = data;
      
      await db.query(
        `INSERT INTO actuator_states (device_id, heater, humidifier, linear_actuator, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [1, heater || false, humidifier || false, linear_actuator || false]
      );

      console.log('✅ Device status updated');

      // Broadcast to WebSocket clients
      if (this.wsManager) {
        this.wsManager.broadcast({
          type: 'actuator_update',
          deviceId: 1,
          data: { heater, humidifier, linear_actuator },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Device status handling error:', error);
    }
  }

  async handleAlert(data) {
    try {
      const { type, value, threshold } = data;
      
      await this.createAlert(1, type, value, threshold);

      if (this.wsManager) {
        this.wsManager.broadcast({
          type: 'alert',
          deviceId: 1,
          alert: { type, value, threshold },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Alert handling error:', error);
    }
  }

  async createAlert(deviceId, type, value, threshold) {
    try {
      const severity = (type.includes('CRITICAL') || type.includes('HIGH') || type.includes('LOW')) ? 'critical' : 'warning';
      
      await db.query(
        `INSERT INTO alerts (id, device_id, type, value, threshold, severity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`alert_${Date.now()}`, deviceId, type, value, threshold, severity]
      );

      console.log(`⚠️  Alert created: ${type} (value: ${value}, threshold: ${threshold})`);
    } catch (error) {
      console.error('❌ Alert creation error:', error);
    }
  }

  publishCommand(deviceId, command) {
    if (!this.client || !this.isConnected) {
      return Promise.reject(new Error('MQTT broker not connected'));
    }

    const topic = `${process.env.DEVICE_TOPIC_PREFIX}/actuator/commands`;
    const payload = JSON.stringify(command);

    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          console.error('❌ Publish error:', error);
          reject(error);
        } else {
          console.log('✅ Command published:', command);
          resolve();
        }
      });
    });
  }

  async disconnect() {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, () => {
          console.log('🔌 MQTT Disconnected');
          this.isConnected = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
