I'll help you create a polished README for your WhatsApp Bot project. Here's an improved version:

```markdown
# 🤖 Desire WhatsApp Bot

<img src="./uploads/upload/Desire.png" width="200" alt="Desire Bot Logo">

A feature-rich WhatsApp bot with AI capabilities, media processing, and group management tools.

## 🚀 Features

### 🤖 AI & Intelligence
- **Gemini AI Integration** - Chat with Google's Gemini AI
- **Image Analysis** - Analyze images with AI
- **Wikipedia Integration** - Search and get content from Wikipedia
- **OCR** - Extract text from images
- **Translation** - Multi-language translation support

### 📱 Media Processing
- **Sticker Creation** - Convert images to stickers
- **Text-to-Speech** - Convert text to voice messages
- **Video Downloads** - Download videos from various platforms (YouTube, Facebook, Twitter, Instagram, TikTok, Vimeo)
- **QR Code Generation** - Create QR codes from text
- **Screenshot Tools** - Capture website screenshots (desktop/mobile)

### 🔒 Security & Utilities
- **Encryption Tools** - AES, Camellia, SHA, MD5, RIPEMD, Bcrypt
- **SEO Analysis** - Check and analyze website SEO
- **File Generation** - Create various document types
- **Math Calculator** - Advanced mathematical operations

### 👥 Group Management
- **Member Management** - Add, kick, promote, demote members
- **Chat Controls** - Open/close group chats
- **Anti-Link Protection** - Prevent spam links
- **Bad Words Filter** - Automatic inappropriate content filtering
- **Public/Private Mode** - Control command accessibility

## 📋 Command List

### Main Commands

| Command | Platform Support | Description |
|---------|------------------|-------------|
| `.gemini-ai` | ✅ Windows ✅ Linux ✅ Termux | Chat with Gemini AI |
| `.gemini-img` | ✅ Windows ✅ Linux ✅ Termux | Analyze quoted images |
| `.sticker` | ✅ Windows ✅ Linux ✅ Termux | Convert images to stickers |
| `.to-voice` | ✅ Windows ✅ Linux ✅ Termux | Convert text to voice |
| `.translate` | ✅ Windows ✅ Linux ✅ Termux | Translate text between languages |
| `.weather` | ✅ Windows ✅ Linux ✅ Termux | Get weather information |
| `.qrcode` | ✅ Windows ✅ Linux ✅ Termux | Generate QR codes |
| `.ytdl-mp4/mp3` | ✅ Windows ✅ Linux ✅ Termux | Download YouTube videos/audio |
| `.ocr` | ✅ Windows ✅ Linux ✅ Termux | Extract text from images |
| `.github` | ✅ Windows ✅ Linux ✅ Termux | Get GitHub user information |

### Group Commands

| Command | Description |
|---------|-------------|
| `.add` | Add members to group |
| `.kick` | Remove members from group |
| `.promote/demote` | Manage admin permissions |
| `.chat-open/close` | Control group chat accessibility |
| `.antilink-on/off` | Enable/disable link protection |
| `.badwords-on/off` | Enable/disable bad words filter |

## 🛠️ Installation

### Prerequisites
- Get your Gemini API key from [Google AI Studio](https://aistudio.google.com)
- Configure your settings in `config.json`

### Windows
```bash
# Install Node.js from https://nodejs.org
git clone https://github.com/Desire-exe/Desire-eXe-
cd whatsapp-bot
npm start
```

### Linux
```bash
sudo apt update
sudo apt install nodejs npm
git clone https://github.com/Desire-exe/Desire-eXe-
cd whatsapp-bot
npm start
```

### Termux
```bash
pkg update
pkg install nodejs git
git clone https://github.com/Desire-exe/Desire-eXe-
cd whatsapp-bot
npm start
```

### VS Code
- Open the project in VS Code
- Install recommended extensions
- Run `npm start` in terminal

## ⚙️ Configuration

Edit `config.json` to customize:
- API keys (Gemini AI)
- Public/Private mode
- Group settings
- Feature toggles

## 📁 Supported File Types
The bot can generate: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.html`, `.htm`, `.csv`, `.rtf`, `.odt`, `.ods`, `.odp`, `.epub`, `.zip`, `.gz`

## 🆕 Coming Soon
- More AI models integration
- Additional social media platforms
- Enhanced group features
- Plugin system

## 🤝 Contributing
Feel free to fork this project and submit pull requests!

## ⭐ Support
If you find this project useful, please give it a star on GitHub!

---

**Platform Support**: ✅ Windows ✅ Linux ✅ Termux ✅ VS Code

*Made with ❤️ by Desire*
```
