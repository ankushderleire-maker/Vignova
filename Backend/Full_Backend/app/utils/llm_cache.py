"""
Shared in-memory LLM response cache.

Keyed by a SHA-256 digest of caller-supplied inputs so identical prompts
never hit the Gemini API twice within the TTL window.

Usage:
    from app.utils.llm_cache import llm_cache

    cached = llm_cache.get("interview_questions", job_title, jd_text[:500])
    if cached is not None:
        return cached
    result = call_gemini(...)
    llm_cache.set("interview_questions", result, job_title, jd_text[:500])
"""

import hashlib
import logging
import time
from threading import Lock
from typing import Any, Optional

logger = logging.getLogger("llm_cache")

# Default TTLs per cache namespace (seconds)
_DEFAULT_TTL: dict[str, int] = {
    "interview_questions": 86_400,   # 24 h — same job, same questions
    "ats_enhance":         3_600,    # 1 h  — deterministic given same inputs
    "resume_parse":        3_600,    # 1 h  — same PDF bytes = same parse
}
_FALLBACK_TTL = 3_600


class _LLMCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float]] = {}
        self._lock = Lock()

    def _key(self, namespace: str, *parts: str) -> str:
        raw = namespace + "|" + "|".join(str(p) for p in parts)
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, namespace: str, *key_parts: str) -> Optional[Any]:
        k = self._key(namespace, *key_parts)
        with self._lock:
            entry = self._store.get(k)
            if entry is None:
                return None
            value, expires_at = entry
            if time.time() > expires_at:
                del self._store[k]
                return None
            logger.debug("LLM cache HIT  namespace=%s", namespace)
            return value

    def set(self, namespace: str, value: Any, *key_parts: str) -> None:
        k = self._key(namespace, *key_parts)
        ttl = _DEFAULT_TTL.get(namespace, _FALLBACK_TTL)
        with self._lock:
            self._store[k] = (value, time.time() + ttl)
        logger.debug("LLM cache SET  namespace=%s ttl=%ds", namespace, ttl)

    def evict_expired(self) -> int:
        now = time.time()
        with self._lock:
            stale = [k for k, (_, exp) in self._store.items() if now > exp]
            for k in stale:
                del self._store[k]
        return len(stale)

    @property
    def size(self) -> int:
        return len(self._store)


llm_cache = _LLMCache()
