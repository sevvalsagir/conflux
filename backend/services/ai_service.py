import os
import json
import asyncio
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = "google/gemini-2.5-flash"
API_URL = "https://openrouter.ai/api/v1/chat/completions"
TIMEOUT_SECONDS = 20.0


async def analyze_change_request(
    cr_title: str, cr_description: str, baseline_context: dict
) -> Optional[dict]:
    """
    Calls Gemini 2.5 Flash via OpenRouter to analyze a change request.
    Returns a structured dict or None on failure/timeout.
    Graceful degradation: if AI fails, CR still moves to under_review.
    """
    if not OPENROUTER_API_KEY:
        return _mock_analysis(cr_title)

    prompt = _build_prompt(cr_title, cr_description, baseline_context)

    try:
        result = await asyncio.wait_for(_call_openrouter(prompt), timeout=TIMEOUT_SECONDS)
        return result
    except asyncio.TimeoutError:
        print(f"[AI] Timeout analyzing CR: {cr_title}")
        return None
    except Exception as e:
        print(f"[AI] Error analyzing CR: {e}")
        return None


async def _call_openrouter(prompt: str) -> dict:
    import httpx

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://conflux-app.local",
        "X-Title": "Conflux",
    }
    body = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a senior software project manager assistant. "
                    "Your job is to analyze change requests for software projects "
                    "and estimate their impact on timeline, risk, and existing features. "
                    "Always respond with valid JSON only — no markdown fences, no explanation, just the JSON object."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 600,
        "temperature": 0.3,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            API_URL,
            headers=headers,
            json=body,
            timeout=TIMEOUT_SECONDS - 1,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
        # Strip markdown fences if model wraps JSON in ```json ... ```
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())


def _build_prompt(title: str, description: str, baseline: dict) -> str:
    features = baseline.get("features", [])
    milestones = baseline.get("milestones", [])

    feature_list = "\n".join(
        [
            f"  - {f['name']} | {f.get('effort_days', '?')} days | status: {f.get('status', 'planned')}"
            for f in features[:15]
        ]
    )
    milestone_list = "\n".join(
        [f"  - {m['name']}: due {m.get('due_date', 'TBD')}" for m in milestones[:8]]
    )

    total_effort = sum(f.get("effort_days", 0) for f in features)

    return f"""Analyze the following change request for a software project.

=== CHANGE REQUEST ===
Title: {title}
Description: {description}

=== CURRENT PROJECT BASELINE ===
Total planned effort: {total_effort} days across {len(features)} features

Features:
{feature_list or "  (no features defined yet)"}

Milestones:
{milestone_list or "  (no milestones defined yet)"}

=== INSTRUCTIONS ===
Analyze the impact of this change request on the project. Consider:
- How many extra days/weeks will this likely add?
- Which existing features or milestones does this affect?
- What is the overall risk level?
- Are there simpler alternatives to achieve the same goal?

Return ONLY a JSON object with exactly these fields:
{{
  "timeline_impact": "short string describing the estimated time impact (e.g. '+3-5 days', '+1-2 weeks', 'Minimal impact')",
  "risk_score": <float between 0.0 and 1.0>,
  "risk_level": "<Low | Medium | High>",
  "dependency_analysis": "1-2 sentences about which features or milestones are affected",
  "alternative_suggestions": "1-2 shorter or simpler alternatives, or empty string if none"
}}"""


def _mock_analysis(title: str) -> dict:
    """Returned when no API key is configured."""
    return {
        "timeline_impact": "Estimated +2-3 days",
        "risk_score": 0.3,
        "risk_level": "Low",
        "dependency_analysis": "Mock analysis — set OPENROUTER_API_KEY in .env for real AI.",
        "alternative_suggestions": "",
    }
