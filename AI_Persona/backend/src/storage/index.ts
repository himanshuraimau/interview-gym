import type { InterviewTranscript, FeedbackReport } from '../types/feedback.js';
import * as fsSync from 'fs';
import { promises as fsAsync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory path for storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage directories - relative to backend folder
const STORAGE_BASE = join(__dirname, '..', '..', 'data');
const TRANSCRIPTS_DIR = join(STORAGE_BASE, 'transcripts');
const FEEDBACK_DIR = join(STORAGE_BASE, 'feedback');

/**
 * File-based storage for transcripts and feedback
 * Uses JSON files for persistence across server restarts and worker disconnects
 */
class Storage {
    private initialized: boolean = false;

    /**
     * Ensure storage directories exist (async version)
     */
    private async ensureDirectories(): Promise<void> {
        if (this.initialized) return;

        try {
            await fsAsync.mkdir(TRANSCRIPTS_DIR, { recursive: true });
            await fsAsync.mkdir(FEEDBACK_DIR, { recursive: true });
            this.initialized = true;
            console.log(`📁 Storage directories initialized at: ${STORAGE_BASE}`);
        } catch (error) {
            console.error('❌ Failed to create storage directories:', error);
            throw error;
        }
    }

    /**
     * Ensure storage directories exist (sync version)
     * Used for critical save operations before process exit
     */
    private ensureDirectoriesSync(): void {
        if (this.initialized) return;

        try {
            fsSync.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
            fsSync.mkdirSync(FEEDBACK_DIR, { recursive: true });
            this.initialized = true;
            console.log(`📁 Storage directories initialized at: ${STORAGE_BASE}`);
        } catch (error) {
            console.error('❌ Failed to create storage directories:', error);
            throw error;
        }
    }

    /**
     * Sanitize roomId to create safe filenames
     */
    private sanitizeFilename(roomId: string): string {
        return roomId.replace(/[^a-zA-Z0-9-_]/g, '_');
    }

    /**
     * Get file path for a transcript
     */
    private getTranscriptPath(roomId: string): string {
        return join(TRANSCRIPTS_DIR, `${this.sanitizeFilename(roomId)}.json`);
    }

    /**
     * Get file path for feedback
     */
    private getFeedbackPath(roomId: string): string {
        return join(FEEDBACK_DIR, `${this.sanitizeFilename(roomId)}.json`);
    }

    // ========== Transcript Operations ==========

    /**
     * Save transcript to JSON file (synchronous - for critical saves before process exit)
     */
    saveTranscript(transcript: InterviewTranscript): void {
        const filePath = this.getTranscriptPath(transcript.roomId);

        // Use sync initialization for first-time setup
        this.ensureDirectoriesSync();

        // Write file synchronously to ensure data is saved before process exits
        try {
            fsSync.writeFileSync(filePath, JSON.stringify(transcript, null, 2), 'utf-8');
            console.log(`💾 Saved transcript to file: ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to save transcript for room ${transcript.roomId}:`, error);
            throw error;
        }
    }

    /**
     * Save transcript asynchronously (for non-critical paths)
     */
    async saveTranscriptAsync(transcript: InterviewTranscript): Promise<void> {
        await this.ensureDirectories();
        const filePath = this.getTranscriptPath(transcript.roomId);

        try {
            await fsAsync.writeFile(filePath, JSON.stringify(transcript, null, 2), 'utf-8');
            console.log(`💾 Saved transcript to file: ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to save transcript for room ${transcript.roomId}:`, error);
            throw error;
        }
    }

    /**
     * Get transcript from JSON file (synchronous)
     */
    getTranscript(roomId: string): InterviewTranscript | undefined {
        const filePath = this.getTranscriptPath(roomId);

        try {
            if (!fsSync.existsSync(filePath)) {
                console.log(`📂 Transcript file not found: ${filePath}`);
                return undefined;
            }

            const data = fsSync.readFileSync(filePath, 'utf-8');
            const transcript = JSON.parse(data) as InterviewTranscript;
            console.log(`📖 Loaded transcript from file: ${filePath}`);
            return transcript;
        } catch (error) {
            console.error(`❌ Failed to read transcript for room ${roomId}:`, error);
            return undefined;
        }
    }

    /**
     * Get transcript asynchronously
     */
    async getTranscriptAsync(roomId: string): Promise<InterviewTranscript | undefined> {
        const filePath = this.getTranscriptPath(roomId);

        try {
            await fsAsync.access(filePath);
            const data = await fsAsync.readFile(filePath, 'utf-8');
            const transcript = JSON.parse(data) as InterviewTranscript;
            console.log(`📖 Loaded transcript from file: ${filePath}`);
            return transcript;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.log(`📂 Transcript file not found: ${filePath}`);
                return undefined;
            }
            console.error(`❌ Failed to read transcript for room ${roomId}:`, error);
            return undefined;
        }
    }

    /**
     * Check if transcript exists (synchronous)
     */
    hasTranscript(roomId: string): boolean {
        const filePath = this.getTranscriptPath(roomId);
        try {
            return fsSync.existsSync(filePath);
        } catch {
            return false;
        }
    }

    // ========== Feedback Operations ==========

    /**
     * Save feedback to JSON file (synchronous)
     */
    saveFeedback(feedback: FeedbackReport): void {
        const filePath = this.getFeedbackPath(feedback.roomId);

        this.ensureDirectoriesSync();

        try {
            fsSync.writeFileSync(filePath, JSON.stringify(feedback, null, 2), 'utf-8');
            console.log(`💾 Saved feedback to file: ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to save feedback for room ${feedback.roomId}:`, error);
            throw error;
        }
    }

    /**
     * Save feedback asynchronously
     */
    async saveFeedbackAsync(feedback: FeedbackReport): Promise<void> {
        await this.ensureDirectories();
        const filePath = this.getFeedbackPath(feedback.roomId);

        try {
            await fsAsync.writeFile(filePath, JSON.stringify(feedback, null, 2), 'utf-8');
            console.log(`💾 Saved feedback to file: ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to save feedback for room ${feedback.roomId}:`, error);
            throw error;
        }
    }

    /**
     * Get feedback from JSON file (synchronous)
     */
    getFeedback(roomId: string): FeedbackReport | undefined {
        const filePath = this.getFeedbackPath(roomId);

        try {
            if (!fsSync.existsSync(filePath)) {
                console.log(`📂 Feedback file not found: ${filePath}`);
                return undefined;
            }

            const data = fsSync.readFileSync(filePath, 'utf-8');
            const feedback = JSON.parse(data) as FeedbackReport;
            console.log(`📖 Loaded feedback from file: ${filePath}`);
            return feedback;
        } catch (error) {
            console.error(`❌ Failed to read feedback for room ${roomId}:`, error);
            return undefined;
        }
    }

    /**
     * Get feedback asynchronously
     */
    async getFeedbackAsync(roomId: string): Promise<FeedbackReport | undefined> {
        const filePath = this.getFeedbackPath(roomId);

        try {
            await fsAsync.access(filePath);
            const data = await fsAsync.readFile(filePath, 'utf-8');
            const feedback = JSON.parse(data) as FeedbackReport;
            console.log(`📖 Loaded feedback from file: ${filePath}`);
            return feedback;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.log(`📂 Feedback file not found: ${filePath}`);
                return undefined;
            }
            console.error(`❌ Failed to read feedback for room ${roomId}:`, error);
            return undefined;
        }
    }

    /**
     * Check if feedback exists (synchronous)
     */
    hasFeedback(roomId: string): boolean {
        const filePath = this.getFeedbackPath(roomId);
        try {
            return fsSync.existsSync(filePath);
        } catch {
            return false;
        }
    }

    // ========== Utility Methods ==========

    /**
     * Get all room IDs that have transcripts (synchronous)
     */
    getAllRoomIds(): string[] {
        try {
            this.ensureDirectoriesSync();

            const files = fsSync.readdirSync(TRANSCRIPTS_DIR);
            return files
                .filter((file: string) => file.endsWith('.json'))
                .map((file: string) => file.replace('.json', ''));
        } catch (error) {
            console.error('❌ Failed to list transcripts:', error);
            return [];
        }
    }

    /**
     * Get all room IDs asynchronously
     */
    async getAllRoomIdsAsync(): Promise<string[]> {
        try {
            await this.ensureDirectories();
            const files = await fsAsync.readdir(TRANSCRIPTS_DIR);
            return files
                .filter((file: string) => file.endsWith('.json'))
                .map((file: string) => file.replace('.json', ''));
        } catch (error) {
            console.error('❌ Failed to list transcripts:', error);
            return [];
        }
    }

    /**
     * Delete transcript and feedback for a room
     */
    async deleteRoom(roomId: string): Promise<void> {
        const transcriptPath = this.getTranscriptPath(roomId);
        const feedbackPath = this.getFeedbackPath(roomId);

        try {
            await fsAsync.unlink(transcriptPath).catch(() => { });
            await fsAsync.unlink(feedbackPath).catch(() => { });
            console.log(`🗑️  Deleted data for room: ${roomId}`);
        } catch (error) {
            console.error(`❌ Failed to delete room ${roomId}:`, error);
        }
    }

    /**
     * Clear all stored data (for testing)
     */
    async clear(): Promise<void> {
        try {
            const transcripts = await fsAsync.readdir(TRANSCRIPTS_DIR).catch(() => [] as string[]);
            const feedback = await fsAsync.readdir(FEEDBACK_DIR).catch(() => [] as string[]);

            for (const file of transcripts) {
                await fsAsync.unlink(join(TRANSCRIPTS_DIR, file)).catch(() => { });
            }

            for (const file of feedback) {
                await fsAsync.unlink(join(FEEDBACK_DIR, file)).catch(() => { });
            }

            console.log('🗑️  Cleared all storage');
        } catch (error) {
            console.error('❌ Failed to clear storage:', error);
        }
    }
}

// Singleton instance
export const storage = new Storage();

// Export storage paths for debugging
export { STORAGE_BASE, TRANSCRIPTS_DIR, FEEDBACK_DIR };
