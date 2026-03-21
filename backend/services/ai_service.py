import os
import json
import asyncio
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


async def analyze_change_request(cr_title: str, cr_description: str, baseline_context: dict) -> Optional[dict]:
    """
    Calls OpenAI to analyze a change request and estimate its impact.
    Returns a structured dict or None if the call fails/times out.

    The 5-second timeout is enforced — if it fails, the CR just moves to
    under_review without AI analysis (graceful degradation).
    """
    if not OPENAI_API_KEY or OPENAI_API_KEY == "":
        return _mock_analysis(cr_title)

    prompt = _build_prompt(cr_title, cr_description, baseline_context)

    try:
        result = await asyncio.wait_for(_call_openai(prompt), timeout=5.0)
        return result
    except asyncio.TimeoutError:
        print(f"[AI] Timeout analyzing CR: {cr_title}")
        return None
    except Exception as e:
        print(f"[AI] Error analyzing CR: {e}")
        return None


async def _call_openai(prompt: str) -> dict:
    """Makes the actual OpenAI API call."""
    import httpx

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a project management assistant that analyzes change requests."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 400,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=body,
            timeout=4.5,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)


def _build_prompt(title: str, description: str, baseline: dict) -> str:
    features = baseline.get("features", [])
    milestones = baseline.get("milestones", [])

    feature_list = "\n".join([f"- {f['name']} ({f['effort_days']} days)" for f in features[:10]])
    milestone_list = "\n".join([f"- {m['name']}: {m['due_date']}" for m in milestones[:5]])

    return f"""Analyze this change request for a software project and return a JSON response.

CHANGE REQUEST:
Title: {title}
Description: {description}

PROJECT BASELINE:
Features:
{feature_list or "No features defined yet."}

Milestones:
{milestone_list or "No milestones defined yet."}

Return ONLY a JSON object with these exact fields:
{{
  "timeline_impact": "string describing days/weeks impact (e.g. +3 days, +1 week)",
  "risk_score": float between 0.0 and 1.0,
  "risk_level": "Low" or "Medium" or "High",
  "dependency_analysis": "short string about which features/milestones this affects",
  "alternative_suggestions": "short string with 1-2 alternative approaches or empty string"
}}"""


def _mock_analysis(title: str) -> dict:
    """Returns a placeholder analysis when no API key is set."""
    return {
        "timeline_impact": "Estimated +2-3 days",
        "risk_score": 0.3,
        "risk_level": "Low",
        "dependency_analysis": "No API key configured — this is a placeholder analysis.",
        "alternative_suggestions": "Set OPENAI_API_KEY in .env to enable real AI analysis."
    }
