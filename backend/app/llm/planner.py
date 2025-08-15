import json
from typing import Optional
from emergentintegrations.exceptions import (
    AuthenticationError,
    RateLimitError,
    InvalidRequestError,
    LLMAPIError,
)
from .client import get_llm_client
from ..projects.models import Plan

_PROVIDER_MAP = {
    "auto": "auto",
    "claude": "anthropic",
    "gpt": "openai",
}

async def plan_from_llm(description: str, provider: Optional[str] = "auto") -> Plan:
    client = get_llm_client()
    if client is None:
        raise RuntimeError("LLM client not configured")

    provider_key = _PROVIDER_MAP.get((provider or "auto").lower(), "auto")

    system = (
        "You are an expert software architect for full-stack web apps. "
        "Given a product description, respond ONLY with strict JSON having three "
        "keys: frontend (array of strings), backend (array of strings), database (array of strings). "
        "No prose, no explanations, just JSON."
    )

    user = (
        f"Product Description:\n{description}\n\n"
        "Generate a concise, production-ready implementation plan with 5-8 bullets per section."
    )

    try:
        resp = await client.chat(
            provider=provider_key,
            # Let the integration pick the best default model per provider
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=900,
            temperature=0.2,
        )
        content = resp.content if isinstance(resp.content, str) else str(resp.content)
        data = json.loads(content)
        return Plan(
            frontend=list(map(str, data.get("frontend", []))),
            backend=list(map(str, data.get("backend", []))),
            database=list(map(str, data.get("database", []))),
        )
    except (AuthenticationError, RateLimitError, InvalidRequestError, LLMAPIError) as e:
        raise RuntimeError(f"LLM error: {e}")
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Invalid JSON from LLM: {e}")