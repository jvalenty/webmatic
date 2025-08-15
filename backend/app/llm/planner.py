import json
from typing import Optional
from emergentintegrations.llm.chat import ChatError, UserMessage
from .client import get_llm_client
from ..projects.models import Plan

_PROVIDER_MAP = {
    "auto": "openai",
    "claude": "anthropic", 
    "gpt": "openai",
}

_MODEL_MAP = {
    "openai": "gpt-4o",
    "anthropic": "claude-3-5-sonnet-20241022",
}

async def plan_from_llm(description: str, provider: Optional[str] = "auto") -> Plan:
    client = get_llm_client()
    if client is None:
        raise RuntimeError("LLM client not configured")

    provider_key = _PROVIDER_MAP.get((provider or "auto").lower(), "openai")
    model = _MODEL_MAP.get(provider_key, "gpt-4o")
    
    # Configure the client for the specific provider
    client.with_model(provider_key, model)

    user_prompt = (
        f"Product Description:\n{description}\n\n"
        "Generate a concise, production-ready implementation plan with 5-8 bullets per section. "
        "Respond ONLY with strict JSON having three keys: frontend (array of strings), "
        "backend (array of strings), database (array of strings). No prose, no explanations, just JSON."
    )

    try:
        response = await client.send_message(UserMessage(text=user_prompt))
        data = json.loads(response)
        return Plan(
            frontend=list(map(str, data.get("frontend", []))),
            backend=list(map(str, data.get("backend", []))),
            database=list(map(str, data.get("database", []))),
        )
    except ChatError as e:
        raise RuntimeError(f"LLM error: {e}")
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Invalid JSON from LLM: {e}")