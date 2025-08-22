import os
from functools import lru_cache
from emergentintegrations.llm.chat import LlmChat

@lru_cache(maxsize=1)
def get_llm_client() -> LlmChat | None:
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        return None
    # Create a simple LlmChat instance for generation
    return LlmChat(
        api_key=api_key,
        session_id="generator",
        system_message="You are an expert full-stack code generator. Given a product description and recent chat, return ONLY strict JSON with keys: files (array of {path, content}), html_preview (string). files should be minimal but functional, focusing on frontend for quick preview. The html_preview must be a complete inline HTML document that renders a basic working preview of the requested UI. No prose, no explanations."
    )