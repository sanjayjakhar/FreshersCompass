"""Tests for the adaptive question generator (#30)."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import question_generator as qg


def _reset_llm_env():
    for key in ("GEMINI_API_KEY", "GROQ_API_KEY"):
        os.environ.pop(key, None)


def test_profile_normalization_bounds_inputs():
    profile = qg.normalize_candidate_profile(
        role="  React Engineer  ",
        skills=["React", "  ", "TypeScript", "x" * 500],
        resume_text="y" * 9000,
        repositories=[
            {"name": "repo-a", "language": "TypeScript", "description": "d" * 900},
            "not-a-dict",
            {},
            {"full_name": "org/repo-b"},
        ],
        project_descriptions=["p1", "p2"],
    )

    assert profile["role"] == "React Engineer"
    assert "  " not in profile["skills"]
    # The oversized skill is bounded, not dropped.
    assert max(len(s) for s in profile["skills"]) == 120
    assert len(profile["resume_text"]) == 2500
    # Only repos with a name or description survive; 2 entries qualify.
    assert len(profile["repositories"]) == 2
    assert profile["repositories"][0]["name"] == "repo-a"
    assert len(profile["repositories"][0]["description"]) == 300
    assert profile["repositories"][1]["name"] == "org/repo-b"
    assert profile["has_evidence"] is True


def test_missing_role_defaults_and_no_evidence():
    profile = qg.normalize_candidate_profile()
    assert profile["role"] == "Software Engineer"
    assert profile["has_evidence"] is False
    assert "NO VERIFIED EVIDENCE" in qg._evidence_digest(profile)


def test_deterministic_bank_composition():
    with_repos = qg.generate_adaptive_questions(
        role="Frontend Engineer",
        skills=["React"],
        repositories=[{"name": "dashboard", "language": "JavaScript"}],
    )
    assert len(with_repos["questions"]) == 5
    assert with_repos["provider_used"] == "deterministic"
    assert with_repos["grounded"] is True
    kinds = [q["kind"] for q in with_repos["questions"]]
    assert kinds.count("deep_dive") == 2
    assert kinds.count("domain") == 2
    assert kinds.count("behavioral") == 1
    # Deep dives cite the actual repository name.
    assert any("dashboard" in q["question"] for q in with_repos["questions"])
    # Every question carries evaluation criteria for the UI.
    assert all(q["expected_points"] for q in with_repos["questions"])


def test_deterministic_bank_without_any_evidence():
    pack = qg.generate_adaptive_questions()
    assert len(pack["questions"]) == 5
    assert pack["grounded"] is False
    text = " ".join(q["question"] for q in pack["questions"]).lower()
    # No invented repository or file references when we know nothing.
    assert "your repository" not in text
    assert "your most substantial repository" not in text


def test_role_hints_change_domain_content():
    frontend = qg.generate_adaptive_questions(role="Frontend React Engineer", skills=["React"])
    devops = qg.generate_adaptive_questions(role="DevOps Engineer", skills=["Docker"])
    fe_text = " ".join(q["question"] for q in frontend["questions"])
    do_text = " ".join(q["question"] for q in devops["questions"])
    assert frontend["target_role"] == "Frontend React Engineer"
    assert devops["target_role"] == "DevOps Engineer"
    assert fe_text != do_text


def test_quota_trims_and_interleaves():
    profile = qg.normalize_candidate_profile(
        role="Backend Engineer", skills=["Node.js"], repositories=[{"name": "api"}]
    )
    noisy = [
        {"kind": "deep_dive", "question": f"Explain your repository module {i} in detail."}
        for i in range(5)
    ] + [
        {"kind": "domain", "question": f"How would you scale the API tier {i}?"}
        for i in range(4)
    ] + [
        {"kind": "behavioral", "question": f"Describe incident number {i} you owned."}
        for i in range(3)
    ]

    selected = qg.enforce_quota(noisy, profile)

    assert len(selected) == 5
    assert sum(1 for q in selected if q["kind"] == "deep_dive") == 2
    assert sum(1 for q in selected if q["kind"] == "domain") == 2
    assert sum(1 for q in selected if q["kind"] == "behavioral") == 1
    # Buckets interleave: deep dive, domain, behavioral, deep dive, domain.
    assert [q["kind"] for q in selected] == [
        "deep_dive",
        "domain",
        "behavioral",
        "deep_dive",
        "domain",
    ]
    # ids are unique so React keys and per-question reporting stay stable.
    assert len({q["id"] for q in selected}) == 5


def test_ungrounded_questions_are_rejected():
    # No evidence at all: a repo-referencing deep dive must not survive.
    empty = qg.normalize_candidate_profile()
    fabricated = [
        {"kind": "deep_dive", "question": "Walk me through your repository architecture and its modules."},
        {"kind": "deep_dive", "question": "Explain the design of your codebase in this project."},
        {"kind": "domain", "question": "How do you index a database for a service under load?"},
    ]
    selected = qg.enforce_quota(fabricated, empty)
    assert all("your repository" not in q["question"].lower() for q in selected)
    assert all("your codebase" not in q["question"].lower() for q in selected)
    # Backfill still delivers the full set.
    assert len(selected) == 5

    # Skills but no repositories: repo claims are still fabrication.
    skills_only = qg.normalize_candidate_profile(skills=["React"])
    repo_claim = qg.enforce_quota(
        [
            {"kind": "deep_dive", "question": "Describe the caching layer in your repository service."},
            {"kind": "domain", "question": "How would you scale a read-heavy API tier?"},
        ],
        skills_only,
    )
    assert all("your repository" not in q["question"].lower() for q in repo_claim)
    assert len(repo_claim) == 5


def test_malformed_model_output_is_tolerated():
    profile = qg.normalize_candidate_profile(
        role="ML Engineer", skills=["PyTorch"], repositories=[{"name": "vision"}]
    )
    junk = [
        None,
        "not a dict",
        {"kind": "unknown_bucket", "question": "Something unrelated entirely?"},
        {"kind": "deep_dive", "question": "Too short"},
        {"kind": "deep_dive", "question": "Explain the training loop inside your repository vision project."},
    ]
    selected = qg.enforce_quota(junk, profile)
    assert len(selected) == 5
    assert all(q["question"] and len(q["question"]) >= 15 for q in selected)


def test_offline_generation_when_llm_unavailable():
    _reset_llm_env()
    saved = qg._try_llm
    qg._try_llm = lambda profile: None
    try:
        pack = qg.generate_adaptive_questions(role="Data Engineer", skills=["Spark"])
        assert pack["provider_used"] == "deterministic"
        assert len(pack["questions"]) == 5
        assert pack["evidence_summary"]["skill_count"] == 1
    finally:
        qg._try_llm = saved


def test_llm_response_used_and_grounded():
    _reset_llm_env()
    profile = qg.normalize_candidate_profile(
        role="Frontend Engineer", skills=["React"], repositories=[{"name": "storefront"}]
    )
    llm_output = [
        {
            "kind": "deep_dive",
            "category": "Your Storefront Code",
            "question": "In storefront, how is checkout state shared between components?",
            "context": "storefront repo",
            "expected_points": ["State ownership", "Re-render cost"],
            "difficulty": "hard",
        },
        {
            "kind": "deep_dive",
            "question": "Which repository module in your codebase would you test first?",
        },
        {
            "kind": "domain",
            "question": "How would you keep a React SPA fast as the bundle grows?",
            "expected_points": ["Code splitting", "Bundle budget"],
        },
        {"kind": "domain", "question": "How do you debug a slow API response end to end?"},
        {"kind": "behavioral", "question": "Tell me about a production incident you owned."},
    ]

    saved = qg._try_llm
    qg._try_llm = lambda p: llm_output
    try:
        pack = qg.generate_adaptive_questions(
            role="Frontend Engineer",
            skills=["React"],
            repositories=[{"name": "storefront"}],
        )
        assert pack["provider_used"] == "llm"
        assert len(pack["questions"]) == 5
        # The model dropped expected_points; defaults are substituted.
        assert all(q["expected_points"] for q in pack["questions"])
        # Ids are generated, not trusted from the model.
        assert all(q["id"].startswith("adp-") for q in pack["questions"])
    finally:
        qg._try_llm = saved


def test_prompt_requires_quota_and_forbids_invention():
    profile = qg.normalize_candidate_profile(role="Rust Systems Engineer", skills=["Rust"])
    prompt = qg._build_prompt(profile)
    assert '2 of kind "deep_dive"' in prompt
    assert '2 of kind "domain"' in prompt
    assert '1 of kind "behavioral"' in prompt
    assert "Rust" in prompt
    assert "do NOT invent" in prompt


def run_all():
    failures = []
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    for test in tests:
        # Clear provider keys before every test: these suites must exercise the
        # deterministic path, never make billable network calls.
        _reset_llm_env()
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