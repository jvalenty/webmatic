import json
from typing import Optional, Dict, Any, List
from .client import get_llm_client
from emergentintegrations.llm.chat import UserMessage
import re

_PROVIDER_MAP = {
    "auto": ("openai", "gpt-4o"),
    "claude": ("anthropic", "claude-4-sonnet-20250514"),
    "gpt": ("openai", "gpt-5"),
}

def _build_user_prompt(description: str, chat_text: str) -> str:
    base = f"Project Description:\n{description.strip()}\n\n"
    if chat_text.strip():
        base += f"Recent Chat:\n{chat_text.strip()}\n\n"
    base += (
        "Generate ONLY a simple JSON response with exactly 2 keys:\n"
        "1. 'files': array with 1 object containing 'path' and 'content'\n"
        "2. 'html_preview': complete HTML document\n\n"
        "Keep the HTML simple and concise. Make it modern and responsive.\n"
        "IMPORTANT: Return ONLY the JSON, no explanations, no markdown blocks, no extra text."
    )
    return base

async def generate_code_from_llm(description: str, chat_messages: List[Dict[str, str]], provider: Optional[str] = "auto") -> Dict[str, Any]:
    client = get_llm_client()
    if client is None:
        raise RuntimeError("LLM client not configured")

    chat_text = "\n".join([f"{m.get('role')}: {m.get('content')}" for m in chat_messages][-10:])
    user_prompt = _build_user_prompt(description, chat_text)

    prov_key, model = _PROVIDER_MAP.get((provider or "auto").lower(), ("openai", "gpt-4o"))

    try:
        # Configure the client with the appropriate provider and model
        configured_client = client.with_model(prov_key, model)
        
        # Add parameters for longer responses
        configured_client = configured_client.with_params(
            max_tokens=4000,  # Increase token limit
            temperature=0.2
        )
        
        # Create user message
        user_message = UserMessage(text=user_prompt)
        
        # Send message and get response
        response = await configured_client.send_message(user_message)
        
        # Extract content - response should be a string
        content = str(response).strip()
        
        if not content:
            raise RuntimeError("LLM returned empty response")
        
        # Try to extract JSON even if provider adds prose or markdown code blocks
        # Look for JSON in any format - more permissive approach
        json_match = None
        
        # Try markdown code blocks first
        patterns = [
            r"```(?:json)?\s*(\{[\s\S]*?\})\s*```",  # JSON in code blocks
            r"```(?:json)?\s*(\{[\s\S]*?)\s*```",     # Relaxed code blocks
            r"\{[\s\S]*\}",                           # Any JSON anywhere
        ]
        
        for pattern in patterns:
            m = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
            if m:
                if len(m.groups()) > 0:
                    json_match = m.group(1)
                else:
                    json_match = m.group(0)
                print(f"DEBUG: Found JSON with pattern: {repr(json_match[:100])}...")
                break
        
        if json_match:
            content = json_match.strip()
        else:
            print(f"DEBUG: No JSON found in response: {repr(content)}")
            raise RuntimeError(f"No JSON found in LLM response: {content[:200]}...")
        # Try to parse JSON, with fallback handling for malformed responses
        try:
            data = json.loads(content)
            files = data.get("files", [])
            html_preview = data.get("html_preview", "")
            if not isinstance(files, list):
                files = []
            print(f"DEBUG: Successfully parsed JSON with {len(files)} files")
            return {"files": files, "html_preview": html_preview}
        except json.JSONDecodeError as e:
            print(f"DEBUG: JSON parsing failed: {e}")
            print(f"DEBUG: Problematic JSON content: {repr(content[:500])}...")
            # Try to fix common JSON issues
            try:
                # Remove incomplete strings at the end
                lines = content.split('\n')
                for i in range(len(lines) - 1, -1, -1):
                    test_content = '\n'.join(lines[:i+1])
                    if test_content.rstrip().endswith('}'):
                        data = json.loads(test_content)
                        files = data.get("files", [])
                        html_preview = data.get("html_preview", "")
                        if not isinstance(files, list):
                            files = []
                        print(f"DEBUG: Fixed JSON parsing with {len(files)} files")
                        return {"files": files, "html_preview": html_preview}
            except:
                pass
            raise RuntimeError(f"Failed to parse LLM JSON response: {e}")
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
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
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
  <section class="hero">
    <div class="title">{title}</div>
    <div class="subtitle">Auto-generated preview. Refine via chat on the left.</div>
    <a class="cta" href="#">Get Started</a>
  </section>
  <section class="grid">
    <div class="card"><strong>Feature One</strong><div>Describe key capability here.</div></div>
    <div class="card"><strong>Feature Two</strong><div>Describe key capability here.</div></div>
    <div class="card"><strong>Feature Three</strong><div>Describe key capability here.</div></div>
  </section>
</body>
</html>"""
    files = [{"path": "index.html", "content": html}]
    return {"files": files, "html_preview": html}