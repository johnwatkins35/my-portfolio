# FLYBER, INC.

## Incident Response Policy

| Field | Value |
|---|---|
| **Document ID** | POL-SEC-002 |
| **Version** | 1.0 |
| **Status** | Submitted for Board approval |
| **Effective date** | 1 October 2026 |
| **Classification** | Internal |
| **Owner** | Chief Information Security Officer |
| **Sponsoring executive** | Chief Executive Officer |
| **Approving authority** | Board of Directors |
| **Review cycle** | Annual, or after a Severity 1 incident |
| **Related policies** | POL-SEC-001 Acceptable Use; POL-SEC-003 Access Control; POL-SEC-004 Data Classification |

---

### Document control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 15 Sep 2026 | CISO | Initial policy for Board adoption |

---

## 1. Purpose

This policy establishes how Flyber detects, classifies, contains, investigates, recovers from, and reports information-security incidents. Its objectives are, in order: protect people and aircraft; stop ongoing harm; preserve evidence; meet legal and contractual notice duties; restore operations; and improve controls.

This is a governance policy. Tactical playbooks, call trees, and forensic procedures are management documents and shall be consistent with this policy.

## 2. Scope

This policy applies to incidents affecting Flyber information, Company systems, vertiport and hangar technology, aircraft-connected systems, workforce devices, and third-party processors that handle Flyber data.

This policy covers cyber and information-security incidents. It does **not** replace aviation occurrence, airworthiness, or emergency-response procedures. Where an event is both a cyber incident and a safety occurrence, both processes shall run, and Section 6.3 governs coordination. Safety-of-flight actions shall not wait on this policy.

## 3. Definitions

**Event** — an observable occurrence in a system or network. Most events are not incidents.

**Incident** — an event, or series of events, that actually or probably: (a) violates this suite or law; (b) compromises confidentiality, integrity, or availability of Flyber information or systems; or (c) is used as a precursor to such compromise.

**Data breach** — an Incident in which Restricted or Confidential personal information, payment data, or authentication secrets are reasonably believed to have been accessed, acquired, or exfiltrated without authorization, or are reasonably believed to be at imminent risk of such access. Legal determines whether a statutory “breach” has occurred.

**Safety-affecting cyber incident** — an Incident that has affected, or reasonably could affect, dispatch, navigation, telemetry integrity, vertiport access control, aircraft software load, or crew/rider communications in a way that degrades aviation safety.

**Personal information** — information that identifies or can reasonably be linked to a rider, crew member, employee, or other natural person, including as defined under New York SHIELD and other applicable law.

## 4. Severity

The CISO (or incident commander) shall assign severity as soon as practicable and may raise or lower it as facts change. When in doubt, the higher severity applies until disproven.

| Severity | Meaning | Examples | Board / CEO notice |
|---|---|---|---|
| **SEV-1** | Immediate threat to safety, material data breach, or Company-wide operational halt | Compromise of flight-ops or vertiport access systems; confirmed exfiltration of rider location or payment data; ransomware on core systems; loss of dispatch capability | CEO: immediate. Board Chair: within **24 hours**. Written Board brief: within **72 hours** |
| **SEV-2** | Significant confidentiality, integrity, or availability impact; limited safety coupling not yet confirmed | Privilege escalation in production identity; payment-processor compromise under investigation; multi-day outage of rider app without safety impact | CEO: immediate. Board: at or before the next scheduled meeting, sooner if Legal advises |
| **SEV-3** | Contained impact, limited data exposure that is not a statutory breach, or a serious near-miss | Phishing that yielded one mailbox, contained; malware on a single endpoint; vendor misconfiguration caught before data access | CEO: as part of weekly operating rhythm, sooner if trend |
| **SEV-4** | Precursor or policy violation without confirmed compromise | Failed brute force; lost locked laptop recovered same day; suspicious but blocked email | Logged; no executive notice required |

A suspected SEV-1 shall be treated as SEV-1 until the CISO and Director of Flight Operations (if safety could be involved) agree to downgrade.

## 5. Organization and authority

### 5.1 Incident commander

The CISO is the default incident commander. The CISO may designate a qualified deputy. For a safety-affecting cyber incident, a Flight Operations lead shall be named co-commander for operational decisions that affect aircraft, pads, or crews. The incident commander has authority to:

- isolate systems, revoke credentials, and disable integrations;
- direct workforce members to preserve devices and accounts;
- engage retained counsel, forensics, insurance, and law enforcement in coordination with Legal;
- recommend suspension of flight operations to the Director of Flight Operations and the CEO. **The decision to ground or release aircraft remains with Flight Operations under aviation rules**, advised by the incident commander.

The CEO may assume or reassign command. No manager shall delay isolation in order to avoid operational inconvenience.

### 5.2 Core response team

Standing members: CISO (lead), CIO, General Counsel, Director of Flight Operations, VP People (if workforce involved), Head of Customer Operations (if riders involved), and Corporate Communications. Payment, insurance, and aviation-safety specialists shall be added as needed.

Outside counsel and a retained forensic firm shall be on contract before they are needed. Privilege shall be established at the start of any SEV-1 or likely-breach matter.

## 6. Required process

Management shall maintain a written incident-response plan implementing the following phases. The plan may be updated without Board approval if this policy’s notice, severity, and coordination rules are unchanged.

### 6.1 Preparation

Flyber shall maintain: 24/7 intake (email, phone, and in-app for riders as applicable); logging sufficient to investigate Restricted-data systems; current contact trees, including Board Chair and counsel; a forensic retainer; cyber-insurance notice instructions; and an annual tabletop that includes at least one joint cyber / flight-operations scenario. First tabletop shall occur within 90 days of the effective date.

### 6.2 Detection and reporting

Any User who suspects an Incident shall report immediately and shall not attempt independent “testing,” deletion of evidence, or payment of a ransom. Riders and partners may report through published channels. The CISO shall operate intake and triage, including after hours.

Failure to report a known or reasonably suspected Incident is a violation of POL-SEC-001.

### 6.3 Coordination with aviation safety

If an Incident is or may be safety-affecting:

1. Flight Operations shall be notified at the same time as the CISO if the reporter is not already in that chain.
2. Immediate actions required for safe flight, landing, or pad evacuation proceed under aviation procedures.
3. Systems shall be preserved for both safety investigation and cyber investigation to the extent those duties do not conflict. Where they conflict, **preservation of life and aircraft comes first**, and the conflict shall be recorded.
4. External aviation reports (FAA, NTSB, or successor obligations as applicable) shall be made on their own clocks. Legal coordinates so that cyber notice and safety notice do not contradict.

### 6.4 Analysis, containment, eradication, recovery

The incident commander shall:

- establish facts: what systems, what data classifications (POL-SEC-004), what time range, what identities;
- contain before performing complete root-cause analysis if delay increases harm;
- preserve logs, disk images, and cloud trail evidence before rebuild;
- eradicate attacker access, rotate credentials and keys, and rebuild from known-good state where integrity is in doubt;
- recover services in an order that restores safety systems and rider-trust functions first;
- document actions in a contemporaneous incident log.

Ransom shall not be paid except by CEO decision with Legal and Board Chair consultation. Payment does not guarantee recovery and may be unlawful in some cases.

### 6.5 Notification and disclosure

**Legal owns the determination** of whether statutory, contractual, payment-brand, or insurance notice is required, and to whom. The CISO supplies facts. Communications owns rider-facing language, approved by Legal.

Notice shall meet the shortest applicable legal or contractual deadline. Management shall not delay statutory notice in order to complete a perfect forensic report.

Where a data breach involves New York residents or other jurisdictions with notice laws, Legal shall direct notices to individuals, the New York Attorney General, and any other required parties. Payment-card incidents shall follow card-brand and acquirer rules.

Workforce members shall not disclose incident facts to press, social media, or family beyond what Communications has released, except to personal legal counsel.

### 6.6 Board reporting

In addition to Section 4:

- All SEV-1 incidents shall be followed by a closed-session briefing covering impact, rider/crew exposure, operational decisions (including any ground stop), notice status, insurance, residual risk, and requested Board action if any.
- Quarterly, the CISO shall report counts of SEV-1 through SEV-3, exception aging, and tabletop results.
- Near-miss SEV-1 events (downgraded after investigation) shall be included in the quarterly report.

### 6.7 Post-incident

Within 15 business days after closure of a SEV-1 or SEV-2 incident (or longer with CEO approval for complex forensics), the CISO shall issue a post-incident review: timeline, root cause, control failures, cost, and corrective actions with owners and dates. Corrective actions that require Board-level risk-appetite change shall be brought to the Board. Lessons that are merely technical shall be implemented under Management.

Evidence shall be retained per Legal hold and not less than three years for SEV-1 and SEV-2.

## 7. Third parties

Incidents at a vendor or partner that processes Flyber information are Flyber incidents for purposes of severity, Board notice, and rider notice if Flyber data is involved. Contracts shall require prompt notice to Flyber (target: 24 hours from vendor awareness for Restricted data; in no case slower than the vendor’s legal maximum). Flyber shall have the contractual right to investigate or to receive sufficient forensic findings.

## 8. Exceptions

There are no exceptions to SEV-1 Board notification or to the prohibition on concealing Incidents. Procedural deviations during an active incident (for example, skipping a low-priority approval to isolate a system) are permitted if logged and reported to the CEO within 24 hours.

## 9. Enforcement

Failure to report, destruction of evidence, unauthorized disclosure of incident facts, or obstruction of response is grounds for termination and possible legal action. This applies to officers.

## 10. Review

Annual review by the CISO, plus after each SEV-1. Material amendments require Board approval.

---

## Approval

| | Name | Signature | Date |
|---|---|---|---|
| Owner (CISO) | Marcus Hale | | |
| Director of Flight Operations (coordination concurrence) | | | |
| CEO | Alexandra Chen | | |
| Chair, Board of Directors | | | |

**Board resolution:** Approved as part of the Information Security Policy Suite v1.0 on ______________ 2026.
