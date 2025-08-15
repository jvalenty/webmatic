import os
from functools import lru_cache
from emergentintegrations import LLMClient

@lru_cache(maxsize=1)
def get_llm_client() -> LLMClient | None:
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        return None
    # Timeout chosen to be safe for planning; streaming disabled for now
    return LLMClient(api_key=api_key, timeout=45, stream=False)