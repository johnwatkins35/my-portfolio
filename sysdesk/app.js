import { YOU, SKILLS, kbArticles, seedDirectory, seedEndpoints, seedTickets, seedPings, AD_GROUPS, TENANTS } from "./data.js?v=jw1";
import { seedCloud, seedAccess, seedSoc, seedNoc, seedDba, seedChange, seedStig, seedPcap, DESK_META, LAB_KB } from "./labs.js";
import { downloadTicketWriteup, downloadManyWriteups } from "./export-docx.js";

const KEY = "sysdesk-join-v1";
const CHANNEL_LABEL = { voice: "Voice", email: "Email", chat: "Chat" };
const DESKS = ["cloud", "access", "soc", "noc", "dba", "change", "stig", "pcap"];

function logoSvg() {
  return `<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#e8c547"/>
    <path d="M8 11.5h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 8 23V11.5z" fill="#0a0e14"/>
    <path d="M8 11.5 16 7l8 4.5v2.2L16 18.2 8 13.7V11.5z" fill="#1e3a5f"/>
  </svg>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function avatar(person, size = 32) {
  const initials = person.initials || (person.name || "?").slice(0, 2).toUpperCase();
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:${person.color || "#e8c547"}">${escapeHtml(initials)}</span>`;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function freshState() {
  return {
    tickets: seedTickets().map((t) => ({ ...t, desk: t.desk || "helpdesk" })),
    directory: seedDirectory(),
    endpoints: seedEndpoints(),
    pings: seedPings().map((p) => ({ ...p, fired: false })),
    cloud: seedCloud(),
    access: seedAccess(),
    soc: seedSoc(),
    noc: seedNoc(),
    dba: seedDba(),
    change: seedChange(),
    stig: seedStig(),
    pcap: seedPcap(),
    isolated: ["NW-WS-3304"],
    vault: {},
    startedAt: Date.now(),
    lastTempPw: null,
    toast: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.tickets?.length && parsed.directory && parsed.endpoints) {
        parsed.pings = parsed.pings || seedPings().map((p) => ({ ...p, fired: true }));
        parsed.startedAt = parsed.startedAt || Date.now();
        parsed.cloud = parsed.cloud || seedCloud();
        parsed.access = parsed.access || seedAccess();
        parsed.soc = parsed.soc || seedSoc();
        parsed.noc = parsed.noc || seedNoc();
        parsed.dba = parsed.dba || seedDba();
        parsed.change = parsed.change || seedChange();
        parsed.stig = parsed.stig || seedStig();
        parsed.pcap = parsed.pcap || seedPcap();
        parsed.isolated = parsed.isolated || [];
        parsed.vault = parsed.vault || {};
        return parsed;
      }
    }
  } catch {}
  return freshState();
}

let state = loadState();
let ui = {
  filter: "all",
  selected: "INC-2401",
  kbQuery: "",
  dirQuery: "",
  dirTenant: "all",
  queueTenant: "all",
  netHost: "NW-WS-2218",
  netLog: "MSP lab console ready.\nSelect a host, then ping / DNS / ipconfig.",
  rdpHost: "NW-WS-0881",
  rdpTerm: "",
  rdpConnected: false,
  mobileNav: false,
  noteDraft: "",
  focusWork: false,
  psLog: "PS C:\\SysDesk>  Simulated PowerShell. Try Get-ADUser jlee, Get-WinEvent lockout, Unlock-ADAccount -Identity jlee, Get-ADUser *Chen*.",
  sqlLog: "Northwind lab (simulated). Try sp_who2, SELECT blocking, KILL 88, SELECT TOP 5 FROM Orders. CREATE INDEX is out of scope.",
  sqlDraft: "",
  psDraft: "",
  pcapFilter: "",
  consoleOpen: false,
  ticketCardOpen: false,
  ticketListPeek: false,
  navCollapsed: localStorage.getItem("sysdesk-nav-collapsed") === "1",
};

function save() {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      tickets: state.tickets,
      directory: state.directory,
      endpoints: state.endpoints,
      pings: state.pings,
      cloud: state.cloud,
      access: state.access,
      soc: state.soc,
      noc: state.noc,
      dba: state.dba,
      change: state.change,
      stig: state.stig,
      pcap: state.pcap,
      isolated: state.isolated,
      vault: state.vault,
      startedAt: state.startedAt,
      lastTempPw: state.lastTempPw,
    })
  );
}

function toast(msg) {
  state.toast = msg;
  render();
  setTimeout(() => {
    if (state.toast === msg) {
      state.toast = null;
      render();
    }
  }, 2400);
}

function route() {
  const parts = (location.hash.replace(/^#/, "") || "/").split("/").filter(Boolean);
  const start = parts[0] === "app" ? 1 : 0;
  let page = parts[start] || "queue";
  if (page === "inbox" || page === "dashboard") page = "queue";
  if (page === "kb") page = "knowledge";
  const id = parts[start + 1] || null;
  const pages = ["campus", "queue", "directory", "network", "remote", "shell", "knowledge", "skills", ...DESKS];
  return { page: pages.includes(page) ? page : "queue", id };
}

function allTickets() {
  return [...state.tickets, ...DESKS.flatMap((d) => state[d]?.tickets || [])];
}

function helpdeskTickets() {
  return state.tickets.filter((t) => !t.desk || t.desk === "helpdesk");
}

function deskOf(t) {
  return t?.desk && t.desk !== "helpdesk" ? t.desk : "queue";
}

function deskMeta(id) {
  return DESK_META.find((d) => d.id === id) || { id, name: id, blurb: "" };
}

function tenantById(id) {
  return TENANTS.find((x) => x.id === id) || TENANTS[0];
}

function tenantOf(t) {
  return tenantById(t?.tenant || "nw");
}

function needsClaim(t) {
  return (t.required || []).includes("claim") && !t.claimed;
}

function hostTenant(h) {
  return h?.tenant || "nw";
}

function needsVault(h) {
  const ten = tenantById(hostTenant(h));
  return ten.jump && !state.vault[ten.id];
}

function openCount(desk) {
  const list = desk === "queue" ? helpdeskTickets() : state[desk]?.tickets || [];
  return list.filter((t) => t.status === "open").length;
}

function markDeskAction(action) {
  for (const t of allTickets()) {
    if (t.status === "open" && (t.required || []).includes(action)) markDone(t.id, action);
  }
}

function relTime(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function slaInfo(t) {
  if (["resolved", "escalated"].includes(t.status)) {
    return { label: t.verified ? "Verified" : "Unverified", cls: t.verified ? "ok" : "warn" };
  }
  const due = t.createdAt + t.slaMin * 60000;
  const mins = Math.round((due - Date.now()) / 60000);
  if (mins < 0) return { label: `Breached ${Math.abs(mins)}m`, cls: "bad" };
  if (mins <= 12) return { label: `${mins}m left`, cls: "warn" };
  return { label: `${mins}m left`, cls: "ok" };
}

function ticketById(id) {
  return allTickets().find((t) => t.id === id) || null;
}

function userBySam(sam) {
  return state.directory.find((u) => u.sam === sam);
}

function hostByName(host) {
  return state.endpoints.find((e) => e.host === host);
}

function hostTrust(h) {
  if (!h) return "ok";
  if (h.trust == null) h.trust = "ok";
  if (h.acctReset == null) h.acctReset = h.trust !== "broken";
  return h.trust;
}

function hostNac(h) {
  if (!h) return "ok";
  if (h.nac == null) h.nac = "ok";
  return h.nac;
}

function isRansomIsolate(host) {
  return host === "NW-WS-3304" || state.isolated.includes(host);
}

function guardClaimForAction(action) {
  const t = allTickets().find((x) => x.status === "open" && (x.required || []).includes(action));
  if (t && needsClaim(t)) {
    toast("Claim the ticket first.");
    return true;
  }
  return false;
}

function markDone(ticketId, action) {
  const t = ticketById(ticketId);
  if (!t) return;
  if (!t.done.includes(action)) t.done.push(action);
}

function relatedOpen(sam, host) {
  return allTickets().find((x) => x.status === "open" && ((sam && x.caller.sam === sam) || (host && x.caller.host === host)));
}

function appendMsg(ticketId, author, role, body) {
  const t = ticketById(ticketId);
  if (!t) return;
  t.messages.push({ id: "m" + Date.now() + Math.random(), author, role, body, at: Date.now() });
  t.preview = body;
}

function missingWork(t) {
  return (t.required || []).filter((a) => !(t.done || []).includes(a));
}

function notesOk(t) {
  return (t.notes || "").trim().length >= 40;
}

function firePings() {
  const elapsed = Date.now() - state.startedAt;
  let changed = false;
  let msg = null;
  for (const ping of state.pings) {
    if (ping.fired || elapsed < ping.afterMs) continue;
    ping.fired = true;
    changed = true;
    if (ping.ticketId && ticketById(ping.ticketId)) {
      const t = ticketById(ping.ticketId);
      if (t.status === "open") {
        appendMsg(ping.ticketId, ping.author, "user", ping.body);
        msg = `${CHANNEL_LABEL[ping.channel]} ping · ${t.id}`;
      }
    } else {
      const nums = state.tickets.map((t) => Number(String(t.id).replace("INC-", ""))).filter(Number.isFinite);
      const id = "INC-" + (Math.max(2400, ...nums) + 1);
      state.tickets.unshift({
        id,
        subject: ping.subject || "Follow-up / thank-you",
        preview: ping.body,
        caller: { name: ping.author, sam: "lortega", host: "NW-WS-0101" },
        channel: ping.channel,
        desk: "helpdesk",
        tenant: "nw",
        status: "open",
        priority: "p3",
        category: "docs",
        skills: ["tickets", "triage", "comms", "docs"],
        required: ["noteonly"],
        escalate: false,
        createdAt: Date.now(),
        slaMin: 240,
        verified: false,
        identityVerified: false,
        done: [],
        notes: "",
        resolution: "",
        messages: [
          { id: "m" + Date.now(), author: ping.author, role: "user", body: ping.body, at: Date.now() },
          { id: "sys" + Date.now(), author: "system", role: "system", body: "Inbound email · acknowledge and file a work note. No AD change needed.", at: Date.now() },
        ],
      });
      msg = "New inbox item · thank-you / status";
    }
  }
  if (changed) save();
  return { changed, msg };
}

function go(hash) {
  if (location.hash === hash) {
    render();
    return;
  }
  location.hash = hash;
}

function viewShell(inner, page) {
  const items = [
    ["campus", "Campus"],
    ["queue", "Help desk"],
    ["cloud", "Cloud"],
    ["access", "Access"],
    ["soc", "SOC"],
    ["noc", "NOC"],
    ["dba", "DBA"],
    ["change", "Change"],
    ["stig", "STIG"],
    ["pcap", "Capture"],
    ["directory", "Directory"],
    ["network", "Network"],
    ["remote", "Remote"],
    ["shell", "Shell"],
    ["knowledge", "Knowledge"],
    ["skills", "Skills"],
  ];
  return `<div class="shell ${ui.navCollapsed ? "nav-collapsed" : ""}">
    <aside class="side ${ui.mobileNav ? "mobile-open" : ""}">
      <a class="brand" href="#/campus">${logoSvg()}<span>SysDesk</span></a>
      <div class="eyebrow side-label" style="padding:0 12px 8px">MSP · six clients</div>
      <nav>${items.map(([id, label]) => `<a href="#/${id}" class="${page === id ? "active" : ""}" title="${escapeHtml(label)}">${escapeHtml(label)}</a>`).join("")}</nav>
      <div class="grow"></div>
      <div class="agent-pill">${avatar(YOU)}<div class="side-label"><strong>${YOU.name}</strong><div style="font-size:12px;color:var(--muted)">${YOU.role}</div></div></div>
      <button class="btn btn-ghost btn-sm nav-toggle" data-action="nav-toggle">${ui.navCollapsed ? "» Show nav" : "« Hide nav"}</button>
    </aside>
    <div class="main">
      <div class="topbar">
        <button class="btn btn-ghost btn-sm" data-action="mobile-nav" id="menuBtn">Menu</button>
        ${ui.navCollapsed ? `<button class="btn btn-ghost btn-sm" data-action="nav-toggle">Show nav</button>` : ""}
        <nav class="top-tools">${items.map(([id, label]) => `<a href="#/${id}" class="${page === id ? "on" : ""}">${label}</a>`).join("")}</nav>
        <button class="btn btn-ghost btn-sm" data-action="reset">Reset lab</button>
        ${avatar(YOU, 28)}
      </div>
      ${inner}
    </div>
  </div>`;
}

function viewQueue(ticketId) {
  let list = helpdeskTickets();
  if (ui.filter !== "all") {
    if (["open", "resolved", "escalated"].includes(ui.filter)) list = list.filter((t) => t.status === ui.filter);
    else if (ui.filter.startsWith("p")) list = list.filter((t) => t.priority === ui.filter);
    else list = list.filter((t) => t.channel === ui.filter);
  }
  if (ui.queueTenant !== "all") list = list.filter((t) => (t.tenant || "nw") === ui.queueTenant);
  const selectedHd = ticketId ? ticketById(ticketId) : null;
  const selected = (selectedHd && deskOf(selectedHd) === "queue" ? selectedHd : null) || list.find((t) => t.id === ui.selected) || list[0] || null;
  if (selected) ui.selected = selected.id;
  const filters = ["all", "open", "voice", "email", "chat", "p1", "p2"];
  const unreadPings = state.tickets.filter((t) => t.status === "open" && Date.now() - t.createdAt < 120000 && t.id.startsWith("INC-") && t.category === "docs").length;
  const working = ui.focusWork && selected;
  return `<div class="page inbox-page">
    <div class="page-title">
      <div>
        <div class="eyebrow">MSP queue · six clients</div>
        <h1>${working ? selected.id : "Incident queue"}</h1>
        <p>${working
          ? "Claim it if it is a client ticket, confirm identity, then Directory / Network / Remote. Jump creds live on Remote."
          : `${list.length} items · Northwind plus Harbor, Peak, Maple CU, Riverton, Oak & Pine.${unreadPings ? " New follow-up in queue." : ""} Same cases each Reset lab.`}</p>
      </div>
      ${working ? `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" data-action="ticket-card-open">Ticket card</button>
        <button class="btn btn-ghost" data-action="back-queue">← Back to queue</button>
      </div>` : ""}
    </div>
    <div class="split ${working ? "work-focus" : ""}">
      <div class="ticket-list">
        <div class="filters">${filters.map((f) => `<button class="filter ${ui.filter === f ? "on" : ""}" data-action="filter" data-filter="${f}">${f}</button>`).join("")}</div>
        <div class="filters">${[{ id: "all", short: "All clients" }, ...TENANTS].map((tn) => `<button class="filter ${ui.queueTenant === tn.id ? "on" : ""}" data-action="queue-tenant" data-tenant="${tn.id}">${escapeHtml(tn.short)}</button>`).join("")}</div>
        ${list.map((t) => ticketRow(t, selected?.id === t.id)).join("") || `<div class="empty">No incidents match.</div>`}
      </div>
      ${selected ? ticketPane(selected) : `<div class="empty">Pick an incident from the list</div>`}
    </div>
    ${selected && ui.ticketCardOpen ? viewTicketCardModal(selected) : ""}
  </div>`;
}

function ticketRow(t, sel) {
  const sla = slaInfo(t);
  const tn = tenantOf(t);
  return `<button class="trow ${sel ? "sel" : ""}" data-action="select" data-id="${t.id}">
    <div class="row1"><span class="pill ch-${t.channel}">${CHANNEL_LABEL[t.channel]}</span><span class="pill tn">${escapeHtml(tn.short)}</span><span class="sla ${sla.cls}">${sla.label}</span></div>
    <strong>${escapeHtml(t.subject)}</strong>
    <div class="prev">${escapeHtml(t.caller.name)} · ${escapeHtml(t.preview)}</div>
    <div class="row1" style="margin-top:6px"><span><span class="pill st-${t.status}">${t.status}</span> <span class="pill pr-${t.priority}">${t.priority}</span>${t.claimed === false ? ` <span class="pill">unclaimed</span>` : ""}</span><span>${relTime(t.createdAt)}</span></div>
  </button>`;
}

function ticketPane(t) {
  const user = userBySam(t.caller.sam);
  const host = hostByName(t.caller.host);
  const sla = slaInfo(t);
  const missing = missingWork(t);
  const draft = ui.selected === t.id ? ui.noteDraft || t.notes : t.notes;
  return `<div class="work-col">
  <div class="thread-wrap">
    <div class="thread">
      <div class="thread-head">
        <div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <strong>${escapeHtml(t.id)}</strong>
            <span class="pill ch-${t.channel}">${CHANNEL_LABEL[t.channel]}</span>
            <span class="pill tn">${escapeHtml(tenantOf(t).short)}</span>
            <span class="pill st-${t.status}">${t.status}</span>
            ${t.claimed === false ? `<span class="pill">unclaimed</span>` : t.claimed ? `<span class="verified">Claimed</span>` : ""}
            ${t.verified ? `<span class="verified">Verified resolution</span>` : t.status !== "open" ? `<span class="unverified">Closed unverified</span>` : ""}
          </div>
          <h2 style="margin:6px 0 0;font-size:17px">${escapeHtml(t.subject)}</h2>
        </div>
        <div style="text-align:right"><div class="sla ${sla.cls}">${sla.label}</div><div style="font-size:12px;color:var(--muted)">${relTime(t.createdAt)}</div></div>
      </div>
      <div class="msgs">${t.messages.map(renderMsg).join("")}</div>
      <form class="composer" data-form="reply" data-id="${t.id}">
        <textarea name="body" placeholder="${t.channel === "voice" ? "Say this on the call…" : "Reply to the user…"}"></textarea>
        <div class="composer-bar">
          <span style="font-size:12px;color:var(--muted)">Soft skills count. Don't dump passwords in email.</span>
          <button class="btn btn-yellow btn-sm" type="submit">Send</button>
        </div>
      </form>
    </div>
    <aside class="props">
      ${(t.required || []).includes("claim") || t.claimed === false ? `<div class="prop">
        <label>Claim</label>
        ${t.claimed === false
          ? `<p style="font-size:12px;color:var(--muted);margin:0 0 8px">Own the ticket before you touch ${escapeHtml(tenantOf(t).name)}.</p>
             <button class="btn btn-yellow btn-sm" data-action="claim" data-id="${t.id}">Claim ticket</button>`
          : `<div class="verified">On ${escapeHtml(YOU.name)} · ${escapeHtml(tenantOf(t).name)}</div>`}
      </div>` : ""}
      <div class="prop">
        <label>Identity check</label>
        ${t.identityVerified
          ? `<div class="verified">Confirmed ${escapeHtml(t.caller.name)} · ${escapeHtml(t.caller.sam)} · ${escapeHtml(t.caller.host)}</div>`
          : `<p style="font-size:12px;color:var(--muted);margin:0 0 8px">${deskOf(t) === "queue" ? "Match the caller to Directory and the device before you change AD." : "Match the caller before you change anything on this desk."}</p>
             <div style="font-size:12px;margin-bottom:8px">Ticket: <strong>${escapeHtml(t.caller.name)}</strong><br>SAM: ${escapeHtml(t.caller.sam)} · ${escapeHtml(t.caller.host)}</div>
             ${user ? `<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Directory: ${escapeHtml(user.name)} · ${user.locked ? "LOCKED" : "not locked"} · ${user.enabled ? "enabled" : "DISABLED"}</div>` : ""}
             ${host ? `<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Endpoint: ${escapeHtml(host.host)} · ${host.online ? "online" : "offline"} · ${escapeHtml(host.ip)} · trust ${escapeHtml(hostTrust(host))} · NAC ${escapeHtml(hostNac(host))}${state.isolated.includes(host.host) ? " · isolated" : ""}</div>` : ""}
             <button class="btn btn-yellow btn-sm" data-action="verify" data-id="${t.id}">Confirm identity</button>`}
      </div>
      <div class="prop">
        <label>Required lab work</label>
        <ul class="steps">${t.required.map((a) => `<li class="${t.done.includes(a) ? "done" : ""}">${t.done.includes(a) ? "✓" : "○"} ${escapeHtml(labelAction(a))}</li>`).join("")}</ul>
      </div>
      <div class="prop">
        <label>Work notes</label>
        <form data-form="notes" data-id="${t.id}">
          <textarea name="notes" placeholder="What you found, what you did, what you told the user. Min 40 characters for a verified close.">${escapeHtml(draft || "")}</textarea>
          <button class="btn btn-ghost btn-sm" type="submit" style="margin-top:8px">Save notes</button>
        </form>
      </div>
      <div class="prop">
        <label>Close</label>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn btn-ok btn-sm" data-action="resolve" data-id="${t.id}">Resolve</button>
          <button class="btn btn-bad btn-sm" data-action="escalate" data-id="${t.id}">Escalate to Tier-2 / HR</button>
        </div>
        <p style="font-size:11px;color:var(--muted);margin:8px 0 0">${t.escalate ? "This one is out of Tier-1 scope if you read the KB." : "Do not escalate a simple lockout or password reset."}</p>
        ${missing.length && t.status === "open" ? `<p class="unverified" style="margin-top:8px">Still open: ${missing.map(labelAction).join("; ")}</p>` : ""}
      </div>
      <div class="prop">
        <label>Tools</label>
        ${deskOf(t) === "queue"
          ? `<a class="btn btn-ghost btn-sm" href="#/directory">Open Directory</a>
        <a class="btn btn-ghost btn-sm" href="#/network">Open Network</a>
        <a class="btn btn-ghost btn-sm" href="#/remote">Open Remote</a>
        <a class="btn btn-ghost btn-sm" href="#/shell">Open Shell</a>
        <button class="btn btn-ghost btn-sm" data-action="ticket-card-open">Ticket card</button>
        <button class="btn btn-yellow btn-sm" data-action="export" data-id="${t.id}">Export write-up</button>`
          : `<p style="font-size:12px;color:var(--muted);margin:0 0 8px">Open the console when you are ready to change something. Only this ticket's tools are in it.</p>
        <button class="btn btn-yellow btn-sm" data-action="console-open">Open console</button>
        <button class="btn btn-ghost btn-sm" data-action="ticket-card-open">Ticket card</button>
        <a class="btn btn-ghost btn-sm" href="#/${deskOf(t)}">Desk queue</a>
        <a class="btn btn-ghost btn-sm" href="#/shell">Open Shell</a>
        <a class="btn btn-ghost btn-sm" href="#/knowledge">Knowledge</a>
        <button class="btn btn-yellow btn-sm" data-action="export" data-id="${t.id}">Export write-up</button>`}
      </div>
    </aside>
  </div>
</div>`;
}

function labelAction(a) {
  const [kind, x, y] = a.split(":");
  const map = {
    verify: `Verify identity (${x})`,
    unlock: `Unlock ${x} in AD`,
    resetpw: `Reset password for ${x}`,
    addgroup: `Add ${x} to ${y}`,
    fixdns: `Fix DNS on ${x}`,
    rdp: `RDP to ${x}`,
    spooler: `Start spooler on ${x}`,
    vpnreset: `Clear VPN profile on ${x}`,
    escalate: `Escalate (do not DIY)`,
    noteonly: `Acknowledge in notes`,
    claim: `Claim the ticket`,
    vault: `Check out jump cred (${tenantById(x).short})`,
    dhcprenew: `Renew DHCP on ${x}`,
    defender: `Start Defender on ${x}`,
    start: `Start VM ${x}`,
    disablekey: `Disable key ${x}`,
    lockssh: `Lock SSH on ${x}`,
    grantdoor: `Grant ${x} door ${y}`,
    rebootctrl: `Reboot controller ${x}`,
    disablebadge: `Disable badge ${x}`,
    isolate: `Isolate ${x}`,
    falsepos: `Close ${x} as false positive`,
    bounce: `Bounce circuit ${x}`,
    kill: `Kill SPID ${x}`,
    rerun: `Rerun job ${x}`,
    approve: `Approve ${x}`,
    reject: `Reject ${x}`,
    ps: x === "lockout" ? `PowerShell lockout log (${y || x})` : x === "findchen" ? "PowerShell find Maya Chen" : `PowerShell ${[x, y].filter(Boolean).join(" ")}`,
    sql: x === "who" ? "SQL: show blocking sessions" : `SQL ${x}`,
    stigfix: x === "telnet" ? "Disable Telnet (lab STIG)" : x === "guest" ? "Remove Guest from Administrators" : x === "expire" ? "Clear password-never-expires" : `STIG fix ${x}`,
    pcapfind: x === "dns" ? "Mark public-DNS frames" : x === "clear" ? "Mark cleartext HTTP auth" : x === "scan" ? "Mark SYN sweep at DC" : x === "dhcp" ? "Mark DHCP Discover / no Offer" : `Mark ${x} in capture`,
    resetacct: `Reset computer account ${x}`,
    rejoin: `Rejoin ${x} to the domain`,
    nacrelease: `Release NAC on ${x}`,
  };
  return map[kind] || a;
}

function renderMsg(m) {
  if (m.role === "system") return `<div class="bubble system">${escapeHtml(m.body)} · ${relTime(m.at)}</div>`;
  return `<div class="bubble ${m.role === "agent" ? "agent" : ""}"><div class="who">${escapeHtml(m.author)} · ${relTime(m.at)}</div>${escapeHtml(m.body)}</div>`;
}

function viewCampus() {
  return `<div class="page">
    <div class="page-title"><div>
      <div class="eyebrow">MSP campus · six clients</div>
      <h1>Pick a desk</h1>
      <p>You cover Northwind plus five client companies. Claim client tickets, pick the right directory, and check out a jump cred before you RDP. Same scripted cases each Reset lab.</p>
    </div></div>
    <div class="campus-grid">${DESK_META.map((d) => `<a class="campus-card" href="#/${d.id}">
      <div class="eyebrow">${openCount(d.id)} open</div>
      <h2>${escapeHtml(d.name)}</h2>
      <p>${escapeHtml(d.blurb)}</p>
    </a>`).join("")}</div>
  </div>`;
}

function viewDesk(desk, ticketId) {
  const meta = deskMeta(desk);
  let list = [...(state[desk]?.tickets || [])];
  if (ui.filter !== "all") {
    if (["open", "resolved", "escalated"].includes(ui.filter)) list = list.filter((t) => t.status === ui.filter);
    else if (ui.filter.startsWith("p")) list = list.filter((t) => t.priority === ui.filter);
    else list = list.filter((t) => t.channel === ui.filter);
  }
  const picked = ticketId && ticketById(ticketId);
  const selected = picked && deskOf(picked) === desk ? picked : null;
  if (selected) ui.selected = selected.id;
  const working = Boolean(selected);
  const filters = ["all", "open", "voice", "email", "chat", "p1", "p2"];
  return `<div class="page inbox-page">
    <div class="page-title">
      <div>
        <div class="eyebrow">${escapeHtml(meta.name)}</div>
        <h1>${working ? selected.id : escapeHtml(meta.name)}</h1>
        <p>${working
          ? "1 Confirm identity · 2 Open console · 3 Notes · 4 Resolve or Escalate."
          : `${escapeHtml(meta.blurb)} ${list.length} items. Click a ticket — you only get the console that case needs.`}</p>
      </div>
      ${working ? `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" data-action="tickets-peek">${ui.ticketListPeek ? "Hide tickets" : "Tickets"}</button>
        <button class="btn btn-yellow" data-action="console-open">Open console</button>
        <button class="btn btn-ghost" data-action="ticket-card-open">Ticket card</button>
        <button class="btn btn-ghost" data-action="back-queue">← Back to queue</button>
      </div>` : `<a class="btn btn-ghost" href="#/campus">Campus</a>`}
    </div>
    <div class="split ${working ? "work-focus" : ""} ${working && ui.ticketListPeek ? "list-peek" : ""}">
      <div class="ticket-list">
        <div class="filters">${filters.map((f) => `<button class="filter ${ui.filter === f ? "on" : ""}" data-action="filter" data-filter="${f}">${f}</button>`).join("")}</div>
        ${list.map((t) => ticketRow(t, selected?.id === t.id)).join("") || `<div class="empty">No tickets match.</div>`}
      </div>
      ${selected ? ticketPane(selected) : `<div class="empty">Pick a ticket. Identity and that case's console open next — not every tool at once.</div>`}
    </div>
    ${working && ui.consoleOpen ? viewConsoleModal(desk, selected) : ""}
    ${selected && ui.ticketCardOpen ? viewTicketCardModal(selected) : ""}
  </div>`;
}

function viewDeskConsole(desk, ticket) {
  if (desk === "cloud") return viewCloudConsole(ticket);
  if (desk === "access") return viewAccessConsole(ticket);
  if (desk === "soc") return viewSocConsole(ticket);
  if (desk === "noc") return viewNocConsole(ticket);
  if (desk === "dba") return viewDbaConsole(ticket);
  if (desk === "change") return viewChangeConsole(ticket);
  if (desk === "stig") return viewStigConsole(ticket);
  if (desk === "pcap") return viewPcapConsole(ticket);
  return "";
}

function reqArg(ticket, kind) {
  const row = (ticket?.required || []).find((a) => a === kind || a.startsWith(`${kind}:`));
  return row ? row.slice(kind.length + 1) : "";
}

function deskConsoleWrap(hint, body) {
  return `<div class="desk-console">
    <div class="eyebrow">This ticket's console</div>
    <p class="desk-hint">${escapeHtml(hint)}</p>
    <div style="margin-top:10px">${body}</div>
  </div>`;
}

function viewConsoleModal(desk, ticket) {
  return `<div class="modal-backdrop" data-action="console-close">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="console-title">
      <div class="modal-bar">
        <strong id="console-title">Console · ${escapeHtml(ticket.id)}</strong>
        <button class="btn btn-ghost btn-sm" data-action="console-close" aria-label="Close">×</button>
      </div>
      <div class="modal-body">${viewDeskConsole(desk, ticket)}</div>
    </div>
  </div>`;
}

function ticketStatusLine(t) {
  const parts = [t.status || "open"];
  if (t.claimed === false) parts.push("unclaimed");
  else if (t.claimed) parts.push("claimed");
  if (t.identityVerified) parts.push("identity confirmed");
  if (t.verified) parts.push("verified");
  else if (t.status && t.status !== "open") parts.push("unverified close");
  return parts.join(" · ");
}

function viewTicketCardModal(t) {
  const desk = deskMeta(deskOf(t));
  const client = tenantOf(t);
  const steps = (t.required || [])
    .map((a) => {
      const done = (t.done || []).includes(a);
      return `<li class="${done ? "done" : ""}">${done ? "✓" : "○"} ${escapeHtml(labelAction(a))}</li>`;
    })
    .join("");
  const row = (label, value) =>
    `<tr><th>${escapeHtml(label)}</th><td>${value}</td></tr>`;
  return `<div class="modal-backdrop" data-action="ticket-card-close">
    <div class="modal ticket-card-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-card-title">
      <div class="modal-bar">
        <strong id="ticket-card-title">Ticket card · ${escapeHtml(t.id)}</strong>
        <div class="ticket-card-actions">
          <button class="btn btn-yellow btn-sm" data-action="export" data-id="${t.id}">Export write-up</button>
          <button class="btn btn-ghost btn-sm" data-action="ticket-card-print">Print</button>
          <button class="btn btn-ghost btn-sm" data-action="ticket-card-close" aria-label="Close">×</button>
        </div>
      </div>
      <div class="modal-body ticket-card-body">
        <article class="ticket-card-sheet">
          <header class="ticket-card-head">
            <div>
              <div class="ticket-card-brand">SysDesk ticket</div>
              <div class="ticket-card-sub">${escapeHtml(desk.name)} · ${escapeHtml(client.short)}</div>
            </div>
            <div class="ticket-card-id">${escapeHtml(t.id)}</div>
          </header>
          <table class="ticket-card-table">
            ${row("Ticket ID", escapeHtml(t.id))}
            ${row("Desk", escapeHtml(desk.name))}
            ${row("Client", escapeHtml(client.name))}
            ${row("Channel / priority", `${escapeHtml(CHANNEL_LABEL[t.channel] || t.channel)} · ${escapeHtml((t.priority || "").toUpperCase())}`)}
            ${row("Caller", escapeHtml(t.caller?.name || ""))}
            ${row("SAM", escapeHtml(t.caller?.sam || ""))}
            ${row("Host", escapeHtml(t.caller?.host || ""))}
            ${row("Subject", escapeHtml(t.subject || ""))}
            ${row("Situation", escapeHtml(t.preview || ""))}
            ${row("Required work", `<ul class="ticket-card-steps">${steps || "<li>—</li>"}</ul>`)}
            ${row("Status", escapeHtml(ticketStatusLine(t)))}
          </table>
          <footer class="ticket-card-foot">Simulated SysDesk / Northwind MSP lab. Not employment at Northwind or a client.</footer>
        </article>
      </div>
    </div>
  </div>`;
}

function viewCloudConsole(ticket) {
  const req = ticket?.required || [];
  const startTarget = req.find((a) => a.startsWith("start:"))?.split(":")[1];
  const keyTarget = req.find((a) => a.startsWith("disablekey:"))?.split(":")[1];
  const sgTarget = req.find((a) => a.startsWith("lockssh:"))?.split(":")[1];
  const hint = ticket?.labHint
    || (startTarget && `Start ${startTarget}. Leave IAM and SSH alone.`)
    || (keyTarget && `Disable ${keyTarget}. Do not start VMs or change SSH.`)
    || (sgTarget && `Lock SSH on ${sgTarget}. Do not disable keys or start instances.`)
    || "Confirm identity, then use this console.";
  const instances = `<div class="card" style="overflow:auto">
        <label>Instances</label>
        <table class="table"><thead><tr><th>Name</th><th>State</th><th></th></tr></thead>
        <tbody>${state.cloud.vms.map((v) => `<tr class="${v.name === startTarget ? "focus" : ""}">
          <td><code>${escapeHtml(v.name)}</code><div style="font-size:11px;color:var(--muted)">${escapeHtml(v.type)} · ${escapeHtml(v.az)}</div></td>
          <td>${v.state === "running" ? `<span class="badge-on">running</span>` : `<span class="badge-off">${escapeHtml(v.state)}</span>`}</td>
          <td>${v.state !== "running" ? `<button class="btn btn-sm btn-yellow" data-action="cld-start" data-name="${escapeHtml(v.name)}">Start</button>` : ""}</td>
        </tr>`).join("")}</tbody></table>
      </div>`;
  const iam = `<div class="card" style="overflow:auto">
        <label>IAM keys</label>
        ${state.cloud.iam.map((u) => `<div class="skill ${u.keys.some((k) => k.id === keyTarget) ? "focus" : ""}" style="align-items:flex-start">
          <span><strong>${escapeHtml(u.user)}</strong><div style="font-size:11px;color:var(--muted)">MFA ${u.mfa ? "on" : "off"} · ${escapeHtml(u.last)}</div>
          ${u.keys.map((k) => `<div style="font-size:12px;margin-top:4px"><code>${escapeHtml(k.id)}</code> ${k.leaked ? `<span class="badge-off">leaked</span>` : ""} <span class="${k.status === "Active" ? "badge-on" : "badge-off"}">${escapeHtml(k.status)}</span>
          ${k.status === "Active" ? `<button class="btn btn-sm btn-bad" data-action="cld-disablekey" data-key="${escapeHtml(k.id)}">Disable</button>` : ""}</div>`).join("")}</span>
        </div>`).join("")}
      </div>`;
  const sgs = `<div class="card" style="overflow:auto">
        <label>Security groups</label>
        ${state.cloud.sgs.map((sg) => `<div class="${sg.id === sgTarget ? "focus-block" : ""}" style="margin-bottom:10px"><strong>${escapeHtml(sg.id)}</strong>
          ${sg.rules.map((r) => `<div style="font-size:12px;color:var(--muted);display:flex;justify-content:space-between;gap:8px;margin-top:4px">
            <span>${escapeHtml(r.proto)}/${escapeHtml(r.port)} ← ${escapeHtml(r.cidr)} ${r.ok ? "" : "⚠"}</span>
            ${r.port === "22" && r.cidr === "0.0.0.0/0" ? `<button class="btn btn-sm btn-yellow" data-action="cld-lockssh" data-sg="${escapeHtml(sg.id)}">Lock SSH</button>` : ""}
          </div>`).join("")}
        </div>`).join("")}
      </div>`;
  const panels = [startTarget && instances, keyTarget && iam, sgTarget && sgs].filter(Boolean);
  return `<div class="desk-console">
    <div class="eyebrow">This ticket's console</div>
    <p class="desk-hint">${escapeHtml(hint)}</p>
    <div class="${panels.length > 1 ? "grid-3" : ""}" style="margin-top:10px">
      ${panels.join("") || instances}
    </div>
  </div>`;
}

function viewAccessConsole(ticket) {
  const grant = reqArg(ticket, "grantdoor").split(":").filter(Boolean);
  const [grantBadge, grantDoor] = grant;
  const reboot = reqArg(ticket, "rebootctrl");
  const disable = reqArg(ticket, "disablebadge");
  const hint = ticket?.labHint
    || (grantBadge && `Grant ${grantDoor} on badge ${grantBadge}. Leave other badges and controllers alone.`)
    || (reboot && `Reboot ${reboot}. Do not change badges.`)
    || (disable && `Disable badge ${disable}. Do not grant doors or touch AD.`)
    || "Confirm identity, then use this console.";
  const doors = state.access.doors.filter((d) => reboot && d.controller === reboot);
  const badges = state.access.badges.filter((b) => b.id === grantBadge || b.id === disable);
  const doorCard = doors.length ? `<div class="card" style="overflow:auto">
        <label>Controller</label>
        <table class="table"><thead><tr><th>Door</th><th>Controller</th><th></th></tr></thead>
        <tbody>${doors.map((d) => `<tr class="focus">
          <td>${escapeHtml(d.name)} <code>${escapeHtml(d.id)}</code></td>
          <td>${escapeHtml(d.controller)} ${d.online ? `<span class="badge-on">online</span>` : `<span class="badge-off">offline</span>`}</td>
          <td>${d.online ? "" : `<button class="btn btn-sm btn-yellow" data-action="acs-reboot" data-ctrl="${escapeHtml(d.controller)}">Reboot</button>`}</td>
        </tr>`).join("")}</tbody></table>
      </div>` : "";
  const badgeCard = badges.length ? `<div class="card" style="overflow:auto">
        <label>Badge</label>
        ${badges.map((b) => `<div class="skill focus" style="align-items:flex-start;flex-wrap:wrap">
          <span><strong>${escapeHtml(b.name)}</strong> ${escapeHtml(b.id)} · ${b.status === "active" ? `<span class="badge-on">active</span>` : `<span class="badge-off">disabled</span>`}
          <div style="font-size:12px;color:var(--muted)">Doors: ${b.doors.length ? b.doors.map(escapeHtml).join(", ") : "none"}</div></span>
          <span style="display:flex;gap:6px;flex-wrap:wrap">
            ${disable === b.id && b.status === "active" ? `<button class="btn btn-sm btn-bad" data-action="acs-disable" data-badge="${escapeHtml(b.id)}">Disable</button>` : ""}
            ${grantBadge === b.id && grantDoor && !b.doors.includes(grantDoor) ? `<button class="btn btn-sm btn-yellow" data-action="acs-grant" data-badge="${escapeHtml(b.id)}" data-door="${escapeHtml(grantDoor)}">Grant ${escapeHtml(grantDoor)}</button>` : ""}
          </span>
        </div>`).join("")}
      </div>` : "";
  return deskConsoleWrap(hint, doorCard + badgeCard);
}

function viewSocConsole(ticket) {
  const isolateHost = reqArg(ticket, "isolate");
  const falsePos = reqArg(ticket, "falsepos");
  const alerts = state.soc.alerts.filter((a) => (isolateHost && a.host === isolateHost) || (falsePos && a.id === falsePos));
  const hint = ticket?.labHint
    || (isolateHost && `Isolate ${isolateHost}. Do not mark this as a false positive.`)
    || (falsePos && `Close ${falsePos} as false positive if it matches the lockout. Do not isolate.`)
    || "Confirm identity, then use this console.";
  return deskConsoleWrap(hint, `<div class="card" style="overflow:auto">
      <label>Alert</label>
      <table class="table"><thead><tr><th>Alert</th><th>Host</th><th>Rule</th><th>Status</th><th></th></tr></thead>
      <tbody>${(alerts.length ? alerts : state.soc.alerts).map((a) => `<tr class="focus">
        <td><code>${escapeHtml(a.id)}</code> <span class="pill pr-${a.sev === "high" ? "p1" : "p2"}">${escapeHtml(a.sev)}</span></td>
        <td>${escapeHtml(a.host)}${state.isolated.includes(a.host) ? ` <span class="badge-off">isolated</span>` : ""}</td>
        <td>${escapeHtml(a.rule)}</td>
        <td>${escapeHtml(a.status)}</td>
        <td>
          ${isolateHost === a.host ? `<button class="btn btn-sm btn-bad" data-action="soc-isolate" data-host="${escapeHtml(a.host)}">Isolate</button>` : ""}
          ${falsePos === a.id ? `<button class="btn btn-sm btn-ghost" data-action="soc-falsepos" data-alert="${escapeHtml(a.id)}">False positive</button>` : ""}
        </td>
      </tr>`).join("")}</tbody></table>
    </div>`);
}

function viewNocConsole(ticket) {
  const bounce = reqArg(ticket, "bounce");
  const escalate = (ticket?.required || []).some((a) => a.startsWith("escalate:"));
  const circuits = bounce
    ? state.noc.circuits.filter((c) => c.id === bounce)
    : escalate
      ? state.noc.circuits.filter((c) => c.id === ticket.caller.host)
      : state.noc.circuits;
  const hint = ticket?.labHint
    || (bounce && `Bounce ${bounce}. Leave other circuits alone.`)
    || (escalate && "Do not bounce this circuit. Escalate to the carrier / WAN.")
    || "Confirm identity, then use this console.";
  return deskConsoleWrap(hint, `<div class="card" style="overflow:auto">
      <label>Circuit</label>
      <table class="table"><thead><tr><th>Circuit</th><th>State</th><th>Latency</th><th>Loss</th><th></th></tr></thead>
      <tbody>${circuits.map((c) => `<tr class="focus">
        <td>${escapeHtml(c.name)} <code>${escapeHtml(c.id)}</code></td>
        <td>${c.state === "up" ? `<span class="badge-on">up</span>` : `<span class="badge-off">${escapeHtml(c.state)}</span>`}</td>
        <td>${escapeHtml(c.latency)}</td>
        <td>${escapeHtml(c.loss)}</td>
        <td>${bounce === c.id ? `<button class="btn btn-sm btn-yellow" data-action="noc-bounce" data-id="${escapeHtml(c.id)}">Bounce</button>` : escalate ? `<span style="font-size:12px;color:var(--warn)">Do not bounce</span>` : ""}</td>
      </tr>`).join("")}</tbody></table>
    </div>`);
}

function viewDbaConsole(ticket) {
  const kill = reqArg(ticket, "kill");
  const rerun = reqArg(ticket, "rerun");
  const needSql = (ticket?.required || []).some((a) => a.startsWith("sql:"));
  const escalate = (ticket?.required || []).some((a) => a.startsWith("escalate:"));
  const hint = ticket?.labHint
    || (needSql && kill && `Run a blocking query, then Kill SPID ${kill}. Do not CREATE INDEX.`)
    || (kill && `Kill SPID ${kill}. Do not restart SQL or add an index.`)
    || (rerun && `Rerun ${rerun}. If it fails again, escalate — do not edit SSIS.`)
    || (escalate && "This is a change. Escalate. Do not add an index from the help desk.")
    || "Confirm identity, then use this console.";
  const sessions = kill ? state.dba.sessions.filter((s) => String(s.spid) === String(kill)) : [];
  const jobs = rerun ? state.dba.jobs.filter((j) => j.id === rerun) : [];
  const sessionCard = (sessions.length || needSql) ? `<div class="card" style="overflow:auto">
        <label>Sessions</label>
        <table class="table"><thead><tr><th>SPID</th><th>Wait</th><th>SQL</th><th></th></tr></thead>
        <tbody>${(sessions.length ? sessions : state.dba.sessions).map((s) => `<tr class="${String(s.spid) === String(kill) ? "focus" : ""}">
          <td>${s.spid} ${s.blocking ? `<span class="badge-off">blocking</span>` : ""}</td>
          <td>${escapeHtml(s.wait)} · ${escapeHtml(s.user)}</td>
          <td style="font-size:12px">${escapeHtml(s.sql)}</td>
          <td>${kill && String(s.spid) === String(kill) ? `<button class="btn btn-sm btn-bad" data-action="dba-kill" data-spid="${s.spid}">Kill</button>` : ""}</td>
        </tr>`).join("") || `<tr><td colspan="4">No sessions</td></tr>`}</tbody></table>
      </div>` : "";
  const jobCard = jobs.length ? `<div class="card" style="overflow:auto">
        <label>Job</label>
        ${jobs.map((j) => `<div class="skill focus">
          <span><strong>${escapeHtml(j.name)}</strong><div style="font-size:12px;color:var(--muted)">${escapeHtml(j.id)} · last ${escapeHtml(j.last)} · ${escapeHtml(j.step)}</div></span>
          <button class="btn btn-sm btn-yellow" data-action="dba-rerun" data-job="${escapeHtml(j.id)}">Rerun</button>
        </div>`).join("")}
      </div>` : "";
  const sqlBox = needSql ? `<form class="card" data-form="sql" style="margin-top:12px">
      <label>SQL (simulated Northwind — not production)</label>
      <textarea name="sql" placeholder="sp_who2&#10;SELECT blocking_session_id, session_id FROM sys.dm_exec_requests&#10;KILL 88">${escapeHtml(ui.sqlDraft || "")}</textarea>
      <button class="btn btn-yellow btn-sm" type="submit" style="margin-top:8px">Run query</button>
      <pre class="term" style="margin-top:10px;min-height:120px">${escapeHtml(ui.sqlLog)}</pre>
    </form>` : "";
  const none = escalate && !kill && !rerun && !needSql
    ? `<p class="desk-hint">No console action. Escalate this ticket.</p>` : "";
  return deskConsoleWrap(hint, sessionCard + jobCard + sqlBox + none);
}

function viewChangeConsole(ticket) {
  const rows = state.change.tickets.filter((t) => !ticket || t.id === ticket.id);
  const hint = ticket?.labHint
    || ((ticket?.required || []).some((a) => a.startsWith("approve:")) && "Approve if it is a standard change with a /32, a backout, and a window.")
    || ((ticket?.required || []).some((a) => a.startsWith("reject:")) && "Reject this. No snapshot and 'reboot if it breaks' is not a backout.")
    || "Confirm identity, then approve or reject.";
  return deskConsoleWrap(hint, `${rows.map((t) => `<div class="card">
        <div class="eyebrow">${escapeHtml(t.id)}</div>
        <h3 style="margin:6px 0">${escapeHtml(t.subject)}</h3>
        <p style="color:var(--muted);font-size:13px">${escapeHtml(t.preview)}</p>
        <div style="display:flex;gap:8px;margin-top:10px">
          ${(t.required || []).some((a) => a.startsWith("approve:")) ? `<button class="btn btn-sm btn-ok" data-action="chg-approve" data-id="${t.id}">Approve</button>` : ""}
          ${(t.required || []).some((a) => a.startsWith("reject:")) ? `<button class="btn btn-sm btn-bad" data-action="chg-reject" data-id="${t.id}">Reject</button>` : ""}
        </div>
      </div>`).join("")}`);
}

function viewStigConsole(ticket) {
  const fix = reqArg(ticket, "stigfix");
  const escalate = (ticket?.required || []).some((a) => a.startsWith("escalate:"));
  const rows = [
    { id: "V-LAB-TELNET", cat: "I", title: "Telnet must be disabled on NW-FS-01", ok: !state.stig.telnet, action: "telnet" },
    { id: "V-LAB-ADMIN", cat: "I", title: "Guest must not be in Administrators (NW-WS-3304)", ok: !state.stig.guestAdmin, action: "guest" },
    { id: "V-LAB-PEXPIRE", cat: "II", title: "batch-nw must not have PasswordNeverExpires", ok: !state.stig.neverExpire, action: "expire" },
    { id: "V-LAB-DC", cat: "I", title: "Apply full STIG checklist to NW-DC-01 today", ok: false, action: "dc" },
  ].filter((r) => (fix && r.action === fix) || (escalate && r.action === "dc"));
  const hint = ticket?.labHint
    || (fix === "telnet" && "Disable Telnet on the file server. Lab control — not a live DISA scan.")
    || (fix === "guest" && "Remove Guest from Administrators. Do not add anyone to Domain Admins.")
    || (fix === "expire" && "Clear password-never-expires. Do not email a new password.")
    || (escalate && "Do not STIG the DC with no window. Escalate.")
    || "Confirm identity, then use this console.";
  return deskConsoleWrap(hint, `<div class="card" style="overflow:auto">
      <table class="table"><thead><tr><th>Control</th><th>CAT</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((r) => `<tr class="focus">
        <td><code>${escapeHtml(r.id)}</code><div style="font-size:12px;color:var(--muted)">${escapeHtml(r.title)}</div></td>
        <td><span class="pill pr-${r.cat === "I" ? "p1" : "p2"}">CAT ${r.cat}</span></td>
        <td>${r.ok ? `<span class="badge-on">closed</span>` : `<span class="badge-off">open</span>`}</td>
        <td>${r.action === "dc"
          ? `<button class="btn btn-sm btn-bad" data-action="stig-fix" data-kind="dc">Escalate — do not DIY</button>`
          : r.ok ? "" : `<button class="btn btn-sm btn-yellow" data-action="stig-fix" data-kind="${r.action}">Remediate</button>`}</td>
      </tr>`).join("")}</tbody></table>
    </div>`);
}

function viewPcapConsole(ticket) {
  const find = reqArg(ticket, "pcapfind");
  const q = ui.pcapFilter.trim().toLowerCase();
  const frames = state.pcap.frames.filter((f) => !q || `${f.proto} ${f.src} ${f.dst} ${f.info}`.toLowerCase().includes(q));
  const hint = ticket?.labHint
    || (find === "dns" && "Find the frames that explain the dead share. Public DNS is the finding.")
    || (find === "clear" && "Find cleartext HTTP auth. That is an app-team escalate — mark the frame.")
    || (find === "scan" && "Find the SYN sweep at the DC, then isolate from SOC — mark the frame here.")
    || (find === "dhcp" && "Find DHCP Discover with no Offer. That is the lease, not a WAN bounce.")
    || "Filter the capture, then mark the finding.";
  return deskConsoleWrap(hint, `<form class="search" data-form="pcap" style="margin:0 0 10px"><input name="q" placeholder="Filter: dns, http, dhcp, 10.20.0.11…" value="${escapeHtml(ui.pcapFilter)}"></form>
    <div class="card" style="overflow:auto">
      <table class="table"><thead><tr><th>#</th><th>Time</th><th>Source</th><th>Dest</th><th>Proto</th><th>Info</th><th></th></tr></thead>
      <tbody>${frames.map((f) => `<tr class="${find && f.tag === find ? "focus" : ""}">
        <td>${f.id}</td>
        <td>${escapeHtml(f.time)}</td>
        <td><code>${escapeHtml(f.src)}</code></td>
        <td><code>${escapeHtml(f.dst)}</code></td>
        <td>${escapeHtml(f.proto)}</td>
        <td style="font-size:12px">${escapeHtml(f.info)}</td>
        <td>${f.tag !== "noise" ? `<button class="btn btn-sm btn-yellow" data-action="pcap-mark" data-tag="${escapeHtml(f.tag)}">This is the finding</button>` : ""}</td>
      </tr>`).join("")}</tbody></table>
    </div>`);
}

function viewDirectory() {
  const q = ui.dirQuery.toLowerCase();
  const rows = state.directory.filter((u) => {
    if (ui.dirTenant !== "all" && (u.tenant || "nw") !== ui.dirTenant) return false;
    return !q || `${u.sam} ${u.name} ${u.ou} ${u.groups.join(" ")} ${tenantById(u.tenant || "nw").name}`.toLowerCase().includes(q);
  });
  const t = ticketById(ui.selected);
  return `<div class="page">
    <div class="page-title"><div><div class="eyebrow">Multi-tenant directory</div><h1>Active Directory</h1><p>Six client directories. Same display name can exist twice — unlock the SAM on the ticket.${t ? ` Working ${t.id} (${t.caller.sam} · ${escapeHtml(tenantOf(t).short)}).` : ""}</p></div></div>
    ${state.lastTempPw ? `<div class="callout" style="margin-bottom:14px">Temp password for <strong>${escapeHtml(state.lastTempPw.sam)}</strong>: <strong>${escapeHtml(state.lastTempPw.pw)}</strong> — read it on voice/chat. Do not email it. User must change at next logon.</div>` : ""}
    <div class="filters" style="padding:0 0 10px">${[{ id: "all", short: "All clients" }, ...TENANTS].map((tn) => `<button class="filter ${ui.dirTenant === tn.id ? "on" : ""}" data-action="dir-tenant" data-tenant="${tn.id}">${escapeHtml(tn.short)}</button>`).join("")}</div>
    <form class="search" data-form="dir" style="margin-bottom:14px"><input name="q" placeholder="Search SAM, name, client…" value="${escapeHtml(ui.dirQuery)}"></form>
    <div class="card" style="overflow:auto">
      <table class="table">
        <thead><tr><th>Client</th><th>SAM</th><th>Name</th><th>OU</th><th>Status</th><th>Groups</th><th>Actions</th></tr></thead>
        <tbody>${rows.map((u) => `<tr>
          <td><span class="pill tn">${escapeHtml(tenantById(u.tenant || "nw").short)}</span></td>
          <td><code>${escapeHtml(u.sam)}</code></td>
          <td>${escapeHtml(u.name)}<div style="font-size:11px;color:var(--muted)">${escapeHtml(u.title)} · ${escapeHtml(u.computer)}</div></td>
          <td>${escapeHtml(u.ou)}</td>
          <td>${u.locked ? `<span class="badge-off">Locked</span>` : `<span class="badge-on">Unlocked</span>`}<br>${u.enabled ? "Enabled" : `<span class="badge-off">Disabled</span>`}${u.pwdExpired ? "<br>Pwd expired" : ""}</td>
          <td style="font-size:12px">${u.groups.map((g) => escapeHtml(g)).join(", ")}</td>
          <td>
            <button class="btn btn-sm btn-ghost" data-action="ad-unlock" data-sam="${u.sam}">Unlock</button>
            <button class="btn btn-sm btn-ghost" data-action="ad-reset" data-sam="${u.sam}">Reset pwd</button>
            <button class="btn btn-sm btn-ghost" data-action="ad-enable" data-sam="${u.sam}">Enable</button>
            <form data-form="ad-group" data-sam="${u.sam}" style="margin-top:6px;display:flex;gap:4px">
              <select name="group">${AD_GROUPS.filter((g) => !u.groups.includes(g)).map((g) => `<option>${g}</option>`).join("")}</select>
              <button class="btn btn-sm btn-yellow" type="submit">Add group</button>
            </form>
          </td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
    <div class="page-title" style="margin-top:22px"><div><div class="eyebrow">Computer objects</div><h1 style="font-size:20px">Domain join / NAC</h1><p>Reset the computer account, then rejoin. Release NAC only for a compliance quarantine — not a SOC isolate.</p></div></div>
    <div class="card" style="overflow:auto">
      <table class="table">
        <thead><tr><th>Client</th><th>Host</th><th>User</th><th>Trust</th><th>NAC</th><th>Actions</th></tr></thead>
        <tbody>${state.endpoints.filter((e) => {
          if (e.user === "SYSTEM") return false;
          if (ui.dirTenant !== "all" && hostTenant(e) !== ui.dirTenant) return false;
          return !q || `${e.host} ${e.user} ${e.note}`.toLowerCase().includes(q);
        }).map((e) => `<tr>
          <td><span class="pill tn">${escapeHtml(tenantById(hostTenant(e)).short)}</span></td>
          <td><code>${escapeHtml(e.host)}</code>${state.isolated.includes(e.host) ? ` <span class="badge-off">isolated</span>` : ""}</td>
          <td>${escapeHtml(e.user)}</td>
          <td>${hostTrust(e) === "broken" ? `<span class="badge-off">Trust failed</span>` : `<span class="badge-on">Joined</span>`}${e.acctReset === false ? "<br>Account not reset" : ""}</td>
          <td>${hostNac(e) === "quarantine" ? `<span class="badge-off">Quarantine</span>` : `<span class="badge-on">Corp VLAN</span>`}</td>
          <td>
            <button class="btn btn-sm btn-ghost" data-action="ad-resetacct" data-host="${escapeHtml(e.host)}">Reset computer account</button>
            <button class="btn btn-sm btn-ghost" data-action="ad-rejoin" data-host="${escapeHtml(e.host)}">Rejoin domain</button>
            <button class="btn btn-sm btn-yellow" data-action="ad-nacrelease" data-host="${escapeHtml(e.host)}">Release NAC</button>
          </td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
  </div>`;
}

function viewNetwork() {
  const host = hostByName(ui.netHost) || state.endpoints[0];
  return `<div class="page">
    <div class="page-title"><div><div class="eyebrow">Network diagnostics</div><h1>Network</h1><p>Ping, DNS, and adapter state against simulated Northwind hosts — not your real LAN.</p></div></div>
    <div class="grid-2">
      <div class="card">
        <label class="prop"><span style="display:block;font-size:11px;font-weight:800;color:var(--muted);margin-bottom:6px">HOST</span>
          <select data-action="net-host">${hostOptions(host.host)}${state.endpoints.filter((e) => e.user === "SYSTEM").map((e) => `<option ${e.host === host.host ? "selected" : ""}>${e.host}</option>`).join("")}</select>
        </label>
        <p style="color:var(--muted);font-size:13px">${escapeHtml(host.ip)} · ${host.online ? "online" : "offline"} · DNS ${host.dns ? "corp 10.20.0.11" : "public 8.8.8.8"} · trust ${escapeHtml(hostTrust(host))} · NAC ${escapeHtml(hostNac(host))}${state.isolated.includes(host.host) ? " · isolated" : ""} · ${escapeHtml(host.note)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button class="btn btn-yellow btn-sm" data-action="net-ping">ping</button>
          <button class="btn btn-ghost btn-sm" data-action="net-dns">nslookup nw-fs-01</button>
          <button class="btn btn-ghost btn-sm" data-action="net-ip">ipconfig</button>
          <button class="btn btn-ok btn-sm" data-action="net-fixdns">Set DNS to DC (10.20.0.11)</button>
          <button class="btn btn-ghost btn-sm" data-action="ad-resetacct" data-host="${escapeHtml(host.host)}">Reset computer account</button>
          <button class="btn btn-ghost btn-sm" data-action="ad-rejoin" data-host="${escapeHtml(host.host)}">Rejoin domain</button>
          <button class="btn btn-yellow btn-sm" data-action="ad-nacrelease" data-host="${escapeHtml(host.host)}">Release NAC</button>
        </div>
      </div>
      <pre class="term">${escapeHtml(ui.netLog)}</pre>
    </div>
  </div>`;
}

function hostOptions(selected) {
  return TENANTS.map((tn) => {
    const hosts = state.endpoints.filter((e) => e.user !== "SYSTEM" && hostTenant(e) === tn.id);
    if (!hosts.length) return "";
    return `<optgroup label="${escapeHtml(tn.name)}">${hosts.map((e) => `<option ${e.host === selected ? "selected" : ""}>${e.host}</option>`).join("")}</optgroup>`;
  }).join("");
}

function viewRemote() {
  const host = hostByName(ui.rdpHost) || hostByName("NW-WS-0881");
  const ten = tenantById(hostTenant(host));
  const cred = state.vault[ten.id];
  const live = ui.rdpConnected && ui.rdpHost === host.host;
  return `<div class="page">
    <div class="page-title"><div><div class="eyebrow">Remote · vault</div><h1>Remote</h1><p>Simulated session. Client PCs need a jump cred from the vault first. Northwind internal hosts do not.</p></div></div>
    <div class="grid-2">
      <div class="card">
        <label class="prop"><span style="display:block;font-size:11px;font-weight:800;color:var(--muted);margin-bottom:6px">WORKSTATION</span>
          <select data-action="rdp-host">${hostOptions(host.host)}</select>
        </label>
        <p style="color:var(--muted);font-size:13px;margin:10px 0">${escapeHtml(ten.short)} · ${escapeHtml(host.host)} · ${escapeHtml(host.user)} · DHCP ${host.dhcpStale ? "stale" : "ok"} · Defender ${escapeHtml(host.defender || "n/a")}</p>
        ${ten.jump
          ? cred
            ? `<div class="verified" style="margin-bottom:10px">Vault · ${escapeHtml(cred.user)} / ${escapeHtml(cred.pw)}</div>`
            : `<button class="btn btn-ghost btn-sm" data-action="vault" data-tenant="${ten.id}" style="margin-bottom:10px">Check out ${escapeHtml(ten.short)} jump cred</button>`
          : `<p style="font-size:12px;color:var(--muted)">Internal Northwind — no vault checkout.</p>`}
        ${live
          ? `<div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-ok btn-sm" data-action="rdp-spooler">Start Print Spooler</button>
              <button class="btn btn-yellow btn-sm" data-action="rdp-vpn">Clear stale VPN profile</button>
              <button class="btn btn-yellow btn-sm" data-action="rdp-dhcp">ipconfig /renew</button>
              <button class="btn btn-ok btn-sm" data-action="rdp-defender">Start Defender</button>
              <button class="btn btn-ghost btn-sm" data-action="rdp-disconnect">Disconnect</button>
            </div>`
          : `<button class="btn btn-yellow" data-action="rdp-connect">Connect</button>`}
      </div>
      <div class="rdp">
        <div class="rdp-bar"><span>Remote Desktop · ${escapeHtml(ten.short)} · ${escapeHtml(host.host)}</span><span>${live ? "Connected" : "Disconnected"}</span></div>
        <div class="rdp-desk">
          ${live
            ? `<div class="rdp-win"><strong>Services</strong><p style="margin:8px 0;font-size:13px">Print Spooler: ${escapeHtml(host.spooler)}<br>Defender: ${escapeHtml(host.defender || "n/a")}<br>DHCP: ${host.dhcpStale ? "lease expired" : "ok"}<br>${escapeHtml(host.note)}</p></div>
               ${ui.rdpTerm ? `<pre class="term" style="margin-top:12px;min-height:80px">${escapeHtml(ui.rdpTerm)}</pre>` : ""}`
            : `<p style="color:#cfe1ff">Session not connected.${ten.jump && !cred ? " Check out the jump cred first." : ""}</p>`}
        </div>
        <div class="rdp-task"></div>
      </div>
    </div>
  </div>`;
}

function viewLabShell() {
  return `<div class="page">
    <div class="page-title"><div><div class="eyebrow">Lab consoles</div><h1>Shell</h1><p>Simulated PowerShell and T-SQL. Nothing runs on your PC. Use this for INC-2510 and DBA-5004.</p></div></div>
    <div class="grid-2">
      <form class="card" data-form="ps">
        <label>PowerShell</label>
        <p style="font-size:12px;color:var(--muted)">Get-ADUser jlee · Unlock-ADAccount -Identity jlee · Get-WinEvent lockout · Get-ADUser *Chen*</p>
        <textarea name="ps" placeholder="Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4740}">${escapeHtml(ui.psDraft || "")}</textarea>
        <button class="btn btn-yellow btn-sm" type="submit" style="margin-top:8px">Run</button>
        <pre class="term" style="margin-top:10px">${escapeHtml(ui.psLog)}</pre>
      </form>
      <form class="card" data-form="sql">
        <label>SQL · Northwind lab</label>
        <p style="font-size:12px;color:var(--muted)">sp_who2 · SELECT blocking · KILL 88 · SELECT TOP 5 FROM Orders. No CREATE INDEX / DROP / BACKUP.</p>
        <textarea name="sql" placeholder="sp_who2">${escapeHtml(ui.sqlDraft || "")}</textarea>
        <button class="btn btn-yellow btn-sm" type="submit" style="margin-top:8px">Run query</button>
        <pre class="term" style="margin-top:10px">${escapeHtml(ui.sqlLog)}</pre>
      </form>
    </div>
  </div>`;
}

function viewKnowledge() {
  const q = ui.kbQuery.toLowerCase();
  const list = [...kbArticles, ...LAB_KB].filter((a) => !q || `${a.title} ${a.body} ${a.category}`.toLowerCase().includes(q));
  return `<div class="page">
    <div class="page-title"><div><div class="eyebrow">Documentation</div><h1>Knowledge</h1><p>Procedures for verified resolutions. Read before you escalate, bounce a WAN circuit, or enable an account.</p></div></div>
    <form class="search" data-form="kb" style="margin-bottom:14px"><input name="q" placeholder="Search articles…" value="${escapeHtml(ui.kbQuery)}"></form>
    <div class="grid-2">${list.map((a) => `<article class="card"><div class="eyebrow">${escapeHtml(a.category)}</div><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.body)}</p></article>`).join("")}</div>
  </div>`;
}

function viewSkills() {
  const tickets = allTickets();
  const verified = tickets.filter((t) => t.verified);
  const counts = {};
  SKILLS.forEach((s) => (counts[s.id] = 0));
  verified.forEach((t) => (t.skills || []).forEach((id) => (counts[id] = (counts[id] || 0) + 1)));
  const open = tickets.filter((t) => t.status === "open").length;
  const unverified = tickets.filter((t) => t.status !== "open" && !t.verified).length;
  return `<div class="page">
    <div class="page-title"><div><div class="eyebrow">Skills you can speak to</div><h1>Lab score</h1><p>Only verified resolutions count. Closing without identity, the root fix, and notes stays unverified.</p></div></div>
    <div class="kpis">
      <div class="card kpi"><b>${open}</b><span>Open incidents</span></div>
      <div class="card kpi"><b>${verified.length}</b><span>Verified resolutions</span></div>
      <div class="card kpi"><b>${unverified}</b><span>Unverified closes</span></div>
      <div class="card kpi"><b>${state.directory.filter((u) => u.locked).length}</b><span>Locked accounts</span></div>
    </div>
    <div class="callout" style="margin-bottom:16px">Practiced Tier-1 / desktop support in a simulated MSP: incident ownership across six client companies, directory work without mixing tenants, jump-cred hygiene, remote troubleshooting, PowerShell / SQL lab consoles, plus campus desks — with documented, verified resolutions.</div>
    ${verified.length ? `<p style="margin:0 0 16px"><button class="btn btn-yellow" data-action="export-all">Export verified write-ups</button></p>` : ""}
    <div class="card">${SKILLS.map((s) => `<div class="skill"><span>${escapeHtml(s.label)}</span><b>${counts[s.id] || 0} verified</b></div>`).join("")}</div>
  </div>`;
}

function render() {
  const r = route();
  if (r.id) ui.selected = r.id;
  let inner = "";
  if (r.page === "campus") inner = viewCampus();
  else if (r.page === "directory") inner = viewDirectory();
  else if (r.page === "network") inner = viewNetwork();
  else if (r.page === "remote") inner = viewRemote();
  else if (r.page === "shell") inner = viewLabShell();
  else if (r.page === "knowledge") inner = viewKnowledge();
  else if (r.page === "skills") inner = viewSkills();
  else if (DESKS.includes(r.page)) inner = viewDesk(r.page, r.id);
  else inner = viewQueue(r.id);
  let html = viewShell(inner, r.page);
  if (state.toast) html += `<div class="toast">${escapeHtml(state.toast)}</div>`;
  document.getElementById("app").innerHTML = html;
  document.body.classList.toggle("ticket-card-open", Boolean(ui.ticketCardOpen));
}

function onClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  if (action === "mobile-nav") {
    ui.mobileNav = !ui.mobileNav;
    render();
  } else if (action === "filter") {
    ui.filter = el.dataset.filter;
    render();
  } else if (action === "queue-tenant") {
    ui.queueTenant = el.dataset.tenant;
    render();
  } else if (action === "dir-tenant") {
    ui.dirTenant = el.dataset.tenant;
    render();
  } else if (action === "claim") {
    claimTicket(el.dataset.id);
  } else if (action === "export") {
    exportWriteup(el.dataset.id);
  } else if (action === "export-all") {
    exportAllVerified();
  } else if (action === "vault") {
    vaultCheckout(el.dataset.tenant);
  } else if (action === "select") {
    const t = ticketById(el.dataset.id);
    ui.selected = el.dataset.id;
    ui.focusWork = true;
    ui.consoleOpen = false;
    ui.ticketCardOpen = false;
    ui.ticketListPeek = false;
    ui.noteDraft = t?.notes || "";
    go(`#/${deskOf(t)}/${el.dataset.id}`);
  } else if (action === "back-queue") {
    ui.focusWork = false;
    ui.consoleOpen = false;
    ui.ticketCardOpen = false;
    ui.ticketListPeek = false;
    go(`#/${deskOf(ticketById(ui.selected))}`);
  } else if (action === "console-open") {
    ui.consoleOpen = true;
    ui.ticketCardOpen = false;
    render();
  } else if (action === "console-close") {
    if (el.classList.contains("modal-backdrop") && e.target !== el) return;
    ui.consoleOpen = false;
    render();
  } else if (action === "ticket-card-open") {
    ui.ticketCardOpen = true;
    ui.consoleOpen = false;
    render();
  } else if (action === "ticket-card-close") {
    if (el.classList.contains("modal-backdrop") && e.target !== el) return;
    ui.ticketCardOpen = false;
    render();
  } else if (action === "ticket-card-print") {
    window.print();
  } else if (action === "tickets-peek") {
    ui.ticketListPeek = !ui.ticketListPeek;
    render();
  } else if (action === "nav-toggle") {
    ui.navCollapsed = !ui.navCollapsed;
    localStorage.setItem("sysdesk-nav-collapsed", ui.navCollapsed ? "1" : "0");
    render();
  } else if (action === "verify") {
    const t = ticketById(el.dataset.id);
    if (!t) return;
    if (needsClaim(t)) {
      toast("Claim the ticket before you change the client.");
      return;
    }
    t.identityVerified = true;
    markDone(t.id, `verify:${t.caller.sam}`);
    if (t.required.includes("noteonly")) markDone(t.id, "noteonly");
    appendMsg(t.id, "system", "system", `Identity confirmed: ${t.caller.name} / ${t.caller.sam} / ${t.caller.host}`);
    save();
    toast("Identity confirmed");
    render();
  } else if (action === "resolve") {
    closeTicket(el.dataset.id, "resolved");
  } else if (action === "escalate") {
    closeTicket(el.dataset.id, "escalated");
  } else if (action === "reset") {
    localStorage.removeItem(KEY);
    state = freshState();
    ui.selected = "INC-2401";
    ui.noteDraft = "";
    ui.netLog = "Lab reset.";
    ui.rdpConnected = false;
    ui.rdpTerm = "";
    ui.queueTenant = "all";
    ui.dirTenant = "all";
    ui.consoleOpen = false;
    ui.ticketCardOpen = false;
    ui.ticketListPeek = false;
    toast("Lab reset");
    go("#/queue/INC-2401");
    render();
  } else if (action === "ad-unlock") {
    adUnlock(el.dataset.sam);
  } else if (action === "ad-reset") {
    adReset(el.dataset.sam);
  } else if (action === "ad-enable") {
    adEnable(el.dataset.sam);
  } else if (action === "ad-resetacct") {
    resetComputerAccount(el.dataset.host);
  } else if (action === "ad-rejoin") {
    rejoinDomain(el.dataset.host);
  } else if (action === "ad-nacrelease") {
    releaseNac(el.dataset.host);
  } else if (action === "net-host") {
    ui.netHost = el.value;
    render();
  } else if (action === "net-ping") {
    netPing();
  } else if (action === "net-dns") {
    netDns();
  } else if (action === "net-ip") {
    netIp();
  } else if (action === "net-fixdns") {
    netFixDns();
  } else if (action === "rdp-host") {
    ui.rdpHost = el.value;
    ui.rdpConnected = false;
    render();
  } else if (action === "rdp-connect") {
    rdpConnect();
  } else if (action === "rdp-disconnect") {
    ui.rdpConnected = false;
    render();
  } else if (action === "rdp-spooler") {
    rdpSpooler();
  } else if (action === "rdp-vpn") {
    rdpVpn();
  } else if (action === "rdp-dhcp") {
    rdpDhcp();
  } else if (action === "rdp-defender") {
    rdpDefender();
  } else if (action === "cld-start") {
    cldStart(el.dataset.name);
  } else if (action === "cld-disablekey") {
    cldDisableKey(el.dataset.key);
  } else if (action === "cld-lockssh") {
    cldLockSsh(el.dataset.sg);
  } else if (action === "acs-grant") {
    acsGrant(el.dataset.badge, el.dataset.door);
  } else if (action === "acs-reboot") {
    acsReboot(el.dataset.ctrl);
  } else if (action === "acs-disable") {
    acsDisable(el.dataset.badge);
  } else if (action === "soc-isolate") {
    socIsolate(el.dataset.host);
  } else if (action === "soc-falsepos") {
    socFalsePos(el.dataset.alert);
  } else if (action === "noc-bounce") {
    nocBounce(el.dataset.id);
  } else if (action === "dba-kill") {
    dbaKill(el.dataset.spid);
  } else if (action === "dba-rerun") {
    dbaRerun(el.dataset.job);
  } else if (action === "chg-approve") {
    chgApprove(el.dataset.id);
  } else if (action === "chg-reject") {
    chgReject(el.dataset.id);
  } else if (action === "stig-fix") {
    stigFix(el.dataset.kind);
  } else if (action === "pcap-mark") {
    pcapMark(el.dataset.tag);
  }
}

function closeTicket(id, status) {
  const t = ticketById(id);
  if (!t || t.status !== "open") return;
  const ta = document.querySelector('form[data-form="notes"] textarea');
  if (ta) {
    t.notes = ta.value;
    ui.noteDraft = ta.value;
  } else {
    t.notes = (ui.noteDraft || t.notes || "").trim();
  }
  if (status === "escalated") markDone(t.id, `escalate:${t.id}`);
  if (t.required.includes("noteonly") && notesOk(t)) markDone(t.id, "noteonly");
  if (!notesOk(t)) {
    toast("Write a real work note (40+ characters) before you close.");
    render();
    return;
  }
  const missing = missingWork(t);
  t.status = status;
  t.resolution = t.notes;
  t.verified = missing.length === 0;
  if (status === "escalated" && !t.escalate) t.verified = false;
  if (status === "resolved" && t.escalate) t.verified = false;
  appendMsg(t.id, "system", "system", t.verified ? `${status} · verified resolution` : `${status} · unverified (${missing.map(labelAction).join("; ") || "wrong close path"})`);
  save();
  toast(t.verified ? "Verified resolution" : "Closed unverified — work incomplete or out of scope");
  render();
}

function adUnlock(sam) {
  const u = userBySam(sam);
  if (!u) return;
  const open = relatedOpen(sam) || ticketById(ui.selected);
  if (open && needsClaim(open)) {
    toast("Claim the ticket first.");
    return;
  }
  if (!u.locked) {
    toast(`${sam} is not locked`);
    return;
  }
  u.locked = false;
  const t = relatedOpen(sam);
  if (t) markDone(t.id, `unlock:${sam}`);
  save();
  toast(`Unlocked ${sam}`);
  render();
}

function adReset(sam) {
  const u = userBySam(sam);
  if (!u) return;
  const pw = "Nw#" + Math.random().toString(36).slice(2, 8);
  u.pwdExpired = false;
  state.lastTempPw = { sam, pw };
  const t = relatedOpen(sam);
  if (t) markDone(t.id, `resetpw:${sam}`);
  save();
  toast(`Password reset for ${sam}`);
  render();
}

function adEnable(sam) {
  const u = userBySam(sam);
  if (!u) return;
  if (u.ou === "Contractors" && !u.enabled) {
    toast("Out of scope — escalate to HR / IAM. Do not re-enable a disabled contractor.");
    return;
  }
  u.enabled = true;
  save();
  toast(`Enabled ${sam}`);
  render();
}

function netPing() {
  const h = hostByName(ui.netHost);
  ui.netLog += h.online
    ? `\n\n> ping ${h.host}\nReply from ${h.ip}: bytes=32 time=4ms TTL=128`
    : `\n\n> ping ${h.host}\nRequest timed out. Host offline (asset collected or powered off).`;
  render();
}

function netDns() {
  const h = hostByName(ui.netHost);
  ui.netLog += h.dns
    ? `\n\n> nslookup nw-fs-01\nServer: NW-DC-01 [${h.ip === "10.20.0.11" ? "10.20.0.11" : "10.20.0.11"}]\nName: nw-fs-01.northwind.corp\nAddress: 10.20.0.20`
    : `\n\n> nslookup nw-fs-01\nDNS request timed out.\nCan't find nw-fs-01.northwind.corp: No response from 8.8.8.8`;
  render();
}

function netIp() {
  const h = hostByName(ui.netHost);
  ui.netLog += `\n\n> ipconfig /all\nIPv4: ${h.ip}\nDNS Servers: ${h.dns ? "10.20.0.11" : "8.8.8.8"}\nDomain trust: ${hostTrust(h)}\nNAC: ${hostNac(h)}${state.isolated.includes(h.host) ? " (SOC isolated)" : ""}\nNote: ${h.note}`;
  render();
}

function resetComputerAccount(host) {
  const h = hostByName(host);
  if (!h) return;
  if (guardClaimForAction(`resetacct:${host}`)) return;
  h.acctReset = true;
  markDeskAction(`resetacct:${host}`);
  save();
  toast(`Computer account reset for ${host}. Rejoin the domain next.`);
  render();
}

function rejoinDomain(host) {
  const h = hostByName(host);
  if (!h) return;
  if (guardClaimForAction(`rejoin:${host}`)) return;
  hostTrust(h);
  if (!h.acctReset) {
    toast("Reset the computer account first, then rejoin.");
    return;
  }
  h.trust = "ok";
  h.note = "Rejoined to northwind.corp";
  markDeskAction(`rejoin:${host}`);
  save();
  toast(`${host} rejoined the domain`);
  render();
}

function releaseNac(host) {
  const h = hostByName(host);
  if (!h) return;
  if (isRansomIsolate(host)) {
    toast("Do not release a SOC isolate. Escalate — this host stays off the network.");
    return;
  }
  if (guardClaimForAction(`nacrelease:${host}`)) return;
  hostNac(h);
  if (h.nac !== "quarantine") {
    toast(`${host} is not in NAC quarantine`);
    return;
  }
  h.nac = "ok";
  h.note = "NAC released — corp VLAN";
  markDeskAction(`nacrelease:${host}`);
  save();
  toast(`NAC released on ${host}`);
  render();
}

function netFixDns() {
  const h = hostByName(ui.netHost);
  h.dns = true;
  ui.netLog += `\n\n> Set-DnsClientServerAddress -Server 10.20.0.11\nDNS updated. Flushing cache… done.`;
  const t = relatedOpen(null, h.host);
  if (t) markDone(t.id, `fixdns:${h.host}`);
  save();
  toast(`DNS fixed on ${h.host}`);
  render();
}

function writeupExtras(t) {
  const form = document.querySelector(`form[data-form="notes"][data-id="${t.id}"]`);
  const ta = form?.querySelector("textarea");
  if (ta) t.notes = ta.value;
  return {
    desk: `${deskMeta(deskOf(t)).name} / ${tenantOf(t).name}`,
    channel: CHANNEL_LABEL[t.channel] || t.channel,
    notes: t.notes || t.resolution || "",
    labelAction,
    skillLabels: Object.fromEntries(SKILLS.map((s) => [s.id, s.label])),
  };
}

function exportWriteup(id) {
  const t = ticketById(id);
  if (!t) return;
  downloadTicketWriteup(t, writeupExtras(t));
  toast(`Downloaded ${t.id}-SysDesk-writeup.docx`);
}

function exportAllVerified() {
  const list = allTickets().filter((t) => t.verified);
  if (!list.length) {
    toast("No verified tickets yet");
    return;
  }
  downloadManyWriteups(list, (t) => writeupExtras(t));
  toast(`Downloaded ${list.length} verified write-ups`);
}

function parseSam(cmd) {
  const m = String(cmd).match(/-identity\s+([a-z0-9_-]+)/i) || String(cmd).match(/\b([a-z][a-z0-9]{2,12})\s*$/i);
  return m ? m[1] : "";
}

function runPs(raw) {
  const cmd = String(raw || "").trim();
  if (!cmd) return;
  ui.psDraft = cmd;
  const low = cmd.toLowerCase();
  let out = `PS C:\\SysDesk> ${cmd}\n`;
  if (/remove-aduser|format-volume|stop-computer|invoke-expression/i.test(cmd)) {
    out += "Blocked. Out of scope for this lab.";
  } else if (/get-winevent|4740|lockout/.test(low)) {
    markDeskAction("ps:lockout:jlee");
    out += "TimeCreated            Id  Message\n";
    out += "8/30/2026 4:12:01 PM  4740  A user account was locked out.\n";
    out += "  Account Name: jlee\n  Caller Computer: NW-WS-1042\n  Source: bad password (3 attempts)\n";
  } else if (/get-aduser/.test(low) && /chen/.test(low)) {
    markDeskAction("ps:findchen");
    out += "SamAccountName Name       Enabled Locked Tenant\n";
    out += "mchen          Maya Chen  True    False  Harbor Dental\n";
    out += "mchenrs        Maya Chen  True    True   Riverton Schools\n";
  } else if (/unlock-adaccount/.test(low)) {
    const sam = parseSam(cmd) || "jlee";
    const u = userBySam(sam);
    if (!u) out += `Get-ADUser : Cannot find ${sam}`;
    else {
      out += `Unlocked ${sam} (${u.name})`;
      ui.psLog = (ui.psLog || "") + "\n\n" + out;
      adUnlock(sam);
    }
    if (!u) {
      ui.psLog = (ui.psLog || "") + "\n\n" + out;
      render();
    }
    return;
  } else if (/get-aduser/.test(low)) {
    const sam = parseSam(cmd) || "jlee";
    const u = userBySam(sam);
    if (!u) out += `Get-ADUser : Cannot find an object with identity: '${sam}'`;
    else {
      const tn = tenantById(u.tenant || "nw");
      out += `DistinguishedName : CN=${u.name},OU=${u.ou},DC=${tn.domain}\n`;
      out += `Enabled           : ${u.enabled}\nLockedOut         : ${u.locked}\nSAM               : ${u.sam}\nTenant            : ${tn.name}\nComputer          : ${u.computer}`;
    }
  } else if (/reset-computermachinepassword|reset-computeraccount|reset.?computer.?account/.test(low)) {
    const host = /nw-ws-1555|1555/.test(low) ? "NW-WS-1555" : (cmd.match(/NW-[A-Z]+-\d+/i) || [])[0] || "NW-WS-1555";
    resetComputerAccount(host.toUpperCase());
    out += `Reset computer account ${host.toUpperCase()}. Rejoin next (Add-Computer / Rejoin domain).`;
    ui.psLog = (ui.psLog || "") + "\n\n" + out;
    render();
    return;
  } else if (/add-computer|rejoin/.test(low)) {
    const host = /nw-ws-1555|1555/.test(low) ? "NW-WS-1555" : (cmd.match(/NW-[A-Z]+-\d+/i) || [])[0] || "NW-WS-1555";
    rejoinDomain(host.toUpperCase());
    out += `Rejoin domain on ${host.toUpperCase()}.`;
    ui.psLog = (ui.psLog || "") + "\n\n" + out;
    render();
    return;
  } else if (/get-service/.test(low) && /spool/i.test(cmd)) {
    const h = hostByName("NW-WS-0881");
    out += `Status  Name     DisplayName\n${h.spooler === "Running" ? "Running" : "Stopped"}  Spooler  Print Spooler`;
  } else {
    out += "Command not in the lab map. Try Get-ADUser, Unlock-ADAccount, Get-WinEvent lockout, or Get-ADUser *Chen*.";
  }
  ui.psLog = (ui.psLog || "") + "\n\n" + out;
  save();
  render();
}

function runSql(raw) {
  const sql = String(raw || "").trim();
  if (!sql) return;
  ui.sqlDraft = sql;
  const low = sql.toLowerCase();
  let out = `> ${sql}\n`;
  if (/create\s+index|drop\s+|backup\s+|alter\s+table|grant\s+|truncate|restore\s+/.test(low)) {
    out += "Msg 50000  Out of scope. Escalate schema / backup work. This console will not change the database.";
  } else if (/kill\s+88/.test(low)) {
    out += "Command(s) completed successfully. SPID 88 killed.";
    ui.sqlLog = (ui.sqlLog || "") + "\n\n" + out;
    dbaKill(88);
    return;
  } else if (/sp_who|blocking|dm_exec/.test(low)) {
    markDeskAction("sql:who");
    out += "SPID  User       Status    BlockedBy  Wait\n";
    for (const s of state.dba.sessions) {
      out += `${String(s.spid).padEnd(5)} ${s.user.padEnd(10)} ${s.blocking ? "BLOCKING" : "runnable "} ${s.blocking ? "—" : (s.wait === "LCK_M_S" ? "88" : "—")}        ${s.wait}\n`;
    }
    if (!state.dba.sessions.length) out += "(no sessions)\n";
  } else if (/orders/.test(low) && /select/.test(low)) {
    out += "OrderID  Customer  ShipDate    Total\n10248    VINET     2026-07-16  440.00\n10249    TOMSP     2026-07-17  1863.40\n10250    HANAR     2026-07-18  1552.60\n";
  } else if (/job|etl|sysjob/.test(low)) {
    out += state.dba.jobs.map((j) => `${j.id}  ${j.name}  ${j.last}  ${j.step}`).join("\n");
  } else {
    out += "Query not in the lab map. Try sp_who2, SELECT ... blocking, KILL 88, or SELECT TOP 5 FROM Orders.";
  }
  ui.sqlLog = (ui.sqlLog || "") + "\n\n" + out;
  save();
  render();
}

function claimTicket(id) {
  const t = ticketById(id);
  if (!t || t.status !== "open") return;
  t.claimed = true;
  markDone(t.id, "claim");
  appendMsg(t.id, "system", "system", `${YOU.name} claimed ${t.id} · ${tenantOf(t).name}`);
  save();
  toast(`Claimed ${t.id}`);
  render();
}

function vaultCheckout(tenantId) {
  const ten = tenantById(tenantId);
  if (!ten.jump) {
    toast("Northwind internal hosts do not use the vault");
    return;
  }
  const pw = "Jump#" + Math.random().toString(36).slice(2, 8);
  state.vault[tenantId] = { user: ten.vaultUser, pw };
  markDeskAction(`vault:${tenantId}`);
  save();
  toast(`Checked out ${ten.short} · ${ten.vaultUser}`);
  render();
}

function rdpConnect() {
  const h = hostByName(ui.rdpHost);
  if (!h.online) {
    toast("Host offline — cannot RDP");
    return;
  }
  if (needsVault(h)) {
    toast(`Check out the ${tenantById(hostTenant(h)).short} jump cred first.`);
    return;
  }
  ui.rdpConnected = true;
  ui.rdpTerm = `C:\\> whoami\n${tenantById(hostTenant(h)).vaultUser || h.user}\\support`;
  const t = relatedOpen(null, h.host);
  if (t) markDone(t.id, `rdp:${h.host}`);
  save();
  toast(`Connected to ${h.host}`);
  render();
}

function rdpSpooler() {
  const h = hostByName(ui.rdpHost);
  h.spooler = "Running";
  const t = relatedOpen(null, h.host);
  if (t) markDone(t.id, `spooler:${h.host}`);
  save();
  toast("Print Spooler started");
  render();
}

function rdpVpn() {
  const h = hostByName(ui.rdpHost);
  h.vpn = "Connected";
  const t = relatedOpen(null, h.host);
  if (t) markDone(t.id, `vpnreset:${h.host}`);
  save();
  toast("Stale VPN profile cleared");
  render();
}

function rdpDhcp() {
  const h = hostByName(ui.rdpHost);
  h.dhcpStale = false;
  ui.rdpTerm = (ui.rdpTerm || "") + `\n\nC:\\> ipconfig /renew\nRenewing IP address...\nDHCP lease renewed. IPv4: ${h.ip}`;
  const t = relatedOpen(null, h.host);
  if (t) markDone(t.id, `dhcprenew:${h.host}`);
  save();
  toast(`DHCP renewed on ${h.host}`);
  render();
}

function rdpDefender() {
  const h = hostByName(ui.rdpHost);
  h.defender = "Running";
  ui.rdpTerm = (ui.rdpTerm || "") + `\n\nC:\\> net start WinDefend\nThe Windows Defender Antivirus Service service was started successfully.`;
  const t = relatedOpen(null, h.host);
  if (t) markDone(t.id, `defender:${h.host}`);
  save();
  toast(`Defender started on ${h.host}`);
  render();
}

function cldStart(name) {
  const vm = state.cloud.vms.find((v) => v.name === name);
  if (!vm) return;
  vm.state = "running";
  markDeskAction(`start:${name}`);
  save();
  toast(`Started ${name}`);
  render();
}

function cldDisableKey(keyId) {
  for (const u of state.cloud.iam) {
    for (const k of u.keys) {
      if (k.id === keyId) {
        k.status = "Disabled";
        k.leaked = false;
      }
    }
  }
  markDeskAction(`disablekey:${keyId}`);
  save();
  toast(`Disabled ${keyId}`);
  render();
}

function cldLockSsh(sgId) {
  const sg = state.cloud.sgs.find((s) => s.id === sgId);
  if (!sg) return;
  for (const r of sg.rules) {
    if (String(r.port) === "22" && r.cidr === "0.0.0.0/0") {
      r.cidr = "10.20.0.0/16";
      r.ok = true;
    }
  }
  markDeskAction(`lockssh:${sgId}`);
  save();
  toast(`SSH on ${sgId} locked to 10.20.0.0/16`);
  render();
}

function acsGrant(badgeId, doorId) {
  const b = state.access.badges.find((x) => x.id === badgeId);
  if (!b || b.status !== "active") return;
  if (!b.doors.includes(doorId)) b.doors.push(doorId);
  markDeskAction(`grantdoor:${badgeId}:${doorId}`);
  save();
  toast(`Granted ${doorId} to ${badgeId}`);
  render();
}

function acsReboot(ctrl) {
  for (const d of state.access.doors) {
    if (d.controller === ctrl) d.online = true;
  }
  markDeskAction(`rebootctrl:${ctrl}`);
  save();
  toast(`Rebooted ${ctrl}`);
  render();
}

function acsDisable(badgeId) {
  const b = state.access.badges.find((x) => x.id === badgeId);
  if (!b) return;
  b.status = "disabled";
  b.doors = [];
  markDeskAction(`disablebadge:${badgeId}`);
  save();
  toast(`Disabled badge ${badgeId}`);
  render();
}

function socIsolate(host) {
  if (host === "NW-WS-1042") {
    toast("That's the lockout user. Close ALT-88 as false positive unless the source is off-site.");
    return;
  }
  if (!state.isolated.includes(host)) state.isolated.push(host);
  const a = state.soc.alerts.find((x) => x.host === host);
  if (a) a.status = "isolated";
  markDeskAction(`isolate:${host}`);
  save();
  toast(`Isolated ${host}`);
  render();
}

function socFalsePos(alertId) {
  if (alertId === "ALT-91" || alertId === "ALT-77") {
    toast("Not a false positive — isolate the host.");
    return;
  }
  const a = state.soc.alerts.find((x) => x.id === alertId);
  if (a) a.status = "false-positive";
  markDeskAction(`falsepos:${alertId}`);
  save();
  toast(`${alertId} closed as false positive`);
  render();
}

function nocBounce(id) {
  if (id === "CIR-AZ") {
    toast("Do not bounce ExpressRoute — escalate to the carrier.");
    return;
  }
  const c = state.noc.circuits.find((x) => x.id === id);
  if (!c) return;
  c.state = "up";
  c.latency = "12ms";
  c.loss = "0%";
  markDeskAction(`bounce:${id}`);
  save();
  toast(`Bounced ${id}`);
  render();
}

function dbaKill(spid) {
  state.dba.sessions = state.dba.sessions.filter((s) => String(s.spid) !== String(spid));
  markDeskAction(`kill:${spid}`);
  save();
  toast(`Killed SPID ${spid}`);
  render();
}

function dbaRerun(jobId) {
  const j = state.dba.jobs.find((x) => x.id === jobId);
  if (!j) return;
  j.last = "Succeeded";
  j.step = "Complete";
  markDeskAction(`rerun:${jobId}`);
  save();
  toast(`Reran ${jobId}`);
  render();
}

function chgApprove(id) {
  if (id === "CHG-6002") {
    toast("No backout on a DC patch — reject this.");
    return;
  }
  markDeskAction(`approve:${id}`);
  save();
  toast(`Approved ${id}`);
  render();
}

function chgReject(id) {
  if (id === "CHG-6001") {
    toast("That's a standard change with a backout — approve it.");
    return;
  }
  markDeskAction(`reject:${id}`);
  save();
  toast(`Rejected ${id}`);
  render();
}

function stigFix(kind) {
  if (kind === "dc") {
    toast("Do not STIG the DC with no window — escalate.");
    return;
  }
  if (kind === "telnet") state.stig.telnet = false;
  if (kind === "guest") state.stig.guestAdmin = false;
  if (kind === "expire") state.stig.neverExpire = false;
  markDeskAction(`stigfix:${kind}`);
  save();
  toast(kind === "telnet" ? "Telnet disabled on NW-FS-01" : kind === "guest" ? "Guest removed from Administrators" : "PasswordNeverExpires cleared on batch-nw");
  render();
}

function pcapMark(tag) {
  if (tag === "noise") {
    toast("That's the lockout AS-REQ — not this ticket's finding.");
    return;
  }
  markDeskAction(`pcapfind:${tag}`);
  if (tag === "scan") {
    if (!state.isolated.includes("NW-WS-3304")) state.isolated.push("NW-WS-3304");
    markDeskAction("isolate:NW-WS-3304");
  }
  save();
  const msg = {
    dns: "Finding: client DNS is 8.8.8.8 — corp zones fail",
    clear: "Finding: HTTP Basic in the clear — escalate to the app team",
    scan: "Finding: SYN sweep at the DC from NW-WS-3304",
    dhcp: "Finding: DHCP Discover, no Offer — lease/server, not a WAN bounce",
  };
  toast(msg[tag] || `Marked ${tag}`);
  render();
}

function onChange(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (el.dataset.action === "net-host") {
    ui.netHost = el.value;
    render();
  } else if (el.dataset.action === "rdp-host") {
    ui.rdpHost = el.value;
    ui.rdpConnected = false;
    render();
  }
}

function onSubmit(e) {
  const form = e.target.closest("form[data-form]");
  if (!form) return;
  e.preventDefault();
  const fd = new FormData(form);
  const type = form.dataset.form;
  if (type === "dir") {
    ui.dirQuery = String(fd.get("q") || "");
    render();
  } else if (type === "kb") {
    ui.kbQuery = String(fd.get("q") || "");
    render();
  } else if (type === "reply") {
    const body = String(fd.get("body") || "").trim();
    if (!body) return;
    appendMsg(form.dataset.id, YOU.name, "agent", body);
    const t = ticketById(form.dataset.id);
    if (t?.pushback && !t.pushbackFired) {
      t.pushbackFired = true;
      appendMsg(t.id, t.caller.name, "user", t.pushback);
    }
    save();
    toast("Reply sent");
    render();
  } else if (type === "ps") {
    runPs(String(fd.get("ps") || ""));
  } else if (type === "sql") {
    runSql(String(fd.get("sql") || ""));
  } else if (type === "pcap") {
    ui.pcapFilter = String(fd.get("q") || "");
    render();
  } else if (type === "notes") {
    const t = ticketById(form.dataset.id);
    if (!t) return;
    t.notes = String(fd.get("notes") || "");
    ui.noteDraft = t.notes;
    if (t.required.includes("noteonly") && notesOk(t)) markDone(t.id, "noteonly");
    save();
    toast("Notes saved");
    render();
  } else if (type === "ad-group") {
    const sam = form.dataset.sam;
    const group = String(fd.get("group") || "");
    const u = userBySam(sam);
    if (!u || !group) return;
    if (!u.groups.includes(group)) u.groups.push(group);
    const t = relatedOpen(sam);
    if (t) markDone(t.id, `addgroup:${sam}:${group}`);
    save();
    toast(`Added ${sam} to ${group}`);
    render();
  }
}

document.getElementById("app").addEventListener("click", onClick);
document.getElementById("app").addEventListener("change", onChange);
document.getElementById("app").addEventListener("submit", onSubmit);
window.addEventListener("hashchange", () => {
  ui.mobileNav = false;
  ui.consoleOpen = false;
  ui.ticketCardOpen = false;
  ui.ticketListPeek = false;
  const r = route();
  if (r.page === "campus") ui.focusWork = false;
  else if (r.page === "queue" || DESKS.includes(r.page)) ui.focusWork = Boolean(r.id);
  const t = ticketById(r.id || ui.selected);
  if (t) ui.noteDraft = t.notes || "";
  render();
});
window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (ui.ticketCardOpen) {
    ui.ticketCardOpen = false;
    render();
    return;
  }
  if (!ui.consoleOpen) return;
  ui.consoleOpen = false;
  render();
});

if (!location.hash || location.hash === "#" || location.hash === "#/") {
  location.replace("#/queue");
}
render();
setInterval(() => {
  const { changed, msg } = firePings();
  const tag = document.activeElement?.tagName;
  if (changed && msg) {
    state.toast = msg;
    render();
    const keep = msg;
    setTimeout(() => {
      if (state.toast === keep) {
        state.toast = null;
        render();
      }
    }, 2400);
    return;
  }
  if (ui.ticketCardOpen || ui.consoleOpen) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
  render();
}, 4000);
