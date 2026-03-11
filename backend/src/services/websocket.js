export class WebSocketManager {
  constructor(app) {
    this.app = app;
    this.clients = new Set();
  }

  handleConnection(ws, req) {
    const clientId = `client_${Date.now()}`;
    console.log(`✅ WebSocket client connected: ${clientId}`);
    
    this.clients.add(ws);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date()
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleClientMessage(ws, message);
      } catch (error) {
        console.error('❌ WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log(`🔌 WebSocket client disconnected: ${clientId}`);
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  handleClientMessage(ws, message) {
    const { event, data } = message;

    switch (event) {
      case 'subscribe':
        ws.subscribed = true;
        console.log('📢 Client subscribed to updates');
        break;
      case 'unsubscribe':
        ws.subscribed = false;
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
        break;
      default:
        console.log('ℹ️  Unknown event:', event);
    }
  }

  broadcast(message) {
    const payload = JSON.stringify(message);
    
    for (const client of this.clients) {
      if (client.readyState === 1) { // OPEN
        client.send(payload);
      }
    }
  }

  broadcastToSubscribed(message) {
    const payload = JSON.stringify(message);
    
    for (const client of this.clients) {
      if (client.readyState === 1 && client.subscribed) {
        client.send(payload);
      }
    }
  }
}
