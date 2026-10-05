"""Server-Sent Events helpers shared by the streaming routers.

SSE is the right transport here: the responses are one-way text, it rides on
plain HTTP (no extra dependency, no websocket handshake, survives proxies) and
the browser can consume it with a plain fetch() ReadableStream.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator, Iterator

# Proxies buffer by default, which defeats the entire point of streaming: nginx
# will hold the whole body until the upstream closes. X-Accel-Buffering: no opts
# out, and no-store stops any intermediary from caching a partial answer.
STREAM_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}

# Comment frames keep idle connections alive without being dispatched as
# messages by the browser's EventSource/fetch SSE parser.
KEEPALIVE_SECONDS = 15.0


def format_event(event: str, data: Any) -> str:
    """Serialise one SSE frame.

    newlines inside data must not break the frame, so JSON (which escapes them)
    is the only thing we ever put on the wire.
    """
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def format_comment(text: str = "keep-alive") -> str:
    return f": {text}\n\n"


_SENTINEL = object()


def _next_or_sentinel(iterator: Iterator[Any]) -> Any:
    try:
        return next(iterator)
    except StopIteration:
        return _SENTINEL


async def aiterate(iterator: Iterator[Any]) -> AsyncIterator[Any]:
    """Drive a blocking generator from async code without stalling the loop.

    The provider SDKs are synchronous. Iterating one directly inside an `async
    def` endpoint blocks the whole event loop for the duration of the answer,
    which would stall every other request this worker is serving. Each `next()`
    goes to a worker thread instead.
    """
    while True:
        item = await asyncio.to_thread(_next_or_sentinel, iterator)
        if item is _SENTINEL:
            return
        yield item