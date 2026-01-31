"""
Voice AI Interviewer - Main Agent Server
This file contains the main agent server implementation.
"""

from livekit.agents import AgentSession, AgentServer, JobContext, Agent
from livekit.plugins import openai, elevenlabs, silero
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Create agent server
server = AgentServer()


@server.rtc_session()
async def interview_agent(ctx: JobContext):
    """
    Main entrypoint for the interview agent.
    This function is called when a participant joins a room.
    """
    # Create agent session with STT-LLM-TTS pipeline
    session = AgentSession(
        # Voice Activity Detection: Silero VAD (required for streaming STT)
        vad=silero.VAD.load(
            min_speech_duration=0.1,  # Detect speech faster (default: 0.5s)
            min_silence_duration=0.3,  # Shorter silence before end-of-speech (default: 0.5s)
        ),
        
        # Speech-to-Text: ElevenLabs (uses default scribe_v2_realtime model)
        stt=elevenlabs.STT(),
        
        # Large Language Model: OpenAI GPT-4o-mini
        llm=openai.LLM(
            model="gpt-4o-mini",
            temperature=0.3,  # Lower temperature for consistent responses
        ),
        
        # Text-to-Speech: ElevenLabs Flash v2.5
        tts=elevenlabs.TTS(
            voice_id="ODq5zmih8GrVes37Dizd",  # Default professional voice
            model="eleven_flash_v2_5",
        ),
        
        # Disable user away timeout (don't mark user as away after silence)
        user_away_timeout=None,
    )
    
    # Start the session with a simple helpful assistant
    await session.start(
        agent=Agent(
            instructions="You are a helpful voice assistant. Respond briefly and clearly."
        ),
        room=ctx.room,
    )
    
    # Log session events for debugging
    @session.on("user_input_transcribed")
    def on_transcription(transcript):
        print(f"🎤 User said: {transcript.text}")
    
    @session.on("agent_state_changed")
    def on_state_change(state):
        print(f"🤖 Agent state: {state}")
    
    @session.on("user_state_changed")
    def on_user_state(state):
        print(f"👤 User state: {state}")
    
    @session.on("conversation_item_added")
    def on_conversation_item(item):
        print(f"💬 Conversation item: {item}")
    
    # Send an initial greeting to test TTS
    print("📢 Sending initial greeting...")
    await session.say("Hello! I'm your voice assistant. How can I help you today?")
    print("✅ Greeting sent!")


if __name__ == "__main__":
    # Validate environment variables
    required_vars = [
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
        "OPENAI_API_KEY",
        "ELEVEN_API_KEY"
    ]
    
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        print(f"📝 Please copy .env.example to .env and fill in your API keys")
        exit(1)
    
    print("✅ Environment validated")
    print("🚀 Starting agent server...")
    
    from livekit.agents import cli
    cli.run_app(server)
