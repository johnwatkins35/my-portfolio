"""QueryLab: plain-language questions over a CSV or SQLite file on this PC."""

from __future__ import annotations

import csv
import io
import json
import re
import sqlite3
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
DATA = ROOT / "data"
SAMPLE = ROOT / "sample"
DB_PATH = DATA / "working.sqlite"
SOURCE_PATH = DATA / "source.json"
WRITEUPS_PATH = DATA / "writeups.json"
PORT = 8765
MAX_UPLOAD = 80 * 1024 * 1024
ROW_CAP = 500
QUERY_SECONDS = 20
PREFERRED_MODELS = ("llama3:latest", "mistral:latest", "gemma3:4b")
CSV_EXT = {".csv", ".tsv"}
SQLITE_EXT = {".db", ".sqlite", ".sqlite3", ".db3"}
LOCK = threading.Lock()

SYSTEM = (
    "You translate a question into one SQLite query. "
    "Reply with JSON only, with two keys: sql and explanation. "
    "sql must be one read-only statement starting with SELECT or WITH. "
    "Use only tables and columns in the schema. "
    "Prefer explicit column names. "
    "Use SQLite functions such as COUNT, AVG, ROUND, SUM, and date. "
    "Treat blank numeric fields as missing. "
    "explanation is one short sentence in plain English. "
    "Do not include markdown."
)

IDENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]{0,62}")
INT_RE = re.compile(r"^[+-]?\d+$")
REAL_RE = re.compile(r"^[+-]?(?:\d+\.\d*|\d*\.\d+)$")
FORBIDDEN = re.compile(
    r"\b(attach|detach|pragma|load_extension|insert|update|delete|drop|"
    r"alter|create|vacuum|reindex|begin|commit|rollback|savepoint|release|"
    r"grant|revoke|analyze)\b",
    re.I,
)


class AppError(Exception):
    def __init__(self, message: str, code: int = 400):
        super().__init__(message)
        self.code = code


def remember(label: str) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    SOURCE_PATH.write_text(json.dumps({"label": label}), encoding="utf-8")


def current_label() -> str:
    if not SOURCE_PATH.exists():
        return ""
    try:
        return json.loads(SOURCE_PATH.read_text(encoding="utf-8")).get("label") or ""
    except json.JSONDecodeError:
        return ""


def sanitize(name: str, fallback: str) -> str:
    text = re.sub(r"[^A-Za-z0-9_]+", "_", (name or "").strip()).strip("_")
    if not text or text[0].isdigit():
        text = f"{fallback}_{text}" if text else fallback
    text = text[:63].strip("_")
    if not IDENT.fullmatch(text):
        return fallback
    return text


def quote(name: str) -> str:
    return '"' + str(name).replace('"', '""') + '"'


def decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def classify(values: list[str]) -> str:
    kinds = set()
    for value in values:
        if value is None or str(value).strip() == "":
            continue
        text = str(value).strip()
        if INT_RE.fullmatch(text):
            kinds.add("int")
        elif REAL_RE.fullmatch(text):
            kinds.add("real")
        else:
            return "TEXT"
    if kinds == {"int"}:
        return "INTEGER"
    if kinds:
        return "REAL"
    return "TEXT"


def coerce(value: str, kind: str):
    if value is None or str(value).strip() == "":
        return None
    text = str(value).strip()
    if kind == "INTEGER":
        return int(text)
    if kind == "REAL":
        return float(text)
    return text


def unique_names(headers: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    names = []
    for index, header in enumerate(headers, start=1):
        base = sanitize(header, f"column_{index}")
        seen[base] = seen.get(base, 0) + 1
        names.append(base if seen[base] == 1 else f"{base}_{seen[base]}")
    return names


def connect_write() -> sqlite3.Connection:
    DATA.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def connect_read() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise AppError("Load a CSV, a SQLite file, or the sample tables first.")
    conn = sqlite3.connect(f"{DB_PATH.resolve().as_uri()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def table_names(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        "SELECT name FROM sqlite_master "
        "WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall()
    return [row[0] for row in rows]


def column_info(conn: sqlite3.Connection, table: str) -> list[dict]:
    return [
        {"name": row[1], "type": row[2] or "TEXT"}
        for row in conn.execute(f"PRAGMA table_info({quote(table)})")
    ]


def database_info() -> dict:
    if not DB_PATH.exists():
        return {"loaded": False, "source": "", "tables": []}
    conn = connect_read()
    try:
        tables = []
        for name in table_names(conn):
            count = conn.execute(f"SELECT COUNT(*) FROM {quote(name)}").fetchone()[0]
            tables.append(
                {"name": name, "rows": count, "columns": column_info(conn, name)}
            )
        return {"loaded": bool(tables), "source": current_label(), "tables": tables}
    finally:
        conn.close()


def schema_text() -> str:
    info = database_info()
    if not info["loaded"]:
        raise AppError("Load a CSV, a SQLite file, or the sample tables first.")
    blocks = []
    for table in info["tables"][:30]:
        columns = table["columns"][:40]
        shown = ", ".join(f"{col['name']} {col['type']}" for col in columns)
        extra = len(table["columns"]) - len(columns)
        if extra > 0:
            shown += f", and {extra} more columns"
        conn = connect_read()
        try:
            sample_rows = conn.execute(
                f"SELECT * FROM {quote(table['name'])} LIMIT 3"
            ).fetchall()
        finally:
            conn.close()
        lines = [f"Table {table['name']} ({table['rows']} rows)", f"Columns: {shown}"]
        for row in sample_rows:
            values = []
            for value in tuple(row):
                text = "" if value is None else str(value)
                if len(text) > 60:
                    text = text[:57] + "..."
                values.append(text)
            lines.append("Sample: " + " | ".join(values))
        blocks.append("\n".join(lines))
    text = "\n\n".join(blocks)
    if len(text) > 14000:
        text = text[:14000] + "\nSchema truncated."
    return text


def import_csv(filename: str, data: bytes) -> str:
    if data[:2] == b"PK":
        raise AppError("This looks like an Excel file. In Excel, use Save As and choose CSV.")
    if data[:16] == b"SQLite format 3\x00":
        raise AppError("That file is a SQLite database. Upload it on its own.")
    text = decode_text(data)
    if not text.strip():
        raise AppError(f"{filename} is empty.")
    try:
        dialect = csv.Sniffer().sniff(text[:8192], delimiters=",\t;|")
    except csv.Error:
        dialect = csv.excel
    rows = list(csv.reader(io.StringIO(text), dialect))
    while rows and not any(cell.strip() for cell in rows[0]):
        rows.pop(0)
    if not rows:
        raise AppError(f"{filename} has no header row.")
    headers = unique_names(rows[0])
    if not headers:
        raise AppError(f"{filename} has no columns.")
    body = [row for row in rows[1:] if any(cell.strip() for cell in row)]
    kinds = []
    for index in range(len(headers)):
        values = [row[index] if index < len(row) else "" for row in body[:200]]
        kinds.append(classify(values))
    table = sanitize(Path(filename).stem, "uploaded")
    conn = connect_write()
    try:
        conn.execute(f"DROP TABLE IF EXISTS {quote(table)}")
        definitions = ", ".join(
            f"{quote(name)} {kind}" for name, kind in zip(headers, kinds)
        )
        conn.execute(f"CREATE TABLE {quote(table)} ({definitions})")
        placeholders = ", ".join("?" for _ in headers)
        payload = []
        for row in body:
            payload.append(
                tuple(
                    coerce(row[index] if index < len(row) else "", kind)
                    for index, kind in enumerate(kinds)
                )
            )
        conn.executemany(
            f"INSERT INTO {quote(table)} VALUES ({placeholders})",
            payload,
        )
        conn.commit()
    finally:
        conn.close()
    return table


def import_sqlite(filename: str, data: bytes) -> None:
    if data[:16] != b"SQLite format 3\x00":
        raise AppError("That file is not a SQLite database.")
    DATA.mkdir(parents=True, exist_ok=True)
    temp = DATA / "upload.tmp"
    temp.write_bytes(data)
    conn = sqlite3.connect(temp)
    try:
        names = table_names(conn)
    except sqlite3.DatabaseError as exc:
        temp.unlink(missing_ok=True)
        raise AppError("SQLite could not open that file.") from exc
    finally:
        conn.close()
    if not names:
        temp.unlink(missing_ok=True)
        raise AppError("That database has no tables.")
    if DB_PATH.exists():
        DB_PATH.unlink()
    temp.replace(DB_PATH)
    remember(filename)


def load_sample() -> dict:
    with LOCK:
        if DB_PATH.exists():
            DB_PATH.unlink()
        if SOURCE_PATH.exists():
            SOURCE_PATH.unlink()
        for name in ("tickets.csv", "agents.csv"):
            import_csv(name, (SAMPLE / name).read_bytes())
        remember("Sample help-desk tables")
    return public_status()


def reset_db() -> dict:
    with LOCK:
        if DB_PATH.exists():
            DB_PATH.unlink()
        if SOURCE_PATH.exists():
            SOURCE_PATH.unlink()
    return public_status()


def handle_files(files: list[dict]) -> dict:
    usable = [item for item in files if item.get("filename")]
    if not usable:
        raise AppError("Choose a CSV or SQLite file.")
    sqlite_files = []
    csv_files = []
    for item in usable:
        ext = Path(item["filename"]).suffix.lower()
        if ext in SQLITE_EXT:
            sqlite_files.append(item)
        elif ext in CSV_EXT:
            csv_files.append(item)
        else:
            raise AppError(
                f"{item['filename']} needs to be a CSV or a SQLite file "
                "(.db, .sqlite, .sqlite3)."
            )
    if sqlite_files and csv_files:
        raise AppError("Upload a SQLite file on its own. CSV files can be uploaded together.")
    if len(sqlite_files) > 1:
        raise AppError("Upload one SQLite file at a time.")
    with LOCK:
        if sqlite_files:
            item = sqlite_files[0]
            import_sqlite(Path(item["filename"]).name, item["data"])
        else:
            names = []
            for item in csv_files:
                import_csv(Path(item["filename"]).name, item["data"])
                names.append(Path(item["filename"]).name)
            previous = current_label()
            added = ", ".join(names)
            remember(f"{previous}, {added}" if previous else added)
    return public_status()


def json_cell(value):
    if value is None or isinstance(value, (int, float, str)):
        return value
    if isinstance(value, bytes):
        return f"<{len(value)} bytes>"
    return str(value)


def clean_sql(sql: str) -> str:
    text = (sql or "").strip()
    text = re.sub(r"^```(?:sql)?\s*", "", text, flags=re.I)
    text = re.sub(r"\s*```$", "", text)
    text = re.sub(r"--.*?$", "", text, flags=re.M)
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return text.strip().rstrip(";").strip()


def ensure_safe(sql: str) -> str:
    cleaned = clean_sql(sql)
    if not cleaned:
        raise AppError("The model did not return a query.")
    if ";" in cleaned:
        raise AppError("QueryLab runs one statement. Remove the extra statement.")
    if not re.match(r"(?is)^(select|with)\b", cleaned):
        raise AppError("QueryLab runs a single read-only SELECT.")
    bare = re.sub(r"'(?:''|[^'])*'", "''", cleaned)
    if FORBIDDEN.search(bare):
        raise AppError("QueryLab runs a single read-only SELECT.")
    return cleaned


def execute(sql: str) -> dict:
    started = time.perf_counter()

    def progress():
        return 1 if time.perf_counter() - started > QUERY_SECONDS else 0

    with LOCK:
        conn = connect_read()
        try:
            conn.set_progress_handler(progress, 100_000)
            try:
                cursor = conn.execute(sql)
            except sqlite3.OperationalError as exc:
                message = str(exc)
                if "interrupt" in message.lower():
                    raise AppError(
                        "That query ran longer than 20 seconds. Add a filter or a LIMIT."
                    ) from exc
                raise
            if cursor.description is None:
                raise AppError("That statement did not return rows.")
            columns = [item[0] for item in cursor.description]
            fetched = cursor.fetchmany(ROW_CAP + 1)
        finally:
            conn.close()
    truncated = len(fetched) > ROW_CAP
    rows = []
    for row in fetched[:ROW_CAP]:
        rows.append([json_cell(value) for value in tuple(row)])
    return {
        "columns": columns,
        "rows": rows,
        "truncated": truncated,
        "row_count": len(rows),
    }


def ollama_models() -> tuple[list[str], bool, str]:
    request = urllib.request.Request("http://127.0.0.1:11434/api/tags", method="GET")
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return [], False, "Ollama is not running. Open the Ollama app, then ask again."
    names = [item.get("name", "") for item in payload.get("models", []) if item.get("name")]
    return names, True, ""


def choose_default(models: list[str]) -> str:
    for name in PREFERRED_MODELS:
        if name in models:
            return name
    return models[0] if models else ""


def post_ollama(payload: dict) -> str:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        "http://127.0.0.1:11434/api/chat",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if payload.get("think") is False and exc.code == 400:
            payload = dict(payload)
            payload.pop("think", None)
            return post_ollama(payload)
        detail = exc.read().decode("utf-8", "replace")[:300]
        raise AppError(f"Ollama returned an error: {detail}", 502) from exc
    except TimeoutError as exc:
        raise AppError(
            "The model took too long. Try gemma3:4b, or write the SQL and press Run SQL.",
            504,
        ) from exc
    except urllib.error.URLError as exc:
        raise AppError(
            "Ollama is not running. Open the Ollama app, or run ollama serve, then ask again.",
            503,
        ) from exc
    content = (body.get("message") or {}).get("content") or ""
    if not content:
        raise AppError("The model returned an empty answer. Try again or switch models.")
    return content


def model_json(text: str) -> dict:
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S).strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.S)
    if fenced:
        text = fenced.group(1).strip()
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.S)
        if not match:
            return {"sql": text, "explanation": ""}
        try:
            value = json.loads(match.group(0))
        except json.JSONDecodeError:
            return {"sql": text, "explanation": ""}
    if not isinstance(value, dict):
        raise AppError("The model answer was not a query. Try again.")
    return value


def ask(body: dict) -> dict:
    question = (body.get("question") or "").strip()
    if not question:
        raise AppError("Type a question first.")
    if not DB_PATH.exists():
        raise AppError("Load a CSV, a SQLite file, or the sample tables first.")
    model = (body.get("model") or "").strip()
    models, online, offline_message = ollama_models()
    if not online:
        raise AppError(offline_message, 503)
    if not model:
        model = choose_default(models)
    if not re.fullmatch(r"[A-Za-z0-9_.:-]{1,80}", model):
        raise AppError("Pick a model from the list.")
    with LOCK:
        schema = schema_text()
    messages = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": f"Schema:\n{schema}\n\nQuestion: {question}"},
    ]
    parsed = model_json(
        post_ollama(
            {
                "model": model,
                "stream": False,
                "format": "json",
                "think": False,
                "messages": messages,
                "options": {"temperature": 0, "num_predict": 1200},
            }
        )
    )
    explanation = str(parsed.get("explanation") or "").strip()
    try:
        sql = ensure_safe(str(parsed.get("sql") or ""))
        result = execute(sql)
    except (AppError, sqlite3.Error) as first_error:
        messages.append(
            {
                "role": "assistant",
                "content": json.dumps({"sql": parsed.get("sql") or "", "explanation": explanation}),
            }
        )
        messages.append(
            {
                "role": "user",
                "content": (
                    "That query could not be used. "
                    f"Error: {first_error}. Return a corrected JSON object."
                ),
            }
        )
        parsed = model_json(
            post_ollama(
                {
                    "model": model,
                    "stream": False,
                    "format": "json",
                    "think": False,
                    "messages": messages,
                    "options": {"temperature": 0, "num_predict": 1200},
                }
            )
        )
        explanation = str(parsed.get("explanation") or explanation).strip()
        sql = ensure_safe(str(parsed.get("sql") or ""))
        try:
            result = execute(sql)
        except sqlite3.Error as second_error:
            return {
                "sql": sql,
                "explanation": explanation,
                "columns": [],
                "rows": [],
                "truncated": False,
                "row_count": 0,
                "error": f"SQLite rejected the query: {second_error}",
            }
    result["sql"] = sql
    result["explanation"] = explanation
    return result


def run_query(sql: str) -> dict:
    cleaned = ensure_safe(sql)
    try:
        result = execute(cleaned)
    except sqlite3.Error as exc:
        raise AppError(f"SQLite rejected the query: {exc}") from exc
    result["sql"] = cleaned
    result["explanation"] = ""
    return result


def load_writeups() -> list[dict]:
    if not WRITEUPS_PATH.exists():
        return []
    try:
        value = json.loads(WRITEUPS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return value if isinstance(value, list) else []


def save_writeup(body: dict) -> dict:
    finding = (body.get("finding") or "").strip()
    if len(finding) < 40:
        raise AppError("The finding needs 40 or more characters. Name the number and the group.")
    item = {
        "id": datetime.now().strftime("%Y%m%d-%H%M%S"),
        "saved": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "question": (body.get("question") or "").strip(),
        "sql": (body.get("sql") or "").strip(),
        "finding": finding,
        "reading": (body.get("reading") or "").strip(),
        "caveat": (body.get("caveat") or "").strip(),
        "oneliner": (body.get("oneliner") or "").strip(),
    }
    if not item["question"]:
        raise AppError("The write-up needs the question.")
    with LOCK:
        items = load_writeups()
        items.insert(0, item)
        DATA.mkdir(parents=True, exist_ok=True)
        WRITEUPS_PATH.write_text(json.dumps(items[:30], indent=2), encoding="utf-8")
    return {"saved": item, "writeups": items[:30]}


def public_status() -> dict:
    models, online, message = ollama_models()
    with LOCK:
        info = database_info()
        writeups = load_writeups()
    return {
        "ollama": online,
        "ollama_message": message,
        "models": models,
        "default_model": choose_default(models),
        "database": info,
        "writeups": writeups,
    }


def parse_multipart(content_type: str, body: bytes) -> list[dict]:
    match = re.search(r'boundary=(?:"([^"]+)"|([^;]+))', content_type or "")
    if not match:
        raise AppError("The upload could not be read.")
    boundary = (match.group(1) or match.group(2)).strip().encode("utf-8")
    parts = body.split(b"--" + boundary)
    files = []
    for part in parts[1:]:
        if part.startswith(b"--"):
            break
        block = part.strip(b"\r\n")
        header_blob, separator, data = block.partition(b"\r\n\r\n")
        if separator == b"":
            continue
        if data.endswith(b"\r\n"):
            data = data[:-2]
        headers = {}
        for line in header_blob.decode("utf-8", "replace").split("\r\n"):
            if ":" in line:
                key, value = line.split(":", 1)
                headers[key.lower().strip()] = value.strip()
        disposition = headers.get("content-disposition", "")
        filename = re.search(r'filename="([^"]*)"', disposition)
        files.append(
            {
                "filename": filename.group(1) if filename else "",
                "data": data,
            }
        )
    return files


class Handler(BaseHTTPRequestHandler):
    server_version = "QueryLab/1.0"

    def log_message(self, fmt: str, *args) -> None:
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

    def send_json(self, code: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(data)

    def read_body(self, limit: int) -> bytes:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return b""
        if length > limit:
            raise AppError("That file is over 80 MB. Use a smaller extract.")
        return self.rfile.read(length)

    def read_json(self) -> dict:
        raw = self.read_body(1_000_000)
        if not raw:
            return {}
        try:
            value = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise AppError("The request could not be read.") from exc
        if not isinstance(value, dict):
            raise AppError("The request could not be read.")
        return value

    def serve_web(self, name: str) -> None:
        path = (WEB / name).resolve()
        if path.parent != WEB.resolve() or not path.is_file():
            self.send_error(404)
            return
        data = path.read_bytes()
        kind = "text/html" if name.endswith(".html") else "text/css" if name.endswith(".css") else "text/javascript"
        self.send_response(200)
        self.send_header("Content-Type", f"{kind}; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        try:
            if path == "/api/status":
                self.send_json(200, public_status())
                return
            if path in ("/", "/index.html"):
                self.serve_web("index.html")
                return
            if path in ("/app.css", "/app.js"):
                self.serve_web(path[1:])
                return
            self.send_error(404)
        except AppError as exc:
            self.send_json(exc.code, {"error": str(exc)})
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            if path == "/api/sample":
                self.read_body(10_000)
                self.send_json(200, load_sample())
            elif path == "/api/reset":
                self.read_body(10_000)
                self.send_json(200, reset_db())
            elif path == "/api/upload":
                body = self.read_body(MAX_UPLOAD)
                files = parse_multipart(self.headers.get("Content-Type", ""), body)
                self.send_json(200, handle_files(files))
            elif path == "/api/ask":
                self.send_json(200, ask(self.read_json()))
            elif path == "/api/run":
                self.send_json(200, run_query(self.read_json().get("sql") or ""))
            elif path == "/api/writeup":
                self.send_json(200, save_writeup(self.read_json()))
            else:
                self.send_error(404)
        except AppError as exc:
            self.send_json(exc.code, {"error": str(exc)})
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})


def main(argv: list[str]) -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    url = f"http://127.0.0.1:{PORT}/"

    def say(message: str) -> None:
        print(message, flush=True)

    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        say(f"QueryLab is already using port {PORT}.")
        say(f"Opening {url}")
        if "--no-browser" not in argv:
            webbrowser.open(url)
        return 0
    say(f"QueryLab is running at {url}")
    say("Press Ctrl+C to stop.")
    if "--no-browser" not in argv:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    import sys

    raise SystemExit(main(sys.argv[1:]))
