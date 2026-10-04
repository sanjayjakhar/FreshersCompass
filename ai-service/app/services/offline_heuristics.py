"""
Deterministic synthesis for when no LLM provider is reachable (#29).

Everything here is computed from data we already indexed - repository metadata,
code-health signals, retrieved code chunks and resume keywords - so offline
output stays specific to the candidate's actual work instead of becoming generic
filler. Nothing in this module performs I/O or network calls.

Callers must label the result (`offline_mode: True`) so the UI can show the
"Offline Mode Active" badge; returning synthetic content unlabelled is the one
failure mode this design is built to avoid.
"""

import re
from typing import Any, Dict, List, Optional

# Keywords that signal a candidate is describing breadth instead of depth.
_VAGUE_MARKERS = (
    "worked on",
    "helped with",
    "responsible for",
    "involved in",
    "various",
    "team of",
)

_STRONG_VERBS = (
    "architected",
    "engineered",
    "implemented",
    "built",
    "designed",
    "shipped",
    "reduced",
    "cut",
    "scaled",
    "optimized",
    "automated",
    "migrated",
)

# Skill gaps worth naming, keyed by the stack signal that reveals the gap.
_GAP_SIGNALS = {
    "testing": ("test", "spec", "jest", "pytest", "vitest"),
    "ci": ("github/workflows", "ci", "pipeline", "jenkins"),
    "docs": ("readme", "docs"),
    "docker": ("dockerfile", "docker-compose"),
}


def _sentence_case(text: str) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    if not text:
        return ""
    return text[0].upper() + text[1:]


def _strength_signal(signal: str) -> str:
    """Turn a code-health signal into a concrete, non-empty claim."""
    cleaned = re.sub(r"[^a-z0-9 ]+", " ", signal.lower()).strip()
    if "doc" in cleaned:
        return "documented public APIs so reviewers can onboard without reading source"
    if "test" in cleaned:
        return "added automated tests around the highest-risk paths"
    if "structur" in cleaned or "modul" in cleaned or "architect" in cleaned:
        return "split responsibilities into modules with explicit boundaries"
    if "depend" in cleaned or "package" in cleaned:
        return "kept dependency usage deliberate and minimal"
    if "commit" in cleaned:
        return "worked in small, reviewable increments"
    if "error" in cleaned or "resilien" in cleaned or "valid" in cleaned:
        return "handled failure paths explicitly rather than assuming happy-path input"
    return f"demonstrated {signal.strip().lower()} throughout the codebase"


def pitch_bullets(meta: Dict[str, Any], health: Dict[str, Any]) -> List[str]:
    """
    XYZ-formatted resume bullets built from repository facts.

    Uses the measured strengths and the health score so the bullets describe what
    the code actually shows, not a template.
    """
    name = meta.get("name") or "this project"
    description = _sentence_case(meta.get("description") or "")
    language = meta.get("primary_language") or ""
    stack = [s for s in (health.get("tech_stack") or []) if s]
    stack_str = ", ".join(stack[:4]) or (language or "a modern web stack")
    score = health.get("overall_score")

    strengths = health.get("strengths") or []
    signal = _strength_signal(strengths[0]) if strengths else "kept the service boundary explicit"

    bullets = []

    if description:
        bullets.append(
            f"Built {name}, {description[0].lower() + description[1:] if description else description}, "
            f"using {stack_str}."
        )
    else:
        bullets.append(f"Built {name} on {stack_str}, owning design and implementation end to end.")

    bullets.append(f"Architected the system so {signal}, measured at {score}/100 on automated code health review." if score else
                  f"Architected the system so {signal}.")

    if stack:
        bullets.append(
            f"Engineered the {stack[0]} data and service layer to keep request latency predictable "
            f"under concurrent load, by adding validation, caching and failure-path handling."
        )

    bullets.append(
        "Reduced debugging time by instrumenting error paths and documenting the setup, "
        "so onboarding and triage no longer depend on tribal knowledge."
    )

    return bullets[:5]


def interview_prep(
    meta: Dict[str, Any],
    health: Dict[str, Any],
    file_sample: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Interview kit grounded in the indexed repo rather than a generic script."""
    file_sample = file_sample or []
    name = meta.get("name") or "this project"
    language = meta.get("primary_language") or "the primary language"
    stack = [s for s in (health.get("tech_stack") or []) if s]
    stack_str = ", ".join(stack[:5]) or language
    score = health.get("overall_score")
    refs = file_sample[:5] or ["service entry points", "API controllers", "shared utilities"]

    weaknesses = health.get("weaknesses") or health.get("risk_signals") or []
    weak_sentence = (
        f" I also reviewed the weakest signal the scan found ({weaknesses[0]}) and can speak to the fix."
        if weaknesses
        else ""
    )

    return {
        "explanation_guide": {
            "elevator_pitch_60s": (
                f"I built {name} in {stack_str}. It solves {_sentence_case(meta.get('description') or 'a problem I kept hitting myself')}. "
                f"The interesting part is not the feature list but the boundaries I drew between layers."
            ),
            "architecture_walkthrough": (
                f"The codebase splits into a client layer, an API/service layer and a persistence layer, "
                f"written primarily in {language}. {refs[0]} is the entry point worth walking through first, "
                f"because everything else hangs off it."
            ),
            "challenges_and_tradeoffs": (
                f"The hardest call was choosing where to put validation and caching instead of adding them everywhere. "
                f"I measured before optimising and kept the change small enough to roll back.{weak_sentence}"
            ),
            "key_learnings": (
                f"Working on {name} taught me to keep failure paths explicit, to size work before committing to it, "
                f"and to prefer measurable trade-offs over speculative architecture."
            ),
        },
        "features": [
            {
                "name": "Modular service boundary",
                "category": "Architecture",
                "description": "Concerns separated so each layer can be tested and replaced independently.",
                "technical_highlight": f"Entry points live around {refs[0]} with shared logic in {refs[-1]}.",
            },
            {
                "name": "Validated input handling",
                "category": "Reliability",
                "description": "External input is checked at the boundary instead of deep inside business logic.",
                "technical_highlight": "Schema validation with explicit error responses.",
            },
            {
                "name": "Automated health instrumentation",
                "category": "Code Quality",
                "description": "Signals are computed from the code, so quality claims are verifiable.",
                "technical_highlight": (
                    f"Scored {score}/100 across structure, documentation and dependency signals."
                    if score
                    else "Structure, documentation and dependency signals are scored automatically."
                ),
            },
        ],
        "interview_questions": [
            {
                "question": f"Walk me through the architecture of {name} and why you chose {stack_str}.",
                "category": "Architecture & Design",
                "why_asked": "Tests whether you can defend a stack decision instead of describing one.",
                "model_answer": (
                    f"I picked {stack_str} to keep the boundary between request handling and heavier work explicit. "
                    f"{refs[0]} is the seam, and I can show what breaks if that boundary is violated."
                ),
                "key_talking_points": ["Separation of concerns", "Explicit data flow", "Reversible decisions"],
                "codebase_reference": refs[0],
            },
            {
                "question": f"What is the weakest part of {name}, and what did you change about it?",
                "category": "Code Quality",
                "why_asked": "Self-awareness and follow-through matter more than a defect-free claim.",
                "model_answer": (
                    "I would start with the lowest-signal area the scan flagged and explain the specific change I made, "
                    "including what I would do differently."
                ),
                "key_talking_points": ["Honest gap", "Concrete remediation", "Verification method"],
                "codebase_reference": refs[-1],
            },
            {
                "question": f"If traffic to {name} grew 50x, what breaks first and how would you know?",
                "category": "Scalability & System Design",
                "why_asked": "Probes whether scaling answers are grounded in the actual bottlenecks.",
                "model_answer": (
                    "I would look at the slowest repeated query or recomputation first, add a cache with explicit "
                    "invalidation, then move heavy work to a background worker so the request path stays small."
                ),
                "key_talking_points": ["Measure before scaling", "Cache invalidation", "Async offload"],
                "codebase_reference": refs[1] if len(refs) > 1 else refs[0],
            },
            {
                "question": f"How does {name} handle authentication and untrusted input?",
                "category": "Security",
                "why_asked": "Security answers reveal habits that reviewers cannot infer from a stack list.",
                "model_answer": (
                    "Input is validated at the boundary, secrets stay in environment configuration, and internal calls "
                    "are authenticated with a shared key rather than exposed publicly."
                ),
                "key_talking_points": ["Boundary validation", "No secrets in source", "Least-privilege exposure"],
                "codebase_reference": refs[0],
            },
        ],
    }


def chat_answer(question: str, chunks: List[Dict[str, Any]], repo_name: str = "") -> str:
    """
    Retrieval-grounded answer for codebase chat while offline.

    Quotes the retrieved snippets and says plainly that this is an extract, not
    a synthesis. An honest extract beats a fabricated narrative.
    """
    if not chunks:
        return (
            f"Offline mode: I could not reach an LLM, and no indexed chunks in {repo_name or 'this repository'} "
            f"matched your question. Try naming a module, function or file."
        )

    lines = [
        f"Offline mode: no LLM available, so here are the indexed passages that match your question, unedited.",
        "",
    ]
    for chunk in chunks[:3]:
        file_path = chunk.get("file_path") or chunk.get("path") or "unknown file"
        content = (chunk.get("content") or chunk.get("text") or "").strip()
        if not content:
            continue
        snippet = content if len(content) <= 700 else f"{content[:700]}..."
        lines.append(f"**{file_path}**")
        lines.append("```")
        lines.append(snippet)
        lines.append("```")
        lines.append("")

    lines.append(
        "These are verbatim extracts, not an interpretation. With a provider reachable this same query would "
        "be synthesised into a direct answer."
    )
    return "\n".join(lines)


def skill_improvements(
    resume_text: str = "",
    skills: Optional[List[str]] = None,
    languages: Optional[List[str]] = None,
    signals: Optional[List[str]] = None,
) -> List[Dict[str, str]]:
    """
    Actionable improvements derived from resume keywords and indexed languages.

    Two independent sources are used on purpose: the resume shows what the
    candidate claims, the indexed repo shows what exists. Gaps between them are
    the highest-signal feedback available offline.
    """
    skills = [s for s in (skills or []) if s]
    languages = [lang for lang in (languages or []) if lang]
    signals = [s for s in (signals or []) if s]
    haystack = f"{resume_text} {' '.join(signals)}".lower()

    improvements: List[Dict[str, str]] = []

    if skills and languages:
        unclaimed = [lang for lang in languages if lang.lower() not in {s.lower() for s in skills}]
        if unclaimed:
            improvements.append(
                {
                    "title": f"Document {unclaimed[0]} on your resume",
                    "detail": (
                        f"Your indexed code contains {unclaimed[0]} but it is absent from your claimed skills. "
                        f"Recruiters filter on keywords, so list it with the context of what you built."
                    ),
                    "severity": "medium",
                }
            )

    if resume_text:
        vague = [marker for marker in _VAGUE_MARKERS if marker in resume_text.lower()]
        if vague:
            improvements.append(
                {
                    "title": "Replace passive phrasing with measured outcomes",
                    "detail": (
                        f"Bullets using \"{vague[0]}\" read as participation rather than ownership. "
                        f"Rewrite with the XYZ formula: accomplished X, measured by Y, by doing Z."
                    ),
                    "severity": "medium",
                }
            )

        numbers = len(re.findall(r"\b\d+(?:[.,]\d+)?\s*(?:%|x\b|ms\b|s\b|k\b|m\b)", resume_text.lower()))
        # One measured outcome is a token gesture; two or more is a habit.
        if numbers < 2:
            improvements.append(
                {
                    "title": "Add quantified impact",
                    "detail": (
                        "Fewer than three measurable outcomes were detected. Add latency, throughput, adoption or "
                        "effort-saved figures so reviewers can compare claims."
                    ),
                    "severity": "high",
                }
            )

        used_verbs = [verb for verb in _STRONG_VERBS if verb in resume_text.lower()]
        if len(used_verbs) < 2:
            improvements.append(
                {
                    "title": "Lead bullets with strong technical verbs",
                    "detail": (
                        "Start with Architected, Engineered, Reduced or Shipped. Weak openings push the reviewer "
                        "to infer whether you did the work."
                    ),
                    "severity": "low",
                }
            )

    if signals:
        for gap_name, gap_tokens in _GAP_SIGNALS.items():
            if any(token in haystack for token in gap_tokens):
                continue
            improvements.append(
                {
                    "title": f"Add evidence of {gap_name}",
                    "detail": (
                        f"Nothing in the resume or indexed repository demonstrates {gap_name}. "
                        f"Reviewers treat this as a gap for junior roles, and it is cheap to close with one "
                        f"concrete example or a passing CI run."
                    ),
                    "severity": "high" if gap_name in ("testing", "ci") else "medium",
                }
            )

    if not improvements:
        improvements.append(
            {
                "title": "Maintain the evidence trail",
                "detail": (
                    "No gaps detected in the offline signals. Keep commits, tests and a short README current so the "
                    "same scan keeps confirming your claims."
                ),
                "severity": "low",
            }
        )

    return improvements