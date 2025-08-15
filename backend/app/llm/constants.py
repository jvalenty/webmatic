from typing import Set

ALLOWED_MODELS: Set[str] = {"claude-4-sonnet", "gpt-5"}

def is_allowed_model(model: str | None) -> bool:
    if not model:
        return True
    return model in ALLOWED_MODELS