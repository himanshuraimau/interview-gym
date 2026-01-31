import OpenAI from 'openai';
import type { FeedbackReport, InterviewTranscript, GenerateFeedbackRequest } from '../types/feedback.js';
import type { InterviewerPersona } from '../types/interviewer.js';
import { createFeedbackPrompt } from '../prompts/feedback-prompt.js';
import { storage } from '../storage/index.js';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate comprehensive feedback from interview transcript
 */
export async function generateFeedback(
    request: GenerateFeedbackRequest,
    interviewer: InterviewerPersona
): Promise<FeedbackReport> {
    console.log(`🤖 Generating feedback for room: ${request.roomId}`);

    // Get transcript from storage
    const transcript = storage.getTranscript(request.roomId);
    if (!transcript) {
        throw new Error(`Transcript not found for room: ${request.roomId}`);
    }

    // Use ONLY interview messages for feedback (exclude Q&A)
    const messagesToAnalyze = transcript.interviewMessages || transcript.messages;
    console.log(`🎯 Analyzing ${messagesToAnalyze.length} interview messages (excluding Q&A)`);

    // Create feedback generation prompt
    const prompt = createFeedbackPrompt(
        interviewer.role,
        request.userProfile.name,
        {
            experience: request.userProfile.experience,
            skills: request.userProfile.skills,
            targetRole: request.userProfile.targetRole,
        },
        messagesToAnalyze  // Only interview portion
    );

    try {
        // Call OpenAI to generate feedback
        console.log('📤 Calling OpenAI for feedback analysis...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert interview evaluator. Analyze interviews and provide structured, constructive feedback in JSON format.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }, // Ensure JSON response
        });

        const feedbackContent = response.choices[0].message.content;
        if (!feedbackContent) {
            throw new Error('No feedback content received from OpenAI');
        }

        // Parse the JSON response
        const feedbackData = JSON.parse(feedbackContent);

        // Construct complete feedback report
        const feedbackReport: FeedbackReport = {
            roomId: request.roomId,
            interviewerId: request.interviewerId,
            candidateName: request.userProfile.name,
            duration: transcript.duration,
            completedAt: new Date().toISOString(),
            overallScore: feedbackData.overallScore,
            overallGrade: feedbackData.overallGrade,
            categoryScores: feedbackData.categoryScores,
            strengths: feedbackData.strengths,
            areasForImprovement: feedbackData.areasForImprovement,
            detailedAnalysis: feedbackData.detailedAnalysis,
            recommendations: feedbackData.recommendations,
            transcript: transcript.messages,
        };

        // Save feedback to storage
        storage.saveFeedback(feedbackReport);

        console.log(`✅ Feedback generated successfully`);
        console.log(`   Overall Score: ${feedbackReport.overallScore}/10 (${feedbackReport.overallGrade})`);

        return feedbackReport;
    } catch (error) {
        console.error('❌ Error generating feedback:', error);
        throw new Error(`Failed to generate feedback: ${error}`);
    }
}

/**
 * Get previously generated feedback
 */
export function getFeedback(roomId: string): FeedbackReport | undefined {
    return storage.getFeedback(roomId);
}

/**
 * Check if feedback exists for a room
 */
export function hasFeedback(roomId: string): boolean {
    return storage.hasFeedback(roomId);
}
