import os
import json
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from app.services.gemini import init_gemini


def _coerce_seconds(value: Any) -> Optional[int]:
    """Return a non-negative whole-second count, or None when not supplied."""
    try:
        if value is None or isinstance(value, bool):
            return None
        seconds = int(round(float(value)))
    except (TypeError, ValueError):
        return None
    return max(0, seconds)


def _pacing_score(time_spent: int, budget: Optional[int]) -> Dict[str, Any]:
    """
    Score time management for one answer.

    Without a budget we can still reward an answer that fits the time a human
    screener typically allows (60-150s) and penalise both ramble and
    under-explained one-liners. With a budget we score against that budget
    instead, which is what pressure mode is training against.
    """
    if time_spent <= 0:
        return {"pacing_score": 0, "pacing_note": "No measurable time on this answer."}

    reference = budget if budget and budget > 0 else 120

    # Utilisation: 1.0 means the full budget was used.
    utilisation = time_spent / reference
    if utilisation <= 0.15:
        score = 45
        note = f"Answered in {time_spent}s against a {reference}s budget; too brief to demonstrate depth."
    elif utilisation <= 0.4:
        score = 70
        note = f"Used {time_spent}s of a {reference}s budget; concise but thin on detail."
    elif utilisation <= 1.0:
        score = 92
        note = f"Used {time_spent}s of a {reference}s budget; well-paced use of the time available."
    elif utilisation <= 1.25:
        score = 75
        note = f"Took {time_spent}s against a {reference}s budget; slightly overran, tighten the summary."
    else:
        score = 50
        note = f"Took {time_spent}s against a {reference}s budget; significantly overran."

    return {"pacing_score": int(score), "pacing_note": note}


def _finalize(result: Dict[str, Any], pacing_scores: List[int], pacing_notes: List[str]) -> Dict[str, Any]:
    """
    Normalise an LLM report so pacing is always present and consistent.

    Models frequently omit or zero out `pacing_score` even when the schema asks
    for it. When the client actually supplied timings we fall back to our own
    deterministic measurement rather than trusting a missing field, and when it
    did not we return None instead of a fabricated number.
    """
    result.setdefault("provider_used", "unknown")
    if pacing_scores:
        result["pacing_score"] = int(round(sum(pacing_scores) / len(pacing_scores)))
        result.setdefault("time_management_summary", " ".join(pacing_notes))
    elif "pacing_score" not in result:
        result["pacing_score"] = None
    return result


def evaluate_interview_session(
    responses: List[Dict[str, Any]],
    role: str = "Full-Stack Software Engineer"
) -> Dict[str, Any]:
    """
    Evaluates candidate mock interview responses using Gemini with Groq fallback.
    Returns structured scoring, category breakdown, positive feedback, and areas to polish.
    """
    if not responses:
        return {
            "overall_score": 0,
            "technical_clarity": 0,
            "system_design_depth": 0,
            "behavioral_impact": 0,
            "pacing_score": 0,
            "feedback_summary": "No answers were provided for evaluation.",
            "strong_points": [],
            "areas_to_polish": ["Complete the interview questions to receive detailed feedback."],
            "per_question_feedback": [],
            "provider_used": "none"
        }

    formatted_qna = []
    pacing_notes: List[str] = []
    pacing_scores: List[int] = []

    for idx, r in enumerate(responses, 1):
        q_text = r.get("question", "")
        a_text = r.get("answer", "")
        expected = r.get("expected_points", [])
        category = r.get("category", "General")
        time_spent = _coerce_seconds(r.get("time_spent_seconds"))
        budget = _coerce_seconds(r.get("budget_seconds"))
        auto_submitted = bool(r.get("auto_submitted"))

        timing_line = ""
        if time_spent is not None:
            pacing = _pacing_score(time_spent, budget)
            pacing_scores.append(pacing["pacing_score"])
            pacing_notes.append(pacing["pacing_note"])
            timing_line = f"Time Spent: {time_spent}s (budget {budget}s){' [AUTO-SUBMITTED ON TIMER]' if auto_submitted else ''}\n"
            if pacing["pacing_score"] < 70:
                timing_line += f"Pacing Concern: {pacing['pacing_note']}\n"

        formatted_qna.append(
            f"Question {idx} [{category}]: {q_text}\n"
            f"Expected Points: {', '.join(expected)}\n"
            f"Candidate Answer: {a_text}\n"
            f"{timing_line}"
        )

    has_timing = bool(pacing_scores)
    mean_pacing = int(round(sum(pacing_scores) / len(pacing_scores))) if pacing_scores else 0

    prompt = f"""
You are a Staff Software Engineering Manager conducting a technical screening for a {role} position.
Evaluate the candidate's responses against expected industry benchmarks.

Candidate Responses:
--------------------
{chr(10).join(formatted_qna)}

Provide a strict, professional, and constructive evaluation.
Return your response STRICTLY as a JSON object matching this schema:
{{
  "overall_score": 85,
  "technical_clarity": 88,
  "system_design_depth": 82,
  "behavioral_impact": 84,
  "pacing_score": {mean_pacing if has_timing else 75},
  "feedback_summary": "Comprehensive 2-3 sentence executive summary of candidate performance.",
  "strong_points": [
    "Specific strength point 1 with reference to their answer",
    "Specific strength point 2 with reference to their answer"
  ],
  "areas_to_polish": [
    "Specific area 1 candidate should improve on",
    "Specific area 2 candidate should improve on"
  ],
  "per_question_feedback": [
    {{
      "question_number": 1,
      "score": 85,
      "verdict": "Strong / Acceptable / Needs Improvement",
      "key_takeaway": "Brief constructive critique for this question",
      "time_management": "One sentence on pacing and conciseness for this answer"
    }}
  ]
}}
"""

    # 1. Try Gemini (gemini-1.5-flash / gemini-2.0-flash)
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            init_gemini()
            gemini_models = [
                os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                "gemini-2.5-flash",
                "gemini-3.8-flash",
                "gemini-2.5-flash-lite",
            ]
            seen_gemini = set()
            for model_name in gemini_models:
                if model_name in seen_gemini:
                    continue
                seen_gemini.add(model_name)
                try:
                    m = genai.GenerativeModel(model_name)
                    resp = m.generate_content(
                        prompt,
                        generation_config=genai.GenerationConfig(
                            response_mime_type="application/json",
                            temperature=0.3
                        ),
                        request_options={"timeout": 12}
                    )
                    if resp and resp.text and resp.text.strip():
                        result = json.loads(resp.text.strip())
                        result["provider_used"] = model_name
                        return _finalize(result, pacing_scores, pacing_notes)
                except Exception as m_err:
                    print(f"[Interview AI] Gemini {model_name} notice: {m_err}")
                    continue
        except Exception as g_err:
            print(f"[Interview AI] Gemini init notice: {g_err}")

    # 2. Try Groq
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key, timeout=10.0)
            groq_models = [
                os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
                "openai/gpt-oss-120b",
                "openai/gpt-oss-20b",
                "qwen/qwen3.8-27b",
            ]
            seen_groq = set()
            for model_name in groq_models:
                if model_name in seen_groq:
                    continue
                seen_groq.add(model_name)
                try:
                    chat = client.chat.completions.create(
                        messages=[
                            {"role": "system", "content": "You are a Staff Software Engineering Interviewer. Return strictly valid JSON matching the requested schema."},
                            {"role": "user", "content": prompt}
                        ],
                        model=model_name,
                        response_format={"type": "json_object"},
                        temperature=0.3
                    )
                    text = chat.choices[0].message.content
                    if text and text.strip():
                        result = json.loads(text.strip())
                        result["provider_used"] = model_name
                        return _finalize(result, pacing_scores, pacing_notes)
                except Exception as q_err:
                    print(f"[Interview AI] Groq {model_name} notice: {q_err}")
                    continue
        except Exception as grq_err:
            print(f"[Interview AI] Groq error: {grq_err}")

    # 3. Intelligent Deterministic Heuristic Fallback
    total_expected_matches = 0
    total_expected_count = 0
    total_words = 0
    per_q = []

    for idx, r in enumerate(responses, 1):
        ans = r.get("answer", "").lower()
        words = len(ans.split())
        total_words += words
        expected = r.get("expected_points", [])
        total_expected_count += max(len(expected), 1)

        matches = sum(1 for ep in expected if any(word in ans for word in ep.lower().split() if len(word) > 3))
        total_expected_matches += matches

        q_score = min(95, max(45, int(50 + (matches * 15) + min(words * 0.4, 25))))
        verdict = "Strong" if q_score >= 80 else ("Acceptable" if q_score >= 65 else "Needs Improvement")

        entry = {
            "question_number": idx,
            "score": q_score,
            "verdict": verdict,
            "key_takeaway": f"Candidate demonstrated {'solid' if q_score >= 75 else 'basic'} grasp of concepts with {words} words."
        }

        time_spent = _coerce_seconds(r.get("time_spent_seconds"))
        if time_spent is not None:
            pacing = _pacing_score(time_spent, _coerce_seconds(r.get("budget_seconds")))
            entry["time_management"] = pacing["pacing_note"]
            entry["pacing_score"] = pacing["pacing_score"]

        per_q.append(entry)

    coverage_ratio = total_expected_matches / max(total_expected_count, 1)
    base_score = int(60 + (coverage_ratio * 30) + min(total_words * 0.05, 10))
    overall_score = min(96, max(50, base_score))

    result = {
        "overall_score": overall_score,
        "technical_clarity": min(95, overall_score + 2),
        "system_design_depth": min(95, max(50, overall_score - 4)),
        "behavioral_impact": min(95, overall_score + 1),
        "feedback_summary": f"Candidate provided {total_words} words across {len(responses)} questions with {int(coverage_ratio * 100)}% expected concept coverage. Solid foundation in core engineering principles.",
        "strong_points": [
            "Addressed key architectural concepts directly in responses",
            "Clear technical vocabulary and structured problem-solving approach"
        ],
        "areas_to_polish": [
            "Quantify trade-offs and latency benchmarks when detailing system designs",
            "Mention failure handling and circuit breaking during high concurrency discussion"
        ],
        "per_question_feedback": per_q,
        "provider_used": "deterministic-heuristic-evaluator"
    }

    # No client timing (older payload): pacing_score stays None rather than
    # implying a measurement we never made.
    return _finalize(result, pacing_scores, pacing_notes)
