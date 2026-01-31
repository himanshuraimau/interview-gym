/**
 * Feedback System Types
 */

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface InterviewTranscript {
    roomId: string;
    messages: ConversationMessage[];           // All messages (full conversation)
    interviewMessages: ConversationMessage[];  // Only messages before timer (for feedback)
    qnaMessages: ConversationMessage[];        // Only messages after timer (Q&A)
    interviewEndTime: number;                  // Timestamp when interview portion ended
    startTime: number;
    endTime: number;
    duration: number; // in minutes
}


export interface CategoryScore {
    score: number; // 1-10
    reasoning: string;
}

export interface FeedbackReport {
    // Metadata
    roomId: string;
    interviewerId: string;
    candidateName: string;
    duration: number;
    completedAt: string;

    // Overall Score
    overallScore: number; // 1-10
    overallGrade: string; // "Excellent", "Good", "Fair", "Needs Improvement"

    // Category Scores
    categoryScores: {
        technicalKnowledge: CategoryScore;
        problemSolving: CategoryScore;
        communication: CategoryScore;
        depthOfUnderstanding: CategoryScore;
        realWorldExperience: CategoryScore;
        clarityOfExplanation: CategoryScore;
    };

    // Analysis
    strengths: string[]; // 3-5 key strengths
    areasForImprovement: string[]; // 3-5 areas to work on
    detailedAnalysis: string; // Paragraph summary

    // Recommendations
    recommendations: string[]; // Specific action items

    // Transcript
    transcript: ConversationMessage[];
}

export interface GenerateFeedbackRequest {
    roomId: string;
    interviewerId: string;
    userProfile: {
        name: string;
        experience: string;
        skills: string[];
        targetRole: string;
    };
}
