"""Thread-safe in-memory cache for the skin catalog fetched from bymykel's API."""
import time
import threading
import logging
from typing import Any

import requests

logger = logging.getLogger(__name__)

_BYMYKEL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en'

_store: dict[str, dict] = {}
_lock = threading.Lock()


def _fetch(url: str, ttl: int) -> Any:
    with _lock:
        entry = _store.get(url)
        if entry and (time.time() - entry['ts']) < ttl:
            return entry['data']

    logger.info('Fetching catalog from %s', url)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    with _lock:
        _store[url] = {'data': data, 'ts': time.time()}

    return data


def get_skins(ttl: int = 3600) -> list:
    return _fetch(f'{_BYMYKEL}/skins.json', ttl)


def get_knives(ttl: int = 3600) -> list:
    return _fetch(f'{_BYMYKEL}/skins.json', ttl)


def get_gloves(ttl: int = 3600) -> list:
    return _fetch(f'{_BYMYKEL}/skins.json', ttl)


def get_agents(ttl: int = 3600) -> list:
    return _fetch(f'{_BYMYKEL}/agents.json', ttl)


def get_stickers(ttl: int = 3600) -> list:
    return _fetch(f'{_BYMYKEL}/stickers.json', ttl)
