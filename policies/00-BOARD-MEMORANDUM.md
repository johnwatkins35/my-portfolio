# FLYBER, INC.

**Board of Directors — Consent / Risk Committee Packet**

| | |
|---|---|
| **To** | Board of Directors |
| **From** | Alexandra Chen, Chief Executive Officer, on behalf of Management |
| **Prepared by** | Marcus Hale, Chief Information Security Officer |
| **Reviewed by** | General Counsel; Chief Operating Officer; VP, People |
| **Date** | 15 September 2026 |
| **Meeting** | Regular meeting of the Board, 30 September 2026 |
| **Item** | Approval of Information Security Policy Suite (v1.0) |
| **Classification** | Internal — Board Materials |
| **Recommended action** | **Approve** |

---

## 1. Requested action

Management requests that the Board adopt the attached Information Security Policy Suite as the governing information-security framework of Flyber, Inc. (“Flyber” or the “Company”), effective 1 October 2026:

| Policy | Document ID | Owner |
|---|---|---|
| Acceptable Use Policy | POL-SEC-001 | CISO |
| Incident Response Policy | POL-SEC-002 | CISO |
| Access Control Policy | POL-SEC-003 | CISO |
| Data Classification Policy | POL-SEC-004 | CISO |

These four instruments are the minimum set a board should put in force before Flyber carries paying riders, holds payment credentials, or operates connected aircraft. Detailed procedures, runbooks, and technical standards will sit underneath these policies and do not require Board approval unless they materially change the risk appetite expressed here.

---

## 2. Why this is in front of the Board now

Flyber is an electric vertical takeoff and landing (eVTOL) air-taxi company preparing a Manhattan pad-to-pad MVP. The Company will process rider identities, precise location and trip history, payment data, crew records, and aircraft telemetry. That combination is not ordinary SaaS risk. A confidentiality failure can become a physical-safety, FAA, New York Attorney General, payment-brand, and insurance event in the same week.

Management is bringing the suite now because:

1. **Launch diligence.** Insurers, aviation partners, pad landlords, and prospective Series investors will ask whether the Board has adopted written security policy. Informal guidelines will not survive that review.
2. **Legal duty.** New York’s SHIELD Act and applicable payment-card rules require a written information-security program. Board adoption is the cleanest evidence that the program is authorized, resourced, and binding.
3. **Safety coupling.** Cyber events on flight-operations, vertiport access, or telemetry systems can degrade aviation safety. The Incident Response Policy requires the CISO and the Director of Flight Operations to treat those events as joint incidents, not as a ticket in IT.
4. **Clarity of authority.** The suite assigns ownership, exception rights, Board notification triggers, and sanctions. That is governance, not IT procedure.

---

## 3. What the Board is being asked to adopt (and what it is not)

**The Board is adopting policy:** purpose, scope, mandatory controls, roles, enforcement, and review. Each policy uses “shall” for binding obligations.

**The Board is not adopting** system architecture, vendor names, or the incident-response playbook. Those are management documents. They must stay consistent with this suite; they may change without a Board vote so long as the policy commitments are met.

The four policies are designed as a closed set:

- **Data Classification** decides how information is labeled and handled.
- **Access Control** decides who may touch it, and under what conditions.
- **Acceptable Use** decides what people may do with Company systems and data.
- **Incident Response** decides what happens when those controls fail or are attacked.

---

## 4. Material provisions the Board should specifically note

Management draws the Board’s attention to the following, which are deliberate risk-appetite choices rather than boilerplate.

**Acceptable Use (POL-SEC-001)**
- Covers employees, contractors, temporary staff, and directors when using Company systems or Flyber data.
- Prohibits use of rider location, trip history, or aircraft telemetry for personal curiosity, social content, or any purpose other than assigned work.
- Prohibits pasting Restricted or Confidential data into public generative-AI tools.
- Gives Management the right to monitor Company systems. Personal devices used for Flyber work are in scope to the extent they store or access Company data.

**Incident Response (POL-SEC-002)**
- Severity 1 (safety-affecting, material rider-data breach, or widespread operational outage) shall be notified to the CEO immediately and to the Board Chair within **24 hours**, with a written Board briefing within **72 hours**.
- Cyber incidents that could affect airworthiness, dispatch, or vertiport access are dual-reported to Flight Operations. Aviation safety reporting (FAA / NTSB as applicable) is not delayed for a cyber investigation.
- Customer, regulator, and payment-brand notification is a Legal decision, executed to statutory clocks (including any 72-hour or faster obligation that applies).

**Access Control (POL-SEC-003)**
- Multi-factor authentication is mandatory for all remote access and all access to Confidential or Restricted data.
- Privileged access to flight-operations, payment, and identity systems is named, time-bounded, and reviewed at least quarterly.
- Physical access to vertiports, hangars, and the operations center is treated as access control, not as facilities trivia.

**Data Classification (POL-SEC-004)**
- Four tiers: Public, Internal, Confidential, Restricted.
- Rider precise location, payment data, authentication secrets, and safety-critical flight data are **Restricted** by default.
- User-research records that include email or other identifiers are at least **Confidential**.
- Encryption in transit and at rest is mandatory for Confidential and Restricted data.

---

## 5. Residual risk if the Board declines or defers

If the suite is not adopted before MVP operations:

- Management has no Board-level mandate to compel MFA, access reviews, or data-handling rules across Flight Ops, Product, and vendors.
- Incident notification to the Board, riders, and regulators would be improvised under time pressure.
- Insurance applications and partner security questionnaires would be answered with “in draft,” which typically prices as a coverage exclusion or a delayed pad agreement.
- A post-incident investigation would show the absence of approved policy. That fact is independently damaging.

Deferral until after first revenue does not reduce the work. It only means the first incident occurs without a rulebook.

---

## 6. Implementation, cost, and oversight

| Item | Plan |
|---|---|
| Effective date | 1 October 2026 |
| Attestation | All workforce members shall acknowledge POL-SEC-001 within 30 days of effective date or upon hire, whichever is later |
| Technical backlog | MFA coverage, endpoint standard, encryption verification, logging to the security operations function — owned by CISO with CIO; target complete before first paying flight |
| Tabletop exercise | First incident-response tabletop within 90 days of adoption; annually thereafter, with one scenario that joins cyber and flight ops |
| Access reviews | First privileged-access certification within 60 days |
| Budget | FY2027 security operating budget to be presented at the November meeting; this vote does not authorize incremental spend beyond the current approved plan |
| Board reporting | CISO written report at least quarterly to the Board or its designated committee: exceptions, Severity 1–2 incidents, access-review completion, and material vendor issues |

No additional director liability is created by adoption beyond the ordinary duty of oversight. Adoption is evidence that the Board discharged that duty on information security at this stage of the Company.

---

## 7. Alternatives considered

1. **Adopt an industry template unchanged.** Rejected. Generic policies do not address rider geolocation, dual cyber/aviation incidents, or vertiport physical access.
2. **Approve only an Acceptable Use Policy and wait.** Rejected. AUP without classification and access control cannot be enforced, and IR without Board notification rules leaves directors uninformed on the events that matter.
3. **Delegate the entire suite to the CEO without Board adoption.** Rejected for this stage. These four documents set risk appetite. That is a Board function.

---

## 8. Proposed resolution

**RESOLVED**, that the Board of Directors hereby approves the Flyber, Inc. Information Security Policy Suite, version 1.0, comprising the Acceptable Use Policy (POL-SEC-001), Incident Response Policy (POL-SEC-002), Access Control Policy (POL-SEC-003), and Data Classification Policy (POL-SEC-004), in the forms presented to this meeting;

**FURTHER RESOLVED**, that such policies shall take effect on 1 October 2026, shall bind all directors, officers, employees, and contractors of the Company, and shall be reviewed at least annually by Management, with material amendments reserved to the Board;

**FURTHER RESOLVED**, that the Chief Executive Officer and the Chief Information Security Officer are authorized to issue implementing procedures and standards consistent with the suite, to require workforce acknowledgment, and to report to the Board as provided therein;

**FURTHER RESOLVED**, that the Chair of the Board is authorized to execute the approval blocks on each policy as evidence of this action.

---

## 9. Attachments

- Attachment A — POL-SEC-001 Acceptable Use Policy
- Attachment B — POL-SEC-002 Incident Response Policy
- Attachment C — POL-SEC-003 Access Control Policy
- Attachment D — POL-SEC-004 Data Classification Policy

---

**Management recommendation:** Approve.

Alexandra Chen  
Chief Executive Officer
