// menu.js

function getMainMenu(prefix) {
    return {
        text: `
╔═══════════════════════
║  🚀 *DESIRE EXE BOT* 🚀
║  ─────────────────────
║  🤖 *Version:* 3.0.0
║  👑 *Owner:* Desire eXe  
║  ⚡ *Prefix:* ${prefix}
║  ─────────────────────
╚═══════════════════════

*Choose a category below:* 👇
        `.trim(),
        buttons: [
            {
                buttonId: `${prefix}menu-music`,
                buttonText: { displayText: '🎵 MUSIC & MEDIA' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-download`, 
                buttonText: { displayText: '📥 DOWNLOADERS' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-ai`,
                buttonText: { displayText: '🤖 AI COMMANDS' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-tools`,
                buttonText: { displayText: '🔧 TOOLS' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-security`,
                buttonText: { displayText: '🔐 SECURITY' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-fun`,
                buttonText: { displayText: '🎮 FUN & GAMES' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-group`,
                buttonText: { displayText: '👥 GROUP MGMT' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-owner`,
                buttonText: { displayText: '👑 OWNER CMDS' },
                type: 1
            }
        ]
    };
}

function getMusicMenu(prefix) {
    return {
        text: `
🎵 *MUSIC & MEDIA COMMANDS*

${prefix}play <song> - Download audio from YouTube
${prefix}video <query> - Download video from YouTube  
${prefix}tts <text> - Text to speech
${prefix}tomp3 - Convert video to MP3
${prefix}sticker - Convert image to sticker
${prefix}to-img - Convert sticker to image
${prefix}tts2 <msg> <number> - Send TTS to number
${prefix}smile - Cool typing animation
        `.trim(),
        buttons: [
            {
                buttonId: `${prefix}menu-main`,
                buttonText: { displayText: '🏠 MAIN MENU' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-download`,
                buttonText: { displayText: '📥 NEXT' },
                type: 1
            }
        ]
    };
}

function getDownloadMenu(prefix) {
    return {
        text: `
📥 *DOWNLOADER COMMANDS*

*YouTube:*
${prefix}yt-mp4 <url> - Download video
${prefix}yt-mp3 <url> - Download audio

*Instagram:*
${prefix}igdl-mp4 <url> - Download video  
${prefix}igdl-mp3 <url> - Download audio

*TikTok:*
${prefix}tkdl-mp4 <url> - Download video
${prefix}tkdl-mp3 <url> - Download audio

*Facebook:*
${prefix}fbdl-mp4 <url> - Download video
${prefix}fbdl-mp3 <url> - Download audio

*Twitter:*
${prefix}tw-mp4 <url> - Download video
${prefix}twdl-mp3 <url> - Download audio

*Vimeo:*
${prefix}vmdl-mp4 <url> - Download video
${prefix}vmdl-mp3 <url> - Download audio
        `.trim(),
        buttons: [
            {
                buttonId: `${prefix}menu-main`,
                buttonText: { displayText: '🏠 MAIN MENU' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-music`,
                buttonText: { displayText: '⬅️ BACK' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-ai`,
                buttonText: { displayText: '📥 NEXT' },
                type: 1
            }
        ]
    };
}

function getAIMenu(prefix) {
    return {
        text: `
🤖 *AI COMMANDS*

${prefix}gemini-ai <query> - Gemini AI chat
${prefix}gemini-img - Analyze image with AI
${prefix}gemini-roasting <text> - Roast with AI
${prefix}gemini-roasting-img - Roast image with AI
${prefix}wiki-ai <query> - Wikipedia AI search
${prefix}wiki-search <query> - Wikipedia search
${prefix}wiki-img <query> - Wikipedia image search
${prefix}chat-on/off - Enable/disable AI chat mode
        `.trim(),
        buttons: [
            {
                buttonId: `${prefix}menu-main`,
                buttonText: { displayText: '🏠 MAIN MENU' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-download`,
                buttonText: { displayText: '⬅️ BACK' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-tools`,
                buttonText: { displayText: '📥 NEXT' },
                type: 1
            }
        ]
    };
}

function getToolsMenu(prefix) {
    return {
        text: `
🔧 *TOOLS & UTILITIES*

${prefix}ocr - Extract text from image
${prefix}ssweb <url> - Website screenshot
${prefix}ssmobile <url> - Mobile view screenshot
${prefix}qrcode <text> - Generate QR code
${prefix}math <expression> - Calculate math
${prefix}words <text> - Text analysis
${prefix}translate-en <text> - Translate to English
${prefix}translate-fr <text> - Translate to French
${prefix}github <username> - GitHub user info
${prefix}github-roasting <username> - Roast GitHub profile
        `.trim(),
        buttons: [
            {
                buttonId: `${prefix}menu-main`,
                buttonText: { displayText: '🏠 MAIN MENU' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-ai`,
                buttonText: { displayText: '⬅️ BACK' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-security`,
                buttonText: { displayText: '📥 NEXT' },
                type: 1
            }
        ]
    };
}

function getSecurityMenu(prefix) {
    return {
        text: `
🔐 *SECURITY & ENCRYPTION*

*Encryption:*
${prefix}sha <text> - SHA encryption
${prefix}md5 <text> - MD5 encryption  
${prefix}ripemd <text> - RIPEMD encryption
${prefix}bcrypt <text> - Bcrypt encryption
${prefix}aes-enc <text> - AES encryption
${prefix}aes-dec <text> - AES decryption
${prefix}camellia-enc <text> - Camellia encryption
${prefix}camellia-dec <text> - Camellia decryption

*Network Tools:*
${prefix}ping <ip/domain> - Ping test
${prefix}ping2 <domain> - Advanced ping
${prefix}whois <domain> - WHOIS lookup
${prefix}whois2 <ip> - IP WHOIS lookup
${prefix}ipinfo <ip> - IP information
${prefix}dnslookup <domain> - DNS lookup
${prefix}subenum <domain> - Subdomain enumeration

*SEO Tools:*
${prefix}seo <domain> - SEO analysis
${prefix}seo-roasting <domain> - SEO roast
        `.trim(),
        buttons: [
            {
                buttonId: `${prefix}menu-main`,
                buttonText: { displayText: '🏠 MAIN MENU' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-tools`,
                buttonText: { displayText: '⬅️ BACK' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-fun`,
                buttonText: { displayText: '📥 NEXT' },
                type: 1
            }
        ]
    };
}

function getFunMenu(prefix) {
    return {
        text: `
🎮 *FUN & GAMES*

${prefix}truth - Random truth question
${prefix}dare - Random dare challenge
${prefix}pickup - Random pickup line
${prefix}savage - Savage roast
${prefix}fact - Random fun fact
${prefix}kill - Fun kill command
${prefix}detect-h - Horny detector
${prefix}whois-gc @user - User investigation
${prefix}poll <q|opt1|opt2> - Create poll
${prefix}mpoll <q|opt1|opt2> - Multi-select poll

*News & Info:*
${prefix}detik-search <query> - Search Detik news
${prefix}detik-article - Latest Detik articles
${prefix}detik-viral - Viral Detik news
${prefix}weather <city> - Weather information
${prefix}country <name> - Country information
${prefix}surah <number> - Quran surah
${prefix}anime <title> - Anime search
        `.trim(),
        buttons: [
            {
                buttonId: `${prefix}menu-main`,
                buttonText: { displayText: '🏠 MAIN MENU' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-security`,
                buttonText: { displayText: '⬅️ BACK' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-group`,
                buttonText: { displayText: '📥 NEXT' },
                type: 1
            }
        ]
    };
}

function getGroupMenu(prefix) {
    return {
        text: `
👥 *GROUP MANAGEMENT*

*Tagging:*
${prefix}tagall - Tag all members
${prefix}tag <text> - Invisible tag
${prefix}Tag <text> - Visible tag

*Moderation:*
${prefix}warn @user - Warn user
${prefix}unwarn @user - Remove warning
${prefix}warnings @user - Check warnings
${prefix}clearwarns @user - Clear all warnings
${prefix}eXe @user - Kick user
${prefix}promote @user - Promote to admin
${prefix}demote @user - Demote admin
${prefix}nuke - Remove all non-admins

*Group Settings:*
${prefix}mute/unmute - Lock/unlock chat
${prefix}gc-name <name> - Change group name
${prefix}gc-desc <text> - Change group description
${prefix}admins - List group admins
${prefix}ginfo - Group information
${prefix}reset-link - Reset group link
${prefix}inv <number> - Invite user
${prefix}inactive - Show inactive members

*Welcome/Goodbye:*
${prefix}welcome-on/off - Welcome messages
${prefix}welcome-set <msg> - Set welcome message
${prefix}goodbye on/off - Goodbye messages

*Presence System:*
${prefix}autotype-on/off - Auto typing indicator
${prefix}autorecord-on/off - Auto recording indicator  
${prefix}presence-status - Show active presence
        `.trim(),
        buttons: [
            {
                buttonId: `${prefix}menu-main`,
                buttonText: { displayText: '🏠 MAIN MENU' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-fun`,
                buttonText: { displayText: '⬅️ BACK' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-owner`,
                buttonText: { displayText: '📥 NEXT' },
                type: 1
            }
        ]
    };
}

function getOwnerMenu(prefix) {
    return {
        text: `
👑 *OWNER COMMANDS*

${prefix}Desire-off - Shutdown bot
${prefix}Desire-Arise - Bot activation video
${prefix}groups - List all groups
${prefix}sspam <nums> <count> <msg> - Smart spam
${prefix}save - Save media to owner
${prefix}vv - View once media
${prefix}block/unblock - Block/unblock users
${prefix}block2/unblock2 - Block in groups
${prefix}clone-pfp - Clone profile picture

*Profile Management:*
${prefix}setpp - Set profile picture
${prefix}set-gcpp - Set group profile picture  
${prefix}removepp - Remove group profile picture

*Bot Settings:*
${prefix}setprefix <char> - Change bot prefix
${prefix}antilink-on/off - Toggle anti-link
${prefix}antibadwords-on/off - Toggle anti-badwords
${prefix}autoblock-on/off - Toggle auto-block
${prefix}public/private - Toggle bot mode
${prefix}dis-on/off - Disappearing messages

*Contact & Info:*
${prefix}owner - Get owner contact
${prefix}Des-info - Bot information
${prefix}send-img - Send test image
${prefix}alive - Bot status check
        `.trim(),
        buttons: [
            {
                buttonId: `${prefix}menu-main`,
                buttonText: { displayText: '🏠 MAIN MENU' },
                type: 1
            },
            {
                buttonId: `${prefix}menu-group`,
                buttonText: { displayText: '⬅️ BACK' },
                type: 1
            }
        ]
    };
}

module.exports = {
    getMainMenu,
    getMusicMenu,
    getDownloadMenu,
    getAIMenu,
    getToolsMenu,
    getSecurityMenu,
    getFunMenu,
    getGroupMenu,
    getOwnerMenu
};
