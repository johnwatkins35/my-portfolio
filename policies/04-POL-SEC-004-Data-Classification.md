# FLYBER, INC.

## Data Classification Policy

| Field | Value |
|---|---|
| **Document ID** | POL-SEC-004 |
| **Version** | 1.0 |
| **Status** | Submitted for Board approval |
| **Effective date** | 1 October 2026 |
| **Classification** | Internal |
| **Owner** | Chief Information Security Officer |
| **Sponsoring executive** | Chief Executive Officer |
| **Approving authority** | Board of Directors |
| **Review cycle** | Annual |
| **Related policies** | POL-SEC-001 Acceptable Use; POL-SEC-002 Incident Response; POL-SEC-003 Access Control |

---

### Document control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 15 Sep 2026 | CISO | Initial policy for Board adoption |

---

## 1. Purpose

This policy defines how Flyber information is classified and the minimum handling required at each level. Classification is the foundation for access control, acceptable use, retention, encryption, and incident severity. If information is not labeled and handled consistently, the rest of the security program is theater.

Flyber holds information whose misuse can identify a rider’s movements, expose payment credentials, or corrupt flight-safety data. The Board adopts these tiers so that Management cannot treat that information as ordinary business files.

## 2. Scope

This policy applies to all information Flyber creates, receives, or processes, in any form: digital, paper, audio, imagery, models, and backups — including information held by vendors.

It applies to production, non-production, analytics, user-research, email, and devices.

## 3. Roles

| Role | Duty |
|---|---|
| **Data owner** | An officer or designated leader accountable for a data domain (for example: VP Customer for rider data; Director of Flight Operations for operational flight data; CFO for financial and payment data; VP People for workforce data). Owners classify their domain, approve Restricted access, and set retention with Legal. |
| **Data steward** | Day-to-day quality, labeling, and access lists for a system or dataset. |
| **CISO** | Interprets this policy; issues handling standards; adjudicates disputes; reports exceptions. |
| **General Counsel** | Privacy, statutory definitions, holds, cross-border, and destruction legal requirements. |
| **Workforce** | Label, store, share, and destroy information at or above the required tier. If unsure, treat as Confidential until the owner or CISO says otherwise. |

Where two classifications could apply, the **higher** tier governs the whole artifact (for example: a slide deck with one Restricted map is Restricted).

## 4. Classification tiers

Flyber uses four tiers. There is no “for now, unclassified” category. Information shall be classified when created or received.

### 4.1 Public

**Definition.** Information approved for unlimited disclosure, or already lawfully public.

**Examples.** Marketing site copy; published pad neighborhood names that Communications has released; job postings; open-source code Flyber has intentionally published; this policy’s existence (the policy text remains Internal until Communications publishes a summary).

**Handling.** No restriction on sharing. Integrity still matters: Public information shall not be altered to mislead.

### 4.2 Internal

**Definition.** Unreleased business information whose unauthorized disclosure would cause limited harm (embarrassment, minor competitive disadvantage) and which does not include personal information beyond ordinary business contact data of workforce members acting in role.

**Examples.** Ordinary all-hands slides without rider data; internal org charts; vendor names on a laptop order; non-public pad construction schedules that do not include security specifications; this policy suite.

**Handling.** Share only with workforce and vendors under NDA who need it. Not for personal social media. Company systems only. Encryption in transit on public networks (HTTPS/VPN) required.

### 4.3 Confidential

**Definition.** Information whose unauthorized disclosure, alteration, or loss would cause significant harm to Flyber, a person, or a partner, including most personal information that is not in the Restricted set, and commercially sensitive material.

**Examples.**

- Rider accounts: name, email, phone, payment-method last-four, trip history at coarse granularity, support tickets.
- User-research files that include email, income band, neighborhood, and survey responses.
- Employee HR files other than government IDs and background-investigation reports (those are Restricted).
- Contracts, pricing, unreleased financials, board decks, insurance applications.
- Network diagrams; non-public vertiport layouts; security-exception logs.
- Aggregated telemetry that cannot reasonably re-identify a rider or reveal exploitable aircraft-control detail.

**Handling.** Need-to-know; MFA-protected systems (POL-SEC-003); encryption in transit and at rest; no Public AI tools (POL-SEC-001); no personal email or consumer cloud; paper in controlled storage; destruction by shredding or cryptographic wipe. May be shared with vendors under contract that matches this tier.

### 4.4 Restricted

**Definition.** Information whose unauthorized disclosure, alteration, or loss could cause severe harm: physical safety risk, identity theft or stalking, regulatory or payment-brand crisis, or loss of aircraft integrity. Default deny outside a named role.

**Examples — Flyber-specific (non-exhaustive).**

- Precise rider or crew geolocation, live tracking, and trip records that reveal home, workplace, or medical destinations.
- Full payment-card data, bank account numbers, government ID images, Social Security / ITIN, passport numbers.
- Authentication secrets: passwords, hashes, API keys, signing keys, MFA seeds, aircraft or pad access codes.
- Safety-critical flight data: software loads, signed configs, integrity-protected telemetry used for airworthiness, maintenance write-ups that reveal a hazard not yet public, recordings designated for safety investigation.
- Background investigations, health information, union or grievance files as applicable.
- Incident files for SEV-1/SEV-2, including forensic images and rider-notification lists, until Legal downgrades.
- Law-enforcement or national-security process (warrants, NSLs) and their existence, except as law requires.

**Handling.** Named access only; quarterly recertification; Company-managed devices; encryption in transit and at rest with Flyber-controlled keys where the vendor allows; DLP or equivalent control on bulk export; no local uncontrolled copies; no screenshots to personal devices; printing only with owner approval and immediate retrieval; dual control for key material and break-glass. Vendors require written Restricted-data terms, minimum 24-hour incident notice, and no secondary use.

**Integrity note.** For safety-critical flight data, **integrity and availability can equal confidentiality in importance**. Unauthorized modification is a Restricted incident even if the data was not “leaked.”

## 5. Flyber data domains (owner map)

| Domain | Default owner | Default tier (unless de-identified) |
|---|---|---|
| Rider identity, trips, location | VP, Customer | Restricted for precise location and live tracking; Confidential for account profile |
| Payments / cardholder data | CFO | Restricted |
| User research & marketing lists | Head of Product / Marketing | Confidential; Restricted if precise location is appended |
| Flight operations, dispatch, telemetry | Director of Flight Operations | Restricted for safety-critical and live tracking; Confidential otherwise |
| Maintenance & airworthiness records | Director of Flight Operations | Restricted when they concern hazards or signed software; Confidential otherwise |
| Workforce / HR | VP, People | Confidential; Restricted for IDs, investigations, health |
| Finance, board, legal | CFO / General Counsel | Confidential; Restricted for bank control and legal-hold investigative files |
| Source code & product telemetry | CIO / VP Engineering | Internal for ordinary code; Confidential for infrastructure-as-code secrets and production configs; Restricted for secrets and signing |
| Physical security (badge, CCTV) | CISO / COO | Confidential; Restricted for override codes |

De-identified or fully aggregated data may be classified Internal if Legal and the CISO agree re-identification risk is low. Zip-code-level demand heat maps used in Board strategy, with no individual trips, are Internal. A CSV of individual pick-up coordinates is Restricted.

## 6. Labeling

- Digital documents and decks shall show classification in header or footer (Public / Internal / Confidential / Restricted).
- Emails carrying Confidential or Restricted content shall state the classification in the subject or first line.
- Data stores and cloud buckets shall be tagged. Untagged stores that may contain personal or operational data shall be treated as Confidential until inventoried.
- Restricted data in tickets or chat is discouraged; if unavoidable, the channel must be approved for Restricted and access-limited.

## 7. Storage, transmission, and destruction

| Control | Public | Internal | Confidential | Restricted |
|---|---|---|---|---|
| Approved Company systems | Allowed | Required | Required | Required; subset of systems only |
| Personal email / consumer cloud | Allowed | Prohibited | Prohibited | Prohibited |
| Encryption in transit | Best practice | Required on public networks | Required | Required |
| Encryption at rest | Optional | Required for laptops | Required | Required; key custody per CISO standard |
| Removable media | Allowed | Discouraged | CISO approval | Prohibited except dual-control backup |
| Production data in non-prod | n/a | Allowed | Masked or prohibited | Prohibited unless CISO + owner exception |
| Retention | Owner discretion | Owner + Legal | Owner + Legal; default minimize | Owner + Legal; default minimize; safety records per aviation retention |
| Destruction | Ordinary delete | Ordinary delete | Secure delete / shred | Cryptographic wipe / witnessed shred; vendor certification of destruction |

Legal holds override destruction until released.

## 8. Cross-border and processors

Flyber’s MVP is New York-centric but cloud processors may store data outside New York. Confidential and Restricted personal information shall be sent to a jurisdiction or vendor only with Legal approval and a written processing agreement. Workforce shall not copy rider datasets to a personal laptop in order to “work from another country.”

## 9. Requests for data (riders, regulators, law enforcement)

Rider access and deletion requests shall follow the published privacy process, owned by Legal. Workforce shall not fulfill informal requests to “pull a friend’s trips.”

Law-enforcement requests shall go to Legal. Except for an imminent threat to life, systems shall not be opened to an agency on a phone call without Legal.

## 10. Incidents

Loss, mis-sending, or unauthorized access to Confidential or Restricted information is an Incident under POL-SEC-002. Restricted location or payment exposure is presumed SEV-1 until triaged otherwise.

## 11. Exceptions

Written, time-bounded, compensating control, CISO approval; CEO concurrence for Restricted. Logged and reported quarterly to the Board or designated committee.

## 12. Enforcement

Misclassification that treats Restricted data as Internal, curiosity lookups of rider location, and unsanctioned exports are serious violations and may be criminal under applicable law. Sanctions follow POL-SEC-001.

## 13. Review

The CISO and data owners shall review the domain map at least annually and whenever a new product data flow (for example: live tracking visible to a family member, or third-party advertising) is proposed. New Restricted flows require CEO approval before launch and notice to the Board at the next meeting. Material amendments to this policy require Board approval.

---

## Approval

| | Name | Signature | Date |
|---|---|---|---|
| Owner (CISO) | Marcus Hale | | |
| General Counsel (privacy concurrence) | | | |
| CEO | Alexandra Chen | | |
| Chair, Board of Directors | | | |

**Board resolution:** Approved as part of the Information Security Policy Suite v1.0 on ______________ 2026.
