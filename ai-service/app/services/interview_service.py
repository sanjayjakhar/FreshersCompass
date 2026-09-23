import os
import json
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from app.services.gemini import init_gemini

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
            "feedback_summary": "No answers were provided for evaluation.",
            "strong_points": [],
            "areas_to_polish": ["Complete the interview questions to receive detailed feedback."],
            "per_question_feedback": [],
            "provider_used": "none"
        }

    formatted_qna = []
    for idx, r in enumerate(responses, 1):
        q_text = r.get("question", "")
        a_text = r.get("answer", "")
        expected = r.get("expected_points", [])
        category = r.get("category", "General")
        formatted_qna.append(
            f"Question {idx} [{category}]: {q_text}\n"
            f"Expected Points: {', '.join(expected)}\n"
            f"Candidate Answer: {a_text}\n"
        )

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
      "key_takeaway": "Brief constructive critique for this question"
    }}
  ]
}}
"""

    # 1. Try Gemini
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            init_gemini()
            for model_name in ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"]:
                try:
                    m = genai.GenerativeModel(model_name)
                    resp = m.generate_content(
                        prompt,
                        generation_config=genai.GenerationConfig(
                            response_mime_type="application/json",
                            temperature=0.3
                        ),
                        request_options={"timeout": 18}
                    )
                    if resp and resp.text and resp.text.strip():
                        result = json.loads(resp.text.strip())
                        result["provider_used"] = model_name
                        return result
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
            client = Groq(api_key=groq_key, timeout=18.0)
            for model_name in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"]:
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
                        return result
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
        per_q.append({
            "question_number": idx,
            "score": q_score,
            "verdict": verdict,
            "key_takeaway": f"Candidate demonstrated {'solid' if q_score >= 75 else 'basic'} grasp of concepts with {words} words."
        })

    coverage_ratio = total_expected_matches / max(total_expected_count, 1)
    base_score = int(60 + (coverage_ratio * 30) + min(total_words * 0.05, 10))
    overall_score = min(96, max(50, base_score))

    return {
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
