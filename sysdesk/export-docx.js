/** Minimal .docx (ZIP STORE) so the static lab can download a Word write-up. */

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c >>> 0;
}

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n) {
  return Uint8Array.of(n & 255, (n >>> 8) & 255);
}

function u32(n) {
  return Uint8Array.of(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255);
}

function concat(parts) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function utf8(s) {
  return new TextEncoder().encode(s);
}

function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of files) {
    const n = utf8(name);
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(n.length),
      u16(0),
      n,
      data,
    ]);
    locals.push(local);
    centrals.push(
      concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(n.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        n,
      ])
    );
    offset += local.length;
  }
  const central = concat(centrals);
  const end = concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0)]);
  return concat([...locals, central, end]);
}

function xmlEscape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wP(text, bold = false, keepNext = false) {
  const t = xmlEscape(text || " ");
  const rPr = bold ? "<w:rPr><w:b/><w:sz w:val=\"22\"/></w:rPr>" : "<w:rPr><w:sz w:val=\"21\"/></w:rPr>";
  const pPr = keepNext ? "<w:pPr><w:keepNext/></w:pPr>" : "";
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
}

function wRow(label, value) {
  return `<w:tr>
    <w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr>${wP(label, true)}</w:tc>
    <w:tc><w:tcPr><w:tcW w:w="6800" w:type="dxa"/></w:tcPr>${wP(value)}</w:tc>
  </w:tr>`;
}

function mark(on) {
  return on ? "☑" : "☐";
}

function wCheck(on, label, keepNext = false) {
  return wP(`${mark(on)}  ${label}`, false, keepNext);
}

function wBlankCell(prefill, extraLines) {
  const lines = [];
  if (prefill) lines.push(wP(prefill));
  for (let i = 0; i < extraLines; i++) lines.push(wP(" "));
  return lines.join("");
}

function wWriteRow(label, prefill, extraLines) {
  return `<w:tr>
    <w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr>${wP(label, true)}</w:tc>
    <w:tc><w:tcPr><w:tcW w:w="6800" w:type="dxa"/></w:tcPr>${wBlankCell(prefill, extraLines)}</w:tc>
  </w:tr>`;
}

function wTable(rowsXml) {
  return `<w:tbl><w:tblPr><w:tblW w:w="9600" w:type="dxa"/><w:tblBorders>
      <w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/>
      <w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/>
    </w:tblBorders></w:tblPr>${rowsXml}</w:tbl>`;
}

function notesOk(t, extras) {
  const notes = extras.notes || t.notes || t.resolution || "";
  return notes.trim().length >= 40;
}

function ticketBody(t, extras = {}) {
  const label = extras.labelAction || ((a) => a);
  const done = t.done || [];
  const required = t.required || [];
  const notes = extras.notes || t.notes || t.resolution || "";
  const claimedApplies = required.includes("claim") || t.claimed === false || t.claimed === true;
  const claimed = t.claimed !== false && (t.claimed === true || !required.includes("claim"));
  const stillOpen = t.status === "open";
  const unverifiedClose = t.status !== "open" && !t.verified;
  const verified = Boolean(t.verified);
  const escalated = t.status === "escalated";

  const header = wTable(
    [
      wRow("Ticket ID", t.id),
      wRow("Desk / client", extras.desk || ""),
      wRow("Channel / priority", `${extras.channel || t.channel} · ${t.priority || ""}`),
      wRow("Caller + SAM + host", `${t.caller?.name || ""} · ${t.caller?.sam || ""} · ${t.caller?.host || ""}`),
      wRow("Subject", t.subject || ""),
      wRow("Situation (from ticket)", t.preview || ""),
      wRow("Scope note", t.escalate ? "Out of Tier-1 scope if you read the KB — escalate." : "In-scope for Tier-1 if the required work is done."),
    ].join("")
  );

  const checks = [
    wP("Checklist (filled from the lab — ☑ done, ☐ still open)", true),
    wCheck(Boolean(t.identityVerified), `Identity confirmed${t.identityVerified ? ` — ${t.caller?.name} / ${t.caller?.sam} / ${t.caller?.host}` : ""}`),
  ];
  if (claimedApplies) checks.push(wCheck(claimed, "Ticket claimed"));
  for (const a of required) {
    if (a === "claim") continue;
    checks.push(wCheck(done.includes(a), label(a)));
  }
  checks.push(wCheck(notesOk(t, extras), "Notes saved (40+ characters)"));
  checks.push(wP("Outcome", true));
  checks.push(wCheck(verified, "Verified"));
  checks.push(wCheck(unverifiedClose && !escalated, "Unverified close"));
  checks.push(wCheck(escalated, "Escalated"));
  checks.push(wCheck(stillOpen, "Still open"));

  const skills = t.skills || [];
  const writeHead = [wP("Skills on this ticket", true, true)];
  if (skills.length) {
    for (const s of skills) writeHead.push(wCheck(verified, extras.skillLabels?.[s] || s, true));
  } else {
    writeHead.push(wP("— none tagged —", false, true));
  }
  writeHead.push(
    wP("Practice write-up — type in the right column", true, true),
    wP("Pre-filled lines are from SysDesk. Use the blank lines to rewrite in your own words.", false, true)
  );

  const write = [
    ...writeHead,
    wTable(
      [
        wWriteRow("Short work notes", notes.trim() || "", 5),
        wWriteRow("STAR — Situation", extras.starS || t.preview || "", 2),
        wWriteRow("STAR — Task", extras.starT || "", 2),
        wWriteRow("STAR — Action", extras.starA || "", 3),
        wWriteRow("STAR — Result", extras.starR || "", 2),
        wWriteRow("Interview one-liner", extras.oneLiner || "", 2),
      ].join("")
    ),
    wP("Simulated SysDesk / Northwind MSP lab. Not employment at Northwind or a client."),
  ];

  return [header, wP(""), ...checks, ...write].join("");
}

function documentXml(title, body) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${wP(title, true)}
    ${wP("Exported from SysDesk. Checkboxes show lab state. Type your write-up in the blank lines.")}
    ${body}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr>
  </w:body>
</w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

function buildDocx(title, bodies) {
  const doc = documentXml(title, bodies.join(wP("")));
  return zipStore([
    { name: "[Content_Types].xml", data: utf8(CONTENT_TYPES) },
    { name: "_rels/.rels", data: utf8(RELS) },
    { name: "word/document.xml", data: utf8(doc) },
    { name: "word/_rels/document.xml.rels", data: utf8(DOC_RELS) },
  ]);
}

export function downloadBlob(name, bytes, mime) {
  const blob = new Blob([bytes], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function buildTicketBytes(t, extras) {
  return buildDocx(`SysDesk write-up · ${t.id}`, [ticketBody(t, extras)]);
}

export function downloadTicketWriteup(t, extras) {
  downloadBlob(`${t.id}-SysDesk-writeup.docx`, buildTicketBytes(t, extras), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

export function downloadManyWriteups(tickets, extrasFor) {
  const blocks = tickets.map((t) => ticketBody(t, extrasFor?.(t) || {}));
  const bytes = buildDocx("SysDesk verified write-ups", blocks);
  downloadBlob("SysDesk-verified-writeups.docx", bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}
