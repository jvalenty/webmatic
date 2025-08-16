from __future__ import annotations
from typing import Dict, List, Tuple
from .models import Plan

KEYWORDS = [
    "auth",
    "authentication",
    "authorization",
    "api",
    "endpoint",
    "schema",
    "database",
    "migration",
    "testing",
    "tests",
    "jest",
    "pytest",
    "deployment",
    "deploy",
    "error",
    "logging",
    "monitor",
    "security",
    "performance",
]


def _flatten(plan: Plan | Dict) -> List[str]:
    if isinstance(plan, Plan):
        items = (plan.frontend or []) + (plan.backend or []) + (plan.database or [])
    else:
        items = list(plan.get("frontend", [])) + list(plan.get("backend", [])) + list(plan.get("database", []))
    return [str(x).lower() for x in items]


def score_plan(plan: Plan | Dict) -> Tuple[int, Dict]:
    """Return (score_0_100, breakdown). Heuristic placeholder.
    - Counts target: 6 items per section (18 total) → up to 60 pts
    - Keyword coverage across all items → up to 40 pts
    """
    if not plan:
        return 0, {"reason": "no_plan"}

    if isinstance(plan, Plan):
        f = len(plan.frontend or [])
        b = len(plan.backend or [])
        d = len(plan.database or [])
        plan_dict = {"frontend": plan.frontend, "backend": plan.backend, "database": plan.database}
    else:
        f = len(plan.get("frontend", []))
        b = len(plan.get("backend", []))
        d = len(plan.get("database", []))
        plan_dict = plan

    # Count-based score (max 60)
    # Ideal 6 per section; score per section = min(count, 6) / 6 * 20
    def section_score(n: int) -> int:
        ratio = min(max(n, 0), 6) / 6.0
        return int(round(ratio * 20))

    count_score = section_score(f) + section_score(b) + section_score(d)

    # Keyword coverage (max 40)
    text_items = _flatten(plan)
    hits = {kw: any(kw in it for it in text_items) for kw in KEYWORDS}
    hit_count = sum(1 for v in hits.values() if v)
    keyword_score = int(round(min(hit_count, 10) / 10.0 * 40))  # cap at 10 keywords

    total = max(0, min(100, count_score + keyword_score))
    breakdown = {
        "counts": {"frontend": f, "backend": b, "database": d},
        "count_score": count_score,
        "keyword_score": keyword_score,
        "keywords_hit": [k for k, v in hits.items() if v],
    }
    return total, breakdown