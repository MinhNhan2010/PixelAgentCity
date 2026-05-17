"""
error_handler.py — PAC Error/Timer/Perf/Storage Utilities
=========================================================
Python parity for error-handler.js non-browser utility logic.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime
import json
import threading
import time
import traceback
from functools import wraps
from typing import Any, Callable, Dict, List, Optional

PAC_VERSION = "1.1.0"


@dataclass
class ErrorEntry:
    type: str
    message: str
    stack: str = ""
    timestamp: str = ""

    def __post_init__(self) -> None:
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, str]:
        return asdict(self)


class ErrorHandler:
    def __init__(self, max_errors: int = 50):
        self.errors: List[ErrorEntry] = []
        self.max_errors = max_errors

    def log(self, type_: str, message: str, error: Optional[BaseException] = None) -> Dict[str, str]:
        stack = "".join(traceback.format_exception(type(error), error, error.__traceback__)) if error else ""
        entry = ErrorEntry(type_, message, stack)
        self.errors.append(entry)
        if len(self.errors) > self.max_errors:
            self.errors = self.errors[-self.max_errors:]
        return entry.to_dict()

    def get_errors(self) -> List[Dict[str, str]]:
        return [e.to_dict() for e in self.errors]

    def clear_errors(self) -> None:
        self.errors = []


error_handler = ErrorHandler()


def safe(fn: Callable[..., Any], context: str = "unknown") -> Callable[..., Any]:
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # JS parity: swallow and return null/None
            error_handler.log("caught", f"[{context}] {exc}", exc)
            return None
    return wrapper


class TimerManager:
    def __init__(self):
        self._intervals: Dict[int, Dict[str, Any]] = {}
        self._timeouts: Dict[int, Dict[str, Any]] = {}
        self._next_id = 1

    def set_timeout(self, fn: Callable[[], Any], ms: int, name: str = "") -> int:
        track_id = self._next_id
        self._next_id += 1

        def run_and_clear() -> None:
            try:
                fn()
            finally:
                self._timeouts.pop(track_id, None)

        timer = threading.Timer(ms / 1000, run_and_clear)
        self._timeouts[track_id] = {"id": timer, "name": name, "ms": ms, "created": int(time.time() * 1000)}
        timer.daemon = True
        timer.start()
        return track_id

    def clear_timeout(self, track_id: int) -> None:
        entry = self._timeouts.pop(track_id, None)
        if entry:
            entry["id"].cancel()

    def set_interval(self, fn: Callable[[], Any], ms: int, name: str = "") -> int:
        track_id = self._next_id
        self._next_id += 1
        stopped = threading.Event()

        def loop() -> None:
            while not stopped.wait(ms / 1000):
                fn()

        thread = threading.Thread(target=loop, daemon=True)
        self._intervals[track_id] = {"id": thread, "stop": stopped, "name": name, "ms": ms, "created": int(time.time() * 1000)}
        thread.start()
        return track_id

    def clear_interval(self, track_id: int) -> None:
        entry = self._intervals.pop(track_id, None)
        if entry:
            entry["stop"].set()

    def clear_all(self) -> None:
        for track_id in list(self._intervals):
            self.clear_interval(track_id)
        for track_id in list(self._timeouts):
            self.clear_timeout(track_id)

    def get_status(self) -> Dict[str, Any]:
        return {
            "activeIntervals": len(self._intervals),
            "activeTimeouts": len(self._timeouts),
            "details": [e.get("name") or f"interval-{i}" for i, e in self._intervals.items()],
        }


class PerfUtils:
    def __init__(self):
        self._last_calls: Dict[str, float] = {}

    def throttle(self, fn: Callable[..., Any], ms: int, key: str = "default") -> Callable[..., Any]:
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            now = time.time() * 1000
            if now - self._last_calls.get(key, 0) >= ms:
                self._last_calls[key] = now
                return fn(*args, **kwargs)
            return None
        return wrapped


class StorageUtils:
    def __init__(self):
        self._store: Dict[str, str] = {}

    def get(self, key: str, fallback: Any = None) -> Any:
        try:
            raw = self._store.get(key)
            return json.loads(raw) if raw is not None else fallback
        except Exception as exc:
            error_handler.log("storage", f"Failed to read '{key}': {exc}", exc)
            return fallback

    def set(self, key: str, value: Any) -> bool:
        try:
            self._store[key] = json.dumps(value)
            return True
        except Exception as exc:
            error_handler.log("storage", f"Failed to write '{key}': {exc} (possibly full)", exc)
            return False

    def remove(self, key: str) -> None:
        self._store.pop(key, None)

    def get_usage(self) -> Dict[str, str]:
        total = sum(len(v) for v in self._store.values())
        used_bytes = total * 2
        return {
            "usedBytes": used_bytes,
            "usedKB": f"{used_bytes / 1024:.1f}",
            "maxKB": "5120",
            "pct": f"{(used_bytes / (5 * 1024 * 1024)) * 100:.1f}",
        }
