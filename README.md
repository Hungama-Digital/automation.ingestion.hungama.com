# automation.ingestion.hungama.com
This repository is created for the Ingestion automation work flow share by Talha

## Usage

1. Put the Excel file here: `input/track_ids.xlsx` (or update `EXCEL_PATH` in `.env`).
2. Copy `.env.example` to `.env` and fill in the auth values.
3. Install dependencies: `npm install`
4. Run: `npm start`

Outputs are written to `~/Downloads` and missing entries are logged to `~/Downloads/output.txt`.
