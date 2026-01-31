# Voice AI Interviewer - Testing Guide

## 🚀 Phase 2: Basic Agent Testing

### Prerequisites
- ✅ Phase 1 complete (environment setup)
- ✅ All API keys in `.env` file
- ✅ Virtual environment activated

### Running the Agent

#### Step 1: Start the Agent Server

```bash
# Activate virtual environment
source venv/bin/activate

# Run in development mode (with hot reload)
python agent.py dev
```

The agent will start and display:
```
✅ Environment validated
🚀 Starting agent server...
```

#### Step 2: Get a Participant Token

You need a participant token to connect to the room. You can get one in two ways:

**Option A: Using LiveKit CLI**
```bash
# Install LiveKit CLI (if not already installed)
brew install livekit

# Generate a token
livekit token create \
  --api-key YOUR_LIVEKIT_API_KEY \
  --api-secret YOUR_LIVEKIT_API_SECRET \
  --join --room test-room \
  --identity user-1 \
  --valid-for 24h
```

**Option B: Using LiveKit Cloud Dashboard**
1. Go to https://cloud.livekit.io
2. Select your project
3. Go to "Rooms" → "Create Room"
4. Generate a participant token

#### Step 3: Open the Test Frontend

1. Open `test.html` in your browser
2. Paste your participant token
3. Click "Connect to Room"
4. Once connected, press and hold the button to speak
5. Release to let the agent respond

### Testing Checklist

- [ ] Agent starts without errors
- [ ] Can connect to room with token
- [ ] Microphone works when button is pressed
- [ ] Speech is transcribed (STT works)
- [ ] Agent generates a response (LLM works)
- [ ] Agent's voice plays back (TTS works)

### Troubleshooting

**Agent won't start:**
- Check `.env` file has all API keys
- Verify virtual environment is activated
- Check Python version (3.13+ required)

**Can't connect to room:**
- Verify token is valid and not expired
- Check LIVEKIT_URL in `.env` is correct
- Ensure agent is running

**No audio playback:**
- Check browser permissions for microphone
- Verify audio output device is working
- Check browser console for errors

### Next Steps

Once Phase 2 testing is successful, move to Phase 3: Push-to-Talk Implementation
