import express from 'express';
import cors from 'cors';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import { join } from 'path';
import { getAllInterviewers, getDefaultUserProfile } from './interviewers/index.js';
import type { RoomMetadata, UserProfile } from './types/interviewer.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/libs', express.static(join(process.cwd(), 'public', 'libs'))); // Serve static files

// Validate environment variables
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitUrl = process.env.LIVEKIT_URL;

if (!apiKey || !apiSecret || !livekitUrl) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

// Create RoomServiceClient for agent dispatch
const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

/**
 * GET /api/interviewers
 * Returns list of available interviewers
 */
app.get('/api/interviewers', (req, res) => {
    const interviewers = getAllInterviewers();

    // Return simplified data (without full system prompts)
    const simplified = interviewers.map(i => ({
        id: i.id,
        name: i.name,
        role: i.role,
        expertise: i.expertise,
        interviewStyle: i.interviewStyle,
        duration: i.duration,
        phases: i.phases,
    }));

    res.json({ interviewers: simplified });
});

/**
 * POST /api/generate-token
 * Generates a LiveKit token with interviewer metadata
 */
app.post('/api/generate-token', async (req, res) => {
    try {
        const { interviewerId, userProfile } = req.body;

        // Validate input
        if (!interviewerId) {
            return res.status(400).json({ error: 'interviewerId is required' });
        }

        // Use provided profile or default
        const profile: UserProfile = userProfile || getDefaultUserProfile();

        console.log('👤 User Profile:', profile);

        // Create room metadata
        const metadata: RoomMetadata = {
            interviewerId,
            userProfile: profile,
        };

        const roomName = `interview-${Date.now()}`; // Unique room name
        const participantName = profile.name.toLowerCase().replace(/\s+/g, '-');

        // Create access token
        const token = new AccessToken(apiKey, apiSecret, {
            identity: participantName,
            name: profile.name,
            // Metadata is set on room, not participant
        });

        // Add room permissions with agent dispatch
        token.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            roomCreate: true,
            roomAdmin: true,  // Admin to trigger agent dispatch
        });

        // Generate JWT
        const jwt = await token.toJwt();

        console.log(`✅ Generated token for ${profile.name} - ${interviewerId} interviewer`);

        // Create room with metadata so agent can read it
        try {
            await roomService.createRoom({
                name: roomName,
                emptyTimeout: 600, // 10 minutes
                maxParticipants: 10,
                metadata: JSON.stringify(metadata), // Set metadata on room, not participant
            });
            console.log(`📦 Created room with metadata: ${roomName}`);
        } catch (error: any) {
            if (error.message?.includes('already exists')) {
                console.log(`📦 Room already exists: ${roomName}`);
                // Update room metadata if room exists
                try {
                    await roomService.updateRoomMetadata(roomName, JSON.stringify(metadata));
                    console.log(`📝 Updated room metadata`);
                } catch (updateError: any) {
                    console.error('⚠️  Failed to update room metadata:', updateError.message);
                }
            } else {
                console.error('⚠️  Room creation error:', error.message);
            }
        }

        res.json({
            token: jwt,
            url: livekitUrl,
            roomName,
            participantName: profile.name,
            interviewerId,
        });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Serve HTML files
 */
app.get('/', (req, res) => {
    res.sendFile(join(process.cwd(), 'test.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(join(process.cwd(), 'livekit-test.html'));
});

app.get('/debug', (req, res) => {
    res.sendFile(join(process.cwd(), 'debug-livekit.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Token API server running on http://localhost:${PORT}`);
    console.log(`📋 Endpoints:`);
    console.log(`   GET  / - Main interview interface`);
    console.log(`   GET  /test - LiveKit library test page`);
    console.log(`   GET  /debug - LiveKit debug page`);
    console.log(`   GET  /api/interviewers - List all interviewers`);
    console.log(`   POST /api/generate-token - Generate token`);
    console.log(`   GET  /api/health - Health check`);
});
