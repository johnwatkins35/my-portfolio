# SysDesk

Simulated Tier-1 help desk for Northwind: tickets, Active Directory, network diagnostics, remote desktop, and graded resolutions.

## Run

Python (no Docker):

```bash
python -m http.server 8088 --bind 127.0.0.1
```

Or on Linux: `chmod +x serve.sh && ./serve.sh`

Docker (Docker Desktop running). Stop any other server on 8088 first:

```bash
docker compose up --build
```

Open [http://127.0.0.1:8088](http://127.0.0.1:8088). Lab state stays in the browser (`localStorage`), not in the container.

Use **Reset lab** in the top bar to start a fresh domain and ticket set.

## Topics

- **01 Tickets** — identity check, device, work notes, root fix; verified vs unverified close
- **02 Active Directory** — unlock, password reset, groups on a simulated domain
- **03 Conversations** — voice / email / chat with impatient, chatty, and VIP users
- **05 Triage** — follow-up pings and thank-you mail arrive while you work the queue
