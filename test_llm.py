#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append('/app/backend')
from app.llm.client import get_llm_client

async def test_llm():
    client = get_llm_client()
    if not client:
        print("❌ LLM client is None - check EMERGENT_LLM_KEY")
        return
    
    print("✅ LLM client created successfully")
    
    try:
        response = await client.chat(
            provider="anthropic",
            model="claude-4-sonnet",
            messages=[{"role": "user", "content": "Say hello in JSON format: {\"message\": \"your response\"}"}],
            max_tokens=100,
            temperature=0.1
        )
        print(f"✅ LLM response: {response.content}")
    except Exception as e:
        print(f"❌ LLM error: {e}")

if __name__ == "__main__":
    asyncio.run(test_llm())