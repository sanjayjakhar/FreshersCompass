import sys, os, types
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# The pacing logic is pure arithmetic and must be testable without pulling in the
# Gemini SDK (or a network key). Stub the optional dependency before import.
if 'google.generativeai' not in sys.modules:
    pkg = types.ModuleType('google')
    genai = types.ModuleType('google.generativeai')
    genai.GenerativeModel = object
    genai.GenerationConfig = object
    pkg.generativeai = genai
    sys.modules['google'] = pkg
    sys.modules['google.generativeai'] = genai

from app.services.interview_service import (
    _coerce_seconds,
    _pacing_score,
    evaluate_interview_session,
    _finalize,
)

passed = 0
def t(name, fn):
    global passed
    try:
        fn(); passed += 1; print(f"  ok  {name}")
    except Exception as e:
        print(f"FAIL  {name}\n      {e}"); sys.exit(1)

print("_coerce_seconds")
t("parses ints and floats", lambda: (
    _coerce_seconds(60) == 60,
    _coerce_seconds(59.6) == 60,
))
t("rejects None, bool, junk", lambda: (
    _coerce_seconds(None) is None,
    _coerce_seconds(True) is None,
    _coerce_seconds("abc") is None,
))
t("never returns a negative", lambda: _coerce_seconds(-5) == 0)

print("\n_pacing_score")
t("scores well inside budget", lambda: (
    _pacing_score(90, 120)["pacing_score"] == 92
))
t("penalises a far-too-short answer", lambda: (
    _pacing_score(5, 120)["pacing_score"] == 45
))
t("penalises a big overrun", lambda: (
    _pacing_score(400, 120)["pacing_score"] == 50
))
t("uses a 120s reference when no budget is given", lambda: (
    _pacing_score(60, None)["pacing_score"] == 92,
    _pacing_score(300, None)["pacing_score"] == 50,
))
t("treats zero budget as no budget", lambda: (
    _pacing_score(60, 0)["pacing_score"] == 92
))
t("returns 0 with no time recorded", lambda: (
    _pacing_score(0, 120)["pacing_score"] == 0
))
t("always produces a note", lambda: (
    all(_pacing_score(s, 120)["pacing_note"] for s in (0, 5, 60, 130, 500))
))

print("\nevaluate_interview_session (heuristic path)")
BASE = [{
    "question": "Explain DB race conditions",
    "answer": "Use row level locks and idempotency keys with postgres transactions to avoid race conditions",
    "expected_points": ["PostgreSQL transactions", "Idempotency keys"],
    "category": "System Architecture",
    "time_spent_seconds": 95,
    "budget_seconds": 120,
    "auto_submitted": False,
}]

def run(resps): return evaluate_interview_session(resps)

t("returns pacing_score when timing supplied", lambda: (
    isinstance(run(BASE)["pacing_score"], int)
))
t("pacing_score is None without timing", lambda: (
    evaluate_interview_session([{k: v for k, v in BASE[0].items() if not k.startswith("time_") and k != "budget_seconds" and k != "auto_submitted"}])["pacing_score"] is None
))
t("per-question carries time_management", lambda: (
    "time_management" in run(BASE)["per_question_feedback"][0]
))
t("per-question pacing score present", lambda: (
    isinstance(run(BASE)["per_question_feedback"][0].get("pacing_score"), int)
))
t("auto_submitted does not crash", lambda: (
    evaluate_interview_session([{**BASE[0], "auto_submitted": True}])["overall_score"] > 0
))
t("empty responses handled", lambda: (
    evaluate_interview_session([])["provider_used"] == "none"
))
t("summary includes timing commentary", lambda: (
    "time_management_summary" in run(BASE)
))
t("pacing notes per question", lambda: (
    run(BASE)["time_management_summary"].strip() != ""
))

print("\n_finalize")
t("overrides a missing pacing score from real data", lambda: (
    _finalize({}, [90, 100], ["note"])["pacing_score"] == 95
))
t("leaves None when no timing and model omitted the key", lambda: (
    _finalize({}, [], [])["pacing_score"] is None
))
t("respects a model-supplied score when no timing data exists", lambda: (
    _finalize({"pacing_score": 81}, [], [])["pacing_score"] == 81
))
t("sets provider_used default", lambda: (
    _finalize({}, [80], [])["provider_used"] == "unknown"
))

print(f"\n{passed} assertions passed.")