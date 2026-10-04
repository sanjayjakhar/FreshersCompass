"""
Shared LLM transport with a circuit breaker (#29).

Every feature in this service used to hand-roll its own Gemini-then-Groq loop.
That produced three problems this module exists to remove:

1. No circuit breaker. When a provider is unreachable or the API key is wrong,
   each request pays the full connect timeout again for every model in the
   list. A dead provider is retried on every single call until the user gives up.
2. No shared offline signal. Services could not tell the UI that what the user
   is reading was synthesised, so "Offline Mode Active" was impossible to show
   honestly.
3. Inconsistent failure semantics. Some helpers returned an error *string* as if
   it were an answer, others raised, and a few silently returned canned text
   without saying so.

The breaker trips after consecutive failures and stays open for a cooldown, so a
provider outage costs one timeout window instead of one per request. Callers get
either a real completion or `LLMUnavailable`, and `status()` tells the UI whether
deterministic fallback output is currently in play.

Breaker states: closed -> open -> half-open -> closed.
"""

import json
import os
import re
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Tuple

# Consecutive failures before a provider is considered down.
FAILURE_THRESHOLD = 3
# Seconds a tripped provider stays open before a single probe is allowed.
COOLDOWN_SECONDS = 90

STATE_CLOSED = "closed"
STATE_OPEN = "open"
STATE_HALF_OPEN = "half-open"


class LLMUnavailable(RuntimeError):
    """Raised when no provider can serve the request right now."""


def _classify(error: BaseException) -> str:
    """
    Bucket a provider error.

    Auth failures are worse than timeouts for our purposes: a wrong key will
    never start working, so it should trip the breaker immediately rather than
    after burning the failure threshold.
    """
    text = f"{type(error).__name__}: {error}".lower()
    if any(token in text for token in ("401", "403", "unauthorized", "forbidden", "api key not valid", "invalid api key", "permission_denied")):
        return "auth"
    if any(token in text for token in ("timeout", "timed out", "deadline", "connection", "temporarily unavailable", "503", "502", "429", "rate limit")):
        return "unavailable"
    if isinstance(error, ImportError):
        return "missing_sdk"
    return "other"


class CircuitBreaker:
    """Per-provider consecutive-failure breaker with cooldown and half-open probe."""

    def __init__(self, name: str, threshold: int = FAILURE_THRESHOLD, cooldown: int = COOLDOWN_SECONDS):
        self.name = name
        self.threshold = threshold
        self.cooldown = cooldown
        self.failures = 0
        self.opened_at: Optional[float] = None
        self.last_error: str = ""
        self.last_error_kind: str = ""
        self.lock = threading.Lock()

    @property
    def state(self) -> str:
        if self.opened_at is None:
            return STATE_CLOSED
        if (time.time() - self.opened_at) < self.cooldown:
            return STATE_OPEN
        # Cooldown elapsed: allow exactly one probe through.
        return STATE_HALF_OPEN

    @property
    def cooldown_remaining(self) -> int:
        if self.opened_at is None:
            return 0
        return max(0, int(self.cooldown - (time.time() - self.opened_at)))

    def allow(self) -> bool:
        return self.state in (STATE_CLOSED, STATE_HALF_OPEN)

    def record_success(self) -> None:
        with self.lock:
            self.failures = 0
            self.opened_at = None
            self.last_error = ""
            self.last_error_kind = ""

    def record_failure(self, error: BaseException) -> None:
        kind = _classify(error)
        with self.lock:
            self.failures += 1
            self.last_error = f"{type(error).__name__}: {error}"[:200]
            self.last_error_kind = kind
            # Transport-level and auth failures are effectively binary: the key
            # is wrong, or the provider is unreachable. Retrying the remaining
            # models on the same provider only multiplies the timeout, so trip
            # immediately and let the cooldown decide when to probe again. Only
            # ambiguous errors accumulate towards the threshold.
            if kind != "other" or self.failures >= self.threshold:
                self.opened_at = time.time()

    def snapshot(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "state": self.state,
            "consecutive_failures": self.failures,
            "cooldown_remaining_seconds": self.cooldown_remaining,
            "last_error_kind": self.last_error_kind,
            "last_error": self.last_error,
        }


class _BreakerRegistry:
    def __init__(self):
        self._breakers: Dict[str, CircuitBreaker] = {}
        self._lock = threading.Lock()

    def get(self, name: str) -> CircuitBreaker:
        with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreaker(name)
            return self._breakers[name]

    def reset(self) -> None:
        """Test seam: clears all breaker state."""
        with self._lock:
            self._breakers.clear()


BREAKERS = _BreakerRegistry()


# ---------- Provider adapters ----------

def _gemini_models() -> List[str]:
    models = [
        os.getenv("GEMINI_MODEL"),
        "gemini-2.5-flash",
        "gemini-3.8-flash",
        "gemini-2.5-flash-lite",
    ]
    seen = set()
    ordered = []
    for model in models:
        if model and model not in seen:
            seen.add(model)
            ordered.append(model)
    return ordered


def _groq_models() -> List[str]:
    models = [os.getenv("GROQ_MODEL"), "openai/gpt-oss-120b", "openai/gpt-oss-20b"]
    seen = set()
    ordered = []
    for model in models:
        if model and model not in seen:
            seen.add(model)
            ordered.append(model)
    return ordered


def _call_gemini(model: str, prompt: str, temperature: float, timeout: int, json_mode: bool) -> str:
    import google.generativeai as genai
    from app.services.gemini import init_gemini

    init_gemini()
    config = genai.GenerationConfig(temperature=temperature)
    if json_mode:
        config.response_mime_type = "application/json"

    response = genai.GenerativeModel(model).generate_content(
        prompt, generation_config=config, request_options={"timeout": timeout}
    )
    text = getattr(response, "text", None)
    if not text or not text.strip():
        raise ValueError(f"Gemini {model} returned an empty response")
    return text.strip()


def _call_groq(model: str, prompt: str, temperature: float, timeout: int, json_mode: bool) -> str:
    from groq import Groq

    client = Groq(api_key=os.getenv("GROQ_API_KEY"), timeout=float(timeout))
    completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a precise technical assistant. "
                + ("Return STRICTLY valid JSON with no markdown fences." if json_mode else ""),
            },
            {"role": "user", "content": prompt},
        ],
        model=model,
        temperature=temperature,
        max_tokens=1200,
    )
    text = completion.choices[0].message.content
    if not text or not text.strip():
        raise ValueError(f"Groq {model} returned an empty response")
    return text.strip()


PROVIDERS: List[Dict[str, Any]] = [
    {
        "name": "gemini",
        "label": "Google Gemini",
        "api_key_env": "GEMINI_API_KEY",
        "models": _gemini_models,
        "call": _call_gemini,
    },
    {
        "name": "groq",
        "label": "Groq",
        "api_key_env": "GROQ_API_KEY",
        "models": _groq_models,
        "call": _call_groq,
    },
]


def _strip_fences(text: str) -> str:
    """Models wrap JSON in markdown fences even when asked not to."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
        cleaned = re.sub(r"```$", "", cleaned).strip()
    return cleaned


def complete(
    prompt: str,
    *,
    temperature: float = 0.3,
    timeout: int = 12,
    json_mode: bool = False,
    prefer: Optional[List[str]] = None,
) -> Tuple[str, str]:
    """
    Run a completion against the configured providers in order.

    Returns (text, provider_label). Raises `LLMUnavailable` when every provider
    is unconfigured, tripped, or failed - callers are expected to fall back to
    deterministic synthesis rather than surfacing an error to the user.
    """
    order = [p for p in PROVIDERS if not prefer or p["name"] in prefer] or PROVIDERS
    attempts: List[str] = []

    for provider in order:
        if not os.getenv(provider["api_key_env"]):
            attempts.append(f"{provider['name']}: no API key configured")
            continue

        breaker = BREAKERS.get(provider["name"])
        if not breaker.allow():
            attempts.append(
                f"{provider['name']}: circuit open for another {breaker.cooldown_remaining}s"
            )
            continue

        for model in provider["models"]():
            try:
                raw = provider["call"](model, prompt, temperature, timeout, json_mode)
                breaker.record_success()
                # Normalise here rather than trusting each adapter: a stray
                # newline or fence would otherwise reach the caller verbatim.
                text = _strip_fences(raw).strip() if json_mode else raw.strip()
                return text, f"{provider['label']} ({model})"
            except Exception as err:  # noqa: BLE001 - breaker must see everything
                kind = _classify(err)
                breaker.record_failure(err)
                attempts.append(f"{provider['name']}/{model}: {kind}")
                print(f"[LLM] {provider['label']} {model} notice: {err}")
                # Only an ambiguous failure is worth retrying on another model of
                # the same provider. A timeout, auth rejection or missing SDK
                # will fail identically for every model, so stop here instead of
                # paying the timeout again per model.
                if kind != "other" or breaker.state != STATE_CLOSED:
                    break

    raise LLMUnavailable("; ".join(attempts) or "no LLM providers available")


def complete_json(
    prompt: str,
    *,
    temperature: float = 0.3,
    timeout: int = 12,
    unwrap_keys: Optional[List[str]] = None,
) -> Tuple[Any, str]:
    """
    `complete` with JSON parsing, tolerant of fenced output and wrapped arrays.

    A malformed body is treated as a provider failure so the breaker still
    trips instead of the request retrying the same broken prompt forever.
    """
    text, provider = complete(prompt, temperature=temperature, timeout=timeout, json_mode=True)

    try:
        data = json.loads(text)
    except json.JSONDecodeError as err:
        breaker_hint = f"invalid JSON from {provider}"
        print(f"[LLM] {breaker_hint}: {err}")
        raise ValueError(breaker_hint) from err

    if isinstance(data, dict) and unwrap_keys:
        for key in unwrap_keys:
            if isinstance(data.get(key), list):
                return data[key], provider
    return data, provider


def offline_mode() -> bool:
    """
    True when no provider could serve a request right now.

    Used to label deterministic output as such in API responses and to drive the
    UI badge, so a user is never shown synthetic content without being told.
    """
    for provider in PROVIDERS:
        if os.getenv(provider["api_key_env"]) and BREAKERS.get(provider["name"]).allow():
            return False
    return True


def status() -> Dict[str, Any]:
    """Payload backing the UI offline badge and the /llm/status endpoint."""
    providers = []
    for provider in PROVIDERS:
        configured = bool(os.getenv(provider["api_key_env"]))
        providers.append(
            {
                **BREAKERS.get(provider["name"]).snapshot(),
                "configured": configured,
                "label": provider["label"],
            }
        )

    return {
        "offline_mode": offline_mode(),
        "providers": providers,
        "threshold": FAILURE_THRESHOLD,
        "cooldown_seconds": COOLDOWN_SECONDS,
    }