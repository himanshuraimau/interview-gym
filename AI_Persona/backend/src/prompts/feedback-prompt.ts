/**
 * Feedback Generation Prompt
 * Used to analyze interview transcripts and generate structured feedback
 */

export function createFeedbackPrompt(
    interviewerRole: string,
    candidateName: string,
    candidateProfile: {
        experience: string;
        skills: string[];
        targetRole: string;
    },
    transcript: Array<{ role: string; content: string }>
): string {
    const conversationText = transcript
        .map(msg => `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`)
        .join('\n\n');

    return `You are an expert interview evaluator analyzing a ${interviewerRole} interview.

**Candidate Information:**
- Name: ${candidateName}
- Experience: ${candidateProfile.experience}
- Skills: ${candidateProfile.skills.join(', ')}
- Target Role: ${candidateProfile.targetRole}

**Interview Transcript (Interview Portion Only):**
${conversationText}

**Note:** This transcript contains ONLY the interview portion (before the conclusion). Any questions asked during the Q&A phase after the interview are NOT included above and should NOT affect the evaluation.

---

**Your Task:**
Analyze this interview conversation and provide comprehensive, constructive feedback in JSON format.

**Scoring Guidelines:**
- 9-10: Exceptional - Expert-level knowledge, excellent communication
- 7-8: Strong - Solid understanding, good explanations
- 5-6: Adequate - Basic knowledge, room for improvement
- 3-4: Weak - Significant gaps, unclear explanations
- 1-2: Poor - Major deficiencies, unable to answer

**Output Format (MUST be valid JSON):**
{
    "overallScore": <number 1-10>,
    "overallGrade": "<Excellent|Good|Fair|Needs Improvement>",
    "categoryScores": {
        "technicalKnowledge": {
            "score": <number 1-10>,
            "reasoning": "<specific observations from the interview>"
        },
        "problemSolving": {
            "score": <number 1-10>,
            "reasoning": "<how they approached problems>"
        },
        "communication": {
            "score": <number 1-10>,
            "reasoning": "<clarity and effectiveness of explanations>"
        },
        "depthOfUnderstanding": {
            "score": <number 1-10>,
            "reasoning": "<beyond surface-level knowledge>"
        },
        "realWorldExperience": {
            "score": <number 1-10>,
            "reasoning": "<practical experience and examples>"
        },
        "clarityOfExplanation": {
            "score": <number 1-10>,
            "reasoning": "<ability to explain concepts clearly>"
        }
    },
    "strengths": [
        "<specific strength 1>",
        "<specific strength 2>",
        "<specific strength 3>"
    ],
    "areasForImprovement": [
        "<specific area 1>",
        "<specific area 2>",
        "<specific area 3>"
    ],
    "detailedAnalysis": "<2-3 paragraph summary of overall performance, highlighting key observations>",
    "recommendations": [
        "<actionable recommendation 1>",
        "<actionable recommendation 2>",
        "<actionable recommendation 3>"
    ]
}

**Important:**
- Be specific and reference actual responses from the interview
- Be constructive and encouraging, not harsh
- Provide actionable recommendations
- Focus on growth opportunities
- Return ONLY valid JSON, no additional text`;
}
