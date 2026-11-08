const $ = (id) => document.getElementById(id);
const question = $("question");
const sqlBox = $("sql");
const modelSelect = $("model");
const statusLine = $("status");
let busy = false;

const SAMPLE_QUESTIONS = [
  "How many open tickets are there for each priority?",
  "Which team has the most open tickets?",
  "What is the average minutes to resolve a closed ticket, by site?",
];

function setStatus(text, isError) {
  statusLine.textContent = text || "";
  statusLine.classList.toggle("bad", Boolean(isError));
}

function setBusy(on, text) {
  busy = on;
  for (const id of ["ask", "run", "sample", "clear", "save-writeup"]) {
    $(id).disabled = on;
  }
  if (text) setStatus(text, false);
}

async function api(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch (err) {
    throw new Error("QueryLab is not running. Double-click start_querylab.cmd in the querylab folder.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The request failed.");
  return data;
}

function renderSchema(database) {
  $("source").textContent = database.loaded
    ? `Loaded: ${database.source}`
    : "No file loaded. Drop a CSV or SQLite file, or load the sample.";
  const box = $("schema");
  box.replaceChildren();
  for (const table of database.tables || []) {
    const card = document.createElement("article");
    card.className = "table-card";
    const title = document.createElement("h3");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${table.name} · ${table.rows} rows`;
    const safeName = String(table.name).replaceAll('"', '""');
    button.addEventListener("click", () => runSql(`SELECT * FROM "${safeName}" LIMIT 20`));
    title.append(button);
    const list = document.createElement("ul");
    for (const column of table.columns) {
      const item = document.createElement("li");
      item.textContent = `${column.name} ${column.type}`;
      list.append(item);
    }
    card.append(title, list);
    box.append(card);
  }
  const suggestions = $("suggestions");
  suggestions.replaceChildren();
  if (database.source === "Sample help-desk tables") {
    for (const text of SAMPLE_QUESTIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.addEventListener("click", () => {
        question.value = text;
        askQuestion(text);
      });
      suggestions.append(button);
    }
  }
}

function renderSaved(writeups) {
  const box = $("saved");
  box.replaceChildren();
  if (!writeups || !writeups.length) {
    const note = document.createElement("p");
    note.className = "quiet";
    note.textContent = "Saved drafts stay in the data folder on this PC.";
    box.append(note);
    return;
  }
  for (const item of writeups) {
    const card = document.createElement("article");
    card.className = "saved-item";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.saved || item.id;
    button.addEventListener("click", () => fillWriteup(item));
    const finding = document.createElement("p");
    finding.className = "quiet";
    finding.textContent = item.finding || "";
    card.append(button, finding);
    box.append(card);
  }
}

function renderModels(data) {
  const previous = localStorage.getItem("querylab-model") || data.default_model;
  modelSelect.replaceChildren();
  for (const name of data.models || []) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === previous) option.selected = true;
    modelSelect.append(option);
  }
  if (!data.models || !data.models.length) {
    const option = document.createElement("option");
    option.textContent = "No model installed";
    modelSelect.append(option);
  }
  $("ollama-status").textContent = data.ollama
    ? "Ollama is running on this PC."
    : data.ollama_message;
  $("ollama-status").classList.toggle("bad", !data.ollama);
}

function applyStatus(data) {
  renderModels(data);
  renderSchema(data.database || { loaded: false, tables: [] });
  renderSaved(data.writeups || []);
}

function showResult(data) {
  $("answer").hidden = false;
  sqlBox.value = data.sql || "";
  $("explanation").textContent = data.explanation || "";
  if (data.error) setStatus(data.error, true);
  else if (data.truncated) setStatus(`First ${data.row_count} rows.`, false);
  else setStatus(`${data.row_count} row${data.row_count === 1 ? "" : "s"}.`, false);
  const meta = $("result-meta");
  meta.textContent = data.truncated ? "Showing the first 500 rows." : "";
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const table = document.createElement("table");
  const head = document.createElement("tr");
  const numeric = (data.columns || []).map((_, index) =>
    (data.rows || []).every((row) => row[index] == null || typeof row[index] === "number")
  );
  for (const name of data.columns || []) {
    const cell = document.createElement("th");
    cell.textContent = name;
    head.append(cell);
  }
  const thead = document.createElement("thead");
  thead.append(head);
  const body = document.createElement("tbody");
  for (const row of data.rows || []) {
    const tr = document.createElement("tr");
    row.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value == null ? "" : String(value);
      if (numeric[index]) cell.className = "num";
      tr.append(cell);
    });
    body.append(tr);
  }
  if (!(data.rows || []).length) {
    const tr = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = Math.max(1, (data.columns || []).length);
    cell.textContent = "The query ran and returned no rows.";
    tr.append(cell);
    body.append(tr);
  }
  table.append(thead, body);
  wrap.append(table);
  $("results").replaceChildren(wrap);
  if (question.value.trim()) refreshChecks();
}

async function askQuestion(text) {
  const value = (text || question.value).trim();
  if (!value) {
    setStatus("Type a question first.", true);
    return;
  }
  setBusy(true, "Writing SQL. The first question can take a minute while the model loads.");
  try {
    const data = await api("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: value, model: modelSelect.value }),
    });
    showResult(data);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    setBusy(false);
  }
}

async function runSql(sql) {
  setBusy(true, "Running SQL.");
  try {
    const data = await api("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    });
    showResult(data);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    setBusy(false);
  }
}

async function upload(fileList) {
  const body = new FormData();
  for (const file of fileList) body.append("files", file, file.name);
  setBusy(true, "Loading the file.");
  try {
    applyStatus(await api("/api/upload", { method: "POST", body }));
    setStatus("File loaded.", false);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    setBusy(false);
  }
}

function writeupPayload() {
  return {
    question: question.value.trim(),
    sql: sqlBox.value.trim(),
    finding: $("finding").value.trim(),
    reading: $("reading").value.trim(),
    caveat: $("caveat").value.trim(),
    oneliner: $("oneliner").value.trim(),
  };
}

function checklist(item) {
  const finding = item.finding || "";
  const hasNumber = /\d/.test(finding);
  return [
    [finding.length >= 40, "Finding is 40 or more characters."],
    [hasNumber, "Finding names a number from the result."],
    [Boolean(item.reading), "How I read the rows is filled in."],
    [Boolean(item.caveat), "A caveat says what the count leaves out."],
    [Boolean(item.oneliner) && !item.oneliner.includes("\n"), "One-liner is a single sentence."],
  ];
}

function refreshChecks() {
  const list = $("checks");
  list.replaceChildren();
  for (const [ok, text] of checklist(writeupPayload())) {
    const item = document.createElement("li");
    item.textContent = text;
    item.className = ok ? "ok" : "";
    list.append(item);
  }
}

function fillWriteup(item) {
  question.value = item.question || "";
  sqlBox.value = item.sql || "";
  $("finding").value = item.finding || "";
  $("reading").value = item.reading || "";
  $("caveat").value = item.caveat || "";
  $("oneliner").value = item.oneliner || "";
  $("answer").hidden = false;
  refreshChecks();
}

function markdown(item) {
  return [
    "# QueryLab write-up",
    "",
    "## Question",
    item.question,
    "",
    "## SQL",
    "```sql",
    item.sql,
    "```",
    "",
    "## Finding",
    item.finding,
    "",
    "## How I read the rows",
    item.reading,
    "",
    "## Caveat",
    item.caveat,
    "",
    "## One-liner",
    item.oneliner,
    "",
  ].join("\n");
}

$("ask-form").addEventListener("submit", (event) => {
  event.preventDefault();
  askQuestion();
});

question.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    askQuestion();
  }
});

$("run").addEventListener("click", () => runSql(sqlBox.value));
$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(sqlBox.value);
    setStatus("SQL copied.", false);
  } catch (err) {
    sqlBox.focus();
    sqlBox.select();
    setStatus("Select the SQL and copy it.", true);
  }
});

$("sample").addEventListener("click", async () => {
  setBusy(true, "Loading the sample help-desk tables.");
  try {
    applyStatus(await api("/api/sample", { method: "POST" }));
    setStatus("Sample loaded. Ask a question, or click a suggested one.", false);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    setBusy(false);
  }
});

$("clear").addEventListener("click", async () => {
  setBusy(true, "Clearing the working copy.");
  try {
    applyStatus(await api("/api/reset", { method: "POST" }));
    setStatus("Working copy cleared. Uploaded files you still have elsewhere are unchanged.", false);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    setBusy(false);
  }
});

$("file").addEventListener("change", () => {
  if ($("file").files.length) upload($("file").files);
});

const drop = $("drop");
drop.addEventListener("dragover", (event) => {
  event.preventDefault();
  drop.classList.add("hot");
});
drop.addEventListener("dragleave", () => drop.classList.remove("hot"));
drop.addEventListener("drop", (event) => {
  event.preventDefault();
  drop.classList.remove("hot");
  if (event.dataTransfer.files.length) upload(event.dataTransfer.files);
});

modelSelect.addEventListener("change", () => {
  localStorage.setItem("querylab-model", modelSelect.value);
});

for (const id of ["finding", "reading", "caveat", "oneliner"]) {
  $(id).addEventListener("input", refreshChecks);
}

$("save-writeup").addEventListener("click", async () => {
  setBusy(true, "Saving the write-up.");
  try {
    const data = await api("/api/writeup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(writeupPayload()),
    });
    renderSaved(data.writeups || []);
    setStatus("Write-up saved in the data folder on this PC.", false);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    setBusy(false);
  }
});

$("download-writeup").addEventListener("click", () => {
  const item = writeupPayload();
  const blob = new Blob([markdown(item)], { type: "text/markdown" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "querylab-writeup.md";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1500);
});

refreshChecks();
api("/api/status").then(applyStatus).catch((err) => setStatus(err.message, true));
