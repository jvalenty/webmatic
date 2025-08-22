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
    
    print(f"Client methods: {[m for m in dir(client) if not m.startswith('_')]}")
    
    try:
        # Try different method names
        if hasattr(client, 'get_response'):
            response = await client.get_response("Say hello in JSON format")
        elif hasattr(client, 'send_message'):
            response = await client.send_message("Say hello in JSON format")
        elif hasattr(client, 'complete'):
            response = await client.complete("Say hello in JSON format")
        else:
            print("❌ No suitable method found")
            return
            
        print(f"✅ LLM response: {response}")
    except Exception as e:
        print(f"❌ LLM error: {e}")

if __name__ == "__main__":
    asyncio.run(test_llm())