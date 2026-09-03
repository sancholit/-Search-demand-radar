#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib import request, error

BASE_URL = "https://searchapi.api.cloud.yandex.net/v2/wordstat"
ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "yandex_seeds.json"
STATUS = ROOT / "data" / "source_status.json"


def msk_now():
    return datetime.now(timezone(timedelta(hours=3)))


def api_post(endpoint, payload, api_key):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = request.Request(
        f"{BASE_URL}/{endpoint}",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Api-Key {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Yandex API HTTP {exc.code}: {detail}") from exc


def with_folder(payload, folder_id):
    if folder_id:
        payload["folderId"] = folder_id
    return payload


def get_top(phrase, cfg, api_key, folder_id):
    return api_post(
        "topRequests",
        with_folder(
            {
                "phrase": phrase,
                "numPhrases": str(cfg.get("top_num_phrases", 50)),
                "devices": cfg.get("devices", ["DEVICE_ALL"]),
            },
            folder_id,
        ),
        api_key,
    )


def get_daily_dynamics(phrase, cfg, api_key, folder_id):
    today = msk_now().date()
    to_date = today - timedelta(days=1)
    from_date = to_date - timedelta(days=59)
    return api_post(
        "dynamics",
        with_folder(
            {
                "phrase": phrase,
                "period": "PERIOD_DAILY",
                "fromDate": f"{from_date.isoformat()}T00:00:00Z",
                "toDate": f"{to_date.isoformat()}T23:59:59Z",
                "devices": cfg.get("devices", ["DEVICE_ALL"]),
            },
            folder_id,
        ),
        api_key,
    )


def get_regions(phrase, cfg, api_key, folder_id):
    return api_post(
        "regions",
        with_folder(
            {
                "phrase": phrase,
                "region": "REGION_REGIONS",
                "devices": cfg.get("devices", ["DEVICE_ALL"]),
            },
            folder_id,
        ),
        api_key,
    )


def write_status(status, message, retrieved_at=None):
    STATUS.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "yandex_wordstat": {
            "status": status,
            "market": "RU",
            "source_type": "official_api",
            "retrieved_at": retrieved_at,
            "message": message,
        },
        "google": {
            "status": "deferred",
            "message": "Google integration intentionally postponed; Yandex-only phase.",
        },
    }
    STATUS.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    api_key = os.environ.get("YANDEX_SEARCH_API_KEY")
    folder_id = os.environ.get("YANDEX_FOLDER_ID", "").strip()
    if not api_key:
        write_status("not_connected", "Missing YANDEX_SEARCH_API_KEY secret.")
        print("Missing YANDEX_SEARCH_API_KEY", file=sys.stderr)
        return 2

    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    phrases = cfg.get("phrases", [])
    if not phrases:
        raise RuntimeError("config/yandex_seeds.json contains no phrases")

    retrieved_at = msk_now().isoformat()
    snapshot = {
        "market": "RU",
        "source": "Yandex Search API / Wordstat",
        "source_type": "official_api",
        "retrieved_at": retrieved_at,
        "mode": cfg.get("mode", "validation_test"),
        "phrases": [],
    }

    try:
        for phrase in phrases:
            item = {"phrase": phrase, "top": get_top(phrase, cfg, api_key, folder_id)}
            if cfg.get("collect_daily_dynamics", True):
                item["daily_dynamics"] = get_daily_dynamics(phrase, cfg, api_key, folder_id)
            if cfg.get("collect_regions", False):
                item["regions"] = get_regions(phrase, cfg, api_key, folder_id)
            snapshot["phrases"].append(item)
    except Exception as exc:
        write_status("error", str(exc), retrieved_at)
        raise

    day = msk_now().date().isoformat()
    out_dir = ROOT / "data" / "raw" / day
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "yandex_wordstat.json"
    out_file.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    write_status("ok", f"Collected {len(snapshot['phrases'])} validation phrases.", retrieved_at)
    print(out_file)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
