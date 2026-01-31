import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import { getDefaultUserProfile } from './interviewers/index.js';
import type { RoomMetadata } from './types/interviewer.js';

// Load environment variables
dotenv.config();

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

if (!apiKey || !apiSecret) {
    console.error('❌ Error: LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in .env file');
    process.exit(1);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const interviewerId = args[0] || 'frontend';
const roomName = 'interview-room';
const participantName = 'candidate-1';

// Get default user profile
const userProfile = getDefaultUserProfile();

// Create room metadata
const metadata: RoomMetadata = {
    interviewerId,
    userProfile,
};

// Create access token
const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    name: participantName,
    metadata: JSON.stringify(metadata), // Add metadata to token
});

// Add room permissions
token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
});

// Generate JWT
const jwt = await token.toJwt();

// Output
console.log('✅ Token Generated Successfully!\n');
console.log(`Room: ${roomName}`);
console.log(`Participant: ${participantName}`);
console.log(`Interviewer: ${interviewerId}`);
console.log(`Candidate: ${userProfile.name} (${userProfile.experience})`);
console.log(`Valid for: 24 hours\n`);
console.log('============================================================');
console.log('TOKEN:');
console.log('============================================================');
console.log(jwt);
console.log('============================================================\n');
console.log('📋 Copy the token above and paste it into test.html');
console.log('\n💡 Tip: Generate token for different interviewer:');
console.log('   pnpm run token backend');
console.log('   pnpm run token system-design');
