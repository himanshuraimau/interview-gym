import json
import os
from pathlib import Path
from google import genai

# =========================
# CONFIGURATION
# =========================

GEMINI_API_KEY = "AIzaSyBXQK-B4un5AZPEmJGBKCxLeS781Zv6qAY"
MODEL_NAME = "models/gemini-2.5-flash"

PROMPT_FILE = "feedback_prompt.md"
ROLE_SCORING_FILE = "role_scoring_system.json"
OUTPUT_FILE = "feedback_report.md"

INTERVIEW_ROLE = "Backend Engineering Interviewer"

# =========================
# DUMMY INPUT DATA
# =========================

USER_PROFILE = """
Name: Rahul Kumar
Experience: 4.5 years
Current Role: Backend Engineer
Primary Stack: Python, FastAPI, PostgreSQL
Target Role: Senior Backend Engineer
Past Work: Designed internal APIs, authentication systems, and caching layers
"""

INTERVIEW_TRANSCRIPT = """
[00:00] Interviewer: Can you explain REST vs GraphQL?
[00:07] Candidate: REST is resource-based and uses multiple endpoints,
while GraphQL allows clients to query exactly what they need. However,
GraphQL adds complexity at the server layer.

[01:10] Interviewer: How would you design authentication for a public API?
[01:18] Candidate: I would use JWT-based authentication with access and refresh
tokens. Tokens should be short-lived and rotated. Sensitive routes must be
protected using middleware.

[02:40] Interviewer: How do you prevent SQL injection?
[02:44] Candidate: By using ORM tools and prepared statements instead of
string concatenation.

[03:30] Interviewer: How would you scale this service?
[03:35] Candidate: Horizontal scaling using stateless services, load balancers,
and Redis caching. Rate limiting is also important.
"""

# =========================
# LOAD FILES
# =========================

def load_file(path):
    return Path(path).read_text(encoding="utf-8")

prompt_template = load_file(PROMPT_FILE)

with open(ROLE_SCORING_FILE, "r", encoding="utf-8") as f:
    role_scoring_data = json.load(f)

if INTERVIEW_ROLE not in role_scoring_data:
    raise ValueError(f"Role '{INTERVIEW_ROLE}' not found in scoring system")

ROLE_SCORING_CHECKLIST = json.dumps(
    role_scoring_data[INTERVIEW_ROLE],
    indent=2
)

# =========================
# BUILD FINAL PROMPT
# =========================

final_prompt = (
    prompt_template
    .replace("{{USER_PROFILE}}", USER_PROFILE.strip())
    .replace("{{INTERVIEW_ROLE}}", INTERVIEW_ROLE)
    .replace("{{ROLE_SCORING_CHECKLIST}}", ROLE_SCORING_CHECKLIST)
    .replace("{{INTERVIEW_TRANSCRIPT}}", INTERVIEW_TRANSCRIPT.strip())
)

# =========================
# GEMINI CALL
# =========================

client = genai.Client(
    api_key=GEMINI_API_KEY
)

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=final_prompt,
)

# =========================
# SAVE OUTPUT
# =========================

Path(OUTPUT_FILE).write_text(response.text, encoding="utf-8")

print(f"Feedback report generated: {OUTPUT_FILE}")

