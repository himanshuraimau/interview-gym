#!/usr/bin/env python3
"""
Simple LiveKit Token Generator
Generates participant tokens for testing
"""

import jwt
import time
import os
from dotenv import load_dotenv

load_dotenv()

def generate_token(room_name="interview-room", participant_name="candidate-1"):
    """Generate a LiveKit participant token using PyJWT"""
    
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    if not api_key or not api_secret:
        print("❌ Error: API keys not found in .env")
        return None
    
    # Token payload
    payload = {
        "exp": int(time.time()) + 86400,  # 24 hours
        "iss": api_key,
        "nbf": int(time.time()),
        "sub": participant_name,
        "name": participant_name,
        "video": {
            "room": room_name,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
        }
    }
    
    # Generate token
    token = jwt.encode(payload, api_secret, algorithm="HS256")
    
    print("✅ Token Generated Successfully!")
    print("")
    print(f"Room: {room_name}")
    print(f"Participant: {participant_name}")
    print(f"Valid for: 24 hours")
    print("")
    print("=" * 60)
    print("TOKEN:")
    print("=" * 60)
    print(token)
    print("=" * 60)
    print("")
    print("📋 Copy the token above and paste it into test.html")
    
    return token

if __name__ == "__main__":
    import sys
    room = sys.argv[1] if len(sys.argv) > 1 else "interview-room"
    participant = sys.argv[2] if len(sys.argv) > 2 else "candidate-1"
    generate_token(room, participant)
