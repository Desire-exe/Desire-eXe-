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
let botStartTime = null;

// Readline for pairing input
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise(resolve => rl.question(text, resolve));

// Load contacts
function loadContactsFromFile() {
  if (fs.existsSync(CONTACT_FILE)) {
    try {
      const raw = fs.readFileSync(CONTACT_FILE);
      contactList = JSON.parse(raw) || [];
      console.log(📁 Loaded ${contactList.length} saved contacts.);
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
    } catch (e) {
      console.error('❌ Failed to parse bug log:', e);
    }
  }

  logs.push(logEntry);
  try {
    fs.writeFileSync(BUG_LOG, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error('❌ Failed to save bug log:', e);
  }
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
  const participantNames = participants.map(p => @${p.split('@')[0]}).join(', ');
  
  return ${participantNames} ${actionText};
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

// Check if JID is a newsletter/channel
function isNewsletterJid(jid) {
  return jid && (jid.endsWith('@newsletter') || jid.includes('@newsletter') || jid.includes('broadcast'));
}

// Get uptime string
function getUptimeString() {
  if (!botStartTime) return 'Just started';
  
  const uptime = Date.now() - botStartTime;
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return ${days}d ${hours % 24}h ${minutes % 60}m;
  if (hours > 0) return ${hours}h ${minutes % 60}m;
  if (minutes > 0) return ${minutes}m ${seconds % 60}s;
  return ${seconds}s;
}

// Send connection notification to owner
async function sendConnectionNotification(sock, config) {
  if (!config.OWNER_JID) {
    console.log('⚠ No OWNER_JID configured - skipping connection notification');
    return;
  }
  
  try {
    const timestamp = new Date().toLocaleString();
    const uptime = getUptimeString();
    
    const connectionMessage = `🤖 Desire eXe Bot Connected!
    
✅ Status: Online and Ready
🕒 Connected At: ${timestamp}
⏱ Uptime: ${uptime}
🔗 Session: ${sock.authState.creds.registered ? 'Authenticated' : 'Not Registered'}
📱 Platform: ${sock.user?.platform || 'Unknown'}

The bot is now operational and listening for messages.`;

    await sock.sendMessage(config.OWNER_JID, {
      text: connectionMessage
    });
    
    console.log(✅ Connection notification sent to owner: ${config.OWNER_JID});
  } catch (error) {
    console.error('❌ Failed to send connection notification:', error);
  }
}

// Main bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  let sock;

  // Set bot start time
  botStartTime = Date.now();

  try {
    sock = makeWASocket({
      auth: state,
      logger: P({ level: 'warn' }),
      emitOwnEvents: true,
      shouldIgnoreJid: jid => {
        // Ignore newsletters/channels and bots
        return typeof jid === 'string' && (
          jid.endsWith('@bot') || 
          isNewsletterJid(jid)
        );
      },
      markOnlineOnConnect: true,
      syncFullHistory: true,
      linkPreviewImageThumbnailWidth: 200,
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        console.warn('⚠ getMessage called for unknown message:', key.id);
        return null;
      }
    });
  } catch (err) {
    console.error('❌ Failed to initialize socket:', err);
    return;
  }

  // Load config for owner JID
  let config = {
    AUTO_BLOCK_UNKNOWN: false,
    OWNER_JID: '2347017747337@s.whatsapp.net',
    MAX_MEDIA_SIZE: 1500000
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE));
      config = { ...config, ...fileConfig };
    }
  } catch (e) {
    console.error('❌ Failed to load config:', e);
  }

  // Pairing code flow
  if (!sock.authState.creds.registered) {
    console.log('🔐 No existing session found - starting pairing process...');
    const phoneNumber = await question('📱 Enter your WhatsApp number (with country code): ');
    const code = await sock.requestPairingCode(phoneNumber.trim());
    console.log(\n🔗 Pairing Code: ${code});
    console.log('📲 Enter this on your phone under "Linked Devices" > "Link with code"\n');
    
    // Wait a bit for pairing to complete
    await delay(5000);
  } else {
    console.log('🔑 Using existing session - no pairing required');
  }

  sock.ev.on('creds.update', saveCreds);

  loadContactsFromFile();

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('⚠ Connection closed - reconnecting in 5s...');
        setTimeout(startBot, 5000);
      } else {
        console.log('🔒 Bot logged out - manual re-pairing required');
        // Send logout notification to owner
        if (config.OWNER_JID && sock) {
          try {
            await sock.sendMessage(config.OWNER_JID, {
              text: '🔒 Bot Logged Out\n\nThe bot has been logged out and requires manual re-pairing. Please restart the bot.'
            });
          } catch (error) {
            console.error('❌ Failed to send logout notification:', error);
          }
        }
      }
    }

    if (connection === 'open') {
      console.log('✅ Desire eXe Bot Online!');
      await sock.sendPresenceUpdate('available');
      await restoreActivePresence(sock);
      
      // Send connection notification to owner
      await sendConnectionNotification(sock, config);
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
      
      // 🚫 IGNORE NEWSLETTER/CHANNEL MESSAGES COMPLETELY
      if (isNewsletterJid(jid)) {
        console.log('📰 Ignoring newsletter/channel message from:', jid);
        return;
      }
      
      if (!msg.message || jid === 'status@broadcast' || jid.endsWith('@bot')) return;

      // ✅ unwrap ephemeral/view-once before processing
      msg.message = unwrapMessage(msg.message);

      // 🛡 Detect and handle group mention messages
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
              console.log(🗑 Deleted mention message from ${mentionUser} in ${jid});
            } catch (deleteError) {
              console.error('❌ Failed to delete mention message:', deleteError);
            }
            
            // Send warning message
            await sock.sendMessage(jid, {
              text: ⚠ *Mention Warning!*\n\n@${mentionUser.split('@')[0]} Please avoid mentioning everyone in the group.\n\n🚫 Mass mentions are not allowed and will be deleted automatically.,
              mentions: [mentionUser]
            });

            // Log the incident
            logBugIncident(jid, 'group_mention', User ${mentionUser} mentioned everyone - MESSAGE DELETED);
            
            console.log(🛡 Anti-mention triggered in ${jid} by ${mentionUser} - Message deleted);
            return; // Skip further processing
          }
        }
      }

      if (!jid.endsWith('@g.us') && !jid.endsWith('@broadcast') && !isNewsletterJid(jid)) {
        if (isDangerousText(msg.message)) {
          console.warn(🚨 Bug-like TEXT from ${jid});
          await sock.sendMessage(jid, { text: '⚠' });
          await sock.updateBlockStatus(jid, 'block');
          logBugIncident(jid, 'text', JSON.stringify(msg.message).slice(0, 500));
          if (config.OWNER_JID) {
            await sock.sendMessage(config.OWNER_JID, {
              text: 🚨 Bug alert\nFrom: ${jid}\nType: Text\nAction: Blocked
            });
          }
          return;
        }
      }

      // Auto-block unknowns (excluding newsletters)
      if (jid && !jid.endsWith('@g.us') && !isNewsletterJid(jid)) {
        const known = contactList.find(c => c.jid === jid);
        if (!known) {
          if (config.AUTO_BLOCK_UNKNOWN) {
            console.log(🚫 Unknown contact blocked: ${jid});
            await sock.updateBlockStatus(jid, 'block');
            return;
          }
          const name = msg.pushName || 'Unknown';
          contactList.push({ jid, name, firstSeen: new Date().toISOString() });
          saveContactsToFile();
          console.log(➕ Saved: ${name} (${jid}));
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
    // 🚫 Ignore newsletter/channel participant updates
    if (isNewsletterJid(id)) {
      console.log('📰 Ignoring newsletter/channel participant update:', id);
      return;
    }
    
    console.log(👥 Group update in ${id}: ${action} - ${participants.join(', ')});
    
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
              const userMessage = customMessage.replace(/@user/g, @${user.split('@')[0]});
              const messageText = ${userMessage}\n🕒 ${time}, ${date};
              
              await sock.sendMessage(id, {
                text: messageText,
                mentions: [user]
              });
            }
            
            console.log(✅ ${action} notification sent for ${participants.join(', ')} in ${id});
          } else {
            console.log(ℹ ${action} notifications disabled for ${id});
          }
        } else {
          // Send default notification if config file doesn't exist
          const actionText = action === 'promote' ? '👑 Promoted to Admin' : '🔻 Demoted from Admin';
          const messageText = *${actionText}*\n👤 User: ${getParticipantActionText(participants, action)}\n🕒 Time: ${time}, ${date};
          
          await sock.sendMessage(id, {
            text: messageText,
            mentions: participants
          });
          
          console.log(✅ Default ${action} notification sent for ${participants.join(', ')} in ${id});
        }
        
      } catch (error) {
        console.error(❌ Error sending ${action} notification:, error);
      }
      return;
    }
    
    // Welcome new members
    if (action === 'add') {
      const welcomeFile = './src/welcome.json';
      if (!fs.existsSync(welcomeFile)) return;
      
      let welcomeData = {};
      try {
        welcomeData = JSON.parse(fs.readFileSync(welcomeFile));
      } catch (e) {
        console.error('❌ Failed to load welcome data:', e);
        return;
      }
      
      if (!welcomeData[id]?.enabled) return;

      for (const user of participants) {
        let pfpUrl;
        try {
          pfpUrl = await Promise.race([
            sock.profilePictureUrl(user, 'image'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
        } catch {
          console.log(⚠ Using fallback pfp for ${user});
          pfpUrl = 'https://i.imgur.com/1s6Qz8v.png';
        }

        const welcomeText = (welcomeData[id]?.message || '👋 Welcome @user!')
          .replace('@user', @${user.split('@')[0]});

        try {
          await sock.sendMessage(id, {
            ...(pfpUrl && { image: { url: pfpUrl } }),
            caption: welcomeText,
            mentions: [user]
          });
        } catch (e) {
          console.error('❌ Failed to send welcome with image:', e);
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
        try {
          fs.writeFileSync(settingsFile, '{}');
        } catch (e) {
          console.error('❌ Failed to create group settings file:', e);
        }
        return;
      }

      let settings = {};
      try {
        settings = JSON.parse(fs.readFileSync(settingsFile));
      } catch (e) {
        console.error('❌ Failed to load group settings:', e);
        return;
      }
      
      if (!settings[id]?.goodbyeEnabled) return;

      const goodbyeText = 👋 Goodbye @user!\n⌚ Left at: ${time}, ${date}\nToo Bad We Won't Miss You! 💔;

      for (const user of participants) {
        let pfpUrl;
        try {
          pfpUrl = await Promise.race([
            sock.profilePictureUrl(user, 'image'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
        } catch {
          pfpUrl = 'https://i.imgur.com/1s6Qz8v.png';
        }

        try {
          await sock.sendMessage(id, {
            ...(pfpUrl && { image: { url: pfpUrl } }),
            caption: goodbyeText.replace('@user', @${user.split('@')[0]}),
            mentions: [user]
          });
        } catch (e) {
          console.error('❌ Failed to send goodbye with image:', e);
          await sock.sendMessage(id, {
            text: goodbyeText.replace('@user', @${user.split('@')[0]}),
            mentions: [user]
          });
        }
      }
    }
  });
   
  // Shutdown
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down Desire eXe bot...');
    
    // Send shutdown notification to owner
    if (sock && config.OWNER_JID) {
      try {
        const uptime = getUptimeString();
        await sock.sendMessage(config.OWNER_JID, {
          text: 🔴 *Bot Shutting Down*\n\n⏱ Total Uptime: ${uptime}\n🕒 Shutdown Time: ${new Date().toLocaleString()}
        });
      } catch (error) {
        console.error('❌ Failed to send shutdown notification:', error);
      }
    }
    
    rl.close();
    process.exit();
  });

  return sock;
}

module.exports = startBot;
