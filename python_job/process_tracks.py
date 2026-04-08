#!/usr/bin/env python3
import json
import os
import re
import shlex
import subprocess
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlencode

import pandas as pd
import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter

BASE_DIR = Path(__file__).resolve().parent
thread_local = threading.local()


@dataclass
class Config:
    input_file: Path
    log_dir: Path
    state_file: Path
    batch_size: int
    concurrency: int
    batch_pause_sec: float
    max_batches_per_run: int
    resume: bool
    request_timeout_sec: int
    request_retries: int
    request_retry_backoff_sec: float
    solr_base_url: str
    solr_username: str
    solr_password: str
    media_suffixes: List[str]
    media_url_prefix: str
    mdn_base_url: str
    mdn_auth_header: str
    mdn_query_string: str
    output_dir: Path
    output_ext: str
    ffmpeg_path: str
    ffmpeg_threads: int
    ffmpeg_args: List[str]


class RunLogger:
    def __init__(self, log_dir: Path):
        self._lock = threading.Lock()
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.run_id = stamp
        self.log_path = log_dir / f"run_{stamp}.log"
        self.missing_path = log_dir / f"missing_{stamp}.csv"

        log_dir.mkdir(parents=True, exist_ok=True)
        self.log_path.touch(exist_ok=True)
        with self.missing_path.open("w", encoding="utf-8") as fp:
            fp.write("timestamp,error,track_content_id,file_rename,detail\n")

    def info(self, message: str) -> None:
        line = f"{datetime.now().isoformat(timespec='seconds')} | INFO | {message}"
        with self._lock:
            with self.log_path.open("a", encoding="utf-8") as fp:
                fp.write(line + "\n")
        print(message)

    def missing(self, error: str, track_id: str, file_rename: str, detail: str = "") -> None:
        timestamp = datetime.now().isoformat(timespec="seconds")
        safe_detail = detail.replace("\n", " ").replace(",", ";")
        line = f"{timestamp},{error},{track_id},{file_rename},{safe_detail}"
        with self._lock:
            with self.missing_path.open("a", encoding="utf-8") as fp:
                fp.write(line + "\n")
            with self.log_path.open("a", encoding="utf-8") as fp:
                fp.write(f"{timestamp} | {error} | content_id={track_id} | file_name={file_rename} | {safe_detail}\n")


ORDINAL_WORDS = {
    1: "First",
    2: "Second",
    3: "Third",
    4: "Fourth",
    5: "Fifth",
    6: "Sixth",
    7: "Seventh",
    8: "Eighth",
    9: "Ninth",
    10: "Tenth",
}


def resolve_path(path_text: str) -> Path:
    candidate = Path(path_text).expanduser()
    if candidate.is_absolute():
        return candidate
    return (BASE_DIR / candidate).resolve()


def read_bool(env_name: str, default: bool) -> bool:
    raw = os.getenv(env_name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y"}


def read_int(env_name: str, default: int) -> int:
    raw = os.getenv(env_name)
    if raw is None or raw.strip() == "":
        return default
    return int(raw)


def read_optional_int(env_name: str) -> Optional[int]:
    raw = os.getenv(env_name)
    if raw is None or raw.strip() == "":
        return None
    return int(raw)


def read_float(env_name: str, default: float) -> float:
    raw = os.getenv(env_name)
    if raw is None or raw.strip() == "":
        return default
    return float(raw)


def load_config() -> Config:
    load_dotenv(BASE_DIR / ".env")

    input_file = resolve_path(os.getenv("INPUT_FILE", "./input/track_ids.xlsx"))
    log_dir = resolve_path(os.getenv("LOG_DIR", "./logs"))
    state_file = resolve_path(os.getenv("STATE_FILE", "./state/progress.json"))

    media_suffixes = [x.strip() for x in os.getenv("MEDIA_SUFFIXES", "_320.mp3,_256.mp3,_128.mp3").split(",") if x.strip()]
    ffmpeg_args = shlex.split(os.getenv("FFMPEG_ARGS", "-t 00:00:30.0 -ar 8000 -ac 1 -c:a pcm_alaw"))

    config = Config(
        input_file=input_file,
        log_dir=log_dir,
        state_file=state_file,
        batch_size=read_int("BATCH_SIZE", 100),
        concurrency=read_int("CONCURRENCY", 5),
        batch_pause_sec=read_float("BATCH_PAUSE_SEC", 0.0),
        max_batches_per_run=read_optional_int("MAX_BATCHES_PER_RUN") or 0,
        resume=read_bool("RESUME", True),
        request_timeout_sec=read_int("REQUEST_TIMEOUT_SEC", 30),
        request_retries=read_int("REQUEST_RETRIES", 2),
        request_retry_backoff_sec=read_float("REQUEST_RETRY_BACKOFF_SEC", 1.0),
        solr_base_url=os.getenv("SOLR_BASE_URL", "").strip(),
        solr_username=os.getenv("SOLR_USERNAME", "").strip(),
        solr_password=os.getenv("SOLR_PASSWORD", "").strip(),
        media_suffixes=media_suffixes,
        media_url_prefix=os.getenv("MEDIA_URL_PREFIX", "https://media.hungama.com").strip(),
        mdn_base_url=os.getenv("MDN_BASE_URL", "").strip(),
        mdn_auth_header=os.getenv("MDN_AUTH_HEADER", "").strip(),
        mdn_query_string=os.getenv("MDN_QUERY_STRING", "duration=PT24H0M0S&cdn=s3&agent=application&cms=ms2&protocol=filedl").strip(),
        output_dir=Path(os.getenv("OUTPUT_DIR", "~/Downloads")).expanduser().resolve(),
        output_ext=os.getenv("OUTPUT_EXT", "wav").strip().lstrip("."),
        ffmpeg_path=os.getenv("FFMPEG_PATH", "ffmpeg").strip(),
        ffmpeg_threads=read_int("FFMPEG_THREADS", 1),
        ffmpeg_args=ffmpeg_args,
    )

    validate_config(config)
    return config


def validate_config(config: Config) -> None:
    required = {
        "SOLR_BASE_URL": config.solr_base_url,
        "SOLR_USERNAME": config.solr_username,
        "SOLR_PASSWORD": config.solr_password,
        "MDN_BASE_URL": config.mdn_base_url,
        "MDN_AUTH_HEADER": config.mdn_auth_header,
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        raise ValueError(f"Missing required env values: {', '.join(missing)}")
    if config.batch_size <= 0:
        raise ValueError("BATCH_SIZE must be > 0")
    if config.concurrency <= 0:
        raise ValueError("CONCURRENCY must be > 0")
    if config.ffmpeg_threads <= 0:
        raise ValueError("FFMPEG_THREADS must be > 0")


def load_rows(input_file: Path) -> List[Tuple[str, str]]:
    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_file}")

    df = pd.read_excel(input_file, dtype=str)
    normalized = {str(col).strip().lower(): col for col in df.columns}

    track_col = normalized.get("track_content_id")
    rename_col = normalized.get("file rename")
    if track_col is None:
        raise ValueError("Column 'track_content_id' not found in input file")
    if rename_col is None:
        raise ValueError("Column 'File rename' not found in input file")

    rows: List[Tuple[str, str]] = []
    for _, row in df.iterrows():
        track_id = str(row.get(track_col, "") or "").strip()
        file_name = str(row.get(rename_col, "") or "").strip()
        if track_id:
            rows.append((track_id, file_name))
    return rows


def build_solr_url(base_url: str, content_id: str) -> str:
    params = {
        "indent": "true",
        "q.op": "OR",
        "q": f"id:{content_id}",
        "useParams": "",
    }
    query = urlencode(params)
    return f"{base_url}?{query}"


def select_media_string(text: str, prefix: str, suffixes: List[str]) -> Optional[str]:
    candidate_text = text.replace("\\/", "/")
    for suffix in suffixes:
        pattern = re.compile(rf"(\d+\|{re.escape(prefix)}[^\s\"']*{re.escape(suffix)})")
        match = pattern.search(candidate_text)
        if match:
            return match.group(1)
    return None


def extract_token(media_string: str) -> Optional[str]:
    match = re.search(r"(\d+)\|https:", media_string)
    return match.group(1) if match else None


def extract_first_url(text: str) -> Optional[str]:
    match = re.search(r"https?://[^\s\"']+", text)
    return match.group(0) if match else None


def build_mdn_url(base_url: str, content_id: str, token: str, query_string: str) -> str:
    clean = base_url.rstrip("/")
    if query_string:
        return f"{clean}/{content_id}/4/{token}?{query_string}"
    return f"{clean}/{content_id}/4/{token}"


def make_safe_output_name(name: str, ext: str) -> Optional[str]:
    cleaned = name.strip()
    if not cleaned:
        return None
    cleaned = cleaned.replace("/", "_").replace("\\", "_")
    if "." not in cleaned:
        return f"{cleaned}.{ext}"
    return cleaned


def get_session(concurrency: int) -> requests.Session:
    if getattr(thread_local, "session", None) is None:
        session = requests.Session()
        adapter = HTTPAdapter(pool_connections=max(10, concurrency * 4), pool_maxsize=max(10, concurrency * 4))
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        thread_local.session = session
    return thread_local.session


def request_with_retry(
    session: requests.Session,
    method: str,
    url: str,
    timeout_sec: int,
    retries: int,
    backoff_sec: float,
    **kwargs,
) -> requests.Response:
    last_exc: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            response = session.request(method=method, url=url, timeout=timeout_sec, **kwargs)
            response.raise_for_status()
            return response
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt == retries:
                break
            time.sleep(backoff_sec * (attempt + 1))
    assert last_exc is not None
    raise last_exc


def transcode_audio(config: Config, raw_file: Path, transcoded_file: Path) -> None:
    cmd = [
        config.ffmpeg_path,
        "-y",
        "-threads",
        str(config.ffmpeg_threads),
        "-i",
        str(raw_file),
        *config.ffmpeg_args,
        str(transcoded_file),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.strip()[:500]}")


def process_one_row(config: Config, logger: RunLogger, row: Tuple[str, str]) -> str:
    track_id, file_rename = row
    session = get_session(config.concurrency)

    raw_file: Optional[Path] = None
    transcoded_file: Optional[Path] = None
    try:
        solr_url = build_solr_url(config.solr_base_url, track_id)
        solr_response = request_with_retry(
            session,
            method="GET",
            url=solr_url,
            timeout_sec=config.request_timeout_sec,
            retries=config.request_retries,
            backoff_sec=config.request_retry_backoff_sec,
            auth=(config.solr_username, config.solr_password),
        )
        solr_text = solr_response.text

        media_string = select_media_string(solr_text, config.media_url_prefix, config.media_suffixes)
        if media_string is None:
            logger.missing("MISSING_MEDIA_STRING", track_id, file_rename)
            return "MISSING_MEDIA_STRING"

        token = extract_token(media_string)
        if token is None:
            logger.missing("MISSING_TOKEN", track_id, file_rename)
            return "MISSING_TOKEN"

        mdn_url = build_mdn_url(config.mdn_base_url, track_id, token, config.mdn_query_string)
        mdn_response = request_with_retry(
            session,
            method="GET",
            url=mdn_url,
            timeout_sec=config.request_timeout_sec,
            retries=config.request_retries,
            backoff_sec=config.request_retry_backoff_sec,
            headers={"Authorization": config.mdn_auth_header},
        )
        public_url = extract_first_url(mdn_response.text)
        if public_url is None:
            logger.missing("MISSING_MDN_URL", track_id, file_rename)
            return "MISSING_MDN_URL"

        output_name = make_safe_output_name(file_rename, config.output_ext)
        if output_name is None:
            logger.missing("MISSING_FILENAME", track_id, file_rename)
            return "MISSING_FILENAME"

        with tempfile.NamedTemporaryFile(prefix="raw_", suffix=".mp3", delete=False) as raw_fp:
            raw_file = Path(raw_fp.name)

        download_response = request_with_retry(
            session,
            method="GET",
            url=public_url,
            timeout_sec=config.request_timeout_sec,
            retries=config.request_retries,
            backoff_sec=config.request_retry_backoff_sec,
            stream=True,
        )
        with raw_file.open("wb") as fp:
            for chunk in download_response.iter_content(chunk_size=1024 * 128):
                if chunk:
                    fp.write(chunk)

        with tempfile.NamedTemporaryFile(prefix="transcoded_", suffix=f".{config.output_ext}", delete=False) as tr_fp:
            transcoded_file = Path(tr_fp.name)

        transcode_audio(config, raw_file, transcoded_file)

        final_path = config.output_dir / output_name
        final_path.parent.mkdir(parents=True, exist_ok=True)
        os.replace(str(transcoded_file), str(final_path))
        transcoded_file = None

        return "SUCCESS"

    except Exception as exc:  # noqa: BLE001
        logger.missing("ERROR", track_id, file_rename, str(exc))
        return "ERROR"
    finally:
        if raw_file is not None and raw_file.exists():
            raw_file.unlink(missing_ok=True)
        if transcoded_file is not None and transcoded_file.exists():
            transcoded_file.unlink(missing_ok=True)


def ordinal_word(index: int) -> str:
    if index in ORDINAL_WORDS:
        return ORDINAL_WORDS[index]
    # Fallback for higher batches (11th, 12th, etc.).
    if 10 <= (index % 100) <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(index % 10, "th")
    return f"{index}{suffix}"


def load_state(path: Path) -> Dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}


def save_state(path: Path, state: Dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2), encoding="utf-8")


def chunk_rows(rows: List[Tuple[str, str]], batch_size: int) -> List[List[Tuple[str, str]]]:
    return [rows[i : i + batch_size] for i in range(0, len(rows), batch_size)]


def main() -> None:
    config = load_config()
    started_at = time.time()

    config.log_dir.mkdir(parents=True, exist_ok=True)
    config.output_dir.mkdir(parents=True, exist_ok=True)

    logger = RunLogger(config.log_dir)

    rows = load_rows(config.input_file)
    batches = chunk_rows(rows, config.batch_size)

    summary = {
        "total": len(rows),
        "success": 0,
        "missing_media": 0,
        "missing_token": 0,
        "missing_mdn": 0,
        "missing_filename": 0,
        "error": 0,
        "unknown": 0,
    }

    start_batch_index = 0
    prior_state = load_state(config.state_file)
    prior_input_file = str(prior_state.get("input_file", ""))
    if config.resume and prior_state.get("status") in {"running", "paused"} and prior_input_file == str(config.input_file):
        last_done = int(prior_state.get("last_completed_batch", -1))
        start_batch_index = last_done + 1
        logger.info(f"Resume enabled: starting from batch {start_batch_index + 1}")

    logger.info(f"Run log: {logger.log_path}")
    logger.info(f"Missing CSV: {logger.missing_path}")
    logger.info(
        f"Loaded {len(rows)} rows across {len(batches)} lots of {config.batch_size}. Concurrency={config.concurrency}, Output={config.output_dir}"
    )
    if config.max_batches_per_run > 0:
        logger.info(f"MAX_BATCHES_PER_RUN is set to {config.max_batches_per_run}. Run will stop safely after this many lots.")

    save_state(
        config.state_file,
        {
            "status": "running",
            "run_id": logger.run_id,
            "input_file": str(config.input_file),
            "last_completed_batch": start_batch_index - 1,
            "total_batches": len(batches),
            "updated_at": datetime.now().isoformat(timespec="seconds"),
        },
    )

    max_batch_index = len(batches) - 1
    if config.max_batches_per_run > 0:
        max_batch_index = min(max_batch_index, start_batch_index + config.max_batches_per_run - 1)

    try:
        for batch_index in range(start_batch_index, max_batch_index + 1):
            batch = batches[batch_index]
            statuses: List[str] = []

            with ThreadPoolExecutor(max_workers=config.concurrency) as executor:
                futures = [executor.submit(process_one_row, config, logger, row) for row in batch]
                for future in as_completed(futures):
                    statuses.append(future.result())

            for status in statuses:
                if status == "SUCCESS":
                    summary["success"] += 1
                elif status == "MISSING_MEDIA_STRING":
                    summary["missing_media"] += 1
                elif status == "MISSING_TOKEN":
                    summary["missing_token"] += 1
                elif status == "MISSING_MDN_URL":
                    summary["missing_mdn"] += 1
                elif status == "MISSING_FILENAME":
                    summary["missing_filename"] += 1
                elif status == "ERROR":
                    summary["error"] += 1
                else:
                    summary["unknown"] += 1

            lot_number = batch_index + 1
            lot_label = ordinal_word(lot_number)
            logger.info(f"{lot_label} lot of {config.batch_size} content id's processed successfully")

            save_state(
                config.state_file,
                {
                    "status": "running",
                    "run_id": logger.run_id,
                    "input_file": str(config.input_file),
                    "last_completed_batch": batch_index,
                    "total_batches": len(batches),
                    "summary": summary,
                    "updated_at": datetime.now().isoformat(timespec="seconds"),
                },
            )

            if config.batch_pause_sec > 0:
                time.sleep(config.batch_pause_sec)

    except KeyboardInterrupt:
        logger.info("Run interrupted by user. Progress is saved and resume can continue from next lot.")
        save_state(
            config.state_file,
            {
                "status": "paused",
                "run_id": logger.run_id,
                "input_file": str(config.input_file),
                "last_completed_batch": int(load_state(config.state_file).get("last_completed_batch", -1)),
                "total_batches": len(batches),
                "summary": summary,
                "updated_at": datetime.now().isoformat(timespec="seconds"),
            },
        )
        return

    run_duration = round(time.time() - started_at, 2)
    completed_all_batches = max_batch_index >= (len(batches) - 1)

    logger.info(
        ("Run complete. " if completed_all_batches else "Run paused (MAX_BATCHES_PER_RUN reached). ")
        + f"Duration(sec): {run_duration} | "
        + f"Total rows: {summary['total']} | "
        + f"Success: {summary['success']} | "
        + f"Missing media: {summary['missing_media']} | "
        + f"Missing token: {summary['missing_token']} | "
        + f"Missing mdn: {summary['missing_mdn']} | "
        + f"Missing filename: {summary['missing_filename']} | "
        + f"Errors: {summary['error']} | "
        + f"Unknown: {summary['unknown']}"
    )

    save_state(
        config.state_file,
        {
            "status": "completed" if completed_all_batches else "paused",
            "run_id": logger.run_id,
            "input_file": str(config.input_file),
            "last_completed_batch": max_batch_index,
            "total_batches": len(batches),
            "summary": summary,
            "completed_at": datetime.now().isoformat(timespec="seconds"),
        },
    )


if __name__ == "__main__":
    main()
