"""
Adaptive interview question generation (#30).

Static curricula ask every candidate the same four questions, which is exactly
wrong for someone targeting a React or ML role whose resume claims Go, Rust or
PyTorch. This module synthesises a question set from the candidate's verified
profile: role, claimed skills, and whatever repository structure the GitHub
analyzer has already indexed.

Design notes:
- The LLM only *reorders and sharpens*. The shape of the set (2 deep-dives, 2
  domain challenges, 1 behavioural) is enforced here, so a hallucinating or
  malformed model response cannot produce an unbalanced interview.
- Every question must reference real candidate evidence. We tag provenance and
  reject any question the model invented without grounding.
- A deterministic generator backs the LLM up, so the endpoint always returns a
  usable question set even fully offline.
"""

import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple

# Composition the interview UI and evaluator both rely on.
QUOTA = {"deep_dive": 2, "domain": 2, "behavioral": 1}

CATEGORIES = {
    "deep_dive": "Deep Dive on Your Work",
    "domain": "Domain Architecture & Debugging",
    "behavioral": "Behavioral & Incident Response",
}

# Signals we accept as evidence that a question is grounded in the candidate.
_GROUNDING_TERMS = ("resume", "repository", "repo", "project", "your code", "codebase")


def _clean(value: Any, limit: int = 400) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return text[:limit]


def _as_list(value: Any, limit: int = 25) -> List[str]:
    if not isinstance(value, list):
        return []
    out: List[str] = []
    for item in value:
        cleaned = _clean(item, 120)
        if cleaned:
            out.append(cleaned)
        if len(out) >= limit:
            break
    return out


def normalize_candidate_profile(
    role: Optional[str] = None,
    skills: Optional[List[str]] = None,
    resume_text: Optional[str] = None,
    repositories: Optional[List[Dict[str, Any]]] = None,
    project_descriptions: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Reduce a candidate payload to the facts question generation can rely on.

    Bounded on purpose: oversized resume text and repo lists are truncated so a
    client cannot blow out the prompt or stall the LLM call.
    """
    skills_list = _as_list(skills)

    repos: List[Dict[str, Any]] = []
    for repo in (repositories or [])[:8]:
        if not isinstance(repo, dict):
            continue
        entry = {
            "name": _clean(repo.get("name") or repo.get("full_name"), 120),
            "language": _clean(repo.get("language") or repo.get("primary_language"), 60),
            "description": _clean(repo.get("description"), 300),
            "topics": _as_list(repo.get("topics"), 8),
        }
        if entry["name"] or entry["description"]:
            repos.append(entry)

    return {
        "role": _clean(role, 120) or "Software Engineer",
        "skills": skills_list[:20],
        "resume_text": _clean(resume_text, 2500),
        "repositories": repos,
        "projects": _as_list(project_descriptions, 6),
        # Drives deep-dive grounding; empty when nothing is known yet.
        "has_evidence": bool(skills_list or repos or _clean(resume_text, 1)),
    }


def _evidence_digest(profile: Dict[str, Any]) -> str:
    """Render the candidate evidence block used inside the LLM prompt."""
    lines: List[str] = [f"Target Role: {profile['role']}"]

    if profile["skills"]:
        lines.append(f"Claimed Skills: {', '.join(profile['skills'])}")

    if profile["repositories"]:
        lines.append("Indexed Repositories:")
        for repo in profile["repositories"]:
            bits = [b for b in (repo["name"], repo["language"], repo["description"]) if b]
            lines.append(f"  - {' | '.join(bits)}")

    if profile["projects"]:
        lines.append(f"Resume Projects: {'; '.join(profile['projects'])}")

    if profile["resume_text"]:
        lines.append(f"Resume Excerpt: {profile['resume_text'][:900]}")

    if not profile["has_evidence"]:
        lines.append(
            "NO VERIFIED EVIDENCE AVAILABLE. Produce general-purpose screening "
            "questions and do not reference any specific project, file or repository."
        )

    return "\n".join(lines)


def _is_grounded(question: Dict[str, Any], profile: Dict[str, Any]) -> bool:
    """
    Reject questions that claim to reference candidate work they cannot know.

    A deep-dive question that mentions "your repository" when we have no
    repository data is worse than useless: it invites the candidate to bluff.
    """
    text = f"{question.get('question', '')} {question.get('context', '')}".lower()

    claims_grounding = any(term in text for term in _GROUNDING_TERMS)
    if not claims_grounding:
        return True

    if not profile["has_evidence"]:
        return False

    if any(term in text for term in ("repository", "repo", "codebase", "your code")):
        return bool(profile["repositories"])
    return bool(profile["skills"] or profile["projects"] or profile["resume_text"])


def _coerce_question(raw: Any, kind: str, index: int) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None

    text = _clean(raw.get("question") or raw.get("text"), 500)
    if len(text) < 15:
        return None

    expected = _as_list(raw.get("expected_points") or raw.get("expectedPoints"), 6)
    if not expected:
        expected = ["Correct technical reasoning", "Quantified trade-offs"]

    return {
        "id": f"adp-{kind}-{index}",
        "kind": kind,
        "category": _clean(raw.get("category"), 80) or CATEGORIES[kind],
        "question": text,
        "context": _clean(raw.get("context"), 220),
        "expected_points": expected,
        "difficulty": _clean(raw.get("difficulty"), 20) or "mid",
        "source": "adaptive",
    }


def enforce_quota(
    candidates: List[Dict[str, Any]], profile: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Trim a model response down to exactly the promised composition.

    Ungrounded questions are dropped first, so a hallucinated deep-dive cannot
    crowd out a legitimate one. If a bucket ends up short we backfill from the
    deterministic bank rather than returning a short interview.
    """
    buckets: Dict[str, List[Dict[str, Any]]] = {kind: [] for kind in QUOTA}

    for raw in candidates:
        if not isinstance(raw, dict):
            continue
        kind = _clean(raw.get("kind"), 30).lower().replace(" ", "_")
        if kind in ("deep_dive", "deepdive", "deep-dive"):
            kind = "deep_dive"
        if kind in ("behavioral", "behavioural", "situational", "incident"):
            kind = "behavioral"
        if kind not in buckets:
            continue

        question = _coerce_question(raw, kind, len(buckets[kind]) + 1)
        if question and _is_grounded(question, profile):
            buckets[kind].append(question)

    selected: List[Dict[str, Any]] = []
    for kind, quota in QUOTA.items():
        selected.extend(buckets[kind][:quota])

    if len(selected) < sum(QUOTA.values()):
        print(
            f"[Adaptive Questions] Model returned {len(selected)} usable questions, "
            f"backfilling to {sum(QUOTA.values())}"
        )
        selected.extend(_backfill(selected, profile))

    return _order(selected)


def _order(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Interleave kinds so the interview does not front-load deep dives."""
    by_kind: Dict[str, List[Dict[str, Any]]] = {}
    for question in questions:
        by_kind.setdefault(question["kind"], []).append(question)

    # Bounded by the longest bucket: the buckets are never mutated, so the
    # termination condition has to be the index, not the bucket contents.
    longest = max((len(bucket) for bucket in by_kind.values()), default=0)

    ordered: List[Dict[str, Any]] = []
    for index in range(longest):
        for kind in ("deep_dive", "domain", "behavioral"):
            bucket = by_kind.get(kind) or []
            if index < len(bucket):
                ordered.append(bucket[index])
    return ordered


def _backfill(existing: List[Dict[str, Any]], profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    have = {q["id"] for q in existing}
    filled: List[Dict[str, Any]] = []
    for question in _deterministic_questions(profile):
        if len(filled) >= sum(QUOTA.values()) - len(existing):
            break
        if question["id"] not in have:
            filled.append(question)
    return filled


# ---------- Deterministic bank ----------

_ROLE_DOMAIN_HINTS = {
    "frontend": ("React", "component", "render", "hydration", "bundle"),
    "backend": ("API", "transaction", "index", "queue", "idempotency"),
    "fullstack": ("API", "end-to-end", "state", "cache"),
    "devops": ("pipeline", "deployment", "rollout", "container"),
    "machine learning": ("model", "dataset", "inference", "evaluation"),
    "data": ("pipeline", "warehouse", "schema", "query"),
}


def _role_hints(role: str) -> Tuple[str, ...]:
    lowered = role.lower()
    for key, hints in _ROLE_DOMAIN_HINTS.items():
        if key in lowered:
            return hints
    return ("architecture", "trade-off", "failure mode")


def _deterministic_questions(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Role-aware question bank used as the offline fallback.

    Generic enough to work for any candidate, but grounded where evidence
    exists so it is a genuine fallback rather than a separate, worse experience.
    """
    role = profile["role"]
    hints = _role_hints(role)
    primary = hints[0]

    questions: List[Dict[str, Any]] = []

    if profile["repositories"]:
        repo = profile["repositories"][0]
        label = repo["name"] or "your most substantial repository"
        language = repo["language"]
        questions.append(
            {
                "id": "adp-deep_dive-1",
                "kind": "deep_dive",
                "category": CATEGORIES["deep_dive"],
                "question": (
                    f"Walk me through the architecture of {label}"
                    f"{f' ({language})' if language else ''}. What are the main modules, "
                    "how do they communicate, and which decision would you reverse if you "
                    "rebuilt it today?"
                ),
                "context": _clean(repo["description"], 220),
                "expected_points": [
                    "Clear module boundaries and data flow",
                    "Explicit trade-off justification",
                    "Acknowledges a real weakness or alternative",
                ],
                "difficulty": "hard",
                "source": "adaptive",
            }
        )
        questions.append(
            {
                "id": "adp-deep_dive-2",
                "kind": "deep_dive",
                "category": CATEGORIES["deep_dive"],
                "question": (
                    f"In {label}, identify the single piece of logic you are least confident "
                    "about. What test or instrumentation would prove whether it actually holds "
                    "under load, and what did you find?"
                ),
                "context": "",
                "expected_points": [
                    "Names a specific file, function or path",
                    "Proposes a concrete verification method",
                    "Reports an honest result",
                ],
                "difficulty": "hard",
                "source": "adaptive",
            }
        )
    elif profile["skills"]:
        top = profile["skills"][0]
        second = profile["skills"][1] if len(profile["skills"]) > 1 else top
        questions.append(
            {
                "id": "adp-deep_dive-1",
                "kind": "deep_dive",
                "category": CATEGORIES["deep_dive"],
                "question": (
                    f"You list {top} on your resume. Describe a specific decision you made with "
                    f"it that a less experienced engineer would get wrong, and what it cost."
                ),
                "context": "",
                "expected_points": [
                    "Concrete project context",
                    "Names a trade-off, not just a benefit",
                    "Quantifies impact where possible",
                ],
                "difficulty": "mid",
                "source": "adaptive",
            }
        )
        questions.append(
            {
                "id": "adp-deep_dive-2",
                "kind": "deep_dive",
                "category": CATEGORIES["deep_dive"],
                "question": (
                    f"Where do {top} and {second} interact in your work, and what happens if that "
                    "boundary is violated at runtime?"
                ),
                "context": "",
                "expected_points": [
                    "Identifies the integration seam",
                    "Describes a realistic failure mode",
                    "Mentions testing or error handling",
                ],
                "difficulty": "mid",
                "source": "adaptive",
            }
        )

    else:
        # No resume and no repo indexed: still owe the candidate two deep dives,
        # but they must not pretend to reference evidence we do not have.
        questions.append(
            {
                "id": "adp-deep_dive-1",
                "kind": "deep_dive",
                "category": CATEGORIES["deep_dive"],
                "question": (
                    "Describe one system you built end to end. What did you own personally, "
                    "what did you deliberately leave out, and how did you know it worked?"
                ),
                "context": "",
                "expected_points": [
                    "Specific personal contribution, not team credit",
                    "Names a scope decision and its reason",
                ],
                "difficulty": "mid",
                "source": "adaptive",
            }
        )
        questions.append(
            {
                "id": "adp-deep_dive-2",
                "kind": "deep_dive",
                "category": CATEGORIES["deep_dive"],
                "question": (
                    "Walk me through the hardest bug you have debugged. How did you narrow it "
                    "down, and what would you instrument from day one next time?"
                ),
                "context": "",
                "expected_points": [
                    "Systematic bisection with evidence",
                    "Concludes with a preventative change",
                ],
                "difficulty": "mid",
                "source": "adaptive",
            }
        )

    questions.append(
        {
            "id": "adp-domain-1",
            "kind": "domain",
            "category": CATEGORIES["domain"],
            "question": (
                f"You are building a {role} service that must handle a 10x traffic spike during "
                f"peak hours. Walk through your caching, database and {primary} strategy in order "
                "of impact."
            ),
            "context": "",
            "expected_points": [
                "Layered caching with invalidation strategy",
                "Database indexing and connection limits",
                "Identifies the bottleneck before scaling",
            ],
            "difficulty": "mid",
            "source": "adaptive",
        }
    )
    questions.append(
        {
            "id": "adp-domain-2",
            "kind": "domain",
            "category": CATEGORIES["domain"],
            "question": (
                f"A production {role} deployment degrades gradually rather than failing outright. "
                "Describe the first three things you check, in order, and how you rule each out."
            ),
            "context": "",
            "expected_points": [
                "Starts with metrics and recent changes",
                "Narrows by elimination with evidence",
                "Includes a rollback or mitigation path",
            ],
            "difficulty": "mid",
            "source": "adaptive",
        }
    )
    questions.append(
        {
            "id": "adp-behavioral-1",
            "kind": "behavioral",
            "category": CATEGORIES["behavioral"],
            "question": (
                "Tell me about a time you shipped something that broke in production. What did you "
                "do in the first hour, and what changed afterwards so it could not recur?"
            ),
            "context": "",
            "expected_points": [
                "Calm root-cause analysis before fixing",
                "Communication with stakeholders",
                "Concrete preventative change, not just a promise",
            ],
            "difficulty": "mid",
            "source": "adaptive",
        }
    )

    return questions


def _build_prompt(profile: Dict[str, Any]) -> str:
    return f"""
You are a Staff Engineer designing a technical screening for a {profile['role']} candidate.
The candidate's verified profile evidence is below. Base every question on it.

{_evidence_digest(profile)}

Produce exactly 5 questions with this composition:
- 2 of kind "deep_dive": reference the candidate's ACTUAL projects or repository structure by name.
- 2 of kind "domain": architecture or debugging challenges specific to {profile['role']}.
- 1 of kind "behavioral": a situational incident or ownership scenario.

Return STRICTLY a JSON array. Each element:
{{
  "kind": "deep_dive" | "domain" | "behavioral",
  "category": "short category label",
  "question": "the question text",
  "context": "one line on which verified evidence this targets, or empty",
  "expected_points": ["3-4 evaluation criteria"],
  "difficulty": "easy" | "mid" | "hard"
}}

Hard rules:
- If evidence is absent, do NOT invent project, file or repository references.
- Questions must be answerable by a strong candidate in 2-3 minutes.
- No generic filler questions that apply to any role.
"""


def _try_llm(profile: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
    """Attempt generation through Gemini then Groq. None when unavailable."""
    prompt = _build_prompt(profile)
    parsed: Optional[str] = None

    if os.getenv("GEMINI_API_KEY"):
        try:
            import google.generativeai as genai
            from app.services.gemini import init_gemini

            init_gemini()
            for model_name in (
                os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                "gemini-2.5-flash",
                "gemini-2.5-flash-lite",
            ):
                try:
                    model = genai.GenerativeModel(model_name)
                    resp = model.generate_content(
                        prompt,
                        generation_config=genai.GenerationConfig(
                            response_mime_type="application/json", temperature=0.6
                        ),
                        request_options={"timeout": 12},
                    )
                    if resp and resp.text and resp.text.strip():
                        parsed = resp.text.strip()
                        break
                except Exception as model_err:
                    print(f"[Adaptive Questions] Gemini {model_name} notice: {model_err}")
                    continue
        except Exception as gemini_err:
            print(f"[Adaptive Questions] Gemini init notice: {gemini_err}")

    if not parsed and os.getenv("GROQ_API_KEY"):
        try:
            from groq import Groq

            client = Groq(api_key=os.getenv("GROQ_API_KEY"), timeout=10.0)
            for model_name in (
                os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
                "openai/gpt-oss-120b",
            ):
                try:
                    chat = client.chat.completions.create(
                        messages=[
                            {
                                "role": "system",
                                "content": "You design technical screenings. Return STRICTLY a valid JSON array of question objects.",
                            },
                            {"role": "user", "content": prompt},
                        ],
                        model=model_name,
                        response_format={"type": "json_object"},
                        temperature=0.6,
                    )
                    text = chat.choices[0].message.content
                    if text and text.strip():
                        parsed = text.strip()
                        break
                except Exception as groq_err:
                    print(f"[Adaptive Questions] Groq {model_name} notice: {groq_err}")
                    continue
        except Exception as groq_err:
            print(f"[Adaptive Questions] Groq client notice: {groq_err}")

    if not parsed:
        return None

    try:
        data = json.loads(parsed)
    except json.JSONDecodeError as decode_err:
        print(f"[Adaptive Questions] JSON decode notice: {decode_err}")
        return None

    # Models sometimes wrap the array in an object; unwrap defensively.
    if isinstance(data, dict):
        for key in ("questions", "data", "items"):
            if isinstance(data.get(key), list):
                return data[key]
        return None
    return data if isinstance(data, list) else None


def generate_adaptive_questions(
    role: Optional[str] = None,
    skills: Optional[List[str]] = None,
    resume_text: Optional[str] = None,
    repositories: Optional[List[Dict[str, Any]]] = None,
    project_descriptions: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Produce a 5-question adaptive set, with a deterministic fallback.

    Always returns the promised composition: callers never have to handle a
    short or missing question list.
    """
    profile = normalize_candidate_profile(
        role=role,
        skills=skills,
        resume_text=resume_text,
        repositories=repositories,
        project_descriptions=project_descriptions,
    )

    raw = _try_llm(profile)
    provider = "llm" if raw else "deterministic"

    if raw:
        questions = enforce_quota(raw, profile)
        if not questions:
            questions = _order(_deterministic_questions(profile))
            provider = "deterministic"
    else:
        questions = _order(_deterministic_questions(profile))

    return {
        "questions": questions,
        "provider_used": provider,
        "grounded": profile["has_evidence"],
        "target_role": profile["role"],
        "evidence_summary": {
            "skill_count": len(profile["skills"]),
            "repository_count": len(profile["repositories"]),
            "has_resume_text": bool(profile["resume_text"]),
        },
    }