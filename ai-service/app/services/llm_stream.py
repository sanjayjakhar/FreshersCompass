"""Streaming counterpart to the buffered provider chain in rag_service.

The buffered path can only answer once the provider has finished generating, so
a multi-paragraph architecture answer is a 3-8 second blank wait. This module
yields deltas as the provider produces them, which is what makes time-to-first
token small enough to feel responsive.

The provider order (Gemini, then Groq) mirrors execute_codebase_llm on purpose:
streaming must not quietly become a different, worse-tuned feature.
"""
from __future__ import annotations

import os
from typing import Any, Dict, Iterator, List

GROQ_SYSTEM_PROMPT = (
    "You are an expert technical AI Codebase Assistant. Answer developer "
    "questions accurately and specifically based on the provided code snippets."
)

UNAVAILABLE_MESSAGE = (
    "Couldn't generate an answer from the codebase at this time due to LLM "
    "provider availability. Please verify API keys or try again in a moment."
)


def _unique_models(env_var: str, default: str, fallbacks: List[str]) -> List[str]:
    """Model preference list, de-duplicated, env override first."""
    ordered = [os.getenv(env_var) or default, *fallbacks]
    seen = set()
    models = []
    for name in ordered:
        if name and name not in seen:
            seen.add(name)
            models.append(name)
    return models


def _gemini_models() -> List[str]:
    return _unique_models(
        "GEMINI_MODEL",
        "gemini-2.5-flash",
        ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-2.5-flash-lite"],
    )


def _groq_models() -> List[str]:
    return _unique_models(
        "GROQ_MODEL",
        "openai/gpt-oss-120b",
        ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"],
    )


def stream_codebase_answer(prompt: str, timeout: int = 12) -> Iterator[Dict[str, Any]]:
    """Yield `{"type": "delta", "text": ...}` events plus exactly one terminal event.

    Terminal event is `{"type": "model", "label": ...}` on success or
    `{"type": "error", "message": ...}` when no provider could answer.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            import google.generativeai as genai
            from app.services.gemini import init_gemini

            init_gemini()
        except Exception as g_err:
            print(f"[RAG Q&A stream] Gemini initialization notice: {g_err}")
        else:
            for model_name in _gemini_models():
                emitted = False
                label = f"Google Gemini ({model_name})"
                try:
                    model = genai.GenerativeModel(model_name)
                    stream = model.generate_content(
                        prompt,
                        generation_config=genai.GenerationConfig(temperature=0.2),
                        request_options={"timeout": timeout},
                        stream=True,
                    )
                    for chunk in stream:
                        piece = getattr(chunk, "text", None)
                        if piece:
                            emitted = True
                            yield {"type": "delta", "text": piece}
                except Exception as m_err:
                    print(f"[RAG Q&A stream] Gemini {model_name} notice: {m_err}")
                    # Text already on the user's screen cannot be un-sent. Swapping
                    # providers mid-answer would append a second, unrelated answer
                    # to it, so finish with what we have and label it partial.
                    if emitted:
                        yield {"type": "model", "label": f"{label} (partial)"}
                        return
                    continue

                if emitted:
                    yield {"type": "model", "label": label}
                    return

    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            from groq import Groq

            client = Groq(api_key=groq_key, timeout=float(timeout))
        except Exception as grq_err:
            print(f"[RAG Q&A stream] Groq client error: {grq_err}")
        else:
            for model_name in _groq_models():
                emitted = False
                label = f"Groq ({model_name})"
                try:
                    stream = client.chat.completions.create(
                        messages=[
                            {"role": "system", "content": GROQ_SYSTEM_PROMPT},
                            {"role": "user", "content": prompt},
                        ],
                        model=model_name,
                        max_tokens=800,
                        temperature=0.2,
                        stream=True,
                    )
                    for chunk in stream:
                        choices = getattr(chunk, "choices", None) or []
                        if not choices:
                            continue
                        piece = getattr(choices[0].delta, "content", None)
                        if piece:
                            emitted = True
                            yield {"type": "delta", "text": piece}
                except Exception as q_err:
                    print(f"[RAG Q&A stream] Groq {model_name} notice: {q_err}")
                    if emitted:
                        yield {"type": "model", "label": f"{label} (partial)"}
                        return
                    continue

                if emitted:
                    yield {"type": "model", "label": label}
                    return

    yield {"type": "error", "message": UNAVAILABLE_MESSAGE}