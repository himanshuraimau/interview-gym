import type { InterviewTranscript, FeedbackReport } from '../types/feedback.js';

/**
 * In-memory storage for transcripts and feedback
 * In production, this would be replaced with a database
 */

class Storage {
    private transcripts: Map<string, InterviewTranscript> = new Map();
    private feedbackReports: Map<string, FeedbackReport> = new Map();

    // Transcript operations
    saveTranscript(transcript: InterviewTranscript): void {
        this.transcripts.set(transcript.roomId, transcript);
        console.log(`💾 Saved transcript for room: ${transcript.roomId}`);
    }

    getTranscript(roomId: string): InterviewTranscript | undefined {
        return this.transcripts.get(roomId);
    }

    hasTranscript(roomId: string): boolean {
        return this.transcripts.has(roomId);
    }

    // Feedback operations
    saveFeedback(feedback: FeedbackReport): void {
        this.feedbackReports.set(feedback.roomId, feedback);
        console.log(`💾 Saved feedback for room: ${feedback.roomId}`);
    }

    getFeedback(roomId: string): FeedbackReport | undefined {
        return this.feedbackReports.get(roomId);
    }

    hasFeedback(roomId: string): boolean {
        return this.feedbackReports.has(roomId);
    }

    // Utility
    getAllRoomIds(): string[] {
        return Array.from(this.transcripts.keys());
    }

    clear(): void {
        this.transcripts.clear();
        this.feedbackReports.clear();
        console.log('🗑️  Cleared all storage');
    }
}

// Singleton instance
export const storage = new Storage();
