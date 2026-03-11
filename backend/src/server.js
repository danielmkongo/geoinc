import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import db from './db/connection.js';
import authRoutes from './routes/auth.js';
import deviceRoutes from './routes/devices.js';
import readingRoutes from './routes/readings.js';
import commandRoutes from './routes/commands.js';
import alertRoutes from './routes/alerts.js';
import exportRoutes from './routes/export.js';
import adminRoutes from './routes/admin.js';
import { authMiddleware } from './middleware/auth.js';
import { adminMiddleware } from './middleware/admin.js';
import { errorHandler } from './middleware/errorHandler.js';
import { WebSocketManager } from './services/websocket.js';
import { MQTTService } from './services/mqtt.js';
import { HealthService } from './services/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
expressWs(app);

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
const wsManager = new WebSocketManager(app);
const mqttService = new MQTTService();
const healthService = new HealthService(db, mqttService);

// WebSocket endpoint
app.ws('/ws', (ws, req) => {
  wsManager.handleConnection(ws, req);
});

// Public routes
app.use('/api/auth', authRoutes);
app.get('/api/health', async (req, res) => {
  try {
    const health = await healthService.getSystemHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Protected routes
app.use('/api/devices', authMiddleware, deviceRoutes);
app.use('/api/readings', authMiddleware, readingRoutes);
app.use('/api/commands', authMiddleware, commandRoutes);
app.use('/api/alerts', authMiddleware, alertRoutes);
app.use('/api/export', authMiddleware, exportRoutes);
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(frontendDist, 'index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 MQTT Broker: ${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`);
  console.log(`🗄️  Database: ${process.env.DB_PATH || './incubator.db'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);

  // Connect MQTT
  try {
    await mqttService.connect(wsManager);
    console.log('✅ MQTT service started');
  } catch (error) {
    console.error('⚠️  MQTT connection failed (will retry automatically):', error.message);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down gracefully...');
  await mqttService.disconnect();
  process.exit(0);
});

export { app, wsManager, mqttService };
