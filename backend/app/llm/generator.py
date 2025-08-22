import json
from typing import Optional, Dict, Any, List
from .client import get_llm_client

SYSTEM = (
    "You are an expert full-stack code generator. Given a product description and recent chat, "
    "return ONLY strict JSON with keys: files (array of {path, content}), html_preview (string). "
    "files should be minimal but functional, focusing on frontend for quick preview. "
    "The html_preview must be a complete inline HTML document that renders a basic working preview of the requested UI. "
    "No prose, no explanations."
)

_PROVIDER_MAP = {
    "auto": ("auto", None),
    "claude": ("anthropic", "claude-4-sonnet"),
    "gpt": ("openai", "gpt-5"),
}


def _build_user_prompt(description: str, chat_text: str) -> str:
    base = f"Project Description:\n{description.strip()}\n\n"
    if chat_text.strip():
        base += f"Recent Chat:\n{chat_text.strip()}\n\n"
    base += (
        "Generate a minimal working set of files and an html_preview that reflects the latest request. "
        "Prefer vanilla HTML/CSS and minimal JS unless explicitly asked.")
    return base


async def generate_code_from_llm(description: str, chat_messages: List[Dict[str, str]], provider: Optional[str] = "auto") -> Dict[str, Any]:
    client = get_llm_client()
    if client is None:
        raise RuntimeError("LLM client not configured")

    chat_text = "\n".join([f"{m.get('role')}: {m.get('content')}" for m in chat_messages][-10:])
    user = _build_user_prompt(description, chat_text)

    prov_key, model = _PROVIDER_MAP.get((provider or "auto").lower(), ("auto", None))

    kwargs = {
        "provider": prov_key,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
        ],
        "max_tokens": 1800,
        "temperature": 0.2,
    }
    if model:
        kwargs["model"] = model
    try:
        resp = await client.chat(**kwargs)
        content = resp.content if isinstance(resp.content, str) else str(resp.content)
        data = json.loads(content)
        files = data.get("files", [])
        html_preview = data.get("html_preview", "")
        if not isinstance(files, list):
            files = []
        return {"files": files, "html_preview": html_preview}
    except Exception as e:
        raise RuntimeError(f"LLM generation error: {e}")


def stub_generate_code(description: str, chat_messages: List[Dict[str, str]]) -> Dict[str, Any]:
    last = ""
    for m in reversed(chat_messages):
        if m.get("role") == "user":
            last = m.get("content", "").strip()
            break
    title = (last or description or "Your App").strip()[:60]
    html = f"""<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>{title}</title>
  <style>
    body{{font-family:ui-sans-serif,system-ui,-apple-system; margin:0; color:#0f172a; background:#f8fafc}}
    .hero{{padding:64px 24px; text-align:center; background:#fff; border-bottom:1px solid #e2e8f0}}
    .title{{font-size:40px; font-weight:700; letter-spacing:-0.02em}}
    .subtitle{{color:#475569; margin-top:8px}}
    .grid{{display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; padding:24px}}
    .card{{background:#fff; border:1px solid #e2e8f0; padding:16px}}
    .cta{{display:inline-block; margin-top:16px; background:#0f172a; color:#fff; padding:10px 16px; border-radius:6px; text-decoration:none}}
  </style>
</head>
<body>
  <section class=\"hero\">
    <div class=\"title\">{title}</div>
    <div class=\"subtitle\">Auto-generated preview. Refine via chat on the left.</div>
    <a class=\"cta\" href=\"#\">Get Started</a>
  </section>
  <section class=\"grid\">
    <div class=\"card\"><strong>Feature One</strong><div>Describe key capability here.</div></div>
    <div class=\"card\"><strong>Feature Two</strong><div>Describe key capability here.</div></div>
    <div class=\"card\"><strong>Feature Three</strong><div>Describe key capability here.</div></div>
  </section>
</body>
</html>"""
    files = [{"path": "index.html", "content": html}]
    return {"files": files, "html_preview": html}