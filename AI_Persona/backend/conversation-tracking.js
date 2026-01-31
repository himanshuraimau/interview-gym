// Conversation Tracking and Transcript Display Functions
// Add this code after the variable declarations in test.html

// Conversation tracking variables
const conversationHistory = [];
let currentQuestionStartTime = null;
let interviewStartTime = null;
let interviewMetadata = {};

/**
 * Add message to conversation history and display in transcript
 */
function addMessage(speaker, text, method = 'voice') {
    const message = {
        speaker,
        text,
        method,
        timestamp: Date.now(),
        responseTime: null
    };

    // Calculate response time if this is a user response
    if (speaker === 'user' && currentQuestionStartTime) {
        message.responseTime = Date.now() - currentQuestionStartTime;
        currentQuestionStartTime = null;
    }

    conversationHistory.push(message);
    displayMessage(message);

    // Start timer for next response if this is from interviewer
    if (speaker === 'interviewer') {
        currentQuestionStartTime = Date.now();
    }

    console.log('📝 Message added:', message);
}

/**
 * Display message in transcript UI
 */
function displayMessage(message) {
    const transcript = document.getElementById('transcript');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.speaker}`;

    const time = new Date(message.timestamp).toLocaleTimeString();
    const methodBadge = message.method === 'text' ? '💬' : '🎤';
    const responseTimeText = message.responseTime
        ? `<div class="message-method">Response time: ${(message.responseTime / 1000).toFixed(1)}s</div>`
        : '';

    messageEl.innerHTML = `
        <div class="message-text">${message.text}</div>
        <div class="message-time">${methodBadge} ${time}</div>
        ${responseTimeText}
    `;

    transcript.appendChild(messageEl);
    transcript.scrollTop = transcript.scrollHeight;
}

/**
 * Generate feedback based on conversation history
 */
async function generateFeedback() {
    try {
        const response = await fetch(`${API_URL}/api/generate-feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversationHistory,
                interviewMetadata,
                interviewDuration: Date.now() - interviewStartTime
            })
        });

        const data = await response.json();
        return data.feedback;
    } catch (error) {
        console.error('Failed to generate feedback:', error);
        return null;
    }
}

/**
 * Show feedback modal
 */
function showFeedback(feedbackText) {
    // Create feedback modal
    const modal = document.createElement('div');
    modal.id = 'feedback-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        ">
            <h2 style="margin: 0 0 20px 0; color: #333;">📊 Interview Feedback</h2>
            <div style="white-space: pre-wrap; line-height: 1.6; color: #555;">
                ${feedbackText || 'Generating feedback...'}
            </div>
            <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="downloadFeedback()" style="
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">Download PDF</button>
                <button onclick="closeFeedback()" style="
                    padding: 12px 24px;
                    background: #f5f5f5;
                    color: #333;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeFeedback() {
    const modal = document.getElementById('feedback-modal');
    if (modal) modal.remove();
}

function downloadFeedback() {
    // TODO: Implement PDF download
    alert('PDF download feature coming soon!');
}
