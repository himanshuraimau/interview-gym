# Voice AI Interviewer - Node.js Backend

Voice-based technical interviewer using LiveKit Agents for Node.js with TypeScript.

## 🚀 Quick Start

### Prerequisites
- Node.js 20 or higher
- pnpm package manager
- LiveKit Cloud account
- API keys (OpenAI)

### Installation

```bash
# Install dependencies
pnpm install

# Download model files
pnpm run download-files
```

### Configuration

Create a `.env` file with your API keys:

```bash
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
OPENAI_API_KEY=your_openai_key
```

### Development

```bash
# Start the agent in development mode
pnpm run dev

# Generate a test token
pnpm run token
```

### Testing

1. Start the agent: `pnpm run dev`
2. Generate a token: `pnpm run token`
3. Open `test.html` in your browser
4. Paste the token and connect
5. Start speaking!

### Production

```bash
# Build the project
pnpm run build

# Run in production mode
pnpm run start
```

## 📦 Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: LiveKit Agents
- **STT**: AssemblyAI Universal Streaming
- **LLM**: OpenAI GPT-4o-mini
- **TTS**: Cartesia Sonic-3
- **VAD**: Silero Voice Activity Detection

## 📁 Project Structure

```
backend/
├── src/
│   ├── agent.ts              # Main agent implementation
│   └── generate-token.ts     # Token generator utility
├── dist/                     # Compiled JavaScript (auto-generated)
├── node_modules/             # Dependencies
├── python-backup/            # Archived Python implementation
├── package.json              # Node.js project config
├── tsconfig.json             # TypeScript configuration
├── .env                      # Environment variables (gitignored)
├── test.html                 # Testing frontend
└── README.md                 # This file
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start agent in development mode |
| `pnpm run build` | Build TypeScript to JavaScript |
| `pnpm run start` | Run agent in production mode |
| `pnpm run token` | Generate a test token |
| `pnpm run download-files` | Download required model files |

## 🎯 Features

- ✅ Real-time voice streaming
- ✅ Speech-to-text transcription
- ✅ LLM-powered responses
- ✅ Natural text-to-speech
- ✅ Voice activity detection
- ✅ Turn detection for interruptions

## 🔄 Migration from Python

This project was migrated from Python to Node.js/TypeScript. The original Python implementation is archived in the `python-backup/` folder for reference.

### Key Changes:
- Python → TypeScript
- `livekit-agents` (Python) → `@livekit/agents` (Node.js)
- Direct plugin usage → Inference Gateway for STT/TTS
- Virtual environment → npm/pnpm packages

## 📚 Documentation

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [LiveKit Agents GitHub](https://github.com/livekit/agents-js)
- [Voice AI Quickstart](https://docs.livekit.io/agents/start/voice-ai-quickstart/)

## 🐛 Troubleshooting

### Agent not connecting
- Verify `.env` file has correct API keys
- Check that LiveKit Cloud project is active
- Ensure firewall allows WebSocket connections

### No audio transcription
- Check microphone permissions in browser
- Verify correct microphone is selected
- Check browser console for errors

### Build errors
- Run `pnpm install` to ensure all dependencies are installed
- Delete `node_modules` and `pnpm-lock.yaml`, then reinstall
- Verify Node.js version is 20 or higher

## 📝 License

MIT

## 👥 Support

For issues and questions, refer to the [LiveKit documentation](https://docs.livekit.io/) or check the archived implementation plan in the artifacts directory.
