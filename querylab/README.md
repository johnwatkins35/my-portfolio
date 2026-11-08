# QueryLab

Ask a question in plain language. QueryLab writes one SQLite SELECT, runs it, and shows the rows.

The CSV or database stays on this PC, in the `data` folder next to this file. Ollama on this PC writes the SQL. You can edit that SQL and run it again. Run SQL still works when Ollama is closed.

## Start

Double-click `start_querylab.cmd` in this folder, or run:

```powershell
.\start_querylab.cmd
```

Python opens http://127.0.0.1:8765/

Leave the window open while you use QueryLab. Press Ctrl+C in that window when you are done.

## Load data

- **Sample.** Fictional help-desk tickets and the technician on each ticket.
- **CSV.** One file becomes one table. You can upload several CSVs together. A `.tsv` file works too.
- **SQLite.** Upload one `.db`, `.sqlite`, or `.sqlite3` file. QueryLab copies it into `data` and leaves the original file where it was. Close the file in other programs first so the copy includes the latest rows.

An Excel workbook needs Save As, CSV, before upload. Files over 80 MB are refused.

## Ollama

The app lists the models already installed. It starts on `llama3:latest` when that model is present.

```powershell
ollama pull llama3
```

The first question loads the model and can take a minute. `gemma3:4b` is the faster option on this PC.

## Write-up practice

After the rows appear, write the finding in your own words. A finished finding names the number, the group, and which rows were included. Save stores the draft in `data`. Download writes `querylab-writeup.md`.

## What a question is allowed to do

Each generated query is one read-only SELECT. QueryLab rejects a second statement and any insert, update, delete, or schema change. Results stop at 500 rows. A query that runs longer than 20 seconds is stopped.

Uploaded files and the working database are in `data`. That folder stays on this PC and is not part of the project source.
