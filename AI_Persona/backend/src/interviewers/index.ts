import { readFileSync } from 'fs';
import { join } from 'path';
import type { InterviewerPersona, UserProfile } from '../types/interviewer.js';

/**
 * Interviewer Personas Database
 * Loads interviewer prompts from markdown files
 */

const INTERVIEWERS: InterviewerPersona[] = [
    {
        id: 'frontend',
        name: 'Frontend Engineering Interviewer',
        role: 'Senior Frontend Engineer with 8+ years',
        expertise: ['React/Vue/Angular', 'Web Vitals', 'Accessibility', 'Security'],
        systemPrompt: '', // Will be loaded from file
        greetingTemplate: 'Hello {name}. I\'m conducting your frontend engineering interview today. I see you have {experience} of experience with {skills}. We\'ll be focusing on React, accessibility, and performance. Let\'s begin with component implementation. Ready?',
        interviewStyle: 'Detail-oriented, user-focused, zero tolerance for accessibility violations',
        duration: 45,
        phases: ['Component Implementation', 'Optimization & Accessibility', 'Advanced Patterns']
    },
    {
        id: 'backend',
        name: 'Backend Engineering Interviewer',
        role: 'Senior Backend Engineer with 10+ years',
        expertise: ['RESTful APIs', 'Database Optimization', 'Auth Patterns', 'Microservices'],
        systemPrompt: '',
        greetingTemplate: 'Hello {name}. I\'m your backend engineering interviewer. With {experience} of experience in {skills}, let\'s dive into API design and database architecture. We\'ll start with REST fundamentals. Ready to begin?',
        interviewStyle: 'Production-focused, pragmatic, zero tolerance for security vulnerabilities',
        duration: 45,
        phases: ['API Design', 'Implementation & Database', 'Production Concerns', 'System Integration']
    },
    {
        id: 'system-design',
        name: 'System Design Interviewer',
        role: 'Principal Engineer with 12+ years',
        expertise: ['Distributed Systems', 'Scalability', 'Architecture', 'Trade-offs'],
        systemPrompt: '',
        greetingTemplate: 'Hello {name}. I\'ll be conducting your system design interview. Given your {experience} background in {skills}, we\'ll explore scalable architecture design. Let\'s start with requirements gathering. Ready?',
        interviewStyle: 'Architecture-focused, trade-off analysis, scalability-oriented',
        duration: 60,
        phases: ['Requirements', 'High-Level Design', 'Deep Dive', 'Bottlenecks & Trade-offs']
    },
    {
        id: 'algorithms',
        name: 'Algorithms & DSA Interviewer',
        role: 'Staff Engineer with competitive programming background',
        expertise: ['Data Structures', 'Algorithms', 'Complexity Analysis', 'Problem Solving'],
        systemPrompt: '',
        greetingTemplate: 'Hello {name}. I\'m your algorithms interviewer today. With {experience} in {skills}, let\'s test your problem-solving skills. We\'ll cover data structures and algorithmic thinking. Ready for the first problem?',
        interviewStyle: 'Problem-solving focused, expects optimal solutions, time/space complexity analysis',
        duration: 45,
        phases: ['Easy Warm-up', 'Medium Complexity', 'Hard Challenge']
    },
    {
        id: 'devops',
        name: 'DevOps & Infrastructure Interviewer',
        role: 'Senior DevOps Engineer with 9+ years',
        expertise: ['CI/CD', 'Kubernetes', 'Cloud Infrastructure', 'Monitoring'],
        systemPrompt: '',
        greetingTemplate: 'Hello {name}. I\'m conducting your DevOps interview. With {experience} working with {skills}, we\'ll discuss infrastructure, deployment pipelines, and reliability. Let\'s start with CI/CD practices. Ready?',
        interviewStyle: 'Infrastructure-focused, automation-oriented, reliability-first',
        duration: 45,
        phases: ['CI/CD Fundamentals', 'Container Orchestration', 'Monitoring & Observability']
    },
    {
        id: 'ml',
        name: 'Machine Learning Interviewer',
        role: 'ML Engineer with 7+ years in production ML',
        expertise: ['Deep Learning', 'Model Training', 'MLOps', 'Feature Engineering'],
        systemPrompt: '',
        greetingTemplate: 'Hello {name}. I\'m your machine learning interviewer. Given your {experience} with {skills}, we\'ll explore model design, training, and deployment. Let\'s begin with ML fundamentals. Ready?',
        interviewStyle: 'Model-focused, production ML oriented, expects mathematical rigor',
        duration: 50,
        phases: ['ML Fundamentals', 'Model Design', 'Training & Evaluation', 'Production ML']
    },
    {
        id: 'mobile',
        name: 'Mobile Development Interviewer',
        role: 'Senior Mobile Engineer with 8+ years',
        expertise: ['iOS/Android', 'React Native', 'Performance', 'Mobile UX'],
        systemPrompt: '',
        greetingTemplate: 'Hello {name}. I\'m conducting your mobile development interview. With {experience} in {skills}, we\'ll cover mobile architecture, performance, and platform-specific challenges. Ready to start?',
        interviewStyle: 'Platform-focused, performance-critical, UX-oriented',
        duration: 45,
        phases: ['Mobile Fundamentals', 'Architecture Patterns', 'Performance Optimization']
    },
    {
        id: 'security',
        name: 'Security Engineering Interviewer',
        role: 'Security Engineer with 10+ years',
        expertise: ['Application Security', 'Penetration Testing', 'Threat Modeling', 'Cryptography'],
        systemPrompt: '',
        greetingTemplate: 'Hello {name}. I\'m your security engineering interviewer. With {experience} in {skills}, we\'ll assess your security knowledge and threat modeling skills. Let\'s begin with security fundamentals. Ready?',
        interviewStyle: 'Security-first, threat-focused, expects defense-in-depth thinking',
        duration: 45,
        phases: ['Security Fundamentals', 'Threat Modeling', 'Secure Architecture']
    }
];

/**
 * Load interviewer prompts from markdown files
 */
function loadInterviewerPrompts(): void {
    const promptsDir = join(process.cwd(), '..', 'interviewer', 'prompts');

    const fileMap: Record<string, string> = {
        'frontend': 'frontend_engineering_interviewer.md',
        'backend': 'backend_engineering_interviewer.md',
        'system-design': 'system_design_interviewer.md',
        'algorithms': 'algorithms_dsa_interviewer.md',
        'devops': 'devops_infrastructure_interviewer.md',
        'ml': 'machine_learning_interviewer.md',
        'mobile': 'mobile_development_interviewer.md',
        'security': 'security_engineering_interviewer.md'
    };

    for (const interviewer of INTERVIEWERS) {
        const filename = fileMap[interviewer.id];
        if (filename) {
            try {
                const filePath = join(promptsDir, filename);
                interviewer.systemPrompt = readFileSync(filePath, 'utf-8');
            } catch (error) {
                console.warn(`Failed to load prompt for ${interviewer.id}:`, error);
                interviewer.systemPrompt = `You are a ${interviewer.name}. Conduct a professional technical interview.`;
            }
        }
    }
}

// Load prompts on module initialization
loadInterviewerPrompts();

/**
 * Get interviewer by ID
 */
export function getInterviewerById(id: string): InterviewerPersona {
    const interviewer = INTERVIEWERS.find(i => i.id === id);
    if (!interviewer) {
        console.warn(`Interviewer ${id} not found, using frontend as default`);
        return INTERVIEWERS[0]!; // Default to frontend, guaranteed to exist
    }
    return interviewer;
}

/**
 * Get all available interviewers
 */
export function getAllInterviewers(): InterviewerPersona[] {
    return INTERVIEWERS;
}

/**
 * Generate personalized greeting
 */
export function generateGreeting(interviewer: InterviewerPersona, userProfile: UserProfile): string {
    let greeting = interviewer.greetingTemplate;

    greeting = greeting.replace('{name}', userProfile.name);
    greeting = greeting.replace('{experience}', userProfile.experience);
    greeting = greeting.replace('{skills}', userProfile.skills.slice(0, 3).join(', '));

    return greeting;
}

/**
 * Format user profile for system prompt
 */
export function formatUserProfile(userProfile: UserProfile): string {
    return `
## Candidate Profile
- **Name:** ${userProfile.name}
- **Experience:** ${userProfile.experience}
- **Skills:** ${userProfile.skills.join(', ')}
- **Target Role:** ${userProfile.targetRole}
${userProfile.resumeHighlights ? `- **Highlights:** ${userProfile.resumeHighlights}` : ''}
${userProfile.github ? `- **GitHub:** ${userProfile.github}` : ''}
${userProfile.portfolio ? `- **Portfolio:** ${userProfile.portfolio}` : ''}
`;
}

/**
 * Get default user profile (dummy data)
 */
export function getDefaultUserProfile(): UserProfile {
    return {
        name: 'Alex Johnson',
        experience: '4 years',
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
        targetRole: 'Senior Software Engineer',
        resumeHighlights: 'Built scalable applications serving 1M+ users',
        github: 'github.com/alexj',
        portfolio: 'alexjohnson.dev'
    };
}

console.log(`✅ Loaded ${INTERVIEWERS.length} interviewer personas`);
