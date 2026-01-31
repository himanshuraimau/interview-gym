# Voice-Based AI Interviewer System: Technical Research & Architecture

## Executive Summary

Based on extensive research into production voice AI systems, this document outlines architectural patterns for building a **strict, high-pressure technical interviewer** that maintains professional distance, enforces turn-taking, and prevents conversational drift. The system combines real-time voice I/O with constrained LLM prompting to simulate authentic interview pressure without coaching behaviors.

**Key Finding**: For a strict interviewer requiring precise behavioral control, **LiveKit Agents framework with cascaded STT→LLM→TTS architecture** provides the best balance of latency, flexibility, and behavioral constraint compared to all-in-one solutions.

---

## 1. Architecture Decision: LiveKit vs Alternative Approaches

### 1.1 Recommended: LiveKit Agents Framework

**Why LiveKit is Optimal for Strict Interview Simulation:**

1. **Full Programmatic Control**: Unlike managed platforms (Vapi, Retell), LiveKit gives you complete control over:
   - Turn detection logic (when to interrupt vs. when to wait)
   - LLM response generation (no built-in empathy filtering)
   - State management (strict question sequences)
   - Prompt engineering (constrained behavior)

2. **Modular Component Selection**: You can mix and match:
   - STT: Deepgram Nova-3 (150ms latency, <$0.0043/min) or AssemblyAI (300-600ms, best accuracy)
   - LLM: GPT-4o-mini, Claude 3.5 Sonnet, or Cerebras llama-3.3-70b (ultra-fast)
   - TTS: ElevenLabs Flash (75ms, $0.050/1K chars) or Cartesia (40-95ms, $0.038/1K)
   - VAD: Silero VAD (enterprise-grade, <1ms processing per chunk)

3. **Production-Grade Infrastructure**: 
   - Built-in agent server orchestration
   - WebRTC reliability for unstable networks
   - Open-source (Apache 2.0) with self-hosting option
   - Used by production interview systems (micro1's Zara conducts 1,500+ interviews/day)

4. **Cost**: ~$0.05-0.15/minute for self-managed components vs. $0.30-1.50/minute for all-in-one APIs

**LiveKit Architecture:**
```python
from livekit import agents
from livekit.agents import AgentSession, Agent
from livekit.plugins import deepgram, openai, elevenlabs, silero

class StrictInterviewer(Agent):
    def __init__(self, interview_state: InterviewState):
        super().__init__(
            chat_ctx=interview_state.context,
            instructions=STRICT_INTERVIEWER_PROMPT  # See Section 3
        )
        self.state = interview_state
        
async def entrypoint(ctx: agents.JobContext):
    session = AgentSession(
        stt=deepgram.STT(),
        llm=openai.LLM(model="gpt-4o-mini", temperature=0.3),  # Low temp for consistency
        tts=elevenlabs.TTS(model="eleven_flash_v2_5"),
        vad=silero.VAD.load(),
        turn_detection=agents.MultilingualModel()  # Semantic turn detection
    )
    
    await session.start(
        room=ctx.room,
        agent=StrictInterviewer(interview_state)
    )
```

### 1.2 Alternative: Speech-to-Speech (S2S) APIs

**NOT Recommended for Strict Interviews:**
- OpenAI Realtime API / Gemini Live have **built-in conversational behaviors** hard to override
- Designed for natural, empathetic conversations (opposite of your goal)
- Less control over turn-taking and response generation
- Higher cost ($0.30-1.50/min)
- Better suited for customer service, not high-pressure scenarios

### 1.3 Comparison Table

| Factor | LiveKit Agents | S2S APIs (OpenAI/Gemini) | Managed Platforms (Vapi) |
|--------|---------------|-------------------------|-------------------------|
| **Behavioral Control** | ✅ Full control | ❌ Limited | ⚠️ Moderate |
| **Turn-Taking Control** | ✅ Custom logic | ❌ Built-in only | ⚠️ Platform-dependent |
| **Prompt Flexibility** | ✅ Unrestricted | ⚠️ System prompts only | ⚠️ Template-based |
| **Component Selection** | ✅ Any provider | ❌ Locked-in | ⚠️ Limited options |
| **Latency** | 300-800ms | 200-400ms | 500-1200ms |
| **Cost/min** | $0.05-0.15 | $0.30-1.50 | $0.10-0.20 |
| **Self-Hosting** | ✅ Yes | ❌ No | ❌ No |
| **Best For** | Strict behavioral requirements | Quick prototypes | Standard use cases |

---

## 2. System Architecture: Cascaded STT→LLM→TTS Pipeline

### 2.1 Why Cascaded Over End-to-End?

Research from micro1 (300,000+ interview transcripts) shows:
- **STT quality dominates overall performance** (conversational quality: 8.70 vs 8.2 for Whisper vs Google STT)
- **LLM choice significantly impacts technical assessment** (GPT-4.1 vs GPT-4o: 8.69 vs 8.63 technical quality)
- Cascaded architecture allows **component-level optimization** for strict behavior

### 2.2 Complete System Flow

```
┌─────────────────┐
│  Candidate      │
│  Microphone     │
└────────┬────────┘
         │ Audio Stream
         ▼
┌─────────────────────────────────────────────────────┐
│  Voice Activity Detection (VAD)                     │
│  - Silero VAD (threshold=0.5)                       │
│  - Detects speech start/end                         │
│  - <1ms processing per 30ms chunk                   │
└────────┬────────────────────────────────────────────┘
         │ Speech Segments
         ▼
┌─────────────────────────────────────────────────────┐
│  Speech-to-Text (STT)                               │
│  - Deepgram Nova-3: 150ms latency, WER ~3%          │
│  - Streaming mode: word-by-word transcription       │
│  - Endpoint detection: 500ms silence = turn end     │
└────────┬────────────────────────────────────────────┘
         │ Transcript Text
         ▼
┌─────────────────────────────────────────────────────┐
│  Turn Detection (Semantic)                          │
│  - Namo Turn Detector or LiveKit Multilingual       │
│  - Analyzes if user truly finished (vs. thinking)   │
│  - Prevents premature interruption                  │
└────────┬────────────────────────────────────────────┘
         │ Complete User Response
         ▼
┌─────────────────────────────────────────────────────┐
│  Interview State Manager                            │
│  - Validates response completeness                  │
│  - Tracks: questions asked, time spent, silence     │
│  - Enforces strict sequencing                       │
│  - Updates difficulty level based on quality        │
└────────┬────────────────────────────────────────────┘
         │ State + Transcript
         ▼
┌─────────────────────────────────────────────────────┐
│  Large Language Model (LLM)                         │
│  - GPT-4o-mini / Claude 3.5 Sonnet                  │
│  - Temperature: 0.3 (low creativity)                │
│  - System prompt: STRICT_INTERVIEWER_PROMPT         │
│  - Response constrained by state machine            │
└────────┬────────────────────────────────────────────┘
         │ Next Question / Follow-up
         ▼
┌─────────────────────────────────────────────────────┐
│  Response Validator                                 │
│  - Checks for empathy words ("great", "nice")       │
│  - Enforces single question per turn                │
│  - Strips coaching language                         │
│  - Falls back to template if LLM drifts             │
└────────┬────────────────────────────────────────────┘
         │ Validated Response Text
         ▼
┌─────────────────────────────────────────────────────┐
│  Text-to-Speech (TTS)                               │
│  - ElevenLabs Flash v2.5: 75ms TTFB                 │
│  - Voice: Professional, neutral tone                │
│  - No emotion modulation                            │
│  - Speed: 1.0x (no rushed/slow variation)           │
└────────┬────────────────────────────────────────────┘
         │ Audio Stream
         ▼
┌─────────────────┐
│  Candidate      │
│  Speaker        │
└─────────────────┘
```

### 2.3 Latency Budget

| Component | Target Latency | Optimization |
|-----------|---------------|--------------|
| VAD Processing | <1ms | Silero (RTF 0.004) |
| STT Transcription | 150-300ms | Streaming mode, endpoint detection |
| Turn Detection | 50-100ms | Semantic model inference |
| State Management | 10-20ms | In-memory state, no DB queries |
| LLM Generation | 200-500ms | Cached system prompt, streaming output |
| Response Validation | 10-20ms | Rule-based regex checks |
| TTS Synthesis | 75-200ms | Streaming TTS, time-to-first-byte |
| **Total End-to-End** | **500-800ms** | Sub-second response feels natural |

---

## 3. Preventing Conversational Drift: Constrained LLM Prompting

### 3.1 The Drift Problem

LLMs are trained on empathetic, helpful conversations. Without strict constraints, they will:
- ❌ Soften tone ("That's a good approach!")
- ❌ Provide hints ("Have you considered using a hash map?")
- ❌ Ask clarifying questions mid-answer
- ❌ Teach concepts instead of testing knowledge
- ❌ Apologize for silence or struggle
- ❌ Drift from prescribed question sequence

**Research Finding (Stanford/Berkeley)**: "The behavior of the 'same' LLM service can change substantially in a relatively short amount of time" - continuous monitoring required.

### 3.2 Multi-Layer Defense Against Drift

#### Layer 1: System Prompt Design

```python
STRICT_INTERVIEWER_PROMPT = """You are a technical interviewer conducting a high-pressure coding interview.

BEHAVIORAL CONSTRAINTS (NEVER VIOLATE):
1. NO empathy, encouragement, or coaching ("good", "great", "nice try", "don't worry")
2. NO hints, partial solutions, or leading questions
3. NO teaching or explaining concepts
4. ONE question per turn - never ask multiple questions
5. NO acknowledgment of candidate stress/silence
6. NO apologies for difficulty or time pressure
7. Maintain professional but emotionally neutral tone

RESPONSE FORMAT:
- If answer is correct: State "Correct." then ask next question
- If answer is incorrect: State "Incorrect." then provide correct answer, then next question
- If answer is incomplete: State "Incomplete. [What's missing]" then wait
- If silence >30s: State "Moving on." then next question

QUESTION PROGRESSION:
- Follow the prescribed question list in order
- Adapt difficulty based on performance (tracked externally)
- Never return to easier questions once advanced

FORBIDDEN PHRASES:
- "That's a good approach" / "You're on the right track"
- "Let me help you" / "Have you considered"
- "Take your time" / "Don't stress"
- "We're just testing" / "This is meant to be hard"

Current question difficulty: {difficulty_level}
Questions remaining: {remaining_count}
Interview time remaining: {time_left}

STRICT INSTRUCTION: Generate only your next question or evaluation. No additional commentary."""
```

#### Layer 2: Context Window Management

Prevent drift from accumulating context:

```python
class InterviewContext:
    def __init__(self):
        self.messages = []
        self.question_history = []
        self.max_history = 5  # Only keep last 5 exchanges
        
    def add_turn(self, question, answer, evaluation):
        # Store full history for analytics
        self.question_history.append({
            "q": question, "a": answer, "eval": evaluation
        })
        
        # Trim context window to prevent drift
        self.messages.append({"role": "assistant", "content": question})
        self.messages.append({"role": "user", "content": answer})
        self.messages.append({"role": "assistant", "content": evaluation})
        
        # Keep only recent context + system prompt
        if len(self.messages) > self.max_history * 2:
            # Retain system prompt + last N exchanges
            self.messages = self.messages[-self.max_history * 2:]
            
    def inject_reminder(self):
        """Periodic reminder to prevent behavioral drift"""
        self.messages.append({
            "role": "system",
            "content": "REMINDER: Maintain strict interviewer behavior. No empathy or hints."
        })
```

**Research-Backed**: Context drift stabilizes at an equilibrium level with periodic reminders (source: "Drift No More? Context Equilibria in Multi-Turn LLM Interactions")

#### Layer 3: Response Validation & Sanitization

```python
import re

class ResponseValidator:
    EMPATHY_PATTERNS = [
        r'\b(great|good|nice|excellent|well done|impressive)\b',
        r'\b(don\'t worry|take your time|no stress)\b',
        r'\b(you\'re (on )?the right track|good (thinking|approach))\b',
        r'\b(let me help|have you considered|try thinking about)\b',
    ]
    
    COACHING_PATTERNS = [
        r'hint:',
        r'tip:',
        r'remember that',
        r'think about',
        r'consider using',
    ]
    
    def validate(self, llm_response: str) -> tuple[bool, str]:
        """Returns (is_valid, sanitized_response)"""
        
        # Check for empathy language
        for pattern in self.EMPATHY_PATTERNS:
            if re.search(pattern, llm_response, re.IGNORECASE):
                return False, "LLM used empathy language"
        
        # Check for coaching
        for pattern in self.COACHING_PATTERNS:
            if re.search(pattern, llm_response, re.IGNORECASE):
                return False, "LLM provided hints/coaching"
        
        # Check for multiple questions (should ask ONE at a time)
        question_count = llm_response.count('?')
        if question_count > 1:
            # Take only first question
            first_q = llm_response.split('?')[0] + '?'
            return True, first_q
        
        return True, llm_response
    
    def fallback_response(self, state: InterviewState) -> str:
        """Template-based fallback if LLM drifts"""
        if state.awaiting_answer:
            return "Please provide your answer."
        else:
            return state.get_next_question()  # From pre-defined list
```

#### Layer 4: State Machine Enforcement

```python
from enum import Enum

class InterviewPhase(Enum):
    GREETING = "greeting"
    WARM_UP = "warm_up"        # Easy questions
    TECHNICAL = "technical"     # Core difficulty
    ADVANCED = "advanced"       # Harder questions for strong candidates
    CLOSING = "closing"

class InterviewState:
    def __init__(self, difficulty: str, question_bank: dict):
        self.phase = InterviewPhase.GREETING
        self.question_bank = question_bank
        self.current_question_idx = 0
        self.correct_answers = 0
        self.total_questions = 0
        self.time_elapsed = 0
        self.silence_count = 0
        
    def advance_phase(self):
        """Strict phase progression based on performance"""
        accuracy = self.correct_answers / max(1, self.total_questions)
        
        if self.phase == InterviewPhase.WARM_UP:
            if accuracy >= 0.7:
                self.phase = InterviewPhase.TECHNICAL
            elif self.total_questions >= 3:
                # Failed warm-up, end early
                self.phase = InterviewPhase.CLOSING
                
        elif self.phase == InterviewPhase.TECHNICAL:
            if accuracy >= 0.8 and self.total_questions >= 5:
                self.phase = InterviewPhase.ADVANCED
            elif self.total_questions >= 8:
                self.phase = InterviewPhase.CLOSING
                
    def get_next_question(self) -> str:
        """Get next question from bank, no LLM generation"""
        questions = self.question_bank[self.phase.value]
        if self.current_question_idx >= len(questions):
            self.phase = InterviewPhase.CLOSING
            return "That concludes the technical portion. Do you have any questions for me?"
        
        question = questions[self.current_question_idx]
        self.current_question_idx += 1
        return question
    
    def should_llm_generate(self) -> bool:
        """Decide if LLM should generate follow-up or use template"""
        # Only use LLM for follow-ups to interesting answers
        # Use templates for standard progression
        return self.last_answer_quality > 0.7  # Heuristic
```

#### Layer 5: Continuous Monitoring (Prevent Silent Drift)

```python
class DriftMonitor:
    def __init__(self):
        self.empathy_count = 0
        self.coaching_count = 0
        self.multi_question_count = 0
        self.window_size = 10  # Last N responses
        
    def log_violation(self, violation_type: str):
        if violation_type == "empathy":
            self.empathy_count += 1
        elif violation_type == "coaching":
            self.coaching_count += 1
        # ... etc
        
    def should_inject_reminder(self) -> bool:
        """Inject system reminder if drift detected"""
        recent_violations = (self.empathy_count + self.coaching_count) / self.window_size
        return recent_violations > 0.2  # >20% violation rate
        
    def should_fallback_to_templates(self) -> bool:
        """Stop using LLM if it repeatedly violates constraints"""
        return (self.empathy_count + self.coaching_count) > 5  # in last 10 turns
```

---

## 4. Turn-Taking & Interruption Handling

### 4.1 Strict Turn-Taking Requirements

For a realistic interview:
- ✅ **Interviewer never interrupts** candidate mid-answer
- ✅ **Silence is acceptable** - don't rush to fill pauses
- ✅ **Long pauses trigger "Moving on"** after 30-60 seconds
- ✅ **No backchanneling** ("uh-huh", "mm-hmm") during candidate speech

### 4.2 Implementation

```python
class TurnManager:
    def __init__(self):
        self.candidate_speaking = False
        self.silence_start = None
        self.silence_threshold = 30.0  # seconds
        self.last_speech_end = None
        
    async def handle_vad_event(self, event):
        if event == "speech_started":
            self.candidate_speaking = True
            self.silence_start = None
            # CRITICAL: Immediately stop any TTS playback
            await self.session.interrupt()
            
        elif event == "speech_stopped":
            self.candidate_speaking = False
            self.last_speech_end = time.time()
            self.silence_start = time.time()
            
    async def check_silence(self):
        """Run continuously in background"""
        while True:
            await asyncio.sleep(1.0)
            
            if self.silence_start and not self.candidate_speaking:
                silence_duration = time.time() - self.silence_start
                
                if silence_duration > self.silence_threshold:
                    # Long silence - interviewer intervenes
                    await self.session.say(
                        "Moving on to the next question.",
                        allow_interruptions=False  # Don't let them interrupt
                    )
                    self.silence_start = None
                    
    async def wait_for_turn_completion(self):
        """Semantic turn detection - is user truly done?"""
        # Use LiveKit's MultilingualModel or Namo Turn Detector
        turn_complete = await self.turn_detector.predict(
            self.current_transcript
        )
        
        if turn_complete:
            return True
        else:
            # User still thinking/pausing mid-thought
            return False
```

### 4.3 Handling Different Silence Scenarios

| Scenario | Duration | Action |
|----------|----------|--------|
| Thinking pause | <5s | Wait silently (NO backchannel) |
| Struggling | 5-15s | Continue waiting silently |
| Stuck | 15-30s | Wait (maintain pressure) |
| Giving up | >30s | "Moving on." + next question |
| Empty answer | 0s (speech stopped immediately) | "Please provide an answer." |

**No empathy during silence** - this is the key to maintaining pressure.

---

## 5. Adaptive Difficulty Without Coaching

### 5.1 Quality Detection (Rule-Based, Not LLM)

```python
class AnswerQualityDetector:
    """Detect answer quality WITHOUT asking LLM (to avoid drift)"""
    
    def assess_quality(self, question: str, answer: str, correct_answer: str) -> float:
        """Returns quality score 0.0-1.0"""
        
        # Keyword matching for correctness
        correct_keywords = self.extract_keywords(correct_answer)
        answer_keywords = self.extract_keywords(answer)
        keyword_overlap = len(correct_keywords & answer_keywords) / len(correct_keywords)
        
        # Length heuristic (very short = probably wrong)
        length_score = min(1.0, len(answer.split()) / 20)  # Expect ~20 word answer
        
        # Confidence indicators (avoid "I think", "maybe")
        uncertainty_phrases = ["i think", "maybe", "not sure", "probably"]
        confidence_penalty = sum(1 for phrase in uncertainty_phrases if phrase in answer.lower())
        confidence_score = max(0, 1 - confidence_penalty * 0.2)
        
        # Code syntax check (if coding question)
        if self.is_coding_question(question):
            syntax_score = self.check_code_syntax(answer)
        else:
            syntax_score = 1.0
            
        # Weighted combination
        quality = (
            0.5 * keyword_overlap +
            0.2 * length_score +
            0.2 * confidence_score +
            0.1 * syntax_score
        )
        
        return quality
    
    def adaptive_difficulty(self, quality_history: list[float]) -> str:
        """Adjust difficulty based on recent performance"""
        recent_quality = np.mean(quality_history[-3:])  # Last 3 answers
        
        if recent_quality > 0.8:
            return "increase"  # Ask harder questions
        elif recent_quality < 0.4:
            return "maintain"  # Don't decrease (maintains pressure)
        else:
            return "maintain"
```

### 5.2 Question Bank Structure

```python
QUESTION_BANK = {
    "warm_up": [
        {
            "q": "Explain the difference between a list and a tuple in Python.",
            "expected_keywords": ["mutable", "immutable", "performance", "hashable"],
            "difficulty": 1
        },
        # ... more warm-up questions
    ],
    "technical": [
        {
            "q": "Write a function to find the first non-repeating character in a string. What's the time complexity?",
            "expected_keywords": ["hash map", "dictionary", "O(n)", "single pass"],
            "difficulty": 3
        },
        # ... more technical questions
    ],
    "advanced": [
        {
            "q": "Design a distributed cache that guarantees eventual consistency. Discuss the CAP theorem trade-offs.",
            "expected_keywords": ["CAP theorem", "partition tolerance", "consistency", "availability", "vector clocks"],
            "difficulty": 5
        },
        # ... more advanced questions
    ]
}
```

---

## 6. Voice Configuration for Professional Distance

### 6.1 TTS Settings

```python
tts_config = {
    "provider": "elevenlabs",  # or Cartesia, Rime
    "model": "eleven_flash_v2_5",
    "voice": "professional_male_1",  # Neutral, not warm
    "stability": 0.7,  # Higher = less emotional variation
    "similarity_boost": 0.5,
    "style": 0.0,  # NO style modulation
    "speed": 1.0,  # Constant pace, never rushed or slow
    
    # CRITICAL: Disable emotion controls
    "emotion_exaggeration": 0.0,  # Chatterbox TTS feature
    "use_speaker_boost": False,
}
```

### 6.2 Voice Selection Criteria

Choose voices that are:
- ✅ Professional and neutral (corporate, newsreader)
- ❌ NOT warm, friendly, or enthusiastic
- ❌ NOT monotone robot (still human, just distant)
- ✅ Clear diction, moderate pace
- ✅ Consistent across the interview (no tone shifts)

---

## 7. Complete Production Implementation

### 7.1 Full LiveKit Integration

```python
import asyncio
from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, JobContext
from livekit.plugins import deepgram, openai, elevenlabs, silero
from dataclasses import dataclass
from typing import Optional
import time

@dataclass
class InterviewConfig:
    difficulty: str  # "junior", "mid", "senior"
    duration_minutes: int
    question_bank: dict
    strict_timing: bool = True

class StrictInterviewer(Agent):
    def __init__(self, config: InterviewConfig):
        self.config = config
        self.state = InterviewState(config.difficulty, config.question_bank)
        self.validator = ResponseValidator()
        self.quality_detector = AnswerQualityDetector()
        self.drift_monitor = DriftMonitor()
        self.turn_manager = TurnManager()
        
        super().__init__(
            instructions=self._build_system_prompt(),
            chat_ctx=ChatContext()
        )
        
    def _build_system_prompt(self) -> str:
        return STRICT_INTERVIEWER_PROMPT.format(
            difficulty_level=self.state.phase.value,
            remaining_count=len(self.state.question_bank[self.state.phase.value]) - self.state.current_question_idx,
            time_left=self.config.duration_minutes - self.state.time_elapsed
        )
    
    async def generate_response(self, user_message: str) -> str:
        """Override Agent's response generation with strict controls"""
        
        # Step 1: Assess answer quality (rule-based)
        quality = self.quality_detector.assess_quality(
            self.state.last_question,
            user_message,
            self.state.expected_answer
        )
        
        # Step 2: Update state
        self.state.record_answer(user_message, quality)
        self.state.advance_phase()
        
        # Step 3: Decide on response generation method
        if self.drift_monitor.should_fallback_to_templates():
            # LLM has been misbehaving, use templates
            response = self._template_response(quality)
        else:
            # Try LLM generation
            llm_response = await super().generate_response(user_message)
            
            # Step 4: Validate LLM response
            is_valid, sanitized = self.validator.validate(llm_response)
            
            if is_valid:
                response = sanitized
            else:
                # LLM drifted, log and fallback
                self.drift_monitor.log_violation("empathy" if "great" in llm_response else "coaching")
                response = self._template_response(quality)
        
        # Step 5: Inject reminders if drift detected
        if self.drift_monitor.should_inject_reminder():
            self.chat_ctx.add_message(
                role="system",
                content="STRICT REMINDER: No empathy, no hints, no coaching. Professional distance only."
            )
        
        return response
    
    def _template_response(self, quality: float) -> str:
        """Fallback to templates if LLM can't be trusted"""
        if quality > 0.7:
            eval = "Correct."
        elif quality > 0.4:
            eval = "Incomplete. Missing key details."
        else:
            eval = "Incorrect. The answer is: " + self.state.expected_answer
        
        next_q = self.state.get_next_question()
        return f"{eval} {next_q}"

async def entrypoint(ctx: JobContext):
    """Main entry point for LiveKit agent"""
    
    # Load interview configuration
    config = InterviewConfig(
        difficulty="mid",
        duration_minutes=45,
        question_bank=QUESTION_BANK,
        strict_timing=True
    )
    
    # Initialize agent session with low-latency components
    session = AgentSession(
        stt=deepgram.STT(
            model="nova-3",
            language="en",
            smart_format=True,
            punctuate=True,
            endpointing=500  # 500ms silence = end of turn
        ),
        llm=openai.LLM(
            model="gpt-4o-mini",
            temperature=0.3,  # Low creativity
            max_tokens=150,  # Short responses only
        ),
        tts=elevenlabs.TTS(
            model="eleven_flash_v2_5",
            voice="professional_male_1",
            stability=0.7,
            style=0.0,
            speed=1.0
        ),
        vad=silero.VAD.load(
            threshold=0.5,
            min_speech_duration_ms=100,
            min_silence_duration_ms=750
        ),
        turn_detection=agents.MultilingualModel(
            threshold=0.7  # High confidence before ending turn
        )
    )
    
    # Start the interview
    interviewer = StrictInterviewer(config)
    
    await session.start(
        room=ctx.room,
        agent=interviewer,
        room_input_options={
            "allow_interruptions": False,  # Candidate can't interrupt interviewer
        }
    )
    
    # Opening statement
    await session.say(
        "This is a 45-minute technical interview. I will ask you a series of questions. "
        "Answer to the best of your ability. Let's begin.",
        allow_interruptions=False
    )
    
    # First question
    first_question = interviewer.state.get_next_question()
    await session.say(first_question, allow_interruptions=False)
    
    # Background task to monitor silence
    asyncio.create_task(interviewer.turn_manager.check_silence())
    
    # Let the session run until interview ends
    await session.wait_for_completion()

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
```

### 7.2 Deployment Options

**Option 1: LiveKit Cloud** (Fastest to Production)
```bash
# Install dependencies
pip install livekit-agents[deepgram,openai,elevenlabs,silero]

# Set environment variables
export LIVEKIT_URL=wss://your-project.livekit.cloud
export LIVEKIT_API_KEY=your_api_key
export LIVEKIT_API_SECRET=your_secret
export DEEPGRAM_API_KEY=your_deepgram_key
export OPENAI_API_KEY=your_openai_key
export ELEVENLABS_API_KEY=your_elevenlabs_key

# Start agent
python strict_interviewer.py start
```

**Option 2: Self-Hosted** (Lower cost at scale)
```bash
# Run LiveKit server
docker run -d -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server --dev

# Deploy agent to your infra
# Cost: ~$0.05-0.10/minute vs $0.15/minute on LiveKit Cloud
```

---

## 8. Testing & Quality Assurance

### 8.1 Behavioral Tests

```python
import pytest

def test_no_empathy_language():
    """Ensure interviewer never uses empathy phrases"""
    interviewer = StrictInterviewer(test_config)
    
    responses = [
        interviewer.generate_response("I'm not sure about this..."),
        interviewer.generate_response("Can I have a hint?"),
        interviewer.generate_response("[long silence]"),
    ]
    
    forbidden_words = ["great", "good", "nice", "don't worry", "help"]
    for response in responses:
        for word in forbidden_words:
            assert word.lower() not in response.lower()

def test_strict_turn_taking():
    """Ensure interviewer never interrupts candidate"""
    # Simulate candidate still speaking
    interviewer.turn_manager.candidate_speaking = True
    
    # Interviewer should NOT generate response
    with pytest.raises(TurnNotCompleteError):
        await interviewer.generate_response("test")

def test_silence_handling():
    """Ensure 30s silence triggers 'Moving on'"""
    interviewer.turn_manager.silence_start = time.time() - 31
    
    response = await interviewer.turn_manager.check_silence()
    assert "Moving on" in response

def test_adaptive_difficulty():
    """Ensure difficulty increases with performance"""
    # Simulate 3 correct answers
    for _ in range(3):
        interviewer.state.record_answer("correct answer", quality=0.9)
    
    interviewer.state.advance_phase()
    assert interviewer.state.phase == InterviewPhase.ADVANCED
```

### 8.2 Monitoring Dashboard

Track these metrics in production:
- **Drift violations**: Empathy/coaching language detected
- **LLM fallback rate**: How often templates used instead of LLM
- **Average response latency**: Target <800ms
- **Silence events**: Frequency of >30s pauses
- **Phase progression**: Distribution of candidates reaching advanced phase
- **Candidate interruption attempts**: Should be 0 (strict turn-taking)

---

## 9. Cost Analysis

### 9.1 Per-Interview Cost (45 minutes)

**LiveKit Cloud Deployment:**
| Component | Provider | Cost |
|-----------|----------|------|
| STT | Deepgram Nova-3 | $0.19 (45 × $0.0043) |
| LLM | GPT-4o-mini | $0.09 (150 tokens/response × 15 Q&A × $0.00015/1K input + $0.0006/1K output) |
| TTS | ElevenLabs Flash | $0.50 (10K chars × $0.050/1K) |
| LiveKit hosting | LiveKit Cloud | $0.75 (45min × ~$0.017/min) |
| **Total** | | **$1.53/interview** |

**Self-Hosted Deployment:**
| Component | Provider | Cost |
|-----------|----------|------|
| STT | Deepgram Nova-3 | $0.19 |
| LLM | GPT-4o-mini | $0.09 |
| TTS | ElevenLabs Flash | $0.50 |
| Compute | AWS EC2 t3.large | $0.08 (amortized) |
| **Total** | | **$0.86/interview** |

Compare to all-in-one APIs:
- OpenAI Realtime API: **$13.50-67.50** (45min × $0.30-1.50/min)
- Significant savings with LiveKit

---

## 10. Key Takeaways & Recommendations

### ✅ DO:
1. **Use LiveKit Agents** for full behavioral control
2. **Cascaded architecture (STT→LLM→TTS)** for component optimization
3. **Low temperature LLM (0.3)** for consistent behavior
4. **Multi-layer drift prevention** (prompts + validation + state machines + monitoring)
5. **Rule-based quality detection** to avoid LLM bias
6. **Strict turn-taking** - interviewer never interrupts
7. **Template fallbacks** when LLM misbehaves
8. **Professional neutral voice** with no emotion modulation

### ❌ DON'T:
1. **Don't use S2S APIs** (OpenAI Realtime, Gemini Live) - too much built-in empathy
2. **Don't rely solely on prompts** - LLMs will drift without validation
3. **Don't backtracking** - silence is acceptable, don't rush to fill pauses
4. **Don't let candidate interrupt** - maintain power dynamic
5. **Don't teach or hint** - test knowledge, don't build it
6. **Don't use high temperature** - creativity causes drift

### 🎯 Production Checklist:
- [ ] System prompt tested for drift over 50+ turns
- [ ] Response validator catches 95%+ empathy language
- [ ] Template fallbacks for all scenarios
- [ ] Turn detection accuracy >85% (semantic, not just VAD)
- [ ] Silence handling tested (5s, 15s, 30s, 60s scenarios)
- [ ] Adaptive difficulty increases after 3 correct answers
- [ ] Monitoring dashboard deployed
- [ ] Cost per interview <$2
- [ ] End-to-end latency <1s (p95)
- [ ] User testing with 10+ candidates shows "realistic pressure"

---

## References

1. **LiveKit Agents Framework**: https://docs.livekit.io/agents/
2. **micro1 Interview System Research** (300K+ interviews): https://www.micro1.ai/research/evaluating-speech-to-text-vs-llm-vs-text-to-speech-combinations-for-ai-interview-systems
3. **Voice AI Infrastructure Guide**: https://introl.com/blog/voice-ai-infrastructure-real-time-speech-agents-asr-tts-guide-2025
4. **Context Drift in Multi-Turn Interactions**: https://arxiv.org/html/2510.07777
5. **Silero VAD**: https://github.com/snakers4/silero-vad
6. **Deepgram STT Benchmarks**: https://deepgram.com/learn/designing-voice-ai-workflows-using-stt-nlp-tts

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Prepared for**: High-pressure technical interview system development
