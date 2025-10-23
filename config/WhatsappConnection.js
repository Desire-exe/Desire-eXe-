// Imports
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const readline = require('readline');
const MessageHandler = require('../controllers/Message');
const { restoreActivePresence } = require('../presenceSystem');
const delay = ms => new Promise(res => setTimeout(res, ms));

const CONTACT_FILE = './Desire_contact.json';
const CONFIG_FILE = './config.json';
const BUG_LOG = './buglog.json';

let contactList = [];

// Readline for pairing input
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise(resolve => rl.question(text, resolve));

// Load contacts
function loadContactsFromFile() {
  if (fs.existsSync(CONTACT_FILE)) {
    try {
      const raw = fs.readFileSync(CONTACT_FILE);
      contactList = JSON.parse(raw) || [];
      console.log(`📁 Loaded ${contactList.length} saved contacts.`);
    } catch (e) {
      console.error('❌ Failed to parse contact file:', e);
      contactList = [];
    }
  }
}

// Save contacts
function saveContactsToFile() {
  try {
    fs.writeFileSync(CONTACT_FILE, JSON.stringify(contactList, null, 2));
  } catch (e) {
    console.error('❌ Failed to save contacts:', e);
  }
}

// Save bug log
function logBugIncident(jid, type, detail) {
  const logEntry = {
    time: new Date().toISOString(),
    jid,
    type,
    detail
  };

  let logs = [];
  if (fs.existsSync(BUG_LOG)) {
    try {
      logs = JSON.parse(fs.readFileSync(BUG_LOG));
    } catch {}
  }

  logs.push(logEntry);
  fs.writeFileSync(BUG_LOG, JSON.stringify(logs, null, 2));
}

// Unwrap ephemeral/viewOnce messages
function unwrapMessage(message) {
  if (message?.ephemeralMessage?.message) {
    return unwrapMessage(message.ephemeralMessage.message);
  }
  if (message?.viewOnceMessage?.message) {
    return unwrapMessage(message.viewOnceMessage.message);
  }
  return message;
}

// Bug detection helpers
function isDangerousText(msg) {
  const text = msg?.conversation || msg?.extendedTextMessage?.text || '';
  const patterns = [
    /[\u200B-\u200F\u202A-\u202E\u2060]/,
    /(.+)\1{100,}/,
    /.{6000,}/,
    /[\uFFF9-\uFFFF]/,
  ];
  return patterns.some(p => p.test(text));
}

function isSuspiciousMedia(msg, maxBytes) {
  const media = msg?.stickerMessage || msg?.imageMessage || msg?.videoMessage || msg?.audioMessage || msg?.documentMessage;
  const size = media?.fileLength || 0;
  return size > maxBytes;
}

// Get participant action text
function getParticipantActionText(participants, action) {
  const actionTexts = {
    'promote': 'promoted',
    'demote': 'demoted'
  };
  
  const actionText = actionTexts[action] || action;
  const participantNames = participants.map(p => `@${p.split('@')[0]}`).join(', ');
  
  return `${participantNames} ${actionText}`;
}

// Detect group status mention messages
function isGroupStatusMentionMessage(message) {
  return message?.groupStatusMentionMessage?.message?.protocolMessage !== undefined;
}

// Extract info from group status mention
function extractMentionInfo(message) {
  const mentionMsg = message.groupStatusMentionMessage;
  return {
    type: 'group_mention',
    protocolMessage: mentionMsg.message?.protocolMessage,
    timestamp: mentionMsg.messageTimestamp,
    key: mentionMsg.message?.key
  };
}

// Main bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  let sock;

  try {
    sock = makeWASocket({
      auth: state,
      logger: P({ level: 'warn' }),
      emitOwnEvents: true,
      shouldIgnoreJid: jid => typeof jid === 'string' && jid.endsWith('@bot'),
      markOnlineOnConnect: true,
      syncFullHistory: false,
      linkPreviewImageThumbnailWidth: 200,
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        console.warn('⚠️ getMessage called for unknown message:', key.id);
        return null;
      }
    });
  } catch (err) {
    console.error('❌ Failed to initialize socket:', err);
    return;
  }

  // Pairing code flow
  if (!sock.authState.creds.registered) {
    const phoneNumber = await question('📱 Enter your WhatsApp number (with country code): ');
    const code = await sock.requestPairingCode(phoneNumber.trim());
    console.log(`\n🔗 Pairing Code: ${code}`);
    console.log('📲 Enter this on your phone under "Linked Devices" > "Link with code"\n');
  }

  sock.ev.on('creds.update', saveCreds);

  loadContactsFromFile();

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('⚠️ Reconnecting in 5s...');
        setTimeout(startBot, 5000);
      } else {
        console.log('🔒 Bot logged out.');
      }
    }

    if (connection === 'open') {
      console.log('✅ Desire eXe Bot Online!');
      await sock.sendPresenceUpdate('available');
      await restoreActivePresence(sock);
    }
  });

  // Remove old listeners
  sock.ev.removeAllListeners('messages.upsert');
  sock.ev.removeAllListeners('group-participants.update');

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    await delay(100);
    let msg;

    try {
      msg = messages[0];
      const jid = msg.key.remoteJid;
      if (!msg.message || jid === 'status@broadcast' || jid.endsWith('@bot')) return;

      // ✅ unwrap ephemeral/view-once before processing
      msg.message = unwrapMessage(msg.message);

      // 🛡️ Detect and handle group mention messages
      if (isGroupStatusMentionMessage(msg.message)) {
        console.log('🔔 Group mention detected:', jid);
        
        // Check if anti-mention is enabled for this group
        const configFile = './src/antimention.json';
        if (fs.existsSync(configFile)) {
          const config = JSON.parse(fs.readFileSync(configFile));
          
          if (config[jid]?.enabled) {
            const mentionInfo = extractMentionInfo(msg.message);
            const mentionUser = msg.key.participant || msg.key.remoteJid;
            
            // ✅ DELETE THE MENTION MESSAGE
            try {
              await sock.sendMessage(jid, {
                delete: msg.key
              });
              console.log(`🗑️ Deleted mention message from ${mentionUser} in ${jid}`);
            } catch (deleteError) {
              console.error('❌ Failed to delete mention message:', deleteError);
            }
            
            // Send warning message
            await sock.sendMessage(jid, {
              text: `⚠️ *Mention Warning!*\n\n@${mentionUser.split('@')[0]} Please avoid mentioning everyone in the group.\n\n🚫 Mass mentions are not allowed and will be deleted automatically.`,
              mentions: [mentionUser]
            });

            // Log the incident
            logBugIncident(jid, 'group_mention', `User ${mentionUser} mentioned everyone - MESSAGE DELETED`);
            
            console.log(`🛡️ Anti-mention triggered in ${jid} by ${mentionUser} - Message deleted`);
            return; // Skip further processing
          }
        }
      }

      let config = {
        AUTO_BLOCK_UNKNOWN: false,
        OWNER_JID: '2347017747337@s.whatsapp.net',
        MAX_MEDIA_SIZE: 1500000
      };

      try {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE));
      } catch {}

      if (!jid.endsWith('@g.us') && !jid.endsWith('@broadcast') && !jid.includes('newsletter') && !jid.includes('@status')) {
        if (isDangerousText(msg.message)) {
          console.warn(`🚨 Bug-like TEXT from ${jid}`);
          await sock.sendMessage(jid, { text: '⚠️' });
          await sock.updateBlockStatus(jid, 'block');
          logBugIncident(jid, 'text', JSON.stringify(msg.message).slice(0, 500));
          if (config.OWNER_JID) {
            await sock.sendMessage(config.OWNER_JID, {
              text: `🚨 Bug alert\nFrom: ${jid}\nType: Text\nAction: Blocked`
            });
          }
          return;
        }
      }

      // Auto-block unknowns
      if (jid && !jid.endsWith('@g.us') && !jid.endsWith('@newsletter')) {
        const known = contactList.find(c => c.jid === jid);
        if (!known) {
          if (config.AUTO_BLOCK_UNKNOWN) {
            console.log(`🚫 Unknown contact blocked: ${jid}`);
            await sock.updateBlockStatus(jid, 'block');
            return;
          }
          const name = msg.pushName || 'Unknown';
          contactList.push({ jid, name, firstSeen: new Date().toISOString() });
          saveContactsToFile();
          console.log(`➕ Saved: ${name} (${jid})`);
        }
      }

      console.log('📩 Message:', msg.message);
      await MessageHandler(sock, messages, contactList);
    } catch (err) {
      console.error('❌ Message handler error:', err);
      if (msg) await sock.sendMessageAck(msg.key);
    }
  });

  // Group participants update handler (combined for all actions)
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    console.log(`👥 Group update in ${id}: ${action} - ${participants.join(', ')}`);
    
    const now = new Date();
    const date = now.toLocaleDateString('en-GB').replace(/\//g, '-');
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    
    // Handle promote/demote actions
    if (action === 'promote' || action === 'demote') {
      try {
        const configFile = action === 'promote' ? './src/promote.json' : './src/demote.json';
        
        // Check if notifications are enabled for this group
        if (fs.existsSync(configFile)) {
          const configData = JSON.parse(fs.readFileSync(configFile));
          
          if (configData[id]?.enabled) {
            const customMessage = configData[id]?.message || 
              (action === 'promote' ? "👑 @user has been promoted to admin!" : "🔻 @user has been demoted from admin!");
            
            for (const user of participants) {
              const userMessage = customMessage.replace(/@user/g, `@${user.split('@')[0]}`);
              const messageText = `${userMessage}\n🕒 ${time}, ${date}`;
              
              await sock.sendMessage(id, {
                text: messageText,
                mentions: [user]
              });
            }
            
            console.log(`✅ ${action} notification sent for ${participants.join(', ')} in ${id}`);
          } else {
            console.log(`ℹ️ ${action} notifications disabled for ${id}`);
          }
        } else {
          // Send default notification if config file doesn't exist
          const actionText = action === 'promote' ? '👑 Promoted to Admin' : '🔻 Demoted from Admin';
          const messageText = `*${actionText}*\n👤 User: ${getParticipantActionText(participants, action)}\n🕒 Time: ${time}, ${date}`;
          
          await sock.sendMessage(id, {
            text: messageText,
            mentions: participants
          });
          
          console.log(`✅ Default ${action} notification sent for ${participants.join(', ')} in ${id}`);
        }
        
        // Optional: Send to owner/bot admin
        let globalConfig = {};
        try {
          globalConfig = JSON.parse(fs.readFileSync(CONFIG_FILE));
        } catch {}
        
      } catch (error) {
        console.error(`❌ Error sending ${action} notification:`, error);
      }
      return;
    }
    
    // Welcome new members
    if (action === 'add') {
      const welcomeFile = './src/welcome.json';
      if (!fs.existsSync(welcomeFile)) return;
      const welcomeData = JSON.parse(fs.readFileSync(welcomeFile));
      if (!welcomeData[id]?.enabled) return;

      for (const user of participants) {
        let pfpUrl;
        try {
          pfpUrl = await Promise.race([
            sock.profilePictureUrl(user, 'image'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
        } catch {
          console.log(`⚠️ Using fallback pfp for ${user}`);
          pfpUrl = 'https://i.imgur.com/1s6Qz8v.png';
        }

        const welcomeText = (welcomeData[id]?.message || '👋 Welcome @user!')
          .replace('@user', `@${user.split('@')[0]}`);

        try {
          await sock.sendMessage(id, {
            ...(pfpUrl && { image: { url: pfpUrl } }),
            caption: welcomeText,
            mentions: [user]
          });
        } catch {
          await sock.sendMessage(id, {
            text: welcomeText,
            mentions: [user]
          });
        }
      }
    }
    
    // Goodbye for removed members
    if (action === 'remove') {
      const settingsFile = './src/group_settings.json';
      if (!fs.existsSync(settingsFile)) {
        fs.writeFileSync(settingsFile, '{}');
        return;
      }

      const settings = JSON.parse(fs.readFileSync(settingsFile));
      if (!settings[id]?.goodbyeEnabled) return;

      const goodbyeText =
        `👋 Goodbye @user!\n⌚ Left at: ${time}, ${date}\nToo Bad We Won't Miss You! 💔`;

      for (const user of participants) {
        let pfpUrl;
        try {
          pfpUrl = await Promise.race([
            sock.profilePictureUrl(user, 'image'),
            new Promise((_, reject) => setTimeout(() => reject(), 5000))
          ]);
        } catch {
          pfpUrl = 'https://i.imgur.com/1s6Qz8v.png';
        }

        try {
          await sock.sendMessage(id, {
            ...(pfpUrl && { image: { url: pfpUrl } }),
            caption: goodbyeText.replace('@user', `@${user.split('@')[0]}`),
            mentions: [user]
          });
        } catch {
          await sock.sendMessage(id, {
            text: goodbyeText.replace('@user', `@${user.split('@')[0]}`),
            mentions: [user]
          });
        }
      }
    }
  });
   
  // Shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down Desire eXe bot...');
    process.exit();
  });

  return sock;
}

module.exports = startBot;
