#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append('/app/backend')
from app.llm.client import get_llm_client
from emergentintegrations.llm.chat import UserMessage

async def test_llm():
    client = get_llm_client()
    if not client:
        print("❌ LLM client is None - check EMERGENT_LLM_KEY")
        return
    
    print("✅ LLM client created successfully")
    print(f"Available methods: {[m for m in dir(client) if not m.startswith('_')]}")
    
    try:
        # Test with correct emergentintegrations usage
        configured_client = client.with_model("anthropic", "claude-4-sonnet-20250514")
        user_message = UserMessage(text='Return only this JSON: {"message": "Hello from LLM!", "status": "working"}')
        
        response = await configured_client.send_message(user_message)
        print(f"✅ LLM response: {response}")
        
        # Test JSON parsing
        import json
        import re
        content = str(response).strip()
        m = re.search(r"\{[\s\S]*\}$", content.strip())
        if m:
            content = m.group(0)
            try:
                data = json.loads(content)
                print(f"✅ JSON parsed successfully: {data}")
            except json.JSONDecodeError as e:
                print(f"❌ JSON parsing failed: {e}")
        else:
            print(f"❌ No JSON found in response: {content}")
            
    except Exception as e:
        print(f"❌ LLM error: {e}")

if __name__ == "__main__":
    asyncio.run(test_llm())

if __name__ == "__main__":
    asyncio.run(test_llm())