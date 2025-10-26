const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const gTTS = require('gtts');
const Tesseract = require('tesseract.js');
const { Octokit } = require('@octokit/rest');
const QRCode = require('qrcode');
const { GeminiMessage, GeminiImage, GeminiRoastingMessage, GeminiImageRoasting } = require('./Gemini');
const { WikipediaSearch, WikipediaAI, WikipediaImage } = require('./Wikipedia');
const { Weather } = require('./Weather');
const { Translate } = require('./Translates');
const { Surah, SurahDetails } = require('./Quran');
const { Country } = require('./Country');
const { CheckSEO } = require('./SEO');
const { FileSearch } = require('./FileSearch');
const { AesEncryption, AesDecryption, CamelliaEncryption, CamelliaDecryption, ShaEncryption, Md5Encryption, RipemdEncryption, BcryptEncryption } = require('./Tools.js');
const { YoutubeVideo, YoutubeAudio, FacebookVideo, FacebookAudio, TwitterVideo, TwitterAudio, InstagramVideo, InstagramAudio, TikTokVideo, TikTokAudio, VimeoVideo, VimeoAudio  } = require('./Downloader');
const { DetikNews, DetikViral, DetikLatest } = require('./Detik');
const { AnimeVideo, downloadImage } = require('./Anime');
const configPath = path.join(__dirname, '../config.json');
const warningFile = './warnings.json';

function loadWarnings() {
    try {
        const data = fs.readFileSync(warningFile);
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function saveWarnings(data) {
    fs.writeFileSync(warningFile, JSON.stringify(data, null, 2));
}
// ✅ Load config once
let config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
global.prefix = config.prefix || ".";

// ✅ Extract message text safely
function extractTextFromMessage(msg) {
    const message = msg.message;
    if (!message) return "";
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.documentMessage?.caption) return message.documentMessage.caption;
    return "";
}

// ✅ Badwords checker
function containsBadWords(message) {
    const regex = new RegExp(`\\b(${config.BAD_WORDS.join("|")})\\b`, "i");
    return regex.test(message);
}

// ✅ URL detector
const urlRegex =
    /(https?:\/\/[^\s]+|www\.[^\s]+|\b[a-zA-Z0-9-]+\.(com|net|org|io|gov|edu|ng|uk)\b)/i;

// ✅ Main Message Handler
async function Message(sock, messages) {
    if (!messages || !messages[0]) return;
    const msg = messages[0];
    const chatId = msg.key.remoteJid;

    // 🚫 Ignore system messages
    if (!msg.message) return;
    if (msg.message?.protocolMessage) return;
    if (msg.message?.senderKeyDistributionMessage) return;
    

    

    const messageBody = extractTextFromMessage(msg);
    if (!messageBody || typeof messageBody !== "string") return;

    console.log("📩 Message from", chatId, ":", messageBody);

    // 🚫 Anti-badwords
    if (config.ANTI_BADWORDS && containsBadWords(messageBody)) {
        try {
            await sock.sendMessage(chatId, { delete: msg.key });
            console.log(`🚫 Deleted badword message: ${msg.key.id}`);
            return;
        } catch (error) {
            console.error("❌ Error deleting badword message:", error);
        }
    }
// 🚫 Anti-link
if (config.ANTI_LINK && messageBody && msg.key.remoteJid.endsWith('@g.us')) {
    const urlRegex = /https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|bit\.ly|t\.co|goo\.gl|tinyurl|t\.me|wa\.me/g;
    
    // Check if message contains links AND is not from the bot itself
    if (urlRegex.test(messageBody) && !msg.key.fromMe) {
        try {
            // Add reaction first to show action
            await sock.sendMessage(chatId, { react: { text: "🚫", key: msg.key } });
            
            const deleteOptions = {
                remoteJid: chatId,
                fromMe: false, // Fixed: should be false since we're deleting others' messages
                id: msg.key.id,
                participant: msg.key.participant // Include participant for group messages
            };

            await sock.sendMessage(chatId, { delete: deleteOptions });
            console.log(`🔗 Anti-URL: Deleted message from ${msg.key.participant || 'unknown'} (${msg.key.id})`);

            // Warn user with better formatting
            if (msg.key.participant) {
                await sock.sendMessage(chatId, {
                    text: `⚠️ *Link Detected!*\n\n@${msg.key.participant.split('@')[0]} *Links are not allowed in this group!*\n\n🚫 Your message has been deleted.`,
                    mentions: [msg.key.participant]
                });
            } else {
                await sock.sendMessage(chatId, {
                    text: `⚠️ *Link Detected!*\n\n🚫 Links are not allowed in this group!\n\nThe message has been deleted.`
                });
            }

        } catch (error) {
            console.error('❌ Anti-URL Error:', error);
            
            // Different error handling based on error type
            if (error.message.includes("405") || error.message.includes("not authorized")) {
                await sock.sendMessage(chatId, { 
                    text: "⚠️ *Admin Rights Required!*\n\nI need admin permissions to delete links in this group." 
                });
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            } else if (error.message.includes("Message not found")) {
                await sock.sendMessage(chatId, { 
                    text: "⚠️ *Link Warning!*\n\nLinks are not allowed here. The message was already deleted." 
                });
            } else {
                await sock.sendMessage(chatId, { 
                    text: "⚠️ *System Error*\n\nFailed to process link detection. Please try again." 
                });
                await sock.sendMessage(chatId, { react: { text: "😔", key: msg.key } });
            }
        }
    }
}

	    // ✅ Use ONLY the configured prefix
    const currentPrefix = global.prefix;
    let command = null;
    let args = [];

    if (messageBody.startsWith(currentPrefix)) {
    const parts = messageBody.slice(currentPrefix.length).trim().split(' ');
    command = parts[0]; // Removed .toLowerCase()
    args = parts.slice(1);
}



    console.log('📥 Parsed command:', command);
    console.log('📥 Args:', args);
    console.log('📥 Prefix:', currentPrefix);

    // 🔹 setprefix command
const fs = require('fs');     
const path = require('path');
    if (command === "setprefix") {
        if (!args[0]) {
            await sock.sendMessage(
                chatId,
                { text: `❌ Usage: ${currentPrefix}setprefix <newPrefix>` },
                { quoted: msg }
            );
            return;
        }

        const newPrefix = args[0].trim();

        // prevent empty or multi-character spaces
        if (newPrefix.length > 3) {
            await sock.sendMessage(
                chatId,
                { text: `❌ Prefix too long! Use 1–3 characters.` },
                { quoted: msg }
            );
            return;
        }

        global.prefix = newPrefix;

        try {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            config.prefix = newPrefix;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            await sock.sendMessage(
                chatId,
                { text: `✅ Prefix updated to: *${newPrefix}*` },
                { quoted: msg }
            );
            console.log(`🔄 Prefix changed to: ${newPrefix}`);
        } catch (err) {
            console.error("⚠️ Failed to update prefix:", err);
            await sock.sendMessage(
                chatId,
                { text: `⚠️ Error: Could not update prefix.` },
                { quoted: msg }
            );
        }
        return;
    }

    // 🔹Send Basic Text 
    if (command === "alive") {
        await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
        try {
            const responseMessage = "I'm Alive And Well Nigga";
            await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } catch (error) {
            console.error("Error sending message:", error);
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        }
    }


if (command === "smile") {
    try {
        const steps = ["I", "LOVE", "YOU", "BABY", "SMILE", "SMILEY FACE 😄"];
        // Initial message must be plain text (not extendedTextMessage)
        const response = await sock.sendMessage(chatId, {
            text: steps[0]
        });

        for (let i = 1; i < steps.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 600)); // delay between edits
            await sock.sendMessage(chatId, {
                text: steps[i],
                edit: response.key
            });
        }

    } catch (error) {
        console.error("Error editing message:", error);
        await sock.sendMessage(chatId, {
            text: "❌ Failed to animate smile.",
        }, { quoted: msg });
    }
}

//🔹Send Basic Image
    if (command === "send-img") {
        await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
        try {
            const url =
                "https://t3.ftcdn.net/jpg/07/66/87/68/360_F_766876856_XDPvm1sg90Ar5Hwf1jRRIHM4FNCXmhKj.jpg";
            const caption = "Hello, I'm sending an image";
            await sock.sendMessage(chatId, { image: { url }, caption }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } catch (error) {
            console.error("Error sending image:", error);
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        }
    }



const ownerJid = "2347017747337@s.whatsapp.net" // <-- your number with @s.whatsapp.net
const sender = msg.key.participant || msg.key.remoteJid


const isOwner = sender === ownerJid || msg.key.fromMe

const allowCommand = !(config.SELF_BOT_MESSAGE && !isOwner);


if (allowCommand) {
const messageBody =
msg.message?.conversation ||
msg.message?.extendedTextMessage?.text ||
msg.message?.imageMessage?.caption ||
msg.message?.videoMessage?.caption ||
'';
const { managePresence, activePresenceChats, getSenderNumber } = require('../presenceSystem.js');

const ownerNumber = '2347017747337'; // Your number

// ==============================================
// 🔹PRESENCE COMMANDS
// ==============================================

// ------------------ AUTOTYPE ON ------------------
if (command === 'autotype-on') {
    const senderNumber = getSenderNumber(msg);
    const isOwner = senderNumber === ownerNumber;

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });
    try {
        await managePresence(sock, chatId, 'composing', true);
        await sock.sendMessage(chatId, { text: `✍️ Typing indicator ON in this chat (will persist after restart)` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
    return;
}

// ------------------ AUTOTYPE OFF ------------------
if (command === 'autotype-off') {
    const senderNumber = getSenderNumber(msg);
    const isOwner = senderNumber === ownerNumber;

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });
    try {
        await managePresence(sock, chatId, 'composing', false);
        await sock.sendMessage(chatId, { text: `✍️ Typing indicator OFF in this chat` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
    return;
}

// ------------------ AUTORECORD ON ------------------
if (command === 'autorecord-on') {
    const senderNumber = getSenderNumber(msg);
    const isOwner = senderNumber === ownerNumber;

    await sock.sendMessage(chatId, { react: { text: "🎙️", key: msg.key } });
    try {
        await managePresence(sock, chatId, 'recording', true);
        await sock.sendMessage(chatId, { text: `🎙️ Recording indicator ON in this chat (will persist after restart)` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
    return;
}

// ------------------ AUTORECORD OFF ------------------
if (command === 'autorecord-off') {
    const senderNumber = getSenderNumber(msg);
    const isOwner = senderNumber === ownerNumber;

    await sock.sendMessage(chatId, { react: { text: "🎙️", key: msg.key } });
    try {
        await managePresence(sock, chatId, 'recording', false);
        await sock.sendMessage(chatId, { text: `🎙️ Recording indicator OFF in this chat` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
    return;
}

// ------------------ PRESENCE STATUS ------------------
if (command === 'presence-status') {
    const senderNumber = getSenderNumber(msg);
    const isOwner = senderNumber === ownerNumber;
    let statusText = '📊 *Active Presence Indicators:*\n\n';
    
    for (const [presenceKey, _] of activePresenceChats) {
        const [chatId, type] = presenceKey.split('_');
        const typeEmoji = type === 'composing' ? '✍️' : '🎙️';
        statusText += `${typeEmoji} ${type} in ${chatId}\n`;
    }
    
    if (activePresenceChats.size === 0) {
        statusText += 'No active presence indicators';
    }
    
    await sock.sendMessage(chatId, { text: statusText }, { quoted: msg });
    return;
}


// ==============================================
// 🔹FUN COMMANDS
// ==============================================

// 👨‍💻 Savage 
if (command === 'savage') {
    const savages = [
        "You're like a software update. Whenever I see you, I think 'Not now.'",
        "If I had a nickel for every time you said something dumb, I’d be richer than Jeff Bezos.",
        "You’re like a cloud. When you go away, everything improves.",
        "You're the reason why the phrase 'don't make me laugh' was invented.",
        "You’re like a broken pencil: pointless."
    ];
    const savage = savages[Math.floor(Math.random() * savages.length)];
    await sock.sendMessage(chatId, { text: savage }, { quoted: msg });
}

// 👨‍💻 Truth or Dare Option
if (command === 't-or-d') {
    await sock.sendMessage(msg.key.remoteJid, {
        text: `Please choose *~truth* or *~dare* to continue.`,
        mentions: [msg.key.participant || msg.key.remoteJid]
    });
}

// 👨‍💻 Truth 
if (command === 'truth') {
    const truths = [
        "What's the most embarrassing thing you've ever done?",
        "Have you ever had a crush on someone in this group?",
        "What's a secret you've never told anyone?",
        "Who's your last Google search?",
        "Have you ever lied to your best friend?",
        "What's something illegal you've done?",
        "Who was your first love?",
        "What turns you on instantly?",
        "Have you ever stalked someone online?",
        "What's the weirdest dream you've ever had?"
    ];

    const randomTruth = truths[Math.floor(Math.random() * truths.length)];

    await sock.sendMessage(msg.key.remoteJid, {
        text: `*Truth:* ${randomTruth}`,
        mentions: [msg.key.participant || msg.key.remoteJid]
    });
}

// 👨‍💻 Dare
if (command === 'dare') {
    const dares = [
        "Send a voice note saying you love someone here.",
        "Say your crush's name backward.",
        "Act like a cat for the next 2 minutes.",
        "Type 'I’m sexy and I know it' and don’t explain.",
        "Change your name to 'I’m a cutie' for 10 minutes.",
        "Send your last pic from your gallery.",
        "DM your crush and send a screenshot.",
        "Call someone in the group and say 'I miss you'.",
        "Write a poem about your toilet.",
        "Tell the group your worst fear."
    ];

    const randomDare = dares[Math.floor(Math.random() * dares.length)];

    await sock.sendMessage(msg.key.remoteJid, {
        text: `*Dare:* ${randomDare}`,
        mentions: [msg.key.participant || msg.key.remoteJid]
    });
}

// 👨‍💻 Pickup
if (command === 'pickup') {
    const pickups = [
        "Are you Wi-Fi? Because I'm feeling a strong connection.",
        "Do you have a map? I just got lost in your eyes.",
        "Are you French? Because Eiffel for you.",
        "If beauty were time, you’d be eternity.",
        "Do you believe in love at first sight—or should I walk by again?",
        "Are you a magician? Because whenever I look at you, everyone else disappears.",
        "Are you made of copper and tellurium? Because you're Cu-Te.",
        "You're like sunshine on a rainy day.",
        "Do you have a Band-Aid? Because I just scraped my knee falling for you.",
        "Are you a parking ticket? Because you've got FINE written all over you."
    ];

    const line = pickups[Math.floor(Math.random() * pickups.length)];

    await sock.sendMessage(msg.key.remoteJid, {
        text: `*Pickup Line:* ${line}`,
        mentions: [msg.key.participant || msg.key.remoteJid]
    });
}

// 👨‍💻 Desire-eXe Information Command 
if (command === 'Des-info') {
    const botInfo = `
┏━━━━━━━【 *Bot Information* 】━━━━━━━┓
┃ *Bot Name*: Desire eXe Bot
┃ *Version*: 3.0.0
┃ *Creator*: Desire eXe
┃ *Description*: A powerful WhatsApp bot with over 100 fun, cool, and interactive commands.

┃ *Features*:
┃ ▶ Jokes, Fun, and Utility Commands
┃ ▶ Games and Challenges
┃ ▶ AI/ Text Generation
┃ ▶ Media Commands (Images, GIFs, Stickers)
┃ ▶ Group Interaction Commands (Polls, Warnings, and more)
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
    `;
    
    await sock.sendMessage(chatId, { text: botInfo });
    console.log('Bot information sent successfully.');
}

const { WA_DEFAULT_EPHEMERAL } = require('@whiskeysockets/baileys');

// 👨‍💻 Enable disappearing messages (24 hours)
if (command === 'dis-on') {
    try {
        await sock.sendMessage(chatId, {
            disappearingMessagesInChat: 86400  // 24 hours in seconds
        });
        await sock.sendMessage(chatId, { text: "💨 Disappearing messages have been *enabled* (24 hours)." }, { quoted: msg });
    } catch (e) {
        console.error(e);
        await sock.sendMessage(chatId, { text: "❌ Failed to enable disappearing messages." }, { quoted: msg });
    }
}


// 👨‍💻 Disable disappearing messages
if (command === 'dis-off') {
    try {
        await sock.sendMessage(chatId, {
            disappearingMessagesInChat: 0   // 0 = Off
        });
        await sock.sendMessage(chatId, { text: "🚫 Disappearing messages have been *disabled*." }, { quoted: msg });
    } catch (e) {
        console.error(e);
        await sock.sendMessage(chatId, { text: "❌ Failed to disable disappearing messages." }, { quoted: msg });
    }
}

// 👨‍💻 Delete Message 
if (command === 'del' && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    try {
        const contextInfo = msg.message.extendedTextMessage.contextInfo;
        const quotedMsgId = contextInfo.stanzaId;
        const senderJid = contextInfo.participant || msg.key.remoteJid; 
        const quotedMessage = contextInfo.quotedMessage;

        await sock.sendMessage(chatId, {
            delete: {
                remoteJid: chatId,
                fromMe: false,
                id: quotedMsgId,
                participant: senderJid
            }
        });

        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (error) {
        console.error('❌ Failed to delete message:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Could not delete the quoted message.'
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
}

// 👨‍💻 Poll Message (Single Answer Only)
if (command === 'poll') {
    try {
        const from = msg.key.remoteJid;

        // Join args back into one string, then split by '|'
        const input = args.join(" ").split("|").map(s => s.trim()).filter(s => s.length > 0);

        if (input.length < 2) {
            await sock.sendMessage(from, { text: "❌ Usage: \\mpoll Question | option1 | option2 | ..." });
            return;
        }

        const question = input[0]; // first part = poll question
        const options = input.slice(1); // rest = poll options

        await sock.sendMessage(from, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1
            }
        });

    } catch (err) {
        console.error("Poll command error:", err);
        await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to create poll." });
    }
}

// 👨‍💻 Poll Message (Multiple Answers)
if (command === 'mpoll') {
    try {
        const from = msg.key.remoteJid;

        // Join args back into one string, then split by '|'
        const input = args.join(" ").split("|").map(s => s.trim()).filter(s => s.length > 0);

        if (input.length < 2) {
            await sock.sendMessage(from, { text: "❌ Usage: \\mpoll Question | option1 | option2 | ..." });
            return;
        }

        const question = input[0]; // first part = poll question
        const options = input.slice(1); // rest = poll options

        await sock.sendMessage(from, {
            poll: {
                name: question,
                values: options,
                selectableCount: options.length // ✅ multi-select allowed
            }
        });

    } catch (err) {
        console.error("Poll command error:", err);
        await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to create poll." });
    }
}

// ==============================================
// 🔹OWNER COMMANDS
// ==============================================
// 👨‍💻 Desire-eXe Menu 
 const os = require('os');
const process = require('process');
const fs = require('fs');
const path = require('path');

const getUptime = () => {
    const seconds = Math.floor(process.uptime());
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

const getRAMUsage = () => {
    const used = process.memoryUsage().rss / 1024 / 1024;
    const total = os.totalmem() / 1024 / 1024;
    return `${used.toFixed(2)}MB / ${total.toFixed(2)}MB (${((used/total)*100).toFixed(1)}%)`;
};

const getPowerPercentage = () => {
    const percentages = [40, 42, 45, 48, 50, 52, 55, 58, 60, 63, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90, 92, 95, 98];
    const randomIndex = Math.floor(Math.random() * percentages.length);
    const percentage = percentages[randomIndex];
    
    const powerMessages = [
        `⚠️  𝓨𝓞𝓤'𝓥𝓔 𝓤𝓝𝓛𝓞𝓒𝓚𝓔𝓓 𝓞𝓝𝓛𝓨 ${percentage}% 𝓞𝓕 𝓜𝓨 𝓟𝓞𝓦𝓔𝓡…`,
        `⚡  ${percentage}% 𝓞𝓕 𝓜𝓨 𝓟𝓞𝓦𝓔𝓡 𝓡𝓔𝓥𝓔𝓐𝓛𝓔𝓓…`,
        `💀  ${percentage}% 𝓟𝓞𝓦𝓔𝓡 𝓤𝓝𝓛𝓔𝓐𝓢𝓗𝓔𝓓 - 𝓟𝓡𝓞𝓒𝓔𝓔𝓓 𝓦𝓘𝓣𝓗 𝓒𝓐𝓤𝓣𝓘𝓞𝓝`,
        `🔓  ${percentage}% 𝓞𝓕 𝓜𝓨 𝓓𝓐𝓡𝓚 𝓔𝓝𝓔𝓡𝓖𝓨 𝓐𝓒𝓒𝓔𝓢𝓢𝓘𝓑𝓛𝓔`,
        `🌑  ${percentage}% 𝓟𝓞𝓦𝓔𝓡 𝓒𝓞𝓡𝓡𝓤𝓟𝓣𝓘𝓞𝓝 𝓓𝓔𝓣𝓔𝓒𝓣𝓔𝓓`
    ];
    
    const randomMessage = powerMessages[Math.floor(Math.random() * powerMessages.length)];
    return randomMessage;
};

// Import your existing config
const config = require('../config.json'); // Adjust path as needed

if (command === 'menu') {
    const filePath = path.join(__dirname, '../uploads/upload/Desire.png');
    const captionPath = path.join(__dirname, './Utils/menu.txt');
    const audioPath = path.join(__dirname, '../uploads/upload/DesireAura.mp3'); // Adjust path to your audio file
    
    await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });

    try {
        let caption = await fs.promises.readFile(captionPath, 'utf-8');
        
        // DEBUG: Let's see what's available
        console.log('=== DEBUG INFO ===');
        console.log('Config prefix:', config.prefix);
        console.log('Message pushName:', msg.pushName);
        console.log('Bot user ID:', sock.user?.id);
        
        let ownerName = "Desire Admin";
        
        // Try multiple methods to get WhatsApp name
        try {
            // Method 1: Get bot's own contact info
            const botJid = sock.user.id;
            console.log('Bot JID:', botJid);
            
            const botContact = await sock.getContact(botJid);
            console.log('Bot contact:', botContact);
            console.log('Bot name:', botContact.name);
            console.log('Bot notify:', botContact.notify);
            
            ownerName = botContact.name || botContact.notify || msg.pushName || "Desire Admin";
            
        } catch (error) {
            console.log('Bot contact fetch failed:', error.message);
            
            // Method 2: Try owner JID from config
            try {
                const ownerContact = await sock.getContact(config.OWNER_JID);
                console.log('Owner contact:', ownerContact);
                ownerName = ownerContact.name || ownerContact.notify || msg.pushName || "Desire Admin";
            } catch (error2) {
                console.log('Owner contact fetch failed:', error2.message);
                
                // Method 3: Use message sender's name
                ownerName = msg.pushName || "Desire-eXe";
            }
        }
        
        console.log('Final ownerName:', ownerName);
        console.log('Final prefix:', config.prefix);
        
        // Replace dynamic variables - FIXED REGEX
        caption = caption
            .replace(/\$\(uptime\)/g, getUptime())
            .replace(/\$\(RAM\)/g, getRAMUsage())
            .replace(/\$\(metadataname\)/g, ownerName)
            .replace(/\$\{global\.prefix\}/g, config.prefix)
            .replace(/\$\{prefix\}/g, config.prefix)
            .replace(/\$\(powerPercentage\)/g, getPowerPercentage());
        
        console.log('Final caption preview:', caption.substring(0, 200));
        
        // 1. First send the image with caption
        await sock.sendMessage(chatId, { image: { url: filePath }, caption }, { quoted: msg });
        
        // 2. Then send the audio file
        // Check if audio file exists
        if (fs.existsSync(audioPath)) {
            await sock.sendMessage(chatId, { 
                audio: { url: audioPath }, 
                mimetype: 'audio/mpeg',
                ptt: false // Set to true if you want push-to-talk style
            }, { quoted: msg });
            console.log('Audio sent successfully');
        } else {
            console.log('Audio file not found at:', audioPath);
            // Optional: Send a fallback message or just skip
        }
        
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error sending menu:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}
// 👨‍💻 Desire eXe - Owner VCard
if (command === "owner" || command === "contact") {
    const vcard = 
        'BEGIN:VCARD\n' +
        'VERSION:1.9.0\n' +
        'FN:Daramola Daniel (Desire)\n' + // Your full name
        'ORG:Desire-eXe Bot;\n' +         // Organization or tag line
        'TEL;type=CELL;type=VOICE;waid=2347017747337:+234 701 774 7337\n' + // Your WhatsApp number
        'END:VCARD';

    await sock.sendMessage(chatId, {
        contacts: {
            displayName: "Desire eXe Owner",
            contacts: [{ vcard }]
        }
    }, { quoted: msg });
}


// 👨‍💻 Shutdown Desire-eXe
	if (command === 'Desire-off') {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
    const isFromMe = msg.key.fromMe || false;

    if (!isFromMe) {
        await sock.sendMessage(chatId, {
            text: '🚫 You are not authorized to eXecute this command.',
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, {
        text: "⚠️ Are you sure you want to shutdown *Desire eXe Bot*?\nReply with *yes* or *no* within 30 seconds.",
    }, { quoted: msg });

    const filter = async ({ messages }) => {
        const incoming = messages[0];
        const responseChat = incoming.key.remoteJid;
        const responseSender = incoming.key.participant || incoming.key.remoteJid;
        const responseText = incoming.message?.conversation?.toLowerCase()
            || incoming.message?.extendedTextMessage?.text?.toLowerCase();

        if (responseChat === chatId && responseSender === sender) {
            if (responseText === 'yes') {
                await sock.sendMessage(chatId, {
                    text: "🛑 Shutting down *Desire eXe Bot*..."
                }, { quoted: incoming });
                process.exit(0);
            } else if (responseText === 'no') {
                await sock.sendMessage(chatId, {
                    text: "❌ Shutdown cancelled."
                }, { quoted: incoming });
            }
        }
    };


    const listener = sock.ev.on('messages.upsert', filter);

    // Timeout cleanup
    setTimeout(() => {
        sock.ev.off('messages.upsert', filter);
        sock.sendMessage(chatId, {
            text: "⏰ Timeout. Shutdown cancelled."
        }, { quoted: msg });
    }, 30000);
}

// 👨‍💻 Activate Desire-eXe
if (command === 'Desire-Arise') {
    const videoPath = path.join(__dirname, '../uploads/Arise.mp4');

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const videoBuffer = await fs.promises.readFile(videoPath);

        await sock.sendMessage(chatId, {
            video: videoBuffer,
            caption: "_*Desire eXe Bot is Ready and running under his eXecutor (Desire)*_",
            mimetype: 'video/mp4'
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error sending .Desire-on video:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}


// 👨‍💻 Desire-eXe Groups
if (command === 'groups' && sender === ownerJid) {
    try {
        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);
        let text = '*📋 Groups List:*\n\n';
        let count = 1;

        for (const group of groupList) {
            text += `${count++}. ${group.subject}\n🆔: ${group.id}\n👥 Members: ${group.participants.length}\n\n`;
        }

        // Handle long messages (split into chunks of 4000 chars)
        const chunks = text.match(/[\s\S]{1,4000}/g) || [];
        for (let chunk of chunks) {
            await sock.sendMessage(chatId, { text: chunk }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('❌ Error fetching groups:', error);
        await sock.sendMessage(chatId, { text: '⚠️ Failed to fetch group list.' }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// 👨‍💻 Save status
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
if (command === 'save') {
  const isGroup = msg.key.remoteJid.endsWith('@g.us');
  const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
  const ownerJid = '2347017747337@s.whatsapp.net'; // <-- your number with @s.whatsapp.net

  if (sender !== ownerJid && !msg.key.fromMe) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: '❌ You are not authorized to use this command.',
    }, { quoted: msg });
    return;
  }

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: '⚠️ Reply to an image or video to repost and save.',
    }, { quoted: msg });
    return;
  }

  let mediaType, ext;
  if (quoted.imageMessage) {
    mediaType = 'imageMessage';
    ext = '.jpg';
  } else if (quoted.videoMessage) {
    mediaType = 'videoMessage';
    ext = '.mp4';
  } else {
    await sock.sendMessage(msg.key.remoteJid, {
      text: '⚠️ Only image or video messages can be reposted.',
    }, { quoted: msg });
    return;
  }

  const mediaContent = quoted[mediaType];
  const stream = await downloadContentFromMessage(mediaContent, mediaType === 'imageMessage' ? 'image' : 'video');
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  const dir = path.join(__dirname, 'saved_media');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const filename = `media_${Date.now()}${ext}`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);

  // Read the saved file and send
  const mediaBuffer = fs.readFileSync(filePath);
  await sock.sendMessage(ownerJid, {
    [mediaType === 'imageMessage' ? 'image' : 'video']: mediaBuffer,
    caption: mediaContent?.caption || ''
  });

  await sock.sendMessage(msg.key.remoteJid, {
    reaction: {
      text: "✅",
      key: msg.key
    }
  });
}

// 👨‍💻 Set Profile Picture Command (DM Only)
const P = require('pino');
if (command === 'setpp') {

    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg?.imageMessage) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ Reply to an image with \\setpp to change your profile picture.' 
        }, { quoted: msg });
        return;
    }

    try {
        const mediaBuffer = await downloadMediaMessage(
            { message: quotedMsg }, // pass full message object
            'buffer',
            {},
            { logger: P({ level: 'silent' }) }
        );

        // Update profile picture for DM (user's own profile)
        await sock.updateProfilePicture(chatId, mediaBuffer);
        await sock.sendMessage(chatId, { text: '✅ Profile picture updated successfully!' });
    } catch (err) {
        await sock.sendMessage(chatId, { text: `❌ Failed: ${err.message}` });
    }
}


// 📛 AutoBlock OFF
if (command === 'autoblock-off') {
    await sock.sendMessage(chatId, { react: { text: "🔓", key: msg.key } });
    try {
        config.AUTO_BLOCK_UNKNOWN = false;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        console.log(`Response: AutoBlock disabled`);
        await sock.sendMessage(chatId, { text: "❌ AutoBlock is now *OFF*" }, { quoted: msg });
    } catch (error) {
        console.error('Error disabling autoblock:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// 🔒 AutoBlock ON
if (command === 'autoblock-on') {
    await sock.sendMessage(chatId, { react: { text: "🔒", key: msg.key } });
    try {
        config.AUTO_BLOCK_UNKNOWN = true;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        console.log(`Response: AutoBlock enabled`);
        await sock.sendMessage(chatId, { text: "✅ AutoBlock is now *ON*" }, { quoted: msg });
    } catch (error) {
        console.error('Error enabling autoblock:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}



// Block in DMs
if (command === 'block') {
    try {
        if (msg.key.remoteJid.endsWith("@g.us")) {
            await sock.sendMessage(chatId, { text: "❌ This command only works in private chat (DM)." });
            return;
        }

        await sock.updateBlockStatus(chatId, "block"); // block the DM user
        await sock.sendMessage(chatId, { text: "✅ User has been blocked." });
    } catch (error) {
        console.error("Error in block command:", error);
        await sock.sendMessage(chatId, { text: "❌ Failed to block user." });
    }
}



// Send Spam Mesaage (Use with Caution)
const delay = ms => new Promise(res => setTimeout(res, ms));

if (command === 'sspam') {
  const isGroup = msg.key.remoteJid.endsWith('@g.us');
  const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
  const ownerJid = '2347017747337@s.whatsapp.net'; // <-- your number with @s.whatsapp.net

  // Authorization
  if (sender !== ownerJid && !msg.key.fromMe) {
    await sock.sendMessage(chatId, {
      text: '🚫 You are not authorized to eXecute this command.',
    }, { quoted: msg });
    return;
  }

  // Ensure message starts with the right prefix+command
  if (!messageBody.startsWith(prefix + 'sspam')) {
    // not our command
    return;
  }

  // remove the prefix+command and trim
  const argsStr = messageBody.slice((prefix + 'sspam').length).trim();

  // Expect format: <numbers> <count> <message>
  // We'll split on whitespace for the first two parts then treat rest as message
  const parts = argsStr.split(/\s+/);
  if (parts.length < 3) {
    await sock.sendMessage(chatId, {
      text: `❌ Invalid format.\n\n✅ Usage:\n${prefix}sspam +234xxxxx,+234yyyyyy <count> <message>`
    }, { quoted: msg });
    return;
  }

  const numbersPart = parts.shift(); // first token (may contain commas)
  const countStr = parts.shift();    // second token
  const spamMessage = parts.join(' '); // rest is the message

  // parse numbers, keep the + sign for international format
  const numbers = numbersPart.split(/[, \n]+/)
    .map(n => n.trim().replace(/[^\d+]/g, '')) // remove everything except digits and plus
    .filter(Boolean);

  const count = parseInt(countStr, 10);

  // validate
  if (!numbers.length) {
    await sock.sendMessage(chatId, { text: '❌ No valid numbers found.' }, { quoted: msg });
    return;
  }
  if (isNaN(count) || count < 1 || count > 99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999) {
    await sock.sendMessage(chatId, { text: '❌ Please provide a valid count (1 - 99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999)' }, { quoted: msg });
    return;
  }
  if (!spamMessage) {
    await sock.sendMessage(chatId, { text: '❌ Please provide a message to send.' }, { quoted: msg });
    return;
  }

  // send messages
  for (let raw of numbers) {
    // normalize JID: remove leading + if you want numbers without plus; whatsapp accepts phone@s.whatsapp.net
    const normalized = raw.startsWith('+') ? raw.slice(1) : raw;
    const jid = `${normalized}@s.whatsapp.net`;

    for (let i = 0; i < count; i++) {
      // small delay between messages to avoid rate-limits/flooding
      await sock.sendMessage(jid, { text: spamMessage });
      await delay(200); // 200ms between messages; increase if you see issues
    }

    // notify sender in the chat
    await sock.sendMessage(chatId, {
      text: `✅ Sent "${spamMessage}" x${count} to @${normalized}`,
      mentions: [jid]
    });
    await delay(300); // short pause before next number
  }

  await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
}

// Clone User's Profile Picture 
if (command === 'clone-pfp') {
  const isGroup = msg.key.remoteJid.endsWith('@g.us');
  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
 
  if (isGroup) {
    const metadata = await sock.groupMetadata(chatId);
    const groupAdmins = metadata.participants.filter(p => p.admin).map(p => p.id);

    if (!groupAdmins.includes(sender)) {
      await sock.sendMessage(chatId, { text: '❌ Only group admins can use this in groups.' });
      return;
    }
  }

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

  if (!quoted) {
    await sock.sendMessage(chatId, { text: '👤 Please *reply to* the person whose profile you want to clone.' });
    return;
  }

  try {
    const pfpUrl = await sock.profilePictureUrl(quoted, 'image');
    const res = await fetch(pfpUrl);
    const arrayBuffer = await res.arrayBuffer(); // ✅ This replaces .buffer()
    const buffer = Buffer.from(arrayBuffer);     // ✅ Convert to Node buffer

    await sock.updateProfilePicture(sock.user.id, buffer);

    await sock.sendMessage(chatId, {
  react: {
    text: '✅',
    key: msg.key
  }
});
  } catch (err) {
    console.error(err);
    await sock.sendMessage(chatId, { text: '❌ Failed to clone. They may have no profile picture or it\'s private.' });
  }
}

// Fun Facts
if (command === 'fact') {
  const facts = [
    "🔥 Honey never spoils.",
    "🌍 Octopuses have three hearts.",
    "🚀 A day on Venus is longer than a year.",
    // Add more fun facts here...
  ];
  const fact = facts[Math.floor(Math.random() * facts.length)];
  await sock.sendMessage(chatId, { text: fact }, { quoted: msg });
}


// Open View-Once Messages
if (command === 'vv') {
    const sender = msg.key.participant || msg.key.remoteJid;
    const ownerJid = '2347017747337@s.whatsapp.net'; // <-- your number with @s.whatsapp.net
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;

    if (!quotedMsg) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Please reply to a message.' });
        return;
    }

    let mediaMsg = quotedMsg?.viewOnceMessage?.message;

    // If it's not wrapped in viewOnce, try directly
    if (!mediaMsg) mediaMsg = quotedMsg;

    const mediaType = Object.keys(mediaMsg || {})[0];

    if (!['imageMessage', 'videoMessage', 'audioMessage'].includes(mediaType)) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'No view-once media found in replied message.' });
        return;
    }

    try {
        const buffer = await downloadMediaMessage(
            {
                key: {
                    remoteJid: msg.key.remoteJid,
                    id: contextInfo.stanzaId,
                    fromMe: false,
                    participant: contextInfo.participant
                },
                message: mediaMsg,
            },
            'buffer',
            {},
            { logger: sock.logger }
        );

        if (!buffer) throw new Error('Download returned empty buffer.');

        if (mediaType === 'imageMessage') {
            await sock.sendMessage(msg.key.remoteJid, {
                image: buffer,
                caption: 'Here’s the view-once image',
            });
        } else if (mediaType === 'videoMessage') {
            await sock.sendMessage(msg.key.remoteJid, {
                video: buffer,
                caption: 'Here’s the view-once video',
            });
        } else if (mediaType === 'audioMessage') {
            await sock.sendMessage(msg.key.remoteJid, {
                audio: buffer,
                mimetype: 'audio/ogg',
                ptt: true,
            });
        }
    } catch (err) {
        console.error('Error downloading/resending media:', err);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Failed to resend media. It may be expired or corrupted.',
        });
    }
}

// Desire-Mini-AI Bot
const chatSessions = require('./chatSessions'); 
const getAIResponse = require('./getAIResponse');

// Enable Chat
if (command === 'Desire-on') {
  chatSessions.enableChat(chatId);
  await sock.sendMessage(chatId, { text: '🧠 Chat mode activated! Talk to me now...' });
  return;
}

// Disable Chat
if (command === 'Desire-off') {
  chatSessions.disableChat(chatId);
  await sock.sendMessage(chatId, { text: '💤 Chat mode deactivated. Bye for now!' });
  return;
}

// AI Response if Chat Mode is Enabled
if (chatSessions.isChatEnabled(chatId)) {
  // Prevent replying to itself
  if (msg.key.fromMe) return;

  await sock.sendMessage(chatId, { react: { text: "🤖", key: msg.key } });

  chatSessions.addMessage(chatId, "user", messageBody);

  const history = chatSessions.getMessages(chatId);
  const aiReply = await getAIResponse(history);

  
  chatSessions.addMessage(chatId, "assistant", aiReply);

  await sock.sendMessage(chatId, { text: aiReply }, { quoted: msg });
  return;
}

// ==============================================
// 🔹HACKING COMMANDS
// ==============================================

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fetch = require('node-fetch');
const dns = require('dns');

// ✅ Ping (simple 4 times)
if (command === "ping2") {
    await sock.sendMessage(chatId, { react: { text: "⚡", key: msg.key } });

    const target = args[0];
    if (!target) {
        await sock.sendMessage(chatId, { text: 'Please provide a domain or IP. Example: `~ping2 google.com`' }, { quoted: msg });
        return;
    }

    try {
        // OS check (Linux uses -c, Windows uses -n)
        const pingCmd = process.platform === "win32" ? `ping -n 4 ${target}` : `ping -c 4 ${target}`;
        const { stdout, stderr } = await execAsync(pingCmd);
        if (stderr) throw new Error(stderr);

        const pingResult = `*Ping Result for:* ${target}\n\`\`\`\n${stdout}\n\`\`\``;
        await sock.sendMessage(chatId, { text: pingResult }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (err) {
        console.error('Ping error:', err);
        await sock.sendMessage(chatId, { text: `Failed to ping ${target}.` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// ✅ Whois by IP
if (command === "whois") {
    await sock.sendMessage(chatId, { react: { text: "🕵️", key: msg.key } });

    const ipAddress = args[0];
    if (!ipAddress) {
        await sock.sendMessage(chatId, { text: 'Please provide an IP address. Example: `~whois2 8.8.8.8`' }, { quoted: msg });
        return;
    }

    try {
        const response = await fetch(`https://ipinfo.io/${ipAddress}/json`);
        if (!response.ok) throw new Error(`WHOIS lookup failed: ${response.status}`);
        const data = await response.json();

        const ipWhoisInfo = `*WHOIS Info for IP:* ${ipAddress}
*IP Address:* ${data.ip || 'N/A'}
*City:* ${data.city || 'N/A'}
*Region:* ${data.region || 'N/A'}
*Country:* ${data.country || 'N/A'}
*Location:* ${data.loc || 'N/A'}
*Organization:* ${data.org || 'N/A'}
*Hostname:* ${data.hostname || 'N/A'}`;

        await sock.sendMessage(chatId, { text: ipWhoisInfo }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (err) {
        console.error('WHOIS error:', err);
        await sock.sendMessage(chatId, { text: 'Failed to perform WHOIS lookup.' }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// ✅ Ping (IP or mention)
if (command === "ping") {
    await sock.sendMessage(chatId, { react: { text: "🏓", key: msg.key } });

    const target = args[0];
    if (!target) {
        await sock.sendMessage(chatId, { text: 'Provide an IP or user. Example: `~ping 8.8.8.8` or `~ping @user`' }, { quoted: msg });
        return;
    }

    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (ipRegex.test(target)) {
        try {
            const pingCmd = process.platform === "win32" ? `ping -n 4 ${target}` : `ping -c 4 ${target}`;
            const { stdout, stderr } = await execAsync(pingCmd);
            if (stderr) throw new Error(stderr);

            const pingResult = `*Ping Result for IP:* ${target}\n\`\`\`\n${stdout}\n\`\`\``;
            await sock.sendMessage(chatId, { text: pingResult }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            await sock.sendMessage(chatId, { text: `Ping to ${target} failed. Reason: ${err.message}` }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        }
    } else {
        // Just mention a user if it's not IP
        await sock.sendMessage(chatId, { text: `🏓 Pinging you, @${target}!`, mentions: [target] }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    }
}

// ✅ IP Info
if (command === "ipinfo") {
    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

    const target = args[0];
    if (!target) {
        await sock.sendMessage(chatId, { text: 'Provide IP. Example: `~ipinfo 8.8.8.8`' }, { quoted: msg });
        return;
    }

    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(target)) {
        await sock.sendMessage(chatId, { text: 'Invalid IP address.' }, { quoted: msg });
        return;
    }

    try {
        const response = await fetch(`https://ipinfo.io/${target}/json`);
        const data = await response.json();

        const ipInfoResult = `*IP Info for:* ${target}\n\`\`\`\nCity: ${data.city}\nRegion: ${data.region}\nCountry: ${data.country}\nLocation: ${data.loc}\nOrg: ${data.org}\nHostname: ${data.hostname || "N/A"}\n\`\`\``;
        await sock.sendMessage(chatId, { text: ipInfoResult }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (err) {
        await sock.sendMessage(chatId, { text: `Failed to fetch IP info.` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// ✅ Whois by domain
if (command === "whois") {
    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

    const domain = args[0];
    if (!domain) {
        await sock.sendMessage(chatId, { text: 'Provide domain. Example: `~whois google.com`' }, { quoted: msg });
        return;
    }

    try {
        const response = await fetch(`https://api.api-ninjas.com/v1/whois?domain=${domain}`, {
            headers: { 'X-Api-Key': 'YOUR_API_KEY' }
        });
        if (!response.ok) throw new Error("WHOIS lookup failed");

        const data = await response.json();
        const whoisResult = `*WHOIS Info for Domain:* ${domain}\n\`\`\`\nRegistrar: ${data.registrar}\nCreated: ${new Date(data.creation_date * 1000).toLocaleString()}\nExpires: ${new Date(data.expiration_date * 1000).toLocaleString()}\nName Servers: ${data.name_servers?.join(", ")}\nOrg: ${data.org || "N/A"}\nCountry: ${data.country || "N/A"}\nEmails: ${data.emails?.join(", ") || "N/A"}\n\`\`\``;

        await sock.sendMessage(chatId, { text: whoisResult }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (err) {
        await sock.sendMessage(chatId, { text: `Error: Could not retrieve WHOIS data.` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// ✅ DNS Lookup
if (command === "dnslookup") {
    await sock.sendMessage(chatId, { react: { text: "🌐", key: msg.key } });

    const target = args[0];
    if (!target) {
        await sock.sendMessage(chatId, { text: 'Provide a domain or IP. Example: `~dnslookup google.com`' }, { quoted: msg });
        return;
    }

    dns.lookup(target, (err, address, family) => {
        if (err) {
            sock.sendMessage(chatId, { text: `Error: ${err.message}` }, { quoted: msg });
        } else {
            sock.sendMessage(chatId, { text: `DNS lookup result for ${target}:\nIP: ${address}\nFamily: IPv${family}` }, { quoted: msg });
        }
    });
}


if (command === 'subenum') {
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith('@g.us');
  const sender = isGroup ? msg.key.participant : chatId;
  const ownerJid = '2347017747337@s.whatsapp.net';

  // Only owner can use this command
  if (sender !== ownerJid && !msg.key.fromMe) {
    await sock.sendMessage(chatId, {
      text: '❌ You are not authorized to execute this command.' // <-- your number with @s.whatsapp.net
    }, { quoted: msg });
    return;
  }

  // Get target domain
  const target = args[0]; // since args[0] after command should be the domain
  if (!target) {
    await sock.sendMessage(chatId, {
      text: 'Usage: `.subenum example.com`'
    }, { quoted: msg });
    return;
  }

  // React to command
  await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

  await sock.sendMessage(chatId, {
    text: `🔎 Enumerating subdomains for *${target}* via crt.sh…`
  }, { quoted: msg });

  try {
    // Fetch from crt.sh
    const res = await axios.get(`https://crt.sh/?q=%25.${target}&output=json`);
    const certs = Array.isArray(res.data) ? res.data : JSON.parse(res.data);

    // Collect subdomains
    const subs = new Set();
    certs.forEach(c => {
      (c.name_value || '')
        .split('\n')
        .forEach(name => {
          if (name.endsWith(`.${target}`) || name === target) {
            subs.add(name.trim());
          }
        });
    });

    // Send results
    if (subs.size === 0) {
      await sock.sendMessage(chatId, {
        text: `❌ No subdomains found for *${target}*.`
      }, { quoted: msg });
    } else {
      await sock.sendMessage(chatId, {
        text: `✅ Found *${subs.size}* subdomains for *${target}*:\n\`\`\`\n${[...subs].join('\n')}\n\`\`\``
      }, { quoted: msg });
    }

  } catch (err) {
    console.error('Subenum error:', err);
    await sock.sendMessage(chatId, {
      text: `❌ Failed to enumerate subdomains for *${target}*.`
    }, { quoted: msg });
  }
}

// OCR (Image to Teks)
		if (command === 'ocr') {
			const quotedMessage = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;

			if (quotedMessage?.imageMessage) {
				await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });
				
				const buffer = await downloadMediaMessage({ message: quotedMessage }, 'buffer');
				const inputFilePath = path.join(__dirname, '../upload/img-to-image.jpg');
				fs.writeFileSync(inputFilePath, buffer);

				try {
					const { data: { text } } = await Tesseract.recognize(inputFilePath, 'eng');
					await sock.sendMessage(chatId, { text: text || "Tidak ada teks yang dikenali." }, { quoted: msg });
					console.log(`Teks yang dikenali: ${text}`);
				} catch (error) {
					console.error('Error during OCR:', error);
					await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
				} finally {
					fs.unlinkSync(inputFilePath);
				}
			} else {
				await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
			}
		}
        
    
// Screenshot Websites
	if (command === 'ssweb') {
    if (args.length < 1) {
        return await sock.sendMessage(chatId, {
            text: '❗ Provide a domain like `.ssweb google.com`',
            quoted: msg
        });
    }

    const domain = args.join(' ').trim(); // ✅ Updated line

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`http://${domain}`, { waitUntil: 'networkidle2' });

        const screenshotPath = path.join(__dirname, '../upload/screenshot-web.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        await browser.close();

        const caption = `Screenshot of ${domain}`;

        await new Promise(resolve => setTimeout(resolve, 2000));

        await sock.sendMessage(chatId, { image: { url: screenshotPath }, caption: caption }, { quoted: msg });
        console.log(`Response: ${caption}\nScreenshot path: ${screenshotPath}`);

        fs.unlinkSync(screenshotPath);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error taking screenshot or sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Screenshot Mobile
if (command === 'ssmobile') {
    const domain = args.join(' ').trim(); // Capture everything after the command

    if (!domain) {
        await sock.sendMessage(chatId, { text: '❌ Usage: `.ssmobile example.com`' }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 375, height: 667 });
        await page.goto(domain.startsWith('http') ? domain : `http://${domain}`, { waitUntil: 'networkidle2' });

        const screenshotPath = path.join(__dirname, '../uploads/screenshot_mobile.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        await browser.close();

        await sock.sendMessage(chatId, {
            image: fs.readFileSync(screenshotPath),
            caption: `📱 Mobile screenshot of ${domain}`
        }, { quoted: msg });

        fs.unlinkSync(screenshotPath);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('❌ Screenshot error:', error);
        await sock.sendMessage(chatId, {
            text: `❌ Failed to capture mobile screenshot.\n\n${error.message}`
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Get Github Username Info
		if (command === 'github') {
    const username = args.join(' ').trim();

    if (!username) {
        await sock.sendMessage(chatId, { text: '❌ Usage: `.github username`' }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const octokit = new Octokit();
        const { data } = await octokit.rest.users.getByUsername({ username });

        const profilePic = data.avatar_url;
        const response = `👤 *GitHub Info for ${data.login}:*\n\n` +
            `📛 Name: ${data.name || 'N/A'}\n` +
            `🧠 Bio: ${data.bio || 'N/A'}\n` +
            `📍 Location: ${data.location || 'N/A'}\n` +
            `🏢 Company: ${data.company || 'N/A'}\n` +
            `📦 Repositories: ${data.public_repos}\n` +
            `📰 Gists: ${data.public_gists}\n` +
            `👥 Followers: ${data.followers}\n` +
            `👣 Following: ${data.following}\n` +
            `🌐 Blog: ${data.blog || 'N/A'}\n` +
            `📅 Joined: ${new Date(data.created_at).toDateString()}`;

        await sock.sendMessage(chatId, {
            image: { url: profilePic },
            caption: response
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('❌ GitHub error:', error);
        await sock.sendMessage(chatId, {
            text: `❌ GitHub user not found or error occurred.\n${error.message}`
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Github-Roasting
if (command === 'github-roasting') {
    const username = args.join(' ').trim();

    if (!username) {
        await sock.sendMessage(chatId, {
            text: '❌ Usage: `.github-roasting username`'
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const octokit = new Octokit();
        const { data } = await octokit.rest.users.getByUsername({ username });

        const profilePic = data.avatar_url;
        const profileData = `*📂 GitHub Stats for ${data.login}:*\n\n` +
            `• 🧑‍💻 Name: ${data.name || 'Unknown'}\n` +
            `• 🧠 Bio: ${data.bio || 'Empty brain detected'}\n` +
            `• 🏙️ Location: ${data.location || 'Nowhere'}\n` +
            `• 🏢 Company: ${data.company || 'Unemployed 😂'}\n` +
            `• 🔥 Repositories: ${data.public_repos}\n` +
            `• ✍️ Gists: ${data.public_gists}\n` +
            `• 👥 Followers: ${data.followers}\n` +
            `• 🤝 Following: ${data.following}\n` +
            `• 🌍 Blog: ${data.blog || 'No blog. No thoughts.'}\n` +
            `• 📅 Joined: ${new Date(data.created_at).toDateString()}`;

        // This function should return a roasted message
        const roast = await GeminiRoastingMessage(profileData);

        await sock.sendMessage(chatId, {
            image: { url: profilePic },
            caption: roast
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('❌ GitHub Roasting Error:', error);
        await sock.sendMessage(chatId, {
            text: `❌ Failed to roast: ${error.message}`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Anime
// Anime command with AniList API - FIXED IMAGE SENDING
if (command === 'anime') {
    const searchQuery = args.join(' ').trim();

    if (!searchQuery) {
        await sock.sendMessage(chatId, {
            text: '❌ *Usage:* `.anime <anime_name>`\n\n*Example:* `.anime Naruto`'
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

    try {
        const result = await AnimeVideo(searchQuery);
        
        let responseMessage = `*🎬 ${result.title}*\n`;
        
        // Add anime metadata
        if (result.score) {
            responseMessage += `⭐ *Score:* ${result.score}/100\n`;
        }
        if (result.status) {
            responseMessage += `📊 *Status:* ${result.status}\n`;
        }
        if (result.year) {
            responseMessage += `📅 *Year:* ${result.year}\n`;
        }
        if (result.genres && result.genres.length > 0) {
            responseMessage += `🏷️ *Genres:* ${result.genres.join(', ')}\n`;
        }
        
        responseMessage += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        responseMessage += `*📺 Streaming Sites:*\n\n`;
        
        // Display streaming sites
        result.episodes.forEach((site, index) => {
            responseMessage += `*${site.epNo}. ${site.epTitle}*\n`;
            responseMessage += `🔗 ${site.videoUrl}\n`;
            if (site.note) {
                responseMessage += `💡 ${site.note}\n`;
            }
            
            if (index < result.episodes.length - 1) {
                responseMessage += `\n`;
            }
        });

        // Add footer
        responseMessage += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        if (result.totalEpisodes) {
            responseMessage += `⭐ *Total Episodes:* ${result.totalEpisodes}`;
        } else {
            responseMessage += `⭐ *Info:* Use links above to watch episodes`;
        }

        // FIXED: Try to send with image
        try {
            const tempImagePath = path.join(__dirname, '../uploads/temp_anime.jpg');
            
            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(__dirname, '../uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            console.log(`🖼️ Downloading thumbnail: ${result.animeImgUrl}`);
            await downloadImage(result.animeImgUrl, tempImagePath);
            
            // Check if file was created and has content
            if (fs.existsSync(tempImagePath)) {
                const stats = fs.statSync(tempImagePath);
                if (stats.size > 0) {
                    console.log(`✅ Thumbnail downloaded: ${tempImagePath} (${stats.size} bytes)`);
                    
                    await sock.sendMessage(chatId, {
                        image: { 
                            url: tempImagePath 
                        },
                        caption: responseMessage
                    }, { quoted: msg });
                    
                    console.log('✅ Image message sent successfully');
                    
                    // Cleanup temp file
                    fs.unlinkSync(tempImagePath);
                } else {
                    throw new Error('Downloaded file is empty');
                }
            } else {
                throw new Error('File was not created');
            }
            
        } catch (imageError) {
            console.log('❌ Image failed, sending text only:', imageError.message);
            // Send text only as fallback
            await sock.sendMessage(chatId, {
                text: responseMessage
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Anime command error:', error);
        
        let errorMessage = `❌ ${error.message}`;
        
        if (error.message.includes('timeout')) {
            errorMessage = '❌ Request timeout. AniList service is busy. Please try again.';
        } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            errorMessage = '❌ Network error. Please check your internet connection.';
        } else if (error.message.includes('No anime found')) {
            errorMessage = `❌ No anime found for "*${searchQuery}*"\n\n💡 *Suggestions:*\n• Check spelling\n• Use English titles\n• Try popular anime names`;
        }
        
        await sock.sendMessage(chatId, {
            text: errorMessage
        }, { quoted: msg });
        
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Detik Search Article
		if (command === 'detik-search') {
    const query = args.join(' ').trim();

    if (!query) {
        await sock.sendMessage(chatId, {
            text: '❌ Usage: `.detik-search berita hari ini`'
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const articles = await DetikNews(query);

        if (!articles || articles.length === 0) {
            await sock.sendMessage(chatId, {
                text: '❌ No articles found.'
            }, { quoted: msg });
            return;
        }

        const responseText = articles
            .map(article => `📰 *${article.title}*\n🔗 ${article.url}`)
            .join('\n\n');

        await sock.sendMessage(chatId, { text: responseText }, { quoted: msg });
        console.log(`✅ Detik News sent successfully`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('❌ Detik News Error:', error);

        await sock.sendMessage(chatId, {
            text: `❌ Failed to search Detik: ${error.message}`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Detik News Article
	if (command === 'detik-article') {
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const articles = await DetikLatest();

        if (!articles || articles.length === 0) {
            await sock.sendMessage(chatId, { text: '❌ No news articles found.' }, { quoted: msg });
            return;
        }

        const responseText = articles.map(article => `📰 *${article.title}*\n🔗 ${article.url}`).join('\n\n');

        await sock.sendMessage(chatId, { text: responseText }, { quoted: msg });
        console.log(`✅ Response: Latest Detik news sent`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        
    } catch (error) {
        console.error('❌ Detik Article Error:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        await sock.sendMessage(chatId, { text: `❌ Failed to fetch Detik articles.` }, { quoted: msg });
    }
}

// ==============================================
// 🔹DOWNLOAD COMMANDS
// ==============================================

// Twitter Video to MP4
	if (command === 'tw-mp4') {
    const url = args.join(' ').trim();

    if (!url.startsWith('http')) {
        await sock.sendMessage(chatId, {
            text: '❌ Invalid or missing Twitter URL.\n\nExample: `.tw-mp4 https://twitter.com/...`'
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const outputFilePath = path.join(__dirname, "../uploads", "twdl-video.mp4");
        await TwitterVideo(url, outputFilePath);

        await sock.sendMessage(chatId, {
            video: { url: outputFilePath },
            caption: "📥 Here’s your Twitter video!"
        }, { quoted: msg });

        console.log(`✅ Twitter video sent: ${outputFilePath}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        // Clean up
        fs.unlink(outputFilePath, (err) => {
            if (err) console.error(`❌ Error deleting file: ${err.message}`);
        });

    } catch (error) {
        console.error('❌ Twitter Download Error:', error);
        await sock.sendMessage(chatId, {
            text: `❌ Failed to download Twitter video.\n\nError: ${error.message}`
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

       // Twitter Video to MP3
if (command === "twdl-mp3") {
    const url = args[0];
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const outputFilePath = path.join(__dirname, "../uploads", "twdl-audio.mp3");
        await TwitterAudio(url, outputFilePath);

        await sock.sendMessage(chatId, { audio: { url: outputFilePath }, mimetype: 'audio/mp4' }, { quoted: msg });
        console.log(`Response: Success sending video ${outputFilePath}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        fs.unlink(outputFilePath, err => err && console.error(`Error deleting file: ${err.message}`));
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Instagram Video to MP4
if (command === "igdl-mp4") {
    const url = args[0];
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const outputFilePath = path.join(__dirname, "../uploads", "igdl-video.mp4");
        await InstagramVideo(url, outputFilePath);

        await sock.sendMessage(chatId, { video: { url: outputFilePath }, caption: "This is the video you asked for!" }, { quoted: msg });
        console.log(`Response: Success sending video ${outputFilePath}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        fs.unlink(outputFilePath, err => err && console.error(`Error deleting file: ${err.message}`));
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Instagram Video to MP3
if (command === "igdl-mp3") {
    const url = args[0];
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const outputFilePath = path.join(__dirname, "../uploads", "igdl-audio.mp3");
        await InstagramAudio(url, outputFilePath);

        await sock.sendMessage(chatId, { audio: { url: outputFilePath }, mimetype: 'audio/mp4' }, { quoted: msg });
        console.log(`Response: Success sending video ${outputFilePath}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        fs.unlink(outputFilePath, err => err && console.error(`Error deleting file: ${err.message}`));
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// TikTok Video to MP4
if (command === "tkdl-mp4") {
    const url = args[0];
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const outputFilePath = path.join(__dirname, "../uploads", "tkdl-video.mp4");
        await TikTokVideo(url, outputFilePath);

        await sock.sendMessage(chatId, { video: { url: outputFilePath }, caption: "This is the video you asked for!" }, { quoted: msg });
        console.log(`Response: Success sending video ${outputFilePath}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        fs.unlink(outputFilePath, err => err && console.error(`Error deleting file: ${err.message}`));
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// TikTok Video to MP3
if (command === "tkdl-mp3") {
    const url = args[0];
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const outputFilePath = path.join(__dirname, "../uploads", "tkdl-audio.mp3");
        await TikTokAudio(url, outputFilePath);

        await sock.sendMessage(chatId, { audio: { url: outputFilePath }, mimetype: 'audio/mp4' }, { quoted: msg });
        console.log(`Response: Success sending video ${outputFilePath}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        fs.unlink(outputFilePath, err => err && console.error(`Error deleting file: ${err.message}`));
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Vimeo Video to MP4
if (command === "vmdl-mp4") {
    const url = args[0];
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const outputFilePath = path.join(__dirname, "../uploads", "vmdl-video.mp4");
        await VimeoVideo(url, outputFilePath);

        await sock.sendMessage(chatId, { video: { url: outputFilePath }, caption: "This is the video you asked for!" }, { quoted: msg });
        console.log(`Response: Success sending video ${outputFilePath}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        fs.unlink(outputFilePath, err => err && console.error(`Error deleting file: ${err.message}`));
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Vimeo Video to MP3
if (command === "vmdl-mp3") {
    const url = args[0];
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const outputFilePath = path.join(__dirname, "../uploads", "vmdl-audio.mp3");
        await VimeoAudio(url, outputFilePath);

        await sock.sendMessage(chatId, { audio: { url: outputFilePath }, mimetype: 'audio/mp4' }, { quoted: msg });
        console.log(`Response: Success sending video ${outputFilePath}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        fs.unlink(outputFilePath, err => err && console.error(`Error deleting file: ${err.message}`));
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Facebook Video to MP4
if (command === "fbdl-mp4") {
    const url = args[0];
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const outputFilePath = path.join(__dirname, "../uploads", "fbdl-video.mp4");
        await FacebookVideo(url, outputFilePath);

        await sock.sendMessage(chatId, { video: { url: outputFilePath }, caption: "This is the video you asked for!" }, { quoted: msg });
        console.log(`Response: Success sending video ${outputFilePath}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        fs.unlink(outputFilePath, err => err && console.error(`Error deleting file: ${err.message}`));
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Facebook Video to MP3
if (command === "fbdl-mp3") {
    const url = args[0];
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const outputFilePath = path.join(__dirname, "../uploads", "fbdl-audio.mp3");
        await FacebookAudio(url, outputFilePath);

        await sock.sendMessage(chatId, { audio: { url: outputFilePath }, mimetype: 'audio/mp4' }, { quoted: msg });
        console.log(`Response: Success sending video ${outputFilePath}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

        fs.unlink(outputFilePath, err => err && console.error(`Error deleting file: ${err.message}`));
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}



const { exec: ytExec } = require('yt-dlp-exec');
const playdl = require('play-dl');
const axios = require('axios');

if (command === "play") {
    let query = args.join(" ");

    if (!query) {
        await sock.sendMessage(chatId, { text: "❌ Please provide a search query.\nExample: \\play song name" }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        // Create upload directory
        const uploadDir = path.join(__dirname, "upload");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Step 1: Search for video using play-dl
        console.log('🔍 Searching for:', query);
        const results = await playdl.search(query, { limit: 1 });
        if (!results || results.length === 0) {
            await sock.sendMessage(chatId, { text: "❌ Song not found. Try a different search term." }, { quoted: msg });
            return;
        }

        const video = results[0];
        const videoUrl = video.url;
        
        console.log('🎯 Found video:', video.title, 'URL:', videoUrl);

        // Step 2: Get video info for thumbnail and upload date
        const videoInfo = await playdl.video_info(videoUrl);
        const videoDetails = videoInfo.video_details;

        // Get thumbnail URL (highest quality available)
        const thumbnails = videoDetails.thumbnails || [];
        const thumbnailUrl = thumbnails.length > 0 ? 
            thumbnails[thumbnails.length - 1].url : // Highest quality thumbnail
            `https://img.youtube.com/vi/${videoDetails.id}/maxresdefault.jpg`;

        // Format duration to 00:00:00 format
        const formatDuration = (durationRaw) => {
            if (!durationRaw) return "00:00";
            const parts = durationRaw.split(':');
            if (parts.length === 2) {
                return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            } else if (parts.length === 3) {
                return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
            }
            return durationRaw;
        };

        // Calculate time ago
        const getTimeAgo = (uploadedAt) => {
            if (!uploadedAt) return "Unknown";
            const uploadDate = new Date(uploadedAt);
            const now = new Date();
            const diffTime = Math.abs(now - uploadDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 1) return "Today";
            if (diffDays === 1) return "1 day ago";
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            return `${Math.floor(diffDays / 365)} years ago`;
        };

        const formattedDuration = formatDuration(videoDetails.durationRaw);
        const timeAgo = getTimeAgo(videoDetails.uploadedAt);
        const views = videoDetails.views ? videoDetails.views.toLocaleString() : "Unknown";

        // Step 3: Download thumbnail
        let thumbnailBuffer = null;
        try {
            console.log('🖼️ Downloading thumbnail...');
            const thumbnailResponse = await axios.get(thumbnailUrl, { 
                responseType: 'arraybuffer',
                timeout: 10000 
            });
            thumbnailBuffer = Buffer.from(thumbnailResponse.data, 'binary');
            console.log('✅ Thumbnail downloaded');
        } catch (thumbError) {
            console.log('❌ Thumbnail download failed, using text only');
        }

        // Step 4: Send thumbnail with caption
        const caption = `🎶 DESIRE-EXE MUSIC PLAYER\n` +
            `> Title: ${videoDetails.title}\n` +
            `> Views: ${views}\n` +
            `> Duration: ${formattedDuration}\n` +
            `> Uploaded: ${timeAgo}\n` +
            `> Url: ${videoUrl}\n` +
            `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴇꜱɪʀᴇ ᴇxᴇ`;

        if (thumbnailBuffer) {
            await sock.sendMessage(chatId, {
                image: thumbnailBuffer,
                caption: caption
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { 
                text: caption 
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "⬇️", key: msg.key } });

        // Step 5: Download using yt-dlp
        const outputPath = path.join(uploadDir, `audio-${Date.now()}.mp3`);
        
        console.log('📥 Downloading audio with yt-dlp...');
        
        await ytExec(videoUrl, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            output: outputPath,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: ['referer:youtube.com', 'user-agent:googlebot']
        });

        // Check if file was created
        if (!fs.existsSync(outputPath)) {
            throw new Error('Download failed - no output file created');
        }

        const stats = fs.statSync(outputPath);
        console.log('✅ Download completed. File size:', stats.size, 'bytes');

        if (stats.size > 50 * 1024 * 1024) {
            fs.unlinkSync(outputPath);
            await sock.sendMessage(chatId, { text: "❌ File is too large to send." }, { quoted: msg });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: "🎶", key: msg.key } });

        // Step 6: Send audio file
        console.log('📤 Sending audio file...');
        await sock.sendMessage(chatId, {
            audio: fs.readFileSync(outputPath),
            mimetype: 'audio/mpeg',
            fileName: `${videoDetails.title.substring(0, 50).replace(/[^\w\s.-]/gi, '')}.mp3`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        console.log('🎉 Audio sent successfully!');

        // Cleanup
        fs.unlinkSync(outputPath);

    } catch (err) {
        console.error('❌ Play command error:', err);
        
        let errorMsg = "❌ An error occurred: ";
        if (err.message.includes('Python')) {
            errorMsg += "Python is required but not installed or not in PATH.";
        } else if (err.message.includes('not found')) {
            errorMsg += "Video not found.";
        } else {
            errorMsg += err.message;
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: msg });
    }
}



if (command === "video") {
    let query = args.join(" ");

    if (!query) {
        await sock.sendMessage(chatId, { text: "❌ Please provide a search query.\nExample: \\video search term" }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        // Create upload directory
        const uploadDir = path.join(__dirname, "upload");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Step 1: Search for video using play-dl
        console.log('🔍 Searching for video:', query);
        const results = await playdl.search(query, { limit: 1 });
        if (!results || results.length === 0) {
            await sock.sendMessage(chatId, { text: "❌ Video not found. Try a different search term." }, { quoted: msg });
            return;
        }

        const video = results[0];
        const videoUrl = video.url;
        
        console.log('🎯 Found video:', video.title, 'URL:', videoUrl);

        // Step 2: Get video info for thumbnail and metadata
        const videoInfo = await playdl.video_info(videoUrl);
        const videoDetails = videoInfo.video_details;

        // Get thumbnail URL (highest quality available)
        const thumbnails = videoDetails.thumbnails || [];
        const thumbnailUrl = thumbnails.length > 0 ? 
            thumbnails[thumbnails.length - 1].url :
            `https://img.youtube.com/vi/${videoDetails.id}/maxresdefault.jpg`;

        // Format duration to 00:00:00 format
        const formatDuration = (durationRaw) => {
            if (!durationRaw) return "00:00";
            const parts = durationRaw.split(':');
            if (parts.length === 2) {
                return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            } else if (parts.length === 3) {
                return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
            }
            return durationRaw;
        };

        // Calculate time ago
        const getTimeAgo = (uploadedAt) => {
            if (!uploadedAt) return "Unknown";
            const uploadDate = new Date(uploadedAt);
            const now = new Date();
            const diffTime = Math.abs(now - uploadDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 1) return "Today";
            if (diffDays === 1) return "1 day ago";
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            return `${Math.floor(diffDays / 365)} years ago`;
        };

        const formattedDuration = formatDuration(videoDetails.durationRaw);
        const timeAgo = getTimeAgo(videoDetails.uploadedAt);
        const views = videoDetails.views ? videoDetails.views.toLocaleString() : "Unknown";

        // Step 3: Download thumbnail
        let thumbnailBuffer = null;
        try {
            console.log('🖼️ Downloading thumbnail...');
            const thumbnailResponse = await axios.get(thumbnailUrl, { 
                responseType: 'arraybuffer',
                timeout: 10000 
            });
            thumbnailBuffer = Buffer.from(thumbnailResponse.data, 'binary');
            console.log('✅ Thumbnail downloaded');
        } catch (thumbError) {
            console.log('❌ Thumbnail download failed, using text only');
        }

        // Step 4: Send thumbnail with caption
        const caption = `🎶 DESIRE-EXE MUSIC PLAYER\n` +
            `> Title: ${videoDetails.title}\n` +
            `> Views: ${views}\n` +
            `> Duration: ${formattedDuration}\n` +
            `> Uploaded: ${timeAgo}\n` +
            `> Url: ${videoUrl}\n` +
            `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴇꜱɪʀᴇ ᴇxᴇ`;

        if (thumbnailBuffer) {
            await sock.sendMessage(chatId, {
                image: thumbnailBuffer,
                caption: caption
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { 
                text: caption 
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: "⬇️", key: msg.key } });

        // Step 5: Download video using yt-dlp (optimized for WhatsApp)
        const outputPath = path.join(uploadDir, `video-${Date.now()}.mp4`);
        
        console.log('📥 Downloading video with yt-dlp...');
        
        await ytExec(videoUrl, {
            format: 'best[height<=480][filesize<50M]', // Max 480p and 50MB for WhatsApp
            output: outputPath,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: ['referer:youtube.com', 'user-agent:googlebot']
        });

        // Check if file was created
        if (!fs.existsSync(outputPath)) {
            throw new Error('Download failed - no output file created');
        }

        const stats = fs.statSync(outputPath);
        console.log('✅ Video download completed. File size:', stats.size, 'bytes');

        // WhatsApp has ~16MB limit for videos
        if (stats.size > 16 * 1024 * 1024) {
            fs.unlinkSync(outputPath);
            await sock.sendMessage(chatId, { text: "❌ Video is too large for WhatsApp (max 16MB)." }, { quoted: msg });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: "🎥", key: msg.key } });

        // Step 6: Send video file
        console.log('📤 Sending video file...');
        await sock.sendMessage(chatId, {
            video: fs.readFileSync(outputPath),
            caption: `🎥 ${videoDetails.title}`,
            fileName: `${videoDetails.title.substring(0, 50).replace(/[^\w\s.-]/gi, '')}.mp4`
        }, { quoted: msg });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        console.log('🎉 Video sent successfully!');

        // Cleanup
        fs.unlinkSync(outputPath);

    } catch (err) {
        console.error('❌ Video command error:', err);
        
        let errorMsg = "❌ An error occurred: ";
        if (err.message.includes('Python')) {
            errorMsg += "Python is required but not installed or not in PATH.";
        } else if (err.message.includes('not found')) {
            errorMsg += "Video not found.";
        } else if (err.message.includes('too large')) {
            errorMsg += "Video is too large for WhatsApp.";
        } else {
            errorMsg += err.message;
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: msg });
    }
}

		
// Translation Command
if (command === 'tr') {
    const targetLang = args[0]?.toLowerCase();
    const text = args.slice(1).join(' ');

    if (!targetLang || !text) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .translate <language_code> <text>\n\n*Common Languages:*\n• .translate en Hello World (English)\n• .translate es Hola Mundo (Spanish)\n• .translate fr Bonjour (French)\n• .translate de Hallo (German)\n• .translate it Ciao (Italian)\n• .translate pt Olá (Portuguese)\n• .translate ru Привет (Russian)\n• .translate ar مرحبا (Arabic)\n• .translate hi नमस्ते (Hindi)\n• .translate zh 你好 (Chinese)\n• .translate ja こんにちは (Japanese)\n• .translate ko 안녕하세요 (Korean)\n\n*Full list:* https://cloud.google.com/translate/docs/languages' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🌐", key: msg.key } });

    try {
        const translatedText = await Translate(text, targetLang);
        
        const responseMessage = `🌐 *Translation*\n\n*Original:* ${text}\n*Target:* ${targetLang.toUpperCase()}\n\n*Translated:* ${translatedText}`;

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Translation Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Translation failed: ${error.message}\n\n💡 *Possible issues:*\n• Invalid language code\n• Text too long\n• Translation service unavailable\n• Check language codes: https://cloud.google.com/translate/docs/languages` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Quick Translate to Common Languages
if (command === 'qtr') {
    const text = args.join(' ');

    if (!text) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .qtranslate <text>\n\n*Translates to 5 common languages automatically*' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "⚡", key: msg.key } });

    try {
        const languages = [
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
            { code: 'pt', name: 'Portuguese' },
            { code: 'it', name: 'Italian' }
        ];

        let responseMessage = `⚡ *Quick Translations*\n\n*Original:* ${text}\n\n`;

        // Translate to all languages
        for (const lang of languages) {
            try {
                const translated = await Translate(text, lang.code);
                responseMessage += `*${lang.name} (${lang.code}):* ${translated}\n\n`;
            } catch (error) {
                responseMessage += `*${lang.name}:* ❌ Failed\n\n`;
            }
        }

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Quick Translate Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Quick translation failed. Try single translations instead.' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Detect Language
if (command === 'detectlang') {
    const text = args.join(' ');

    if (!text) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .detectlang <text>\n\n*Detects the language of the provided text*' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

    try {
        // Use translation API to detect language
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const response = await axios.get(url);
        
        let detectedLang = 'Unknown';
        if (response.data && response.data[2]) {
            detectedLang = response.data[2]; // Language code
        }

        // Get language name
        const langNames = {
            'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
            'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi',
            'tr': 'Turkish', 'nl': 'Dutch', 'sv': 'Swedish', 'pl': 'Polish'
        };

        const langName = langNames[detectedLang] || detectedLang;

        const responseMessage = `🔍 *Language Detection*\n\n*Text:* ${text}\n\n*Detected Language:* ${langName} (${detectedLang.toUpperCase()})`;

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Language Detection Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Language detection failed.' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Translation with multiple targets
if (command === 'mtr') {
    const languages = args[0]?.split(',');
    const text = args.slice(1).join(' ');

    if (!languages || !text || languages.length === 0) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .multitranslate <lang1,lang2,lang3> <text>\n\n*Example:* .multitranslate es,fr,de Hello World\n*Translates to Spanish, French, and German*' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🔄", key: msg.key } });

    try {
        let responseMessage = `🔄 *Multi-Language Translation*\n\n*Original:* ${text}\n\n`;

        for (const lang of languages.slice(0, 5)) { // Limit to 5 languages
            const cleanLang = lang.trim().toLowerCase();
            try {
                const translated = await Translate(text, cleanLang);
                responseMessage += `*${cleanLang.toUpperCase()}:* ${translated}\n\n`;
            } catch (error) {
                responseMessage += `*${cleanLang.toUpperCase()}:* ❌ Invalid language code\n\n`;
            }
        }

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Multi-Translate Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Multi-translation failed.' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

		// File Search Commands
const validFileTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'];

if (validFileTypes.includes(command)) {
    const query = args.join(" ").trim();

    if (!query) {
        await sock.sendMessage(chatId, { 
            text: `❌ *Usage:* .${command} <search_query>\n\n*Examples:*\n.${command} research paper\n.${command} business plan template\n.${command} programming tutorial` 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "📁", key: msg.key } });

    try {
        const result = await FileSearch(query, command);
        await sock.sendMessage(chatId, { text: result }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (err) {
        console.error(`❌ ${command.toUpperCase()} Search Error:`, err);
        await sock.sendMessage(chatId, { 
            text: `❌ Failed to search for ${command} files. Please try again later.` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Advanced file search
if (command === 'filesearch' || command === 'fsearch') {
    const fileType = args[0]?.toLowerCase();
    const searchQuery = args.slice(1).join(' ');

    if (!fileType || !searchQuery) {
        await sock.sendMessage(chatId, { 
            text: `❌ *Usage:* .filesearch <file_type> <query>\n\n*Supported Types:* ${validFileTypes.join(', ')}\n\n*Examples:*\n.filesearch pdf machine learning\n.fsearch docx business proposal\n.filesearch ppt marketing presentation` 
        }, { quoted: msg });
        return;
    }

    if (!validFileTypes.includes(fileType)) {
        await sock.sendMessage(chatId, { 
            text: `❌ Invalid file type: ${fileType}\n\n*Supported types:* ${validFileTypes.join(', ')}` 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

    try {
        const result = await FileSearch(searchQuery, fileType);
        await sock.sendMessage(chatId, { text: result }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (err) {
        console.error('File Search Error:', err);
        await sock.sendMessage(chatId, { 
            text: `❌ File search failed: ${err.message}` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Quick multi-format search
if (command === 'quickfiles' || command === 'qfiles') {
    const query = args.join(" ").trim();

    if (!query) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .quickfiles <search_query>\n\n*Searches for PDF, DOC, and PPT files simultaneously*' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "⚡", key: msg.key } });

    try {
        const { QuickFileSearch } = require('./controllers/FileSearch');
        const results = await QuickFileSearch(query);
        
        let responseMessage = `⚡ *Quick File Search for "${query}"*\n\n`;
        
        for (const [fileType, result] of Object.entries(results)) {
            responseMessage += `*${fileType.toUpperCase()} Files:*\n`;
            if (typeof result === 'string' && result.includes('❌')) {
                responseMessage += `${result}\n\n`;
            } else {
                // Extract first result from formatted string
                const firstResult = result.split('\n').slice(0, 4).join('\n');
                responseMessage += `${firstResult}\n\n`;
            }
        }

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (err) {
        console.error('Quick Files Error:', err);
        await sock.sendMessage(chatId, { 
            text: '❌ Quick file search failed. Please try individual file searches.' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}
		// Generate QRCode
		if (command === 'qrcode') {
    const text = args.join(" ").trim();

    if (!text) {
        await sock.sendMessage(chatId, { text: "❌ Please provide text to generate a QR code." }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const qrPath = path.join(__dirname, '../upload/qrcode.png');
        await QRCode.toFile(qrPath, text);

        await sock.sendMessage(chatId, {
            image: { url: qrPath },
            caption: `🔲 *QR Code Generated:*\n"${text}"`
        }, { quoted: msg });

        fs.unlink(qrPath, (err) => {
            if (err) console.error("⚠️ Failed to delete QR image:", err);
        });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error("❌ QR Code Error:", error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

		// Mathematics 
		if (command === 'math') {
    const expression = args.join(" ").trim();

    if (!expression) {
        await sock.sendMessage(chatId, {
            text: "❌ Please provide a math expression.\n\n*Example:* `.math 2 + 3 * (4 - 1)`"
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const result = calculateExpression(expression);
        await sock.sendMessage(chatId, {
            text: `🧮 *Result:*\n\`\`\`${result}\`\`\``
        }, { quoted: msg });
        console.log(`✅ Math Result: ${result}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('❌ Math Error:', error);
        await sock.sendMessage(chatId, { text: "❌ Invalid expression." }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

function calculateExpression(expression) {
    const sanitized = expression.replace(/:/g, '/');
    return eval(sanitized);
}
		
		// Count Words
		if (command === 'words') {
    const text = args.join(" ").trim();

    if (!text) {
        await sock.sendMessage(chatId, {
            text: "❌ Please provide some text to analyze.\n\n*Example:* `.words Hello world!`"
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const wordCount = text.split(/\s+/).length;
        const characterCount = text.length;
        const spaceCount = (text.match(/\s/g) || []).length;
        const symbolCount = (text.match(/[^\w\s]/g) || []).length;
        const paragraphCount = text.split(/\n+/).length;
        const numberCount = (text.match(/\d+/g) || []).length;

        const responseMessage =
            '*📝 Text Analysis*\n\n' +
            `- Words: ${wordCount}\n` +
            `- Characters: ${characterCount}\n` +
            `- Spaces: ${spaceCount}\n` +
            `- Symbols: ${symbolCount}\n` +
            `- Paragraphs: ${paragraphCount}\n` +
            `- Numbers: ${numberCount}`;

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        console.log(`✅ Word analysis done.`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error("❌ Word analysis error:", error);
        await sock.sendMessage(chatId, { text: "❌ Error analyzing text." }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}


// SEO Check Command (Enhanced)
if (command === 'seo') {
    const domain = args[0];
    
    if (!domain) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .seo <domain>\n\n*Examples:*\n.seo google.com\n.seo example.com\n.seo github.com' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

    try {
        const seoData = await CheckSEO(domain);
        
        let responseMessage = `🔍 *SEO Analysis for ${domain}*\n\n`;
        responseMessage += `📊 *SEO Score:* ${seoData.seoSuccessRate}\n`;
        responseMessage += `🔗 *Indexable:* ${seoData.isIndexable ? '✅ Yes' : '❌ No'}\n\n`;
        
        // Character count analysis
        const titleLength = seoData.title.length;
        const descLength = seoData.metaDescription.length;
        
        responseMessage += `*📝 Title (${titleLength}/60):*\n${seoData.title}\n${titleLength > 60 ? '⚠️ *Too long!*' : '✅ *Good length*'}\n\n`;
        
        responseMessage += `*📄 Meta Description (${descLength}/160):*\n${seoData.metaDescription}\n${descLength > 160 ? '⚠️ *Too long!*' : '✅ *Good length*'}\n\n`;
        
        responseMessage += `*🏷️ Meta Keywords:*\n${seoData.metaKeywords}\n\n`;
        responseMessage += `*📱 OG Title:*\n${seoData.ogTitle}\n\n`;
        responseMessage += `*📱 OG Description:*\n${seoData.ogDescription}\n\n`;
        responseMessage += `*🖼️ OG Image:*\n${seoData.ogImage || '❌ Not set'}\n\n`;
        responseMessage += `*🔗 Canonical URL:*\n${seoData.canonicalUrl}\n\n`;
        
        // Quick assessment
        responseMessage += `💡 *Quick Assessment:*\n`;
        if (parseFloat(seoData.seoSuccessRate) > 70) {
            responseMessage += `✅ Good SEO foundation\n`;
        } else if (parseFloat(seoData.seoSuccessRate) > 40) {
            responseMessage += `⚠️ Needs improvement\n`;
        } else {
            responseMessage += `❌ Poor SEO setup\n`;
        }
        
        responseMessage += `\n💡 *Tips:*\n`;
        responseMessage += `• Title should be under 60 chars\n`;
        responseMessage += `• Meta description under 160 chars\n`;
        responseMessage += `• Add Open Graph tags for social media\n`;
        responseMessage += `• Ensure proper canonical URLs\n`;
        responseMessage += `• Use relevant, focused keywords`;

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('SEO Check Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ SEO check failed: ${error.message}\n\n💡 *Troubleshooting:*\n• Make sure domain is valid\n• Include protocol if needed (http/https)\n• Domain must be accessible\n• Try: ${domain.startsWith('http') ? domain : 'https://' + domain}` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// SEO Roasting Command (Enhanced)
if (command === 'seo-roast') {
    const domain = args[0];
    
    if (!domain) {
        await sock.sendMessage(chatId, {
            text: "❌ *Usage:* .seo-roast <domain>\n\n*Example:* .seo-roast example.com"
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🔥", key: msg.key } });

    try {
        const seoData = await CheckSEO(domain);
        
        // Create a more detailed report for roasting
        const seoReport = 
            `🌐 *Website SEO Report for ${domain}*\n\n` +
            `📊 SEO Success Rate: ${seoData.seoSuccessRate}\n` +
            `🔍 Indexable: ${seoData.isIndexable ? 'Yes' : 'No'}\n\n` +
            `📝 *Title Analysis:*\n` +
            `- Title: "${seoData.title}"\n` +
            `- Length: ${seoData.title.length}/60 characters\n` +
            `- Status: ${seoData.title.length > 60 ? 'TOO LONG' : 'OK'}\n\n` +
            `📄 *Meta Description:*\n` +
            `- Description: "${seoData.metaDescription}"\n` +
            `- Length: ${seoData.metaDescription.length}/160 characters\n` +
            `- Status: ${seoData.metaDescription.length > 160 ? 'TOO LONG' : 'OK'}\n\n` +
            `🏷️ *Keywords:* ${seoData.metaKeywords || 'None set'}\n\n` +
            `📱 *Social Media:*\n` +
            `- OG Title: ${seoData.ogTitle || 'Missing'}\n` +
            `- OG Description: ${seoData.ogDescription || 'Missing'}\n` +
            `- OG Image: ${seoData.ogImage || 'Missing'}\n\n` +
            `🔗 *Technical:*\n` +
            `- Canonical URL: ${seoData.canonicalUrl || 'Not set'}\n` +
            `- Overall Grade: ${parseFloat(seoData.seoSuccessRate) > 70 ? 'C' : parseFloat(seoData.seoSuccessRate) > 40 ? 'D' : 'F'}`;

        // Roast prompt with specific instructions
        const roastPrompt = `Roast this website's SEO in a funny, sarcastic way. Focus on the specific issues found. Be brutally honest but entertaining. Here's the SEO report:\n\n${seoReport}`;

        const seoRoast = await GeminiRoastingMessage(roastPrompt);

        const finalMessage = `🔥 *SEO Roast for ${domain}*\n\n${seoRoast.trim()}\n\n💡 *Remember:* This is just for fun! Use .seo for serious analysis.`;

        await sock.sendMessage(chatId, { text: finalMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        
    } catch (error) {
        console.error("❌ SEO Roast Error:", error);
        await sock.sendMessage(chatId, { 
            text: `❌ Failed to roast ${domain}: ${error.message}\n\n💡 Make sure the domain is accessible.` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Quick SEO Comparison Command
if (command === 'seo-compare') {
    const domains = args;
    
    if (domains.length < 2) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .seo-compare <domain1> <domain2> [domain3...]\n\n*Example:* .seo-compare google.com bing.com duckduckgo.com' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "📊", key: msg.key } });

    try {
        let comparisonMessage = `📊 *SEO Comparison*\n\n`;
        
        for (const domain of domains.slice(0, 3)) { // Limit to 3 domains
            try {
                const seoData = await CheckSEO(domain);
                comparisonMessage += `*${domain}*\n`;
                comparisonMessage += `📊 Score: ${seoData.seoSuccessRate}\n`;
                comparisonMessage += `🔗 Indexable: ${seoData.isIndexable ? '✅' : '❌'}\n`;
                comparisonMessage += `📝 Title: ${seoData.title.length}/60 chars\n`;
                comparisonMessage += `📄 Desc: ${seoData.metaDescription.length}/160 chars\n`;
                comparisonMessage += `📱 OG Tags: ${seoData.ogTitle ? '✅' : '❌'}\n\n`;
            } catch (error) {
                comparisonMessage += `*${domain}*\n❌ Failed to analyze\n\n`;
            }
        }
        
        comparisonMessage += `💡 *Tip:* Higher scores generally indicate better SEO setup.`;

        await sock.sendMessage(chatId, { text: comparisonMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        
    } catch (error) {
        console.error('SEO Compare Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ SEO comparison failed. Check domain accessibility.' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}
		
		
// Search Country Detail
	if (command === 'country') {
    const countryName = args.join(" ").trim();

    if (!countryName) {
        await sock.sendMessage(chatId, {
            text: "❌ Please provide a country name.\n\n*Example:* `.country Nigeria`"
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const info = await Country(countryName);
        await sock.sendMessage(chatId, { text: info }, { quoted: msg });
        console.log("✅ Country data sent.");
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (err) {
        console.error("❌ Country Error:", err);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Bible Chapter Command
if (command === 'bible') {
    const book = args[0];
    const chapter = args[1];

    if (!book || !chapter || isNaN(chapter)) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .bible <book> <chapter>\n\n*Examples:*\n.bible john 3\n.bible psalms 23\n.bible genesis 1\n.bible matthew 5\n\n💡 *Tip:* Use .biblebooks to see all books' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "📖", key: msg.key } });

    try {
        const { Bible } = require('../controllers/Bible');
        const bibleText = await Bible(book, chapter);
        
        // Split long messages
        if (bibleText.length > 4000) {
            const parts = splitLongMessage(bibleText, 4000);
            for (let i = 0; i < parts.length; i++) {
                await sock.sendMessage(chatId, { 
                    text: `${parts[i]}${i < parts.length - 1 ? '\n\n_(Continued...)_' : ''}` 
                }, { quoted: i === 0 ? msg : undefined });
                if (i < parts.length - 1) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            await sock.sendMessage(chatId, { text: bibleText }, { quoted: msg });
        }
        
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Bible Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Failed to fetch Bible chapter: ${error.message}\n\n💡 Check book name and chapter number.` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Bible Verse Command
if (command === 'bibleverse') {
    const book = args[0];
    const chapter = args[1];
    const verse = args[2];

    if (!book || !chapter || !verse || isNaN(chapter) || isNaN(verse)) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .bibleverse <book> <chapter> <verse>\n\n*Examples:*\n.bibleverse john 3 16\n.bibleverse psalms 23 1\n.bibleverse romans 8 28\n.verse philippians 4 13' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🎯", key: msg.key } });

    try {
        const { BibleVerse } = require('../controllers/Bible');
        const verseText = await BibleVerse(book, chapter, verse);
        
        await sock.sendMessage(chatId, { text: verseText }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Bible Verse Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Failed to fetch Bible verse: ${error.message}` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Bible Search Command
if (command === 'biblesearch') {
    const query = args.join(' ');

    if (!query) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .biblesearch <search_query>\n\n*Examples:*\n.biblesearch love\n.biblesearch faith hope\n.bsearch Jesus said\n.bsearch peace of God' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

    try {
        const { BibleSearch } = require('../controllers/Bible');
        const searchResults = await BibleSearch(query);
        
        await sock.sendMessage(chatId, { text: searchResults }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Bible Search Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Bible search failed: ${error.message}\n\n💡 Try different keywords or check spelling.` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Random Bible Verse Command
if (command === 'randomverse') {
    await sock.sendMessage(chatId, { react: { text: "🎲", key: msg.key } });

    try {
        const { RandomBibleVerse } = require('../controllers/Bible');
        const randomVerse = await RandomBibleVerse();
        
        await sock.sendMessage(chatId, { text: randomVerse }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Random Bible Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to fetch random Bible verse.' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Bible Books List Command
if (command === 'biblebooks') {
    const testament = args[0]?.toLowerCase();

    try {
        const { bibleBooks } = require('../controllers/Bible');
        
        let responseMessage = '📖 *Bible Books*\n\n';

        if (!testament || testament === 'old') {
            responseMessage += '*Old Testament:*\n';
            bibleBooks.oldTestament.forEach((book, index) => {
                responseMessage += `${index + 1}. ${book}\n`;
            });
            responseMessage += '\n';
        }

        if (!testament || testament === 'new') {
            responseMessage += '*New Testament:*\n';
            bibleBooks.newTestament.forEach((book, index) => {
                responseMessage += `${index + 1}. ${book}\n`;
            });
        }

        responseMessage += '\n💡 *Usage:* .bible <book_name> <chapter>';

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });

    } catch (error) {
        console.error('Bible Books Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to load Bible books list.' 
        }, { quoted: msg });
    }
}

// Popular Verses Command
if (command === 'popularverses') {
    const popularList = `🌟 *Popular Bible Verses*\n\n
*1. John 3:16*
"For God so loved the world that he gave his one and only Son..."

*2. Philippians 4:13*
"I can do all this through him who gives me strength."

*3. Jeremiah 29:11*
"For I know the plans I have for you," declares the LORD...

*4. Psalms 23:1*
"The LORD is my shepherd, I lack nothing."

*5. Romans 8:28*
"And we know that in all things God works for the good..."

*6. Proverbs 3:5-6*
"Trust in the LORD with all your heart..."

*7. Isaiah 41:10*
"So do not fear, for I am with you..."

💡 *Get any verse:* .bibleverse book chapter verse`;

    await sock.sendMessage(chatId, { text: popularList }, { quoted: msg });
}
		
// Surah Command - Get entire surah
if (command === 'surah') {
    const surahId = args[0];

    if (!surahId || isNaN(surahId) || surahId < 1 || surahId > 114) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .surah <surah_number>\n\n*Surah Numbers:* 1-114\n\n*Examples:*\n.surah 1  (Al-Fatihah)\n.surah 2  (Al-Baqarah)\n.surah 36 (Ya-Sin)\n.surah 112 (Al-Ikhlas)\n\n💡 *Tip:* Use .surahlist to see all surah names and numbers' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "📖", key: msg.key } });

    try {
        const surahText = await Surah(surahId);
        
        // Split long messages (WhatsApp has character limits)
        if (surahText.length > 4000) {
            const parts = splitLongMessage(surahText, 4000);
            for (let i = 0; i < parts.length; i++) {
                await sock.sendMessage(chatId, { 
                    text: `${parts[i]}${i < parts.length - 1 ? '\n\n_(Continued...)_' : ''}` 
                }, { quoted: i === 0 ? msg : undefined });
                if (i < parts.length - 1) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            await sock.sendMessage(chatId, { text: surahText }, { quoted: msg });
        }
        
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Surah Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Failed to fetch surah: ${error.message}\n\n💡 Make sure the surah number is between 1-114.` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Ayah Command - Get specific verse
if (command === 'verse') {
    const surahId = args[0];
    const ayahId = args[1];

    if (!surahId || !ayahId || isNaN(surahId) || isNaN(ayahId) || surahId < 1 || surahId > 114) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .ayah <surah_number> <verse_number>\n\n*Examples:*\n.ayah 1 1  (Al-Fatihah:1)\n.ayah 2 255 (Ayat Kursi)\n.ayah 36 1  (Ya-Sin:1)\n.ayah 112 1 (Al-Ikhlas:1)' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🎯", key: msg.key } });

    try {
        const ayahText = await SurahDetails(surahId, parseInt(ayahId));
        
        if (ayahText === 'Surah Not available') {
            await sock.sendMessage(chatId, { 
                text: `❌ Ayah ${ayahId} not found in Surah ${surahId}\n\n💡 Check if the verse number exists in that surah.` 
            }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            return;
        }

        await sock.sendMessage(chatId, { text: ayahText }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Ayah Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Failed to fetch ayah: ${error.message}` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Surah List Command
if (command === 'surahlist') {
    const page = parseInt(args[0]) || 1;
    const surahsPerPage = 10;

    try {
        const surahList = [
            { number: 1, latin: "Al-Fatihah", translation: "Pembukaan", verses: 7 },
            { number: 2, latin: "Al-Baqarah", translation: "Sapi Betina", verses: 286 },
            { number: 3, latin: "Ali 'Imran", translation: "Keluarga Imran", verses: 200 },
            { number: 4, latin: "An-Nisa", translation: "Wanita", verses: 176 },
            { number: 5, latin: "Al-Ma'idah", translation: "Hidangan", verses: 120 },
            { number: 6, latin: "Al-An'am", translation: "Binatang Ternak", verses: 165 },
            { number: 7, latin: "Al-A'raf", translation: "Tempat Tertinggi", verses: 206 },
            { number: 8, latin: "Al-Anfal", translation: "Rampasan Perang", verses: 75 },
            { number: 9, latin: "At-Taubah", translation: "Pengampunan", verses: 129 },
            { number: 10, latin: "Yunus", translation: "Yunus", verses: 109 },
            // Add more surahs as needed...
            { number: 36, latin: "Ya-Sin", translation: "Ya Sin", verses: 83 },
            { number: 55, latin: "Ar-Rahman", translation: "Maha Pengasih", verses: 78 },
            { number: 67, latin: "Al-Mulk", translation: "Kerajaan", verses: 30 },
            { number: 112, latin: "Al-Ikhlas", translation: "Ikhlas", verses: 4 },
            { number: 113, latin: "Al-Falaq", translation: "Subuh", verses: 5 },
            { number: 114, latin: "An-Nas", translation: "Manusia", verses: 6 }
        ];

        const startIndex = (page - 1) * surahsPerPage;
        const endIndex = startIndex + surahsPerPage;
        const pageSurahs = surahList.slice(startIndex, endIndex);

        if (pageSurahs.length === 0) {
            await sock.sendMessage(chatId, { 
                text: `❌ Page ${page} not found. There are only ${Math.ceil(surahList.length / surahsPerPage)} pages.` 
            }, { quoted: msg });
            return;
        }

        let responseMessage = `📖 *Surah List - Page ${page}*\n\n`;
        
        pageSurahs.forEach(surah => {
            responseMessage += `${surah.number}. ${surah.latin}\n`;
            responseMessage += `   ${surah.translation} (${surah.verses} verses)\n\n`;
        });

        responseMessage += `📄 Page ${page} of ${Math.ceil(surahList.length / surahsPerPage)}\n`;
        responseMessage += `💡 Use: .surahlist ${page + 1} for next page`;

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });

    } catch (error) {
        console.error('Surah List Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to load surah list.' 
        }, { quoted: msg });
    }
}

// Random Ayah Command
if (command === 'randomverse') {
    await sock.sendMessage(chatId, { react: { text: "🎲", key: msg.key } });

    try {
        // Generate random surah (1-114) and random ayah
        const randomSurah = Math.floor(Math.random() * 114) + 1;
        
        // Get surah info to know max verses
        const response = await axios.get(`https://web-api.qurankemenag.net/quran-ayah?surah=${randomSurah}`);
        const surahData = response.data.data;
        const maxAyah = surahData.length;
        const randomAyah = Math.floor(Math.random() * maxAyah) + 1;

        const ayahText = await SurahDetails(randomSurah, randomAyah);
        
        const responseMessage = `🎲 *Random Ayah*\n\n${ayahText}\n\n💡 Use .ayah ${randomSurah} ${randomAyah} to get this verse again`;

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Random Ayah Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to fetch random ayah.' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Helper function to split long messages
function splitLongMessage(text, maxLength) {
    const parts = [];
    const lines = text.split('\n');
    let currentPart = '';
    
    for (const line of lines) {
        if ((currentPart + line + '\n').length > maxLength) {
            if (currentPart) parts.push(currentPart.trim());
            currentPart = line + '\n';
        } else {
            currentPart += line + '\n';
        }
    }
    
    if (currentPart) parts.push(currentPart.trim());
    return parts;
}

// Weather
if (command === 'weather') {
    const cityName = args.join(' ');

    if (!cityName) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .weather <city_name>\n\n*Examples:*\n.weather London\n.weather New York\n.weather Tokyo\n.weather Jakarta\n.cuaca Bandung' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🌤️", key: msg.key } });

    try {
        const weatherData = await Weather(cityName);
        
        const responseMessage = `🌤️ *Weather in ${cityName}*\n\n` +
                               `🌡️ *Temperature:* ${weatherData.temperature}\n` +
                               `☁️ *Condition:* ${weatherData.condition}\n` +
                               `💨 *Wind:* ${weatherData.wind}\n` +
                               `💧 *Humidity:* ${weatherData.humidity}`;

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Weather Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Weather check failed: ${error.message}\n\n💡 *Possible issues:*\n• City name not found\n• Network connection issue\n• Try different city spelling` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Detailed Weather Command
if (command === 'weather-detail') {
    const cityName = args.join(' ');

    if (!cityName) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .weather-detail <city_name>\n\n*Shows detailed weather forecast*' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "📊", key: msg.key } });

    try {
        // Get more detailed weather data
        const detailUrl = `https://wttr.in/${cityName}?format=%t|%C|%w|%h|%p|%P|%u|%m&lang=id&m`;
        const response = await axios.get(detailUrl);
        const weatherParts = response.data.split('|');

        const responseMessage = `📊 *Detailed Weather - ${cityName}*\n\n` +
                               `🌡️ *Temperature:* ${weatherParts[0].trim()}\n` +
                               `☁️ *Condition:* ${weatherParts[1].trim()}\n` +
                               `💨 *Wind:* ${weatherParts[2].trim()}\n` +
                               `💧 *Humidity:* ${weatherParts[3].trim()}\n` +
                               `🌧️ *Precipitation:* ${weatherParts[4].trim()}\n` +
                               `💨 *Pressure:* ${weatherParts[5].trim()}\n` +
                               `👁️ *UV Index:* ${weatherParts[6].trim()}\n` +
                               `🌙 *Moon Phase:* ${weatherParts[7].trim()}`;

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Detailed Weather Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Detailed weather failed for ${cityName}` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Weather Forecast (3 days)
if (command === 'forecast') {
    const cityName = args.join(' ');

    if (!cityName) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .forecast <city_name>\n\n*Shows 3-day weather forecast*' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "📅", key: msg.key } });

    try {
        const forecastUrl = `https://wttr.in/${cityName}?format="%l|%c|%t|%w|%h\n"&lang=id&m&period=3`;
        const response = await axios.get(forecastUrl);
        
        const forecasts = response.data.trim().split('\n');
        
        let responseMessage = `📅 *3-Day Forecast - ${cityName}*\n\n`;
        
        const days = ['Today', 'Tomorrow', 'Day After Tomorrow'];
        
        forecasts.slice(0, 3).forEach((forecast, index) => {
            const parts = forecast.replace(/"/g, '').split('|');
            if (parts.length >= 5) {
                responseMessage += `*${days[index]}*\n` +
                                 `☁️ ${parts[1].trim()}\n` +
                                 `🌡️ ${parts[2].trim()}\n` +
                                 `💨 ${parts[3].trim()}\n` +
                                 `💧 ${parts[4].trim()}\n\n`;
            }
        });

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Forecast Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Forecast failed for ${cityName}` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Multiple Cities Weather Comparison
if (command === 'weather-compare') {
    const cities = args.join(' ').split(',').map(city => city.trim());

    if (cities.length < 2) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .weather-compare <city1>,<city2>,<city3>\n\n*Example:* .weather-compare London,Paris,Tokyo\n*Compares weather in multiple cities*' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "⚖️", key: msg.key } });

    try {
        let responseMessage = `⚖️ *Weather Comparison*\n\n`;
        
        for (const city of cities.slice(0, 5)) { // Limit to 5 cities
            try {
                const weatherData = await Weather(city);
                responseMessage += `*${city}*\n` +
                                 `🌡️ ${weatherData.temperature} | ☁️ ${weatherData.condition}\n` +
                                 `💨 ${weatherData.wind} | 💧 ${weatherData.humidity}\n\n`;
            } catch (error) {
                responseMessage += `*${city}*: ❌ Not found\n\n`;
            }
        }

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Weather Compare Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Weather comparison failed.' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Weather with ASCII Art (Fun)
if (command === 'weather-art') {
    const cityName = args.join(' ');

    if (!cityName) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .weather-art <city_name>\n\n*Shows weather with ASCII art*' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🎨", key: msg.key } });

    try {
        const artUrl = `https://wttr.in/${cityName}?lang=id&m`;
        const response = await axios.get(artUrl);
        
        // Get ASCII art (first few lines)
        const asciiArt = response.data.split('\n').slice(0, 10).join('\n');
        
        const responseMessage = `🎨 *Weather Art - ${cityName}*\n\n\`\`\`${asciiArt}\`\`\``;

        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (error) {
        console.error('Weather Art Error:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Weather art failed for ${cityName}` 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Wiki AI
if (command === 'wiki-ai') {
    const searchQuery = args.join(' ');
    if (!searchQuery) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .wiki-ai <search_query>\n\n*Example:* .wiki-ai Albert Einstein' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const responseMessage = await WikipediaAI(searchQuery);
        if (responseMessage) {
            await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
            console.log(`Response: ${responseMessage}`);
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Wiki Search
if (command === 'wiki-search') {
    const searchQuery = args.join(' ');
    if (!searchQuery) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .wiki-search <search_query>\n\n*Example:* .wiki-search quantum physics' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });

    try {
        const responseMessage = await WikipediaSearch(searchQuery);
        if (responseMessage) {
            await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
            console.log(`Response: ${responseMessage}`);
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Wiki Image
if (command === 'wiki-img') {
    const userQuery = args.join(' ');
    if (!userQuery) {
        await sock.sendMessage(chatId, { 
            text: '❌ *Usage:* .wiki-img <search_query>\n\n*Example:* .wiki-img Eiffel Tower' 
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🖼️", key: msg.key } });

    try {
        const result = await WikipediaImage(userQuery);
        if (result && result.url) {
            await sock.sendMessage(chatId, { 
                image: { url: result.url }, 
                caption: result.caption 
            }, { quoted: msg });
            console.log(`Response: ${result.caption}\n${result.url}`);

            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ No Wikipedia image found for that search.' 
            }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        }
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error fetching Wikipedia image.' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Text-to-Speech (TTS)
if (command === 'tts') {
    const textToConvert = args.join(' ');
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const audioFilePath = path.join(__dirname, '../uploads/output.mp3');
        const gtts = new gTTS(textToConvert, 'en');

        gtts.save(audioFilePath, async function (err) {
            if (err) {
                console.error('Error saving audio:', err);
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
                return;
            }

            await sock.sendMessage(chatId, {
                audio: { url: audioFilePath },
                mimetype: 'audio/mp4',
                ptt: true,
            }, { quoted: msg });

            console.log(`Response: Audio sent ${audioFilePath}`);

            fs.unlink(audioFilePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error deleting audio file:', unlinkErr);
                }
            });

            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        });
    } catch (error) {
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Text-to-Speech (TTS2) send to target 
		if (command === 'Tts2') {
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const joinedArgs = args.join(' ');
        const lastSpaceIndex = joinedArgs.lastIndexOf(' ');

        if (lastSpaceIndex === -1) {
            await sock.sendMessage(chatId, { text: "❌ Usage: `.tts2 your message here 23481xxxxxxx`" });
            return;
        }

        const textToConvert = joinedArgs.substring(0, lastSpaceIndex).trim();
        const targetNumber = joinedArgs.substring(lastSpaceIndex + 1).trim();

        if (!textToConvert || !targetNumber) {
            await sock.sendMessage(chatId, {
                text: "❌ Please provide both a message and a phone number like `.tts2 Hello 23481xxxxxxx`",
            });
            return;
        }

        const targetJid = `${targetNumber.replace('+', '')}@s.whatsapp.net`;
        const audioFilePath = path.join(__dirname, '../uploads/output.mp3');
        const gtts = new gTTS(textToConvert, 'en');

        gtts.save(audioFilePath, async function (err) {
            if (err) {
                console.error('Error saving audio:', err);
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
                return;
            }

            await sock.sendMessage(targetJid, {
                audio: { url: audioFilePath },
                mimetype: 'audio/mp4',
                ptt: true,
            });

            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
            console.log(`✅ Sent TTS to ${targetJid}: "${textToConvert}"`);

            fs.unlink(audioFilePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting audio file:', unlinkErr);
            });
        });
    } catch (error) {
        console.error("TTS2 Error:", error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}


// Translate to English 
if (command === "translate-en") {
    const text = args.join(" ");
    if (!text) {
        await sock.sendMessage(chatId, {
            text: "❌ Please provide text to translate.\n\n*Example:* ~translate-en I love coding"
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const translatedText = await Translate(text, "en");
        await sock.sendMessage(chatId, { text: `*Translated (EN):*\n${translatedText}` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error("❌ Translate error:", error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Translate to French
if (command === "translate-fr") {
    const text = args.join(" ");
    if (!text) {
        await sock.sendMessage(chatId, {
            text: "❌ Please provide text to translate.\n\n*Example:* ~translate-fr I love coding"
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const translatedText = await Translate(text, "fr");
        await sock.sendMessage(chatId, { text: `*Traduit (FR):*\n${translatedText}` }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error("❌ Translate error:", error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Convert Video to Audio
const ffmpeg = require('fluent-ffmpeg');

if (command === 'tomp3') {
  const chatId = msg.key.remoteJid;

  // Check if message is a reply to a video
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const videoMessage = quoted?.videoMessage || msg.message?.videoMessage;

  if (!videoMessage) {
    await sock.sendMessage(chatId, { text: '⚠️ Reply to a video with ~tomp3 to convert it.' });
    return;
  }

  try {
    // Send processing message
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });
    
    // Download video
    const buffer = await downloadContentFromMessage(videoMessage, 'video')
      .then(async (stream) => {
        let buff = Buffer.from([]);
        for await (const chunk of stream) {
          buff = Buffer.concat([buff, chunk]);
        }
        return buff;
      });

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `input_${timestamp}.mp4`);
    const outputPath = path.join(tempDir, `output_${timestamp}.mp3`);

    fs.writeFileSync(inputPath, buffer);

    await sock.sendMessage(chatId, { react: { text: "🔄", key: msg.key } });

    // Convert to MP3 using ffmpeg
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioBitrate(128)
        .toFormat('mp3')
        .on('start', (commandLine) => {
          console.log('FFmpeg started with command: ' + commandLine);
        })
        .on('progress', (progress) => {
          console.log('Processing: ' + (progress.percent || 0) + '% done');
        })
        .on('end', async () => {
          try {
            console.log('Conversion finished');
            
            // Check if file exists and has content
            if (!fs.existsSync(outputPath)) {
              throw new Error('Output file was not created');
            }
            
            const stats = fs.statSync(outputPath);
            if (stats.size === 0) {
              throw new Error('Output file is empty');
            }
            
            const mp3Buffer = fs.readFileSync(outputPath);
            
            await sock.sendMessage(chatId, { 
              audio: mp3Buffer, 
              mimetype: 'audio/mpeg',
              ptt: false
            });

            // Cleanup
            cleanupFiles(inputPath, outputPath);
            resolve();
            
          } catch (error) {
            console.error('Error sending audio:', error);
            await sock.sendMessage(chatId, { text: '❌ Error sending converted audio.' });
            cleanupFiles(inputPath, outputPath);
            reject(error);
          }
        })
        .on('error', async (err) => {
          console.error('FFmpeg error:', err);
          await sock.sendMessage(chatId, { text: '❌ Conversion failed.' });
          cleanupFiles(inputPath, outputPath);
          reject(err);
        })
        .save(outputPath);
    });

  } catch (err) {
    console.error('General error:', err);
    await sock.sendMessage(chatId, { text: '❌ Error processing video.' });
  }
}

// Helper function for cleanup
function cleanupFiles(...files) {
  files.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log('Cleaned up:', file);
      }
    } catch (error) {
      console.error('Error cleaning up file:', file, error);
    }
  });
}

// Convert Sticker to Image 
if (command === 'to-img') {
    const isSticker = msg.message?.stickerMessage ||
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;

    const targetMsg = msg.message?.stickerMessage ? msg :
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ? {
            message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
            key: {
                remoteJid: chatId,
                id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                fromMe: false,
                participant: msg.message.extendedTextMessage.contextInfo.participant,
            }
        } : null;

    if (!isSticker || !targetMsg) {
        await sock.sendMessage(chatId, {
            text: "⚠️ Please reply to a *sticker* to convert it to an image.",
        }, { quoted: msg });
        return;
    }

    try {
        console.log("🔄 STEP 1: Downloading sticker media...");
        const media = await downloadMediaMessage(
            targetMsg,
            'buffer',
            {},
            { reuploadRequest: sock.updateMediaMessage }
        );
        console.log("✅ STEP 2: Sticker media downloaded.");

        await sock.sendMessage(chatId, {
            image: media,
            caption: '🖼️ Sticker successfully converted to image!',
        }, { quoted: msg });

        console.log("🎉 STEP 4: Image sent successfully!");

    } catch (err) {
        console.error("❌ Error in sticker to image conversion:", err);
        await sock.sendMessage(chatId, {
            text: `❌ Failed to convert sticker: ${err.message}`
        }, { quoted: msg });
    }
}

// Convert Image to Sticker
	if (command === 'sticker') {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const isQuotedImage = quoted?.imageMessage;
    const isDirectImage = msg.message.imageMessage;

    const targetImage = isQuotedImage ? { message: quoted } : (isDirectImage ? msg : null);

    if (!targetImage) {
        await sock.sendMessage(chatId, { text: "❌ Send or reply to an image with the command." }, { quoted: msg });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: "🛠️", key: msg.key } });
    console.log("🟡 STEP 1: Detected valid image...");

    try {
        const buffer = await downloadMediaMessage(
            targetImage,
            'buffer',
            {},
            { reuploadRequest: sock.updateMediaMessage }
        );
        console.log("🟢 STEP 2: Media downloaded");

        const inputPath = path.join(__dirname, '../uploads/input.jpg');
        const outputPath = path.join(__dirname, '../uploads/output.webp');
        const ffmpegPath = 'ffmpeg';



        fs.writeFileSync(inputPath, buffer);
        console.log("🟢 STEP 3: Buffer saved to", inputPath);

        const ffmpegCmd = `${ffmpegPath} -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white" -vcodec libwebp -lossless 1 -q:v 80 -preset default -loop 0 -an -fps_mode vfr "${outputPath}"`;
        console.log("🟢 STEP 4: Running FFmpeg...");
        exec(ffmpegCmd, async (error, stdout, stderr) => {
            if (error) {
                console.error("❌ FFmpeg Error:", error.message);
                console.error("❌ STDERR:", stderr);
                await sock.sendMessage(chatId, { text: "❌ FFmpeg failed to convert image.", quoted: msg });
                return;
            }

            console.log("✅ STEP 5: FFmpeg completed.");
            const sticker = fs.readFileSync(outputPath);
            await sock.sendMessage(chatId, { sticker }, { quoted: msg });

            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);

            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        });

    } catch (err) {
        console.error("❌ Download error:", err);
        await sock.sendMessage(chatId, { text: "❌ Failed to download media.", quoted: msg });
    }
}


		if (command === 'gemini') {
    const question = args.join(' ');
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const responseMessage = await GeminiMessage(question);
        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        console.log(`Response: ${responseMessage}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

if (command === 'test-key') {
    try {
        const testUrls = [
            `https://generativelanguage.googleapis.com/v1/models?key=${config.GEMINI_API}`,
            `https://generativelanguage.googleapis.com/v1beta/models?key=${config.GEMINI_API}`
        ];
        
        let workingUrl = null;
        
        for (const testUrl of testUrls) {
            try {
                console.log(`Testing: ${testUrl}`);
                const response = await axios.get(testUrl);
                
                if (response.status === 200) {
                    const data = response.data;
                    workingUrl = testUrl;
                    await sock.sendMessage(chatId, {
                        text: `✅ API Key is WORKING!\n\nEndpoint: ${testUrl.split('?')[0]}\nAvailable models: ${data.models ? data.models.length : 'Unknown'}\n\nGemini AI is now ready! 🚀`
                    });
                    break;
                }
            } catch (error) {
                console.log(`❌ Endpoint failed: ${testUrl}`);
                continue;
            }
        }
        
        if (!workingUrl) {
            await sock.sendMessage(chatId, {
                text: `❌ API Key test failed on all endpoints.\n\nPlease check:\n1. Your API key is valid\n2. You have enabled Gemini API in Google Cloud Console\n3. Your billing is set up`
            });
        }
        
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: `❌ API Key test error: ${error.message}`
        });
    }
}

if (command === 'list-models') {
    try {
        await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });
        
        // Import the Gemini module properly
        const { findWorkingModel } = require('../controllers/Gemini');
        const modelName = await findWorkingModel();
        
        await sock.sendMessage(chatId, {
            text: `✅ Working model found: ${modelName}\n\nTry using .gemini-ai now! 🚀`
        });
        
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: `❌ Error finding models: ${error.message}\n\nCheck console for detailed model list.`
        });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Gemini Roasting
if (command === 'gemini-roasting') {
    const question = args.join(' ');
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

    try {
        const responseMessage = await GeminiRoastingMessage(question);
        await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
        console.log(`Response: ${responseMessage}`);
        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
        console.error('Error sending message:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Gemini Image Analysis
if (command === 'gemini-img') {
    const quotedMessage = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const getPrompt = args.join(' ').trim();

    if (quotedMessage?.imageMessage) {
        await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

        const buffer = await downloadMediaMessage({ message: quotedMessage }, 'buffer');
        const inputFilePath = path.join(__dirname, '../uploads/input-image.jpg');
        fs.writeFileSync(inputFilePath, buffer);

        try {
            const analysisResult = await GeminiImage(inputFilePath, getPrompt);
            await sock.sendMessage(chatId, { text: analysisResult }, { quoted: msg });
            console.log(`Response: ${analysisResult}`);
        } catch (error) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        } finally {
            fs.unlinkSync(inputFilePath);
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        }
    } else {
        await sock.sendMessage(chatId, { text: "⚠️ Please reply to an image to analyze.", quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Gemini Roasting Image
if (command === 'gemini-roasting-img') {
    const quotedMessage = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const getPrompt = args.join(' ').trim();

    if (quotedMessage?.imageMessage) {
        await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });

        const buffer = await downloadMediaMessage({ message: quotedMessage }, 'buffer');
        const inputFilePath = path.join(__dirname, '../upload/input-image.jpg');
        fs.writeFileSync(inputFilePath, buffer);

        try {
            const analysisResult = await GeminiImageRoasting(inputFilePath, getPrompt);
            await sock.sendMessage(chatId, { text: analysisResult }, { quoted: msg });
            console.log(`Response: ${analysisResult}`);
        } catch (error) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        } finally {
            fs.unlinkSync(inputFilePath);
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        }
    } else {
        await sock.sendMessage(chatId, { text: "⚠️ Please reply to an image to roast.", quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// ==============================================
// 🔹GROUP COMMANDS
// ==============================================

       
// Group Kicked User
if (command === 'eXe') {
    await sock.sendMessage(chatId, { react: { text: "👨‍💻", key: msg.key } });
    
    let usersToKick = [];
    
    // Check for mentioned users (@)
    const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentionedJid && mentionedJid.length > 0) {
        usersToKick = mentionedJid;
    }
    // Check for quoted/replied message
    else if (msg.message.extendedTextMessage?.contextInfo?.participant) {
        usersToKick = [msg.message.extendedTextMessage.contextInfo.participant];
    }
    
    if (usersToKick.length > 0) {
        try {
            await sock.groupParticipantsUpdate(chatId, usersToKick, "remove");
            await sock.sendMessage(chatId, { text: "User(s) Kicked!" }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } catch (error) {
            console.error('Error kicking user:', error);
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        }
    } else {
        await sock.sendMessage(chatId, { text: "Please mention a user (@) or reply to a user's message to Kick." }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Desire Leaves Group Chat
if (command === 'Desire-eXit') {
    await sock.sendMessage(chatId, { text: "*Desire is done eXecuting*" });
    await sock.groupLeave(chatId);
}

// ✅ Set Group Profile Picture
if (command === 'set-gcpp') {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) return;

    const metadata = await sock.groupMetadata(chatId);
    const admins = metadata.participants.filter(p => p.admin);
    const isAdmin = admins.some(p => p.id === msg.key.participant);

    if (!isAdmin) {
        await sock.sendMessage(chatId, { 
            text: '❌ Only admins can change the group profile picture.' 
        }, { quoted: msg });
        return;
    }

    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg?.imageMessage) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ Reply to an image with \\setpfp to change the group profile picture.' 
        }, { quoted: msg });
        return;
    }

    try {
        // ✅ Proper media download
        const mediaBuffer = await downloadMediaMessage(
            { message: quotedMsg }, 
            'buffer',
            {},
            { logger: P({ level: 'silent' }) }
        );

        await sock.updateProfilePicture(chatId, mediaBuffer);
        await sock.sendMessage(chatId, { text: '✅ Group profile picture updated successfully!' });
    } catch (err) {
        await sock.sendMessage(chatId, { text: `❌ Failed: ${err.message}` });
    }
}

// ✅ Remove Group Profile Picture
if (command === 'removepp') {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) return;

    const metadata = await sock.groupMetadata(chatId);
    const admins = metadata.participants.filter(p => p.admin);
    const isAdmin = admins.some(p => p.id === msg.key.participant);

    if (!isAdmin) {
        await sock.sendMessage(chatId, { 
            text: '❌ Only admins can remove the group profile picture.' 
        }, { quoted: msg });
        return;
    }

    try {
        // Use reliable image URLs that won't give 404
        const defaultImages = [
            "https://i.imgur.com/7B6Q6ZQ.png", // Group icon
            "https://i.imgur.com/1s6Qz8v.png", // Grey placeholder
            "https://i.imgur.com/3Q6ZQ7u.png", // Green icon
            "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" // WhatsApp logo
        ];

        let success = false;
        for (const imageUrl of defaultImages) {
            try {
                await sock.updateProfilePicture(chatId, { url: imageUrl });
                success = true;
                await sock.sendMessage(chatId, { text: "✅ Group profile picture set to default icon." });
                break;
            } catch (urlError) {
                console.log(`URL failed: ${imageUrl}, trying next...`);
                continue;
            }
        }

        if (!success) {
            throw new Error('All default image URLs failed');
        }
        
    } catch (err) {
        console.error("Remove PP error:", err);
        
        if (err.message.includes('404')) {
            await sock.sendMessage(chatId, { 
                text: '❌ Default image not found. Please try a different image URL.' 
            }, { quoted: msg });
        } else if (err.message.includes('429')) {
            await sock.sendMessage(chatId, { 
                text: '❌ Rate limited. Please wait 5-10 minutes.' 
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { 
                text: `❌ Failed: ${err.message}` 
            }, { quoted: msg });
        }
    }
}

// Send A Kill Gif
if (command === 'kill') {
    try {
        // List of working kill-related GIFs
        const killGifs = [
            'https://media.giphy.com/media/l0Exk8EUz7gRgPRm8/giphy.gif', // Gun shooting
            'https://media.giphy.com/media/3o7aD2d7hy9ktXNDP2/giphy.gif', // Explosion
            'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif', // Knife throw
            'https://media.giphy.com/media/26uf759LlDftqZNVm/giphy.gif', // Bomb explosion
            'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', // Sword slash
            'https://media.giphy.com/media/3o7abGQa0aRsohveX6/giphy.gif', // Fireball
            'https://media.giphy.com/media/26ufnwz3wDUli7GU0/giphy.gif', // Laser blast
            'https://media.giphy.com/media/l0HlN3skHzHz8m0q4/giphy.gif'  // Magic spell
        ];

        // Randomly select a GIF
        const randomGif = killGifs[Math.floor(Math.random() * killGifs.length)];

        // List of death messages
        const deathMessages = [
            'has been eliminated! 💀',
            'was sent to the shadow realm! 👻',
            'has met their doom! ☠️',
            'got rekt by the bot! 🤖',
            'has been defeated! 🎯',
            'is no more! 💥',
            'got owned! 🔥',
            'has been terminated! ⚡'
        ];

        // Randomly select a death message
        const randomMessage = deathMessages[Math.floor(Math.random() * deathMessages.length)];

        // Check if it's a reply to someone
        const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedUser = quotedMsg ? msg.message.extendedTextMessage.contextInfo.participant : null;

        let messageText = '';
        let mentions = [];

        if (quotedUser) {
            // If replying to someone, target that person
            const quotedName = quotedUser.split('@')[0];
            const senderName = msg.key.participant ? msg.key.participant.split('@')[0] : 'Someone';
            
            messageText = `🔫 @${senderName} killed @${quotedName}! ${randomMessage}`;
            mentions = [quotedUser, msg.key.participant].filter(Boolean);
        } else {
            // If no reply, just send a general kill message
            const senderName = msg.key.participant ? msg.key.participant.split('@')[0] : 'Anonymous';
            messageText = `🔫 @${senderName} is on a killing spree! ${randomMessage}`;
            mentions = msg.key.participant ? [msg.key.participant] : [];
        }

        // Send the kill message with GIF
        await sock.sendMessage(msg.key.remoteJid, {
            video: { url: randomGif },
            gifPlayback: true,
            caption: messageText,
            mentions: mentions
        });

    } catch (err) {
        console.error("Kill command error:", err);
        
        // Fallback: Send text-only message if GIF fails
        try {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '💀 Someone just got eliminated! (GIF failed to load)'
            });
        } catch (fallbackError) {
            console.error("Fallback also failed:", fallbackError);
        }
    }
}

// List Admins
if (command === 'admins') {
  try {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
      await sock.sendMessage(chatId, { text: '❌ This command only works in groups.' });
      return;
    }

    const metadata = await sock.groupMetadata(chatId);
    const admins = metadata.participants.filter(p => p.admin !== null);
    
    if (admins.length === 0) {
      await sock.sendMessage(chatId, { text: '👥 No admins found in this group.' });
      return;
    }

    let text = `*👑 Group Admins - ${metadata.subject}*\n\n`;
    admins.forEach((admin, i) => {
      const username = admin.id.split('@')[0];
      const adminType = admin.admin === 'superadmin' ? ' (Owner)' : ' (Admin)';
      text += `${i + 1}. @${username}${adminType}\n`;
    });

    text += `\n*Total:* ${admins.length} admin(s)`;

    await sock.sendMessage(chatId, {
      text,
      mentions: admins.map(a => a.id)
    });

  } catch (err) {
    console.error('Error in admins command:', err);
    await sock.sendMessage(chatId, { text: '❌ Failed to fetch admin list.' });
  }
}

// Tagging All Members2
if (command === 'Tagall') {
    try {
        // Make sure it's a group
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { text: "❌ This command only works in groups." }, { quoted: msg });
            return;
        }

        // Fetch group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        // Optional: Custom text after tagall
        const text = args.length > 0 ? args.join(" ") : "📢 *Tagging all members:*";

        // Create numbered list format
        let memberList = '';
        participants.forEach((participant, index) => {
            const username = participant.id.split('@')[0];
            memberList += `${index + 1}). @${username}\n`;
        });

        // Send message with mentions
        await sock.sendMessage(chatId, {
            text: `${text}\n\n${memberList}`,
            mentions: participants.map(p => p.id)
        }, { quoted: msg });

    } catch (e) {
        console.error(e);
        await sock.sendMessage(chatId, { text: "❌ Failed to tag all members." }, { quoted: msg });
    }
}

// Tagging All Members
if (command === 'tagall') {
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;

        const mentions = participants.map(p => p.id);

        let message = `🔥 *TAG ALL MEMBERS* 🔥\n\n`;
        message += `📌 *Group:* ${metadata.subject}\n`;
        message += `👥 *Total Members:* ${participants.length}\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━\n`;

        // Fancy list symbols instead of numbers
        const symbols = ["✨", "🔥", "⚡", "🌙", "🌟", "💎", "🚀", "🎯", "💥", "🎉"];

        message += participants
            .map((p, i) => `${symbols[i % symbols.length]} 𝙐𝙨𝙚𝙧 → @${p.id.split('@')[0]}`)
            .join('\n');

        message += `\n━━━━━━━━━━━━━━━━━━━\n✅ Done tagging all!`;

        await sock.sendMessage(chatId, {
            text: message,
            mentions: mentions
        });
    } catch (error) {
        console.error('Error in tagall command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to tag all members.' });
    }
}

// Warn A Memmber
if (command === 'warn') {
    try {
        const chatId = msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        
        if (!isGroup) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ This command only works in groups.' 
            });
            return;
        }

        // Get the target user (either mentioned or replied to)
        let targetUser = null;
        let reason = args.join(' ').trim();

        // Check if it's a reply to a message
        if (msg.message.extendedTextMessage?.contextInfo?.participant) {
            targetUser = msg.message.extendedTextMessage.contextInfo.participant;
            
            // Extract reason from message text if it exists
            const messageText = msg.message.extendedTextMessage.text || '';
            if (messageText.startsWith('\\warn')) {
                reason = messageText.replace('\\warn', '').trim();
            }
        }
        
        // If no reply, check for mentioned users
        if (!targetUser && msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            targetUser = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }

        // If still no target, check args for @mention
        if (!targetUser && args.length > 0) {
            const mentionMatch = args[0].match(/@(\d+)/);
            if (mentionMatch) {
                targetUser = `${mentionMatch[1]}@s.whatsapp.net`;
                reason = args.slice(1).join(' ').trim();
            }
        }

        if (!targetUser) {
            await sock.sendMessage(chatId, { 
                text: '❌ Please reply to a user or mention someone to warn.\nUsage: ~warn @user [reason]' 
            }, { quoted: msg });
            return;
        }

        // Check if warner is admin
        const groupMetadata = await sock.groupMetadata(chatId);
        const admins = groupMetadata.participants.filter(p => p.admin);
        const isAdmin = admins.some(p => p.id === (msg.key.participant || msg.key.remoteJid));

        if (!isAdmin) {
            await sock.sendMessage(chatId, { 
                text: '❌ Only admins can warn users.' 
            }, { quoted: msg });
            return;
        }

        // Check if target is admin
        const targetIsAdmin = admins.some(p => p.id === targetUser);
        if (targetIsAdmin) {
            await sock.sendMessage(chatId, { 
                text: '❌ You cannot warn other admins.' 
            }, { quoted: msg });
            return;
        }

        // Initialize warnings system
        const warningsFile = './src/warnings.json';
        let warningsData = {};
        
        if (fs.existsSync(warningsFile)) {
            try {
                warningsData = JSON.parse(fs.readFileSync(warningsFile));
            } catch (e) {
                warningsData = {};
            }
        }

        if (!warningsData[chatId]) {
            warningsData[chatId] = {};
        }

        if (!warningsData[chatId][targetUser]) {
            warningsData[chatId][targetUser] = {
                count: 0,
                reasons: [],
                lastWarned: null
            };
        }

        // Update warnings
        warningsData[chatId][targetUser].count++;
        warningsData[chatId][targetUser].reasons.push(reason || 'No reason provided');
        warningsData[chatId][targetUser].lastWarned = new Date().toISOString();

        // Save warnings data
        fs.writeFileSync(warningsFile, JSON.stringify(warningsData, null, 2));

        const warnCount = warningsData[chatId][targetUser].count;
        const targetName = targetUser.split('@')[0];
        const warnerName = (msg.key.participant || msg.key.remoteJid).split('@')[0];

        // Create warning message
        let warningMessage = `⚠️ *WARNING* ⚠️\n\n`;
        warningMessage += `👤 User: @${targetName}\n`;
        warningMessage += `🔢 Warning: ${warnCount}/3\n`;
        warningMessage += `📝 Reason: ${reason || 'No reason provided'}\n`;
        warningMessage += `🛡️ Warned by: @${warnerName}\n\n`;

if (warnCount >= 3) {
    warningMessage += `🚨 *FINAL WARNING!* User has been removed for exceeding 3 warnings!`;

    // Auto-kick after 3 warnings
    await sock.groupParticipantsUpdate(chatId, [targetUser], 'remove');
} else if (warnCount === 2) {
    warningMessage += `⚠ *Second warning!* One more and actions will be taken!`;
} else {
    warningMessage += `ℹ Be careful! Further violations will lead to more warnings.`;
}


        // Send warning message
        await sock.sendMessage(chatId, {
            text: warningMessage,
            mentions: [targetUser, (msg.key.participant || msg.key.remoteJid)]
        }, { quoted: msg });

    } catch (err) {
        console.error("Warn command error:", err);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❌ Failed to warn user: ${err.message}`
        }, { quoted: msg });
    }
}

// List All Warnings For A Member
if (command === 'warnings') {
    try {
        const chatId = msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        
        if (!isGroup) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ This command only works in groups.' 
            });
            return;
        }

        // Get target user
        let targetUser = null;

        // Check reply
        if (msg.message.extendedTextMessage?.contextInfo?.participant) {
            targetUser = msg.message.extendedTextMessage.contextInfo.participant;
        }
        // Check mention
        else if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            targetUser = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Check args
        else if (args.length > 0) {
            const mentionMatch = args[0].match(/@(\d+)/);
            if (mentionMatch) {
                targetUser = `${mentionMatch[1]}@s.whatsapp.net`;
            }
        }
        // Default to sender
        else {
            targetUser = msg.key.participant || msg.key.remoteJid;
        }

        // Load warnings data
        const warningsFile = './src/warnings.json';
        let warningsData = {};
        
        if (fs.existsSync(warningsFile)) {
            try {
                warningsData = JSON.parse(fs.readFileSync(warningsFile));
            } catch (e) {
                warningsData = {};
            }
        }

        const userWarnings = warningsData[chatId]?.[targetUser];
        const targetName = targetUser.split('@')[0];

        if (!userWarnings || userWarnings.count === 0) {
            await sock.sendMessage(chatId, {
                text: `✅ @${targetName} has no warnings in this group.`,
                mentions: [targetUser]
            }, { quoted: msg });
            return;
        }

        let warningsMessage = `📋 *Warnings for @${targetName}*\n\n`;
        warningsMessage += `🔢 Total Warnings: ${userWarnings.count}/3\n`;
        warningsMessage += `🕒 Last Warned: ${new Date(userWarnings.lastWarned).toLocaleString()}\n\n`;
        warningsMessage += `📝 Warning Reasons:\n`;

        userWarnings.reasons.forEach((reason, index) => {
            warningsMessage += `${index + 1}. ${reason}\n`;
        });

        if (userWarnings.count >= 3) {
            warningsMessage += `\n🚨 *USER HAS MAX WARNINGS!* Consider taking action.`;
        }

        await sock.sendMessage(chatId, {
            text: warningsMessage,
            mentions: [targetUser]
        }, { quoted: msg });

    } catch (err) {
        console.error("Warnings command error:", err);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❌ Failed to check warnings: ${err.message}`
        });
    }
}


// Clear All Warnings For A Member
if (command === 'clearwarns') {
    try {
        const chatId = msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        
        if (!isGroup) return;

        // Check if user is admin
        const groupMetadata = await sock.groupMetadata(chatId);
        const admins = groupMetadata.participants.filter(p => p.admin);
        const isAdmin = admins.some(p => p.id === (msg.key.participant || msg.key.remoteJid));

        if (!isAdmin) {
            await sock.sendMessage(chatId, { 
                text: '❌ Only admins can clear warnings.' 
            });
            return;
        }

        let targetUser = null;

        if (msg.message.extendedTextMessage?.contextInfo?.participant) {
            targetUser = msg.message.extendedTextMessage.contextInfo.participant;
        }
        else if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            targetUser = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        else if (args.length > 0) {
            const mentionMatch = args[0].match(/@(\d+)/);
            if (mentionMatch) {
                targetUser = `${mentionMatch[1]}@s.whatsapp.net`;
            }
        }

        if (!targetUser) {
            await sock.sendMessage(chatId, { 
                text: '❌ Please reply to or mention a user to clear their warnings.' 
            }, { quoted: msg });
            return;
        }

        // Load and clear warnings
        const warningsFile = './src/warnings.json';
        let warningsData = {};
        
        if (fs.existsSync(warningsFile)) {
            try {
                warningsData = JSON.parse(fs.readFileSync(warningsFile));
            } catch (e) {
                warningsData = {};
            }
        }

        if (warningsData[chatId]?.[targetUser]) {
            delete warningsData[chatId][targetUser];
            fs.writeFileSync(warningsFile, JSON.stringify(warningsData, null, 2));
            
            await sock.sendMessage(chatId, {
                text: `✅ All warnings cleared for @${targetUser.split('@')[0]}`,
                mentions: [targetUser]
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, {
                text: `✅ @${targetUser.split('@')[0]} has no warnings to clear.`,
                mentions: [targetUser]
            }, { quoted: msg });
        }

    } catch (err) {
        console.error("Clear warns error:", err);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❌ Failed to clear warnings: ${err.message}`
        });
    }
}
// Remove one Warning For A Member
if (command === 'unwarn') { 
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: '⚠️ This command only works in groups.' });
        return;
    }

    // Get target user (mentioned or replied to)
    let targetUser = null;

    // Check if it's a reply
    if (msg.message.extendedTextMessage?.contextInfo?.participant) {
        targetUser = msg.message.extendedTextMessage.contextInfo.participant;
    }
    // Check if user is mentioned
    else if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetUser = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Check args for @mention
    else if (args.length > 0) {
        const mentionMatch = args[0].match(/@(\d+)/);
        if (mentionMatch) {
            targetUser = `${mentionMatch[1]}@s.whatsapp.net`;
        }
    }

    if (!targetUser) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ Please reply to a user or mention someone to unwarn.\nUsage: ~unwarn @user' 
        }, { quoted: msg });
        return;
    }

    // Check if user is admin
    const groupMetadata = await sock.groupMetadata(chatId);
    const admins = groupMetadata.participants.filter(p => p.admin);
    const isAdmin = admins.some(p => p.id === (msg.key.participant || msg.key.remoteJid));

    if (!isAdmin) {
        await sock.sendMessage(chatId, { 
            text: '❌ Only admins can remove warnings.' 
        }, { quoted: msg });
        return;
    }

    // Load warnings data
    const warningsFile = './src/warnings.json';
    let warningsData = {};
    
    if (fs.existsSync(warningsFile)) {
        try {
            warningsData = JSON.parse(fs.readFileSync(warningsFile));
        } catch (e) {
            warningsData = {};
        }
    }

    if (!warningsData[chatId]) warningsData[chatId] = {};
    if (!warningsData[chatId][targetUser]) {
        warningsData[chatId][targetUser] = {
            count: 0,
            reasons: [],
            lastWarned: null
        };
    }

    const currentWarnings = warningsData[chatId][targetUser].count;

    if (currentWarnings > 0) {
        // Decrease warning count
        warningsData[chatId][targetUser].count--;
        
        // Remove the last reason
        if (warningsData[chatId][targetUser].reasons.length > 0) {
            warningsData[chatId][targetUser].reasons.pop();
        }
        
        // Save updated warnings
        fs.writeFileSync(warningsFile, JSON.stringify(warningsData, null, 2));

        const newCount = warningsData[chatId][targetUser].count;
        await sock.sendMessage(chatId, {
            text: `✅ Removed a warning for @${targetUser.split('@')[0]} (${newCount}/3).`,
            mentions: [targetUser]
        }, { quoted: msg });
    } else {
        await sock.sendMessage(chatId, {
            text: `ℹ️ @${targetUser.split('@')[0]} has no warnings to remove.`,
            mentions: [targetUser]
        }, { quoted: msg });
    }
}

// Kick all Non-Admins (Use With Caution)
if (command === 'nuke') {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: '⚠️ This command only works in groups.' });
        return;
    }

    // Check if user is admin
    const metadata = await sock.groupMetadata(chatId);
    const sender = msg.key.participant || msg.key.remoteJid;
    const admins = metadata.participants.filter(p => p.admin);
    const isSenderAdmin = admins.some(a => a.id === sender);

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { 
            text: '❌ You must be an admin to use this command.' 
        }, { quoted: msg });
        return;
    }

    // Check for confirmation
    const needsConfirmation = !args.includes('-y') && !args.includes('--yes');
    
    if (needsConfirmation) {
        const nonAdmins = metadata.participants.filter(p => !p.admin);
        
        if (nonAdmins.length === 0) {
            await sock.sendMessage(chatId, { 
                text: 'ℹ️ Everyone in this group is already an admin.' 
            }, { quoted: msg });
            return;
        }

        await sock.sendMessage(chatId, {
            text: `💣 *NUKE COMMAND CONFIRMATION*\n\n` +
                  `⚠️ This will remove ALL ${nonAdmins.length} non-admin members!\n\n` +
                  `🔴 *This action cannot be undone!*\n\n` +
                  `To proceed, use: \\nuke -y\n` +
                  `To cancel, ignore this message.`
        }, { quoted: msg });
        return;
    }

    // Proceed with nuke
    const nonAdmins = metadata.participants.filter(p => !p.admin).map(p => p.id);
    
    if (nonAdmins.length === 0) {
        await sock.sendMessage(chatId, { 
            text: 'ℹ️ Everyone in this group is already an admin.' 
        }, { quoted: msg });
        return;
    }

    // Send countdown message
    await sock.sendMessage(chatId, { 
        text: `💣 NUKING ${nonAdmins.length} NON-ADMINS IN 3 SECONDS...\n🚨 SAY YOUR GOODBYES!` 
    });

    // 3 second countdown
    await new Promise(resolve => setTimeout(resolve, 3000));

    let successCount = 0;
    let failCount = 0;

    // Remove non-admins in batches to avoid rate limits
    for (let i = 0; i < nonAdmins.length; i++) {
        const user = nonAdmins[i];
        try {
            await sock.groupParticipantsUpdate(chatId, [user], 'remove');
            successCount++;
            
            // Small delay between removals to avoid rate limits
            if (i < nonAdmins.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (err) {
            console.log(`Failed to remove ${user}: ${err.message}`);
            failCount++;
        }
    }

    // Send result
    let resultText = `💥 *NUKE COMPLETE*\n\n`;
    resultText += `✅ Successfully removed: ${successCount} members\n`;
    
    if (failCount > 0) {
        resultText += `❌ Failed to remove: ${failCount} members\n`;
        resultText += `(They might be admins now or have protection)`;
    }
    
    resultText += `\n\n🏠 Group population: ${metadata.participants.length - nonAdmins.length} members`;

    await sock.sendMessage(chatId, { text: resultText });
}

// Reset Group chat's Link
if (command === 'reset-link') {
    const code = await sock.groupRevokeInvite(msg.key.remoteJid);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Group invite link has been revoked.\nNew link: https://chat.whatsapp.com/${code}` });
}

// Group Chat Information
if (command === 'ginfo') {
    try {
        const chatId = msg.key.remoteJid;
        const metadata = await sock.groupMetadata(chatId);

        const groupName = metadata.subject || "Unnamed Group";
        const groupMembers = metadata.participants.length;
        const groupDesc = metadata.desc || "No description set.";
        const creationDate = new Date(metadata.creation * 1000).toLocaleDateString();
        
        // Find the superadmin (founder)
        const superAdmin = metadata.participants.find(p => p.admin === 'superadmin');
        const groupOwner = superAdmin ? `@${superAdmin.id.split('@')[0]}` : "Unknown";
        
        const admins = metadata.participants.filter(p => p.admin).length;
        const regularMembers = groupMembers - admins;

        // Try to get group profile picture
        let groupImage = null;
        try {
            groupImage = await sock.profilePictureUrl(chatId, 'image');
        } catch (e) {
            console.log("No group profile picture found");
        }

        const info = `📊 *GROUP INFORMATION* 📊

🏷️ *Name:* ${groupName}
👑 *Founder:* ${groupOwner}
📅 *Established:* ${creationDate}

📈 *Population:* ${groupMembers}
   ├─ 💎 Admins: ${admins}
   ├─ 👥 Members: ${regularMembers}
   └─ 📊 Admin Ratio: ${Math.round((admins / groupMembers) * 100)}%

📖 *About:*
"${groupDesc}"

🆔 *ID:* ${chatId.split('@')[0]}`;

        // Send with image if available, otherwise text only
        if (groupImage) {
            await sock.sendMessage(chatId, {
                image: { url: groupImage },
                caption: info,
                mentions: superAdmin ? [superAdmin.id] : []
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { 
                text: info,
                mentions: superAdmin ? [superAdmin.id] : []
            }, { quoted: msg });
        }

    } catch (e) {
        console.error("Error fetching group info:", e);
        await sock.sendMessage(chatId, { text: "❌ Failed to fetch group information." }, { quoted: msg });
    }
}
// Tag
if (command === 'Tag') {
    const text = args.join(" ") || "👋 Hello everyone!";
    try {
        const metadata = await sock.groupMetadata(chatId);
        const mentions = metadata.participants.map(p => p.id);

        let message = `📢 *Broadcast Message* 📢\n\n${text}\n\n━━━━━━━━━━━━━━\n`;
        message += mentions
            .map((m, i) => `👨‍💻 @${m.split("@")[0]}`)
            .join("\n");

        await sock.sendMessage(chatId, {
            text: message,
            mentions: mentions
        });
    } catch (error) {
        console.error("Error in ~tag command:", error);
        await sock.sendMessage(chatId, { text: "❌ Failed to tag members." });
    }
}

// Invisible Tag
if (command === 'tag') {
    const text = args.join(" ") || "👀 Hidden message to all!";
    try {
        const metadata = await sock.groupMetadata(chatId);
        const mentions = metadata.participants.map(p => p.id);

        await sock.sendMessage(chatId, {
            text: text,
            mentions: mentions
        });
    } catch (error) {
        console.error("Error in ~hidetag command:", error);
        await sock.sendMessage(chatId, { text: "❌ Failed to hide tag." });
    }
}

// Block from Group chats 
if (command === 'block2') {
    try {
        if (!msg.key.remoteJid.endsWith("@g.us")) {
            await sock.sendMessage(chatId, { text: "❌ This command only works in groups." });
            return;
        }

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quotedUser = contextInfo?.participant;

        if (!quotedUser) {
            await sock.sendMessage(chatId, { text: "❌ Reply to a user’s message with ~block2 to block them." });
            return;
        }

        await sock.updateBlockStatus(quotedUser, "block"); // block that user
        await sock.sendMessage(chatId, {
            text: `✅ User @${quotedUser.split("@")[0]} has been blocked.`,
            mentions: [quotedUser]
        });
    } catch (error) {
        console.error("Error in block2 command:", error);
        await sock.sendMessage(chatId, { text: "❌ Failed to block user." });
    }
}


// Unblock from Group chats 
if (command === 'unblock') {
    try {
        if (!msg.key.remoteJid.endsWith("@g.us")) {
            await sock.sendMessage(chatId, { text: "❌ This command only works in groups." });
            return;
        }

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quotedUser = contextInfo?.participant;

        if (!quotedUser) {
            await sock.sendMessage(chatId, { text: "❌ Reply to a user’s message with ~unblock2 to unblock them." });
            return;
        }

        await sock.updateBlockStatus(quotedUser, "unblock"); // unblock that user
        await sock.sendMessage(chatId, {
            text: `✅ User @${quotedUser.split("@")[0]} has been unblocked.`,
            mentions: [quotedUser]
        });
    } catch (error) {
        console.error("Error in unblock2 command:", error);
        await sock.sendMessage(chatId, { text: "❌ Failed to unblock user." });
    }
}

// Detect Horny Members
if (command === 'detect-h') {
    await sock.sendMessage(chatId, { react: { text: "🔍", key: msg.key } });
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;

        if (!metadata || !participants || participants.length === 0) {
            throw new Error("No group participants found.");
        }

        // Randomly select one member
        const randomIndex = Math.floor(Math.random() * participants.length);
        const target = participants[randomIndex];
        const targetId = target.id;

        // Respond with a horny detection message
        const hornyLines = [
            "*You're acting way too down bad today...*",
            "*Suspicious levels of horniness detected!*",
            "*Caught in 4K being horny.*",
            "*Horny radar just pinged... and it's YOU.*",
            "*Your mind is 80% NSFW today, chill!*"
        ];

        const line = hornyLines[Math.floor(Math.random() * hornyLines.length)];

        await sock.sendMessage(chatId, {
            text: `@${targetId.split('@')[0]} ${line}`,
            mentions: [targetId]
        });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error("Error in ~detecthorny:", err);
        await sock.sendMessage(chatId, {
            text: "Failed to scan horny levels. Try again later.",
        });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
} 

// Send Information about A Member (Also works in DMs)
if (command === 'detect') {
  const chatId = msg.key.remoteJid;

  let targetUser = null;
  
  if (msg.message.extendedTextMessage?.contextInfo?.participant) {
    targetUser = msg.message.extendedTextMessage.contextInfo.participant;
  }
  else if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
    targetUser = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
  }

  if (!targetUser) {
    await sock.sendMessage(chatId, { 
      text: "🕵️‍♂️ *Detective Mode*\n\nI need a target to investigate!\n\nReply to user or: ~whois-gc @suspect" 
    }, { quoted: msg });
    return;
  }

  await sock.sendMessage(chatId, { react: { text: "🔎", key: msg.key } });

  try {
    const [profilePic, whatsAppInfo, groupMetadata] = await Promise.all([
      sock.profilePictureUrl(targetUser, 'image').catch(() => null),
      sock.onWhatsApp(targetUser).catch(() => null),
      sock.groupMetadata(chatId).catch(() => null)
    ]);

    let userName = "Unknown Identity";
    const number = targetUser.split('@')[0];
    
    if (whatsAppInfo?.[0]?.exists) {
      userName = whatsAppInfo[0].name || `User ${number}`;
    }

    // Investigate group role
    let clearanceLevel = "🕵️ Civilian";
    if (groupMetadata) {
      const userInGroup = groupMetadata.participants.find(p => p.id === targetUser);
      if (userInGroup) {
        clearanceLevel = userInGroup.admin ? "🦸‍♂️ High Command" : "👤 Operative";
      } else {
        clearanceLevel = "🚫 Not in organization";
      }
    }

    const caption = `🕵️‍♂️ *INVESTIGATION REPORT* 🕵️‍♂️
━━━━━━━━━━━━━━━━━━━━

🎭 *ALIAS:* ${userName}
📱 *CONTACT:* +${number}
🔐 *CLEARANCE:* ${clearanceLevel}
📸 *PHOTO ON FILE:* ${profilePic ? "YES" : "CLASSIFIED"}

━━━━━━━━━━━━━━━━━━━━
🆔 CASE #: ${targetUser.split('@')[0]}

*Further investigation required...*`;

    if (profilePic) {
      await sock.sendMessage(chatId, { 
        image: { url: profilePic }, 
        caption: caption
      }, { quoted: msg });
    } else {
      await sock.sendMessage(chatId, { 
        text: caption 
      }, { quoted: msg });
    }

    await sock.sendMessage(chatId, { react: { text: "📋", key: msg.key } });

  } catch (err) {
    console.error("Whois error:", err);
    await sock.sendMessage(chatId, { 
      text: "🚫 Investigation failed. Target is using advanced privacy measures." 
    }, { quoted: msg });
  }
}

// 📜 Promote Member
if (command === "promote") {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");

    if (!isGroup) {
        await sock.sendMessage(chatId, { text: "🎭 *Oops!* This command only works in groups, darling! 💫" });
        return;
    }

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const quotedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const senderJid = msg.key.participant || msg.key.remoteJid;

    const targetJids = mentionedJid && mentionedJid.length > 0
        ? mentionedJid
        : quotedJid
        ? [quotedJid]
        : [];

    await sock.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });

    if (targetJids.length > 0) {
        try {
            await sock.groupParticipantsUpdate(chatId, targetJids, "promote");

            const promotedUser = targetJids.map(jid => `@${jid.split('@')[0]}`).join(", ");
            const promoter = `@${senderJid.split('@')[0]}`;

            const caption = `✨ _*PROMOTION CELEBRATION*_ ✨

🎯 *User:* ${promotedUser}

📈 *Status:* 🚀 _PROMOTED TO ADMIN_

👑 *By:* ${promoter}

💫 _*Congratulations! New powers unlocked!*_ 🎊`;

            await sock.sendMessage(
                chatId,
                { text: caption, mentions: [...targetJids, senderJid] },
                { quoted: msg }
            );

            await sock.sendMessage(chatId, { react: { text: "🎉", key: msg.key } });
        } catch (error) {
            console.error("Error promoting user:", error);
            await sock.sendMessage(chatId, { text: "❌ *Failed to promote user(s).* Maybe I don't have admin rights? 👀" }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "😔", key: msg.key } });
        }
    } else {
        await sock.sendMessage(chatId, { text: "🤔 *How to use:* Mention or reply to user\n💡 *Example:* .promote @user" }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "⚠️", key: msg.key } });
    }
}

// 📜 Demote Member
if (command === "demote") {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");

    if (!isGroup) {
        await sock.sendMessage(chatId, { text: "🎭 *Oops!* This command only works in groups, darling! 💫" });
        return;
    }

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const quotedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const senderJid = msg.key.participant || msg.key.remoteJid;

    const targetJids = mentionedJid && mentionedJid.length > 0
        ? mentionedJid
        : quotedJid
        ? [quotedJid]
        : [];

    await sock.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });

    if (targetJids.length > 0) {
        try {
            await sock.groupParticipantsUpdate(chatId, targetJids, "demote");

            const demotedUser = targetJids.map(jid => `@${jid.split('@')[0]}`).join(", ");
            const demoter = `@${senderJid.split('@')[0]}`;

            const caption = `📉 _*ADMIN DEMOTION*_ 📉

🎯 *User:* ${demotedUser}

📉 *Status:* 🔻 _DEMOTED FROM ADMIN_

👑 *By:* ${demoter}

💼 _*Admin privileges have been removed.*_ 🤷‍♂️`;

            await sock.sendMessage(
                chatId,
                { text: caption, mentions: [...targetJids, senderJid] },
                { quoted: msg }
            );

            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } catch (error) {
            console.error("Error demoting user:", error);
            await sock.sendMessage(chatId, { text: "❌ *Failed to demote user(s).* Maybe I don't have admin rights? 👀" }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "😔", key: msg.key } });
        }
    } else {
        await sock.sendMessage(chatId, { text: "🤔 *How to use:* Mention or reply to user\n💡 *Example:* .demote @user" }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "⚠️", key: msg.key } });
    }
}

// Change Group Name
if (command === "gc-name") {
    const newName = args.join(" ");
    await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
    if (newName) {
        try {
            await sock.groupUpdateSubject(chatId, newName);
            await sock.sendMessage(chatId, { text: "Group name changed!" }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } catch (error) {
            console.error("Error changing group name:", error);
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        }
    } else {
        await sock.sendMessage(chatId, { text: "Please enter a new group name." }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}

// Change Group Description
if (command === "gc-desc") {
    const newDesc = args.join(" ");
    await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
    if (newDesc) {
        try {
            await sock.groupUpdateDescription(chatId, newDesc);
            await sock.sendMessage(chatId, { text: "Group description changed!" }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } catch (error) {
            console.error("Error changing group description:", error);
            await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
        }
    } else {
        await sock.sendMessage(chatId, { text: "Please enter a new group description." }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    }
}


        // Lock Group Chat
        if (command === 'mute') {
            await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
            try {
                await sock.groupSettingUpdate(chatId, "announcement");
                await sock.sendMessage(chatId, { text: "Chat locked! Only admins can send messages." }, { quoted: msg });
                await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
            } catch (error) {
                console.error('Error closing chat:', error);
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            }
        }

        // Unlock Chat Group
        if (command === 'unmute') {
            await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
            try {
                await sock.groupSettingUpdate(chatId, "not_announcement");
                await sock.sendMessage(chatId, { text: "Chat unlocked! Everyone can send messages." }, { quoted: msg });
                await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
            } catch (error) {
                console.error('Error opening chat:', error);
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            }
        }

// Group chat invite ( Can Also Send To Multiple Users) 
if (command === 'inv') {
    const chatId = msg.key.remoteJid;

    if (args.length === 0) {
        await sock.sendMessage(chatId, { 
            text: '📌 Usage: ~inv +2347017747337 +234812345678\n📌 Add multiple numbers separated by spaces' 
        }, { quoted: msg });
        return;
    }

    // Extract all valid numbers
    const numbers = [];
    for (const arg of args) {
        const match = arg.match(/(\+?\d+)/);
        if (match) {
            const cleanNum = match[1].replace(/\D/g, '');
            if (cleanNum.length >= 10) {
                numbers.push(cleanNum);
            }
        }
    }

    if (numbers.length === 0) {
        await sock.sendMessage(chatId, { 
            text: '❌ No valid phone numbers found.' 
        }, { quoted: msg });
        return;
    }

    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const inviteCode = await sock.groupInviteCode(chatId);
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

        // Group info
        const groupInfo = `👋 *You've been invited to join ${groupMetadata.subject}!*

👥 Members: ${groupMetadata.participants.length}
📝 ${groupMetadata.desc || 'Join our community!'}
🔗 ${inviteLink}

Tap the link to join! 🎉`;

        // Try to get group image
        let hasImage = false;
        try {
            await sock.profilePictureUrl(chatId, 'image');
            hasImage = true;
        } catch {
            hasImage = false;
        }

        const results = [];
        const mentions = [];

        for (const number of numbers) {
            const jid = `${number}@s.whatsapp.net`;
            try {
                if (hasImage) {
                    await sock.sendMessage(jid, {
                        image: { url: await sock.profilePictureUrl(chatId, 'image') },
                        caption: groupInfo
                    });
                } else {
                    await sock.sendMessage(jid, { text: groupInfo });
                }
                results.push(`✅ @${number}`);
                mentions.push(jid);
            } catch {
                results.push(`❌ @${number}`);
            }
            await delay(800); // Prevent flooding
        }

        await sock.sendMessage(chatId, {
            text: `📤 Invite Results:\n\n${results.join('\n')}\n\n🔗 ${inviteLink}`,
            mentions: mentions
        }, { quoted: msg });

    } catch (err) {
        console.error("Invite error:", err);
        await sock.sendMessage(chatId, {
            text: `❌ Error: ${err.message}`
        }, { quoted: msg });
    }
}

// Toggle Welcome Message 
const isGroup = chatId.endsWith('@g.us');

if (command === 'welcome-on') {
  const welcomeFile = './src/welcome.json';
  if (!fs.existsSync(welcomeFile)) fs.writeFileSync(welcomeFile, JSON.stringify({}));
  const welcomeData = JSON.parse(fs.readFileSync(welcomeFile));

  if (!isGroup) {
    await sock.sendMessage(chatId, { text: "⚠️ This command only works in groups." });
    return;
  }

  if (!welcomeData[chatId]) {
    welcomeData[chatId] = { enabled: false, message: "👋 Welcome @user!" };
  }

  welcomeData[chatId].enabled = true;
  fs.writeFileSync(welcomeFile, JSON.stringify(welcomeData, null, 2));
  await sock.sendMessage(chatId, { text: "✅ Welcome message enabled!" });
}

if (command === 'welcome-off') {
    const welcomeFile = './src/welcome.json';
  if (!fs.existsSync(welcomeFile)) fs.writeFileSync(welcomeFile, JSON.stringify({}));
  const welcomeData = JSON.parse(fs.readFileSync(welcomeFile));

  if (!isGroup) {
    await sock.sendMessage(chatId, { text: "⚠️ This command only works in groups." });
    return;
  }

  welcomeData[chatId].enabled = false;
  fs.writeFileSync(welcomeFile, JSON.stringify(welcomeData, null, 2));
  await sock.sendMessage(chatId, { text: "✅ Welcome message diabled!" });
}


//set Welcome Message
if (command === 'welcome-set') {
  const newMsg = args.join(" ");
  if (!newMsg) {
    await sock.sendMessage(chatId, { text: "⚠️ Usage: \\welcome-set <message>" });
    return;
  }

  const welcomeFile = './src/welcome.json';
  if (!fs.existsSync(welcomeFile)) fs.writeFileSync(welcomeFile, JSON.stringify({}));
  const welcomeData = JSON.parse(fs.readFileSync(welcomeFile));

  if (!welcomeData[chatId]) {
    welcomeData[chatId] = { enabled: true, message: "👋 Welcome @user!" };
  }

  welcomeData[chatId].message = newMsg;
  fs.writeFileSync(welcomeFile, JSON.stringify(welcomeData, null, 2));
  await sock.sendMessage(chatId, { text: `✍️ Welcome message updated:\n${newMsg}` });
}

//Toggle GoodBye Message
if (command === 'goodbye') {
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith('@g.us');
  if (!isGroup) {
    await sock.sendMessage(chatId, { text: '⚠️ This command only works in groups.' });
    return;
  }

  const settingsFile = './src/group_settings.json';
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, '{}');
  }

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsFile));
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      settings = {}; // ✅ force object if file got corrupted
    }
  } catch {
    settings = {}; // fallback
  }

  const arg = args[0]?.toLowerCase();
  if (arg === 'on') {
    if (!settings[chatId]) settings[chatId] = {};
    settings[chatId].goodbyeEnabled = true;
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    await sock.sendMessage(chatId, { text: '✅ Goodbye message enabled for this group.' });
  } else if (arg === 'off') {
    if (!settings[chatId]) settings[chatId] = {};
    settings[chatId].goodbyeEnabled = false;
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    await sock.sendMessage(chatId, { text: '🚫 Goodbye message disabled for this group.' });
  } else {
    await sock.sendMessage(chatId, { text: 'Usage: ~goodbye on / ~goodbye off' });
  }
}

// Promote/Demote Message Configuration Commands
if (command === 'promote-on') {
  const promoteFile = './src/promote.json';
  if (!fs.existsSync(promoteFile)) fs.writeFileSync(promoteFile, JSON.stringify({}));
  const promoteData = JSON.parse(fs.readFileSync(promoteFile));

  if (!isGroup) {
    await sock.sendMessage(chatId, { text: "⚠️ This command only works in groups." });
    return;
  }

  if (!promoteData[chatId]) {
    promoteData[chatId] = { enabled: false, message: "👑 @user has been promoted to admin!" };
  }

  promoteData[chatId].enabled = true;
  fs.writeFileSync(promoteFile, JSON.stringify(promoteData, null, 2));
  await sock.sendMessage(chatId, { text: "✅ Promote notifications enabled!" });
}

if (command === 'promote-off') {
  const promoteFile = './src/promote.json';
  if (!fs.existsSync(promoteFile)) fs.writeFileSync(promoteFile, JSON.stringify({}));
  const promoteData = JSON.parse(fs.readFileSync(promoteFile));

  if (!isGroup) {
    await sock.sendMessage(chatId, { text: "⚠️ This command only works in groups." });
    return;
  }

  if (!promoteData[chatId]) {
    promoteData[chatId] = { enabled: true, message: "👑 @user has been promoted to admin!" };
  }

  promoteData[chatId].enabled = false;
  fs.writeFileSync(promoteFile, JSON.stringify(promoteData, null, 2));
  await sock.sendMessage(chatId, { text: "❌ Promote notifications disabled!" });
}

if (command === 'set-promote') {
  const newMsg = args.join(" ");
  if (!newMsg) {
    await sock.sendMessage(chatId, { text: "⚠️ Usage: \\set-promote <message>\nYou can use @user to mention the promoted user" });
    return;
  }

  const promoteFile = './src/promote.json';
  if (!fs.existsSync(promoteFile)) fs.writeFileSync(promoteFile, JSON.stringify({}));
  const promoteData = JSON.parse(fs.readFileSync(promoteFile));

  if (!promoteData[chatId]) {
    promoteData[chatId] = { enabled: true, message: "👑 @user has been promoted to admin!" };
  }

  promoteData[chatId].message = newMsg;
  fs.writeFileSync(promoteFile, JSON.stringify(promoteData, null, 2));
  await sock.sendMessage(chatId, { text: `✍️ Promote message updated:\n${newMsg}` });
}

if (command === 'demote-on') {
  const demoteFile = './src/demote.json';
  if (!fs.existsSync(demoteFile)) fs.writeFileSync(demoteFile, JSON.stringify({}));
  const demoteData = JSON.parse(fs.readFileSync(demoteFile));

  if (!isGroup) {
    await sock.sendMessage(chatId, { text: "⚠️ This command only works in groups." });
    return;
  }

  if (!demoteData[chatId]) {
    demoteData[chatId] = { enabled: false, message: "🔻 @user has been demoted from admin!" };
  }

  demoteData[chatId].enabled = true;
  fs.writeFileSync(demoteFile, JSON.stringify(demoteData, null, 2));
  await sock.sendMessage(chatId, { text: "✅ Demote notifications enabled!" });
}

if (command === 'demote-off') {
  const demoteFile = './src/demote.json';
  if (!fs.existsSync(demoteFile)) fs.writeFileSync(demoteFile, JSON.stringify({}));
  const demoteData = JSON.parse(fs.readFileSync(demoteFile));

  if (!isGroup) {
    await sock.sendMessage(chatId, { text: "⚠️ This command only works in groups." });
    return;
  }

  if (!demoteData[chatId]) {
    demoteData[chatId] = { enabled: true, message: "🔻 @user has been demoted from admin!" };
  }

  demoteData[chatId].enabled = false;
  fs.writeFileSync(demoteFile, JSON.stringify(demoteData, null, 2));
  await sock.sendMessage(chatId, { text: "❌ Demote notifications disabled!" });
}

if (command === 'set-demote') {
  const newMsg = args.join(" ");
  if (!newMsg) {
    await sock.sendMessage(chatId, { text: "⚠️ Usage: \\set-demote <message>\nYou can use @user to mention the demoted user" });
    return;
  }

  const demoteFile = './src/demote.json';
  if (!fs.existsSync(demoteFile)) fs.writeFileSync(demoteFile, JSON.stringify({}));
  const demoteData = JSON.parse(fs.readFileSync(demoteFile));

  if (!demoteData[chatId]) {
    demoteData[chatId] = { enabled: true, message: "🔻 @user has been demoted from admin!" };
  }

  demoteData[chatId].message = newMsg;
  fs.writeFileSync(demoteFile, JSON.stringify(demoteData, null, 2));
  await sock.sendMessage(chatId, { text: `✍️ Demote message updated:\n${newMsg}` });
}

// Anti-Status Mention without Deletion
if (command === 'antimention') {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: '⚠️ This command only works in groups.' });
        return;
    }

    const configFile = './src/antimention.json';
    if (!fs.existsSync(configFile)) {
        fs.writeFileSync(configFile, '{}');
    }

    let config;
    try {
        config = JSON.parse(fs.readFileSync(configFile));
        if (typeof config !== 'object' || Array.isArray(config)) {
            config = {}; // ✅ force object if file got corrupted
        }
    } catch {
        config = {}; // fallback
    }

    const arg = args[0]?.toLowerCase();
    if (arg === 'on') {
        if (!config[chatId]) config[chatId] = {};
        config[chatId].enabled = true;
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
       await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
    } else if (arg === 'off') {
        if (!config[chatId]) config[chatId] = {};
        config[chatId].enabled = false;
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        await sock.sendMessage(chatId, { text: '🚫 Anti-mention protection disabled for this group.' });
    } else {
       await sock.sendMessage(chatId, { text: `Usage: ${prefix}antimention on / ${prefix}antimention off\n\n📝 When enabled, the bot will delete @everyone mentions and warn users automatically.` });
    }
}

        
        // Anti Link Actived
        if (command === 'antilink-on') {
            await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
            try {
                config.ANTI_LINK = true;
        
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        
                const responseMessage = `Anti link activated`;
                await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
                console.log(`Response: ${responseMessage}`);
        
                await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
            } catch (error) {
                console.error('Error sending message:', error);
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            }
        }
        
        // Anti Link Non-Actived
        if (command === 'antilink-off') {
            await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
            try {
                config.ANTI_LINK = false;
        
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        
                const responseMessage = `Anti link Deactivated`;
                await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
                console.log(`Response: ${responseMessage}`);
        
                await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
            } catch (error) {
                console.error('Error sending message:', error);
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            }
        }
		
		// Badwords Actived
        if (command === 'antibadwords-on') {
            await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
            try {
                config.ANTI_BADWORDS = true;
        
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        
                const responseMessage = "Antibadwords Activated";
                await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
                console.log(`Response: ${responseMessage}`);
        
                await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
            } catch (error) {
                console.error('Error sending message:', error);
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            }
        }
        
        // Badwords Deactivated
        if ( command === 'antibadwords-off') {
            await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
            try {
                config.ANTI_BADWORDS = false;
        
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        
                const responseMessage = "Badwords Deactivated";
                await sock.sendMessage(chatId, { text: responseMessage }, { quoted: msg });
                console.log(`Response: ${responseMessage}`);
        
                await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
            } catch (error) {
                console.error('Error sending message:', error);
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            }
        }
		
		// Public Mode
        if (command === 'public') {
            await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
            try {
                config.SELF_BOT_MESSAGE = false;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
                console.log(`Response: Self Bot Use Non-Actived`);
                await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
            } catch (error) {
                console.error('Error sending message:', error);
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            }
        }
		
		// Private Mode
        if (command === 'private') {
            await sock.sendMessage(chatId, { react: { text: "⌛", key: msg.key } });
            try {
                config.SELF_BOT_MESSAGE = true;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
                console.log(`Response: Self Bot Use Actived`);
                await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
            } catch (error) {
                console.error('Error sending message:', error);
                await sock.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
            }
        }
} 
} 

module.exports = Message;
