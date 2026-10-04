"""Tests for the LLM circuit breaker and offline heuristic fallback (#29)."""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import llm_service
from app.services import offline_heuristics as oh


def _clean_env():
    for key in ("GEMINI_API_KEY", "GROQ_API_KEY", "GEMINI_MODEL", "GROQ_MODEL"):
        os.environ.pop(key, None)
    llm_service.BREAKERS.reset()


def test_error_classification():
    assert llm_service._classify(RuntimeError("401 Unauthorized")) == "auth"
    assert llm_service._classify(RuntimeError("Read timed out")) == "unavailable"
    assert llm_service._classify(RuntimeError("503 temporarily unavailable")) == "unavailable"
    assert llm_service._classify(ImportError("No module named 'groq'")) == "missing_sdk"
    assert llm_service._classify(ValueError("weird")) == "other"


def test_breaker_trips_after_threshold_and_recovers():
    _clean_env()
    breaker = llm_service.CircuitBreaker("gemini", threshold=3, cooldown=1)

    assert breaker.state == llm_service.STATE_CLOSED
    # Ambiguous failures accumulate towards the threshold.
    breaker.record_failure(ValueError("unexpected response shape"))
    breaker.record_failure(ValueError("unexpected response shape"))
    assert breaker.state == llm_service.STATE_CLOSED, "should not trip before the threshold"

    breaker.record_failure(ValueError("unexpected response shape"))
    assert breaker.state == llm_service.STATE_OPEN
    assert breaker.allow() is False
    assert breaker.snapshot()["consecutive_failures"] == 3

    # Cooldown elapses, then exactly one probe is allowed through.
    time.sleep(1.05)
    assert breaker.state == llm_service.STATE_HALF_OPEN
    assert breaker.allow() is True

    breaker.record_success()
    assert breaker.state == llm_service.STATE_CLOSED
    assert breaker.failures == 0


def test_auth_failure_trips_immediately():
    _clean_env()
    breaker = llm_service.CircuitBreaker("groq", threshold=3, cooldown=60)

    breaker.record_failure(RuntimeError("401 Unauthorized"))

    # A wrong key never self-heals, so waiting out three failures wastes two
    # more timeouts for nothing.
    assert breaker.state == llm_service.STATE_OPEN
    assert breaker.snapshot()["last_error_kind"] == "auth"


def test_complete_raises_when_no_providers_configured():
    _clean_env()

    try:
        llm_service.complete("hello")
        raise AssertionError("expected LLMUnavailable")
    except llm_service.LLMUnavailable as err:
        assert "no API key configured" in str(err)


def test_complete_skips_open_circuit_and_uses_second_provider():
    _clean_env()
    os.environ["GEMINI_API_KEY"] = "broken"
    os.environ["GROQ_API_KEY"] = "working"

    calls = []

    def fake_gemini(model, prompt, temperature, timeout, json_mode):
        calls.append(("gemini", model))
        raise TimeoutError("deadline exceeded")

    def fake_groq(model, prompt, temperature, timeout, json_mode):
        calls.append(("groq", model))
        return "  recovered output  "

    for provider in llm_service.PROVIDERS:
        if provider["name"] == "gemini":
            provider["call"] = fake_gemini
        else:
            provider["call"] = fake_groq

    try:
        text, label = llm_service.complete("prompt")
        assert text == "recovered output", f"unexpected text: {text!r}"
        assert label.startswith("Groq"), f"unexpected label: {label!r}"
        assert [c[0] for c in calls] == ["gemini", "groq"], f"first call sequence: {calls}"

        # Gemini is now tripped, so the next call must not touch it again.
        calls.clear()
        llm_service.complete("prompt")
        assert [c[0] for c in calls] == ["groq"], f"open circuit was retried: {calls}"
    finally:
        _clean_env()


def test_offline_mode_and_status_shape():
    _clean_env()
    assert llm_service.offline_mode() is True
    status = llm_service.status()
    assert status["offline_mode"] is True
    assert len(status["providers"]) == 2
    for provider in status["providers"]:
        assert provider["configured"] is False
        assert "state" in provider and "cooldown_remaining_seconds" in provider

    os.environ["GROQ_API_KEY"] = "present"
    assert llm_service.offline_mode() is False
    assert llm_service.status()["offline_mode"] is False
    _clean_env()


def test_complete_json_strips_fences_and_unwraps():
    _clean_env()
    os.environ["GROQ_API_KEY"] = "k"

    def fenced(model, prompt, temperature, timeout, json_mode):
        return '```json\n{"bullets": ["one", "two"]}\n```'

    for provider in llm_service.PROVIDERS:
        provider["call"] = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("skip")) if a[0] != "openai/gpt-oss-120b" else fenced(*a, **k)

    try:
        data, _provider = llm_service.complete_json("prompt", unwrap_keys=["bullets"])
        assert data == ["one", "two"]
    finally:
        _clean_env()


def test_complete_json_raises_on_malformed_body():
    _clean_env()
    os.environ["GROQ_API_KEY"] = "k"

    for provider in llm_service.PROVIDERS:
        if provider["name"] == "groq":
            provider["call"] = lambda *a, **k: "this is not json"

    try:
        llm_service.complete_json("prompt")
        raise AssertionError("expected ValueError for undecodable JSON")
    except ValueError as err:
        assert "invalid JSON" in str(err)
    finally:
        _clean_env()


def test_pitch_bullets_are_grounded_in_repo_facts():
    meta = {"name": "shop", "description": "A storefront for campus merch", "primary_language": "TypeScript"}
    health = {"tech_stack": ["TypeScript", "React", "Express"], "overall_score": 88, "strengths": ["Well documented API routes"]}

    bullets = oh.pitch_bullets(meta, health)

    assert 3 <= len(bullets) <= 5
    assert all(isinstance(b, str) and b.strip() for b in bullets)
    joined = " ".join(bullets)
    assert "shop" in joined
    assert "TypeScript" in joined
    assert "88" in joined
    assert "documented" in joined.lower()


def test_pitch_bullets_survive_empty_health():
    bullets = oh.pitch_bullets({}, {})

    assert bullets
    assert all(b.strip() for b in bullets)
    # No unresolved placeholders or "None" leaking into candidate-facing copy.
    joined = " ".join(bullets)
    assert "None" not in joined
    assert "{" not in joined


def test_interview_prep_references_real_files():
    meta = {"name": "tracker", "description": "Internship tracker", "primary_language": "Python"}
    health = {"tech_stack": ["Python", "FastAPI"], "overall_score": 74, "strengths": ["Clear module structure"], "weaknesses": ["No test coverage"]}

    prep = oh.interview_prep(meta, health, ["app/main.py", "app/db.py"])

    guide = prep["explanation_guide"]
    assert guide["elevator_pitch_60s"]
    assert prep["features"]
    questions = prep["interview_questions"]
    assert len(questions) >= 4
    # Questions must cite files we actually indexed.
    assert any("app/main.py" in q["codebase_reference"] for q in questions)
    # The weakest measured signal is surfaced, not hidden.
    assert "No test coverage" in guide["challenges_and_tradeoffs"]


def test_chat_answer_quotes_chunks_or_admits_gap():
    empty = oh.chat_answer("How does auth work?", [], "shop")
    assert "Offline mode" in empty
    assert "could not reach an LLM" in empty

    chunks = [
        {"file_path": "src/auth.py", "content": "def login(u, p):\n    return verify(u, p)"},
        {"file_path": "src/db.py", "content": "x" * 1200},
    ]
    answer = oh.chat_answer("How does auth work?", chunks, "shop")
    assert "src/auth.py" in answer
    assert "def login" in answer
    assert "```" in answer
    # Long content is truncated rather than dumped whole.
    assert "x" * 1200 not in answer
    assert "verbatim extracts" in answer


def test_skill_improvements_detects_claim_and_evidence_gaps():
    improvements = oh.skill_improvements(
        resume_text="Worked on a team of 5 building web apps.",
        skills=["React"],
        languages=["React", "Go"],
        signals=["src/main.py"],
    )
    titles = " ".join(i["title"] for i in improvements).lower()
    details = " ".join(i["detail"] for i in improvements)

    assert "go" in details.lower()
    assert "quantified" in titles or "measured" in titles
    assert any(i["severity"] == "high" for i in improvements)
    for item in improvements:
        assert item["detail"].strip()


def test_skill_improvements_clean_profile_is_not_invented():
    improvements = oh.skill_improvements(
        resume_text="Architected services that reduced p99 latency by 40% and cut build times 3x across 12 releases.",
        skills=["Go", "Kubernetes"],
        languages=["Go"],
        signals=["docker/Dockerfile", ".github/workflows/ci.yml", "README.md", "tests/test_api.py"],
    )

    assert len(improvements) == 1
    assert improvements[0]["severity"] == "low"
    assert "Maintain" in improvements[0]["title"]


def run_all():
    failures = []
    _clean_env()
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    for test in tests:
        _clean_env()
        try:
            test()
            print(f"  PASS  {test.__name__}")
        except AssertionError as err:
            failures.append((test.__name__, err))
            print(f"  FAIL  {test.__name__}: {err}")
    print(f"\n{len(tests) - len(failures)}/{len(tests)} assertion groups passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(run_all())