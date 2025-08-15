import os
from functools import lru_cache
from emergentintegrations.llm.chat import LlmChat

@lru_cache(maxsize=1)
def get_llm_client() -> LlmChat | None:
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        return None
    # Create a simple LlmChat instance for planning
    return LlmChat(
        api_key=api_key,
        session_id="planner",
        system_message="You are an expert software architect for full-stack web apps."
    )