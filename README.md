# automation.ingestion.hungama.com
This repository is created for the Ingestion automation work flow share by Talha

## Usage

1. Put the Excel file here: `input/track_ids.xlsx` (or update `EXCEL_PATH` in `.env`).
2. Copy `.env.example` to `.env` and fill in the auth values.
3. Install dependencies: `npm install`
4. Run: `npm start`

Outputs are written to `~/Downloads`.
Missing/error entries are logged to a timestamped file in the project `logs` folder (for example `logs/missing_entries_20260408_162530.log`).
Set `MISSING_LOG_DIR` in `.env` to choose a different log directory.
