# MP3 Batch Fetch + Transcode Design

**Goal**
Build a Node.js script that reads an Excel file of `track_content_id` + `File rename`, batches rows in groups of 100, processes 5 content IDs concurrently, fetches media URLs via Solr and MDN APIs, downloads the audio, transcodes it to 30s PCM A-law, and saves the output file in `~/Downloads`. Missing Solr strings are logged and skipped.

## Inputs
- Excel `.xlsx` file with columns:
  - `track_content_id` (Column A)
  - `File rename` (Column B)
- Config via `.env`

## Outputs
- Transcoded audio files saved to `OUTPUT_DIR` (default `~/Downloads`).
- Missing Solr string entries appended to `MISSING_LOG_PATH` (default `~/Downloads/output.txt`).
- Console progress logs per batch: "First lot of 100 content id's processed successfully", then "Second lot...", etc.

## Configuration (env)
- `EXCEL_PATH` (absolute or repo-relative path to `.xlsx`)
- `BATCH_SIZE` (default 100)
- `CONCURRENCY` (default 5)
- `SOLR_BASE_URL` (default `http://solr.hungama.com/solr/music/select`)
- `SOLR_USERNAME`, `SOLR_PASSWORD`
- `MEDIA_SUFFIXES` (default `_320.mp3,_256.mp3,_128.mp3`)
- `MEDIA_URL_PREFIX` (default `https://media.hungama.co`)
- `MDN_BASE_URL` (default `http://mdn.hungama.com/streaming`)
- `MDN_AUTH_HEADER` (full Authorization header value)
- `MDN_QUERY_STRING` (default `duration=PT24H0M0S&cdn=s3&agent=application&cms=ms2&protocol=filedl`)
- `OUTPUT_DIR` (default `~/Downloads`)
- `OUTPUT_EXT` (default `wav`)
- `MISSING_LOG_PATH` (default `~/Downloads/output.txt`)
- `FFMPEG_PATH` (default `ffmpeg`)
- `FFMPEG_ARGS` (default `-t 00:00:30.0 -ar 8000 -ac 1 -c:a pcm_alaw`)

## Processing Flow
1. Load Excel and map rows by header names.
2. Split rows into batches of `BATCH_SIZE`.
3. For each batch, process rows with concurrency limit `CONCURRENCY`.
4. For each content ID:
   - Call Solr API with basic auth.
   - Search response text for `MEDIA_URL_PREFIX` + preferred suffix order from `MEDIA_SUFFIXES`.
   - If none found, append a clear line to `MISSING_LOG_PATH`, then skip to next ID.
   - If found, extract the numeric token before `|https:`.
   - Call MDN API with content ID + fixed `4` + extracted token, using `MDN_AUTH_HEADER`.
   - Extract the first public URL from response.
   - Download to temp file, transcode via ffmpeg, write to `OUTPUT_DIR` using `File rename` as base name.
   - Delete temp file.
5. After each batch, log the "lot" completion message.

## Error Handling & Logging
- Missing Solr media string: log to `MISSING_LOG_PATH` with content ID and file rename, continue.
- API errors, download failures, or ffmpeg errors: log to console and to `MISSING_LOG_PATH` with `ERROR` prefix, continue.
- Invalid or missing rows are skipped with a console warning.

## Testing
- Unit tests for Solr media string selection, MDN URL extraction, ordinal lot labels, and concurrency limiter.
- Use Node's built-in test runner (`node --test`).

## Non-Goals
- SFTP upload (to be added later).
- Saving raw input media (only temporary file is used, then deleted).
