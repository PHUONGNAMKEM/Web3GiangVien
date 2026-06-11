"""
Theo dõi tiến độ phân tích PhoBERT theo job_id (in-memory, thread-safe).
Frontend poll endpoint /analyze-progress/{job_id} để vẽ thanh % thật.
"""
import threading
import time

_progress: dict[str, dict] = {}
_lock = threading.Lock()

# Tự dọn job cũ quá 5 phút để tránh rò rỉ bộ nhớ
_TTL_SECONDS = 300


def _purge_locked():
    now = time.time()
    stale = [k for k, v in _progress.items() if now - v.get('_ts', now) > _TTL_SECONDS]
    for k in stale:
        _progress.pop(k, None)


def init_job(job_id: str | None, total: int, chunks: int = 0):
    if not job_id:
        return
    with _lock:
        _purge_locked()
        _progress[job_id] = {
            'status': 'running',
            'stage': 'embedding_chunks',
            'current': 0,
            'total': max(1, total),
            'percent': 0,
            'chunks': chunks,
            '_ts': time.time(),
        }


def update_job(job_id: str | None, current: int | None = None, stage: str | None = None):
    if not job_id:
        return
    with _lock:
        p = _progress.get(job_id)
        if not p:
            return
        if current is not None:
            p['current'] = current
        if stage is not None:
            p['stage'] = stage
        p['percent'] = min(99, int(p['current'] / p['total'] * 100))
        p['_ts'] = time.time()


def finish_job(job_id: str | None):
    if not job_id:
        return
    with _lock:
        p = _progress.get(job_id)
        if p:
            p['status'] = 'done'
            p['stage'] = 'done'
            p['percent'] = 100
            p['_ts'] = time.time()


def get_job(job_id: str) -> dict:
    with _lock:
        p = _progress.get(job_id)
        if not p:
            return {'status': 'unknown', 'percent': 0, 'current': 0, 'total': 1, 'chunks': 0, 'stage': 'unknown'}
        return {k: v for k, v in p.items() if not k.startswith('_')}
