import {
    type JobContext,
    type JobProcess,
    WorkerOptions,
    cli,
    defineAgent,
    voice,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as silero from '@livekit/agents-plugin-silero';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getInterviewerById, generateGreeting, formatUserProfile, getDefaultUserProfile } from './interviewers/index.js';
import type { RoomMetadata } from './types/interviewer.js';

// Load environment variables
dotenv.config();

/**
 * Voice AI Interviewer Agent
 * 
 * This agent uses LiveKit Agents framework to create a voice-based
 * technical interviewer with STT-LLM-TTS pipeline.
 */
export default defineAgent({
    /**
     * Prewarm phase: Load models before handling jobs
     * This improves first-response latency
     */
    prewarm: async (proc: JobProcess) => {
        console.log('🔥 Prewarming agent...');

        // Load VAD model with optimized settings for better speech detection
        proc.userData.vad = await silero.VAD.load({
            minSpeechDuration: 0.1,  // Detect speech faster (100ms)
            minSilenceDuration: 0.3,  // Shorter silence before end-of-speech (300ms)
        });

        console.log('✅ Prewarm complete');
    },

    /**
     * Entry point: Called when a participant joins a room
     */
    entry: async (ctx: JobContext) => {
        console.log('📢 New job request received');
        console.log(`Room: ${ctx.room.name}, Participant count: ${ctx.room.remoteParticipants.size}`);

        // Get the preloaded VAD
        const vad = ctx.proc.userData.vad! as silero.VAD;

        // Connect to the room FIRST to get metadata
        await ctx.connect();

        // NOW read room metadata (available after connection)
        let interviewerId = 'frontend'; // Default
        let userProfile = getDefaultUserProfile();

        console.log('🔍 Raw room metadata:', ctx.room.metadata);
        console.log('🔍 Room name:', ctx.room.name);

        try {
            if (ctx.room.metadata) {
                console.log('✅ Room metadata exists, parsing...');
                const metadata: RoomMetadata = JSON.parse(ctx.room.metadata);
                interviewerId = metadata.interviewerId || 'frontend';
                userProfile = metadata.userProfile || getDefaultUserProfile();
                console.log(`📋 Interviewer: ${interviewerId}`);
                console.log(`👤 Candidate: ${userProfile.name}`);
            } else {
                console.warn('⚠️  Room metadata is empty or undefined!');
            }
        } catch (error) {
            console.warn('❌ Failed to parse room metadata, using defaults:', error);
        }

        // Load interviewer persona
        const interviewer = getInterviewerById(interviewerId);
        console.log(`🎭 Loaded interviewer: ${interviewer.name}`);

        // Build system prompt with interviewer's instructions + user profile
        const systemPrompt = `${interviewer.systemPrompt}\n\n${formatUserProfile(userProfile)}`;

        // Create the voice agent with personalized instructions
        const agent = new voice.Agent({
            instructions: systemPrompt,
        });

        // Create agent session with STT-LLM-TTS pipeline
        const session = new voice.AgentSession({
            // Voice Activity Detection: Silero VAD (preloaded)
            vad,

            // Speech-to-Text: AssemblyAI (via inference gateway - no API key needed)
            stt: 'assemblyai/universal-streaming:en',

            // Large Language Model: OpenAI GPT-4o-mini (using plugin with API key)
            llm: new openai.LLM({
                model: 'gpt-4o-mini',
            }),

            // Text-to-Speech: Cartesia Sonic-3 (via inference gateway - no API key needed)
            tts: 'cartesia/sonic-3:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
        });

        // Start the session
        await session.start({
            agent,
            room: ctx.room,
        });

        // Generate personalized greeting based on interviewer persona
        const personalizedGreeting = generateGreeting(interviewer, userProfile);
        console.log('📢 Sending personalized greeting...');
        console.log(`💬 Greeting: ${personalizedGreeting}`);

        await session.generateReply({
            instructions: `Say exactly this greeting: "${personalizedGreeting}"`,
        });

        console.log('✅ Greeting sent!');
    },
});

// Run the agent
cli.runApp(
    new WorkerOptions({
        agent: fileURLToPath(import.meta.url),
    })
);
