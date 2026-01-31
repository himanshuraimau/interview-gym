import {
    type JobContext,
    type JobProcess,
    WorkerOptions,
    cli,
    defineAgent,
    voice,
    llm,
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
        let duration = 30; // Default 30 minutes
        let startTime = Date.now();

        console.log('🔍 Raw room metadata:', ctx.room.metadata);
        console.log('🔍 Room name:', ctx.room.name);

        try {
            if (ctx.room.metadata) {
                console.log('✅ Room metadata exists, parsing...');
                const metadata: RoomMetadata = JSON.parse(ctx.room.metadata);
                interviewerId = metadata.interviewerId || 'frontend';
                userProfile = metadata.userProfile || getDefaultUserProfile();
                duration = metadata.duration || 30;
                startTime = metadata.startTime || Date.now();
                console.log(`📋 Interviewer: ${interviewerId}`);
                console.log(`👤 Candidate: ${userProfile.name}`);
                console.log(`⏱️ Duration: ${duration} minutes`);
            } else {
                console.warn('⚠️  Room metadata is empty or undefined!');
            }
        } catch (error) {
            console.warn('❌ Failed to parse room metadata, using defaults:', error);
        }

        // Load interviewer persona
        const interviewer = getInterviewerById(interviewerId);
        console.log(`🎭 Loaded interviewer: ${interviewer.name}`);

        // Build system prompt with interviewer's instructions + user profile + time context
        const wrapUpTime = Math.floor(duration * 0.8);
        const finalMinutes = duration <= 5 ? 1 : (duration <= 15 ? 2 : 3);

        // Determine pacing based on duration
        let pacingGuidance = '';
        if (duration === 1) {
            pacingGuidance = '1 min: Ask ONE quick question, then immediately provide brief feedback and end';
        } else if (duration === 2) {
            pacingGuidance = '2 min: Ask 1-2 very quick questions, wrap up at 1.5 min with brief feedback';
        } else if (duration === 5) {
            pacingGuidance = '5 min: Ask 2-3 quick questions, wrap up at 4 min with concise feedback';
        } else if (duration === 15) {
            pacingGuidance = '15 min: 2-3 questions focusing on fundamentals';
        } else if (duration === 30) {
            pacingGuidance = '30 min: 4-6 questions with balanced depth';
        } else if (duration === 45) {
            pacingGuidance = '45 min: 6-8 questions with deep exploration';
        } else {
            pacingGuidance = `${duration} min: Adjust question count and depth accordingly`;
        }

        const timeContext = `\n\n## INTERVIEW TIME MANAGEMENT (INTERNAL - DO NOT MENTION TO CANDIDATE)\n\nThis interview is ${duration} minutes total. You must manage time SILENTLY.\n\n**CRITICAL RULES:**\n- NEVER mention time remaining to the candidate\n- NEVER say "we have X minutes left" or "we're running out of time"\n- Track time mentally and pace yourself internally\n- Naturally transition to conclusion without referencing time\n\n**Pacing (internal guidance):**\n${pacingGuidance}\n\n**When to wrap up:**\n- After approximately ${wrapUpTime} minutes, begin your final question\n- After the candidate answers, smoothly transition to feedback\n- Provide ${duration <= 5 ? '1-2' : '2-3'} key observations (strengths and areas to improve)\n- End naturally with: "That wraps up our interview. Thank you for your time!"\n\n**Natural conclusion (NO time references):**\n❌ DON'T SAY: "We're coming up on time, so let me wrap up"\n✅ DO SAY: "Let me share some observations about our conversation"\n\n❌ DON'T SAY: "We have 2 minutes left"\n✅ DO SAY: [Just naturally move to conclusion after appropriate number of questions]\n\n${duration <= 5 ? '⚠️ VERY SHORT INTERVIEW: Keep questions extremely brief. Move quickly but naturally to conclusion.\n' : ''}**Remember:** The candidate should NOT be aware of time constraints. Make the interview feel natural and unhurried, but end on time.`;

        const systemPrompt = `${interviewer.systemPrompt}\\n\\n${formatUserProfile(userProfile)}${timeContext}`;

        //  ===========================================
        // Custom Agent class that controls interview ending
        // ===========================================
        class TimeAwareAgent extends voice.Agent {
            private timeExpired: boolean = false;
            private conclusionGiven: boolean = false;
            private agentSession: voice.AgentSession | null = null;

            setTimeExpired(expired: boolean) {
                this.timeExpired = expired;
            }

            setSession(session: voice.AgentSession) {
                this.agentSession = session;
            }

            // This hook is called BEFORE the agent generates a response
            // Perfect place to intercept and give conclusion instead
            override async onUserTurnCompleted(
                turnCtx: llm.ChatContext,
                newMessage: llm.ChatMessage
            ): Promise<void> {
                // If time expired and we haven't given conclusion yet
                if (this.timeExpired && !this.conclusionGiven && this.agentSession) {
                    this.conclusionGiven = true;

                    console.log('⏰ Time expired - giving conclusion instead of responding');

                    // Force conclusion speech (bypasses LLM)
                    const conclusionText = `Thank you for your time, ${userProfile.name}. ${duration <= 2
                        ? 'You showed good technical understanding. Keep practicing and best of luck!'
                        : 'You demonstrated solid problem-solving skills and technical knowledge. I recommend continuing to build projects and deepen your understanding. Best of luck with your career!'
                        }`;

                    // CRITICAL: Await session.say() so it actually plays
                    await this.agentSession.say(conclusionText, {
                        allowInterruptions: false
                    });

                    console.log('✅ Conclusion speech started');

                    // Throw StopResponse to prevent normal agent response
                    throw new voice.StopResponse();
                }

                // Otherwise, allow normal processing
                return super.onUserTurnCompleted(turnCtx, newMessage);
            }
        }

        // Create the custom agent with personalized instructions
        const agent = new TimeAwareAgent({
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

        // Connect session to agent for conclusion control
        agent.setSession(session);

        // Track conversation for feedback generation
        const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }> = [];
        const interviewStartTime = Date.now();
        let interviewPhaseEnded = false;  // Track when interview portion ends
        let interviewEndTimestamp = 0;     // Timestamp when timer expires

        // Listen for conversation items using the proper event type
        session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
            try {
                const item = ev.item;
                const role = item.role === 'user' ? 'user' : 'assistant';
                
                // Extract text content from ChatContent array
                let content = '';
                if (Array.isArray(item.content)) {
                    content = item.content
                        .map((c: any) => {
                            if (typeof c === 'string') return c;
                            if (c.type === 'audio_content' && c.transcript) return c.transcript;
                            return '';
                        })
                        .filter(Boolean)
                        .join(' ');
                } else if (typeof item.content === 'string') {
                    content = item.content;
                }

                if (content && (role === 'user' || role === 'assistant')) {
                    conversationHistory.push({
                        role,
                        content,
                        timestamp: ev.createdAt || Date.now()
                    });
                    console.log(`📝 Captured ${role} message: ${content.substring(0, 50)}...`);
                }
            } catch (error) {
                console.error('⚠️  Error capturing conversation item:', error);
            }
        });

        // Also capture user input transcriptions as a backup
        session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
            if (ev.isFinal && ev.transcript) {
                console.log(`🎤 User transcript (final): ${ev.transcript.substring(0, 50)}...`);
                // Only add if not already captured by ConversationItemAdded
                const alreadyCaptured = conversationHistory.some(
                    msg => msg.role === 'user' && msg.content === ev.transcript
                );
                if (!alreadyCaptured) {
                    conversationHistory.push({
                        role: 'user',
                        content: ev.transcript,
                        timestamp: ev.createdAt || Date.now()
                    });
                }
            }
        });

        // Generate personalized greeting based on interviewer persona
        const personalizedGreeting = generateGreeting(interviewer, userProfile);
        console.log('📢 Sending personalized greeting...');
        console.log(`💬 Greeting: ${personalizedGreeting}`);

        await session.generateReply({
            instructions: `Say exactly this greeting: "${personalizedGreeting}"`,
        });

        console.log('✅ Greeting sent!');
        console.log('📝 Conversation tracking enabled via conversation_item_added event');

        // Save transcript when interview ends
        const saveTranscript = async () => {
            const sessionEndTime = Date.now();
            const actualDuration = Math.floor((sessionEndTime - interviewStartTime) / 60000);

            console.log(`💾 Saving transcript for room: ${ctx.room.name || 'unknown'}`);
            console.log(`   Duration: ${actualDuration} minutes`);
            console.log(`   Messages captured: ${conversationHistory.length}`);

            try {
                // Separate interview messages from Q&A messages based on timestamp
                const interviewMessages: typeof conversationHistory = [];
                const qnaMessages: typeof conversationHistory = [];

                for (const msg of conversationHistory) {
                    if (!msg) continue;

                    // If interview phase ended, check timestamp
                    if (interviewPhaseEnded && interviewEndTimestamp > 0 && msg.timestamp > interviewEndTimestamp) {
                        qnaMessages.push(msg);
                    } else {
                        interviewMessages.push(msg);
                    }
                }

                console.log(`   🎯 Interview messages: ${interviewMessages.length}`);
                console.log(`   💬 Q&A messages: ${qnaMessages.length}`);
                console.log(`   📊 Total messages: ${conversationHistory.length}`);

                // Save to storage with separation
                const { storage } = await import('./storage/index.js');
                storage.saveTranscript({
                    roomId: ctx.room.name || `interview-${Date.now()}`,
                    messages: conversationHistory,
                    interviewMessages,  // For feedback generation
                    qnaMessages,        // For reference only
                    interviewEndTime: interviewEndTimestamp || sessionEndTime,
                    startTime: interviewStartTime,
                    endTime: sessionEndTime,
                    duration: actualDuration
                });
                console.log('✅ Transcript saved successfully');
            } catch (error) {
                console.error('❌ Error saving transcript:', error);
            }
        };

        // Simple timer-based interview ending via agent hook
        const targetTime = duration * 60 * 1000; // milliseconds

        // When time expires, set flag on agent
        // Agent's onUserTurnCompleted hook will handle the rest
        setTimeout(() => {
            console.log(`⏰ Time limit reached (${duration} minutes)`);
            interviewPhaseEnded = true;
            interviewEndTimestamp = Date.now();
            agent.setTimeExpired(true);
        }, targetTime);

        // Disconnect after agent gives conclusion (buffer time for speech)
        // IMPORTANT: Save transcript BEFORE disconnecting to avoid data loss
        setTimeout(async () => {
            console.log('🔴 Hard stop - saving transcript and disconnecting');
            
            // Save transcript FIRST, before disconnect
            await saveTranscript();
            
            // Now disconnect
            clearInterval(timeLogger);
            ctx.room.disconnect();
        }, targetTime + 45000); // +45 seconds for conclusion speech

        // Log time periodically
        const timeLogger = setInterval(() => {
            const elapsed = Date.now() - interviewStartTime;
            const elapsedMin = Math.floor(elapsed / 60000);
            const elapsedSec = Math.floor((elapsed % 60000) / 1000);
            const remainingMs = targetTime - elapsed;
            const remainingMin = Math.floor(remainingMs / 60000);
            const remainingSec = Math.floor((remainingMs % 60000) / 1000);
            console.log(`⏱️  Time: ${elapsedMin}:${elapsedSec.toString().padStart(2, '0')} elapsed, ${remainingMin}:${remainingSec.toString().padStart(2, '0')} remaining`);
        }, 10000);

        // Clean up when session ends (backup save in case of early disconnect)
        ctx.room.once('disconnected', async (reason) => {
            clearInterval(timeLogger);
            console.log('🔴 Session ended');
            console.log('   Disconnect reason:', reason);
            console.log('   Interview phase ended:', interviewPhaseEnded);
            console.log('   Time elapsed:', Math.floor((Date.now() - interviewStartTime) / 1000), 'seconds');
            console.log('   Expected duration:', duration * 60, 'seconds');
            
            // Only save if not already saved (check if file exists)
            const { storage } = await import('./storage/index.js');
            if (!storage.hasTranscript(ctx.room.name || '')) {
                console.log('💾 Backup save - transcript not found, saving now...');
                await saveTranscript();
            } else {
                console.log('✅ Transcript already saved');
            }
        });
    },
});

// Run the agent
cli.runApp(
    new WorkerOptions({
        agent: fileURLToPath(import.meta.url),
    })
);
