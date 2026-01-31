/**
 * Interviewer Persona Types
 */

export interface InterviewerPersona {
    id: string;
    name: string;
    role: string;
    expertise: string[];
    systemPrompt: string;
    greetingTemplate: string;
    interviewStyle: string;
    duration: number;
    phases: string[];
}

export interface UserProfile {
    name: string;
    experience: string;
    skills: string[];
    targetRole: string;
    duration?: number; // Interview duration in minutes
    resumeHighlights?: string;
    github?: string;
    portfolio?: string;
}

export interface InterviewSession {
    interviewer: InterviewerPersona;
    userProfile: UserProfile;
    sessionId: string;
    startTime: Date;
    metadata?: Record<string, any>;
}

export interface RoomMetadata {
    interviewerId: string;
    userProfile: UserProfile;
    duration: number; // Interview duration in minutes
    startTime: number; // Unix timestamp of interview start
}
