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
      `${deviceTopic}/actuator/feedback`,
      `${deviceTopic}/device/request_commands`
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
      } else if (topic.includes('device/request_commands')) {
        await this.handleCommandRequest(data);
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
      const { temperature, humidity, soil_temperature,
              pump_status, egg_rotation_motor_status, exhaust_fan_status, inlet_fan_status, radiator_fan_status,
              timestamp } = data;

      await db.query(
        `INSERT OR IGNORE INTO readings
           (device_id, temperature, humidity, soil_temperature,
            pump_status, egg_rotation_motor_status, exhaust_fan_status, inlet_fan_status, radiator_fan_status,
            timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [1, temperature, humidity, soil_temperature ?? null,
         pump_status ?? null, egg_rotation_motor_status ?? null,
         exhaust_fan_status ?? null, inlet_fan_status ?? null, radiator_fan_status ?? null,
         new Date(timestamp * 1000).toISOString()]
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
          data: { temperature, humidity, soil_temperature,
                  pump_status, egg_rotation_motor_status, exhaust_fan_status, inlet_fan_status, radiator_fan_status },
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
      const { pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan } = data;

      await db.query(
        `INSERT INTO actuator_states (device_id, pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [1, pump || false, egg_rotation_motor || false, exhaust_fan || false, inlet_fan || false, radiator_fan || false]
      );

      // Mark the most recent pending command as confirmed
      await db.query(
        `UPDATE command_logs SET status = 'confirmed', acknowledged_at = CURRENT_TIMESTAMP
         WHERE id = (
           SELECT id FROM command_logs
           WHERE device_id = 1 AND status = 'pending'
           ORDER BY sent_at DESC LIMIT 1
         )`
      );

      console.log('✅ Device status updated');

      // Broadcast to WebSocket clients
      if (this.wsManager) {
        this.wsManager.broadcast({
          type: 'actuator_update',
          deviceId: 1,
          data: { pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan },
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

  // Returns true if `available` version is strictly newer than `device` version.
  // Compares dot-separated numeric parts: "1.6" > "1.5", "2.0.1" > "2.0.0"
  _isNewer(available, device) {
    const av = String(available).split('.').map(Number);
    const dv = String(device).split('.').map(Number);
    const len = Math.max(av.length, dv.length);
    for (let i = 0; i < len; i++) {
      const a = av[i] ?? 0;
      const d = dv[i] ?? 0;
      if (a > d) return true;
      if (a < d) return false;
    }
    return false;
  }

  async handleCommandRequest(data) {
    try {
      const deviceVersion = data?.fv ?? null; // firmware version reported by device

      const [cmdResult, otaResult] = await Promise.all([
        db.query(
          `SELECT command_payload FROM command_logs
           WHERE device_id = 1
           ORDER BY sent_at DESC LIMIT 1`
        ),
        db.query(
          `SELECT version, download_url, file_size FROM firmware_updates
           WHERE is_active = 1
           ORDER BY created_at DESC LIMIT 1`
        )
      ]);

      const hasCommand = cmdResult.rows && cmdResult.rows.length > 0;
      const fw = otaResult.rows?.[0] ?? null;

      // Only include firmware_update if:
      //  - there is an active firmware entry, AND
      //  - the device reported its version AND it is older than available, OR
      //  - the device did not report a version (treat as unknown → always send)
      const shouldSendFirmware = fw && (
        deviceVersion === null || this._isNewer(fw.version, deviceVersion)
      );

      if (!hasCommand && !shouldSendFirmware) {
        console.log('ℹ️  Device requested commands but nothing to send');
        return;
      }

      const payload = hasCommand
        ? JSON.parse(cmdResult.rows[0].command_payload)
        : {};

      if (shouldSendFirmware) {
        payload.firmware_update = {
          available: true,
          version: fw.version,
          download_url: fw.download_url,
          file_size: fw.file_size
        };
        console.log(`ℹ️  Sending OTA ${fw.version} (device has ${deviceVersion ?? 'unknown'})`);
      }

      const commandTopic = `${process.env.DEVICE_TOPIC_PREFIX}/actuator/commands`;
      this.client.publish(commandTopic, JSON.stringify(payload), { qos: 1 }, (error) => {
        if (error) {
          console.error('❌ Failed to re-publish pending command:', error);
        } else {
          console.log('✅ Re-published pending command to offline device:', payload);
        }
      });
    } catch (error) {
      console.error('❌ handleCommandRequest error:', error);
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
