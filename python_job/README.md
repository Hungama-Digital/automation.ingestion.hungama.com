# Python Bulk Processor (Local Download Mode)

This folder contains the Python version of the job (same core flow as commit `cc263b28a62ad360675f304dc2254c190131a99c`, without SFTP).

## Folder structure

- `input/` -> put Excel file here (`.xls` or `.xlsx`)
- `logs/` -> timestamped run logs and missing-entry CSV
- `state/` -> resume checkpoint (`progress.json`)

## One-time setup

```bash
cd /Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/python_job
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill values in `.env`:
- `SOLR_USERNAME`, `SOLR_PASSWORD`
- `MDN_AUTH_HEADER`
- Keep `OUTPUT_DIR=~/Downloads` for local output

## Input file

Place your file in:

`/Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/python_job/input/`

Required columns:
- `track_content_id`
- `File rename`

Set filename in `.env`, for example:

`INPUT_FILE=./input/track_ids.xls`

## Run

```bash
cd /Users/Amol/Documents/30_sec_from_320_mp3_upload_ftp/python_job
source .venv/bin/activate
python process_tracks.py
```

## Recommended for 50k volume

- Keep `BATCH_SIZE=100`
- Keep `CONCURRENCY=5` (or reduce to `3` if machine heats)
- Keep `FFMPEG_THREADS=1` to reduce CPU pressure
- Optional: set `MAX_BATCHES_PER_RUN=50` for safer long runs; rerun command to resume automatically

## Logs and resume

For each app start, new files are created:
- `logs/run_YYYYMMDD_HHMMSS.log`
- `logs/missing_YYYYMMDD_HHMMSS.csv`

Resume checkpoint:
- `state/progress.json`

Missing/error CSV includes:
- timestamp
- logical error name
- `track_content_id`
- `file_rename`
- detail
