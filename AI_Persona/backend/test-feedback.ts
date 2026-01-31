#!/usr/bin/env bun

/**
 * Test script to manually generate feedback for an interview
 * Usage: bun test-feedback.ts
 */

const roomId = 'interview-1769898187801';

// Sample transcript (replace with actual data if available)
const sampleTranscript = {
    roomId: roomId,
    participantName: 'Alex Johnson',
    startTime: new Date('2026-02-01T03:53:09Z'),
    endTime: new Date('2026-02-01T03:54:48Z'),
    duration: 99, // seconds
    interviewerId: 'frontend',
    userProfile: {
        name: 'Alex Johnson',
        experience: '4 years',
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
        targetRole: 'Senior Software Engineer'
    },
    interviewMessages: [
        {
            role: 'assistant',
            content: 'Hello Alex Johnson. I\'m conducting your frontend engineering interview today. Ready?',
            timestamp: new Date('2026-02-01T03:53:11Z')
        },
        {
            role: 'user',
            content: 'Yes, I\'m ready!',
            timestamp: new Date('2026-02-01T03:53:30Z')
        },
        {
            role: 'assistant',
            content: 'Great! To start, could you tell me about your frontend experience?',
            timestamp: new Date('2026-02-01T03:53:32Z')
        },
        {
            role: 'user',
            content: 'I\'ve been working with React for 4 years, building various web applications. Recently worked on Kuma AI, a multi-agent system.',
            timestamp: new Date('2026-02-01T03:54:00Z')
        },
        {
            role: 'assistant',
            content: 'What was the most challenging part of the Kuma AI project?',
            timestamp: new Date('2026-02-01T03:54:09Z')
        },
        {
            role: 'user',
            content: 'Managing state across different agents and ensuring smooth communication between them.',
            timestamp: new Date('2026-02-01T03:54:20Z')
        }
    ],
    fullMessages: []
};

console.log('🧪 Testing Feedback Generation');
console.log(`📋 Room ID: ${roomId}\n`);

// Step 1: Save transcript to storage first
console.log('📝 Step 1: Saving transcript to storage...');
const saveResponse = await fetch('http://localhost:3001/api/save-transcript', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(sampleTranscript)
});

if (!saveResponse.ok) {
    console.error('❌ Failed to save transcript');
    process.exit(1);
}
console.log('✅ Transcript saved\n');

// Step 2: Generate feedback
console.log('📊 Step 2: Generating feedback...');
const response = await fetch('http://localhost:3001/api/generate-feedback', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        roomId: sampleTranscript.roomId,
        userProfile: sampleTranscript.userProfile,
        interviewerId: sampleTranscript.interviewerId
    })
});

if (response.ok) {
    const feedback = await response.json();
    console.log('✅ Feedback generated successfully!\n');
    console.log('📊 Results:');
    console.log(`   Overall Score: ${feedback.overallScore}/10 (${feedback.overallGrade})`);
    console.log(`\n💪 Strengths:`);
    feedback.strengths.forEach((s: string, i: number) => console.log(`   ${i + 1}. ${s}`));
    console.log(`\n📈 Areas for Improvement:`);
    feedback.areasForImprovement.forEach((a: string, i: number) => console.log(`   ${i + 1}. ${a}`));
    console.log(`\n📝 Analysis:\n   ${feedback.detailedAnalysis}`);
    console.log(`\n💡 Recommendations:`);
    feedback.recommendations.forEach((r: string, i: number) => console.log(`   ${i + 1}. ${r}`));
} else {
    const error = await response.json();
    console.error('❌ Failed to generate feedback:', error);
}

// Try to retrieve it
console.log(`\n🔍 Retrieving feedback from API...`);
const retrieveResponse = await fetch(`http://localhost:3001/api/feedback/${roomId}`);
if (retrieveResponse.ok) {
    const feedback = await response.json();
    console.log('✅ Feedback retrieved successfully!');
} else {
    console.error('❌ Could not retrieve feedback');
}
