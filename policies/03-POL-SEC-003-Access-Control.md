# FLYBER, INC.

## Access Control Policy

| Field | Value |
|---|---|
| **Document ID** | POL-SEC-003 |
| **Version** | 1.0 |
| **Status** | Submitted for Board approval |
| **Effective date** | 1 October 2026 |
| **Classification** | Internal |
| **Owner** | Chief Information Security Officer |
| **Sponsoring executive** | Chief Executive Officer |
| **Approving authority** | Board of Directors |
| **Review cycle** | Annual |
| **Related policies** | POL-SEC-001 Acceptable Use; POL-SEC-002 Incident Response; POL-SEC-004 Data Classification |

---

### Document control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 15 Sep 2026 | CISO | Initial policy for Board adoption |

---

## 1. Purpose

This policy requires that access to Flyber systems, facilities, aircraft-connected technology, and information be limited to identified people and services that need it, for as long as they need it, and no further. Flyber’s rider location data, payment systems, and flight-operations tools are high-value targets. Weak access control is the most common way those targets are hit.

## 2. Scope

This policy applies to:

- logical access to Company systems and Flyber information, including cloud, SaaS, source code, data warehouses, flight-operations, maintenance, and payment environments;
- privileged and service-account access;
- physical access to offices, the operations center, hangars, vertiports, aircraft, and secured equipment rooms;
- workforce members, vendors, and automated identities (service accounts, bots, integrations).

## 3. Principles (binding)

Flyber shall implement access control according to the following, which are mandatory, not aspirational:

1. **Least privilege.** Access shall be the minimum required for the current role.
2. **Need to know.** Classification under POL-SEC-004 governs who may see information, independent of technical ability.
3. **Default deny.** Access is withheld until granted. Shared “open” production credentials are prohibited.
4. **Individual accountability.** Interactive access shall map to a unique person. Shared logins are prohibited except for a documented break-glass account under Section 7.
5. **Separation of duties.** No single person shall be able to create a vendor, approve payment, and conceal the record; or to deploy flight-ops software and solely approve that deployment, except as a logged emergency under CEO or Director of Flight Operations authority.
6. **Lifecycle.** Access is granted on join, adjusted on move, and removed on leave — including contractors.

## 4. Identity and authentication

### 4.1 Identity source

Workforce identity shall be issued from Flyber’s authoritative identity system. Vendors shall be issued distinct identities, not borrowed employee accounts. Identities shall be tied to a named sponsor and an end date.

### 4.2 Authentication

- Multi-factor authentication (MFA) is **required** for: all remote access; all access to Confidential or Restricted data; email; VPN; cloud consoles; source-control; and flight-operations systems.
- Phishing-resistant MFA (hardware key or platform passkey) is **required** for privileged roles in identity, cloud, payment, and flight-operations administration.
- Passwords, where used, shall meet the password standard issued by the CISO. Password reuse with personal accounts is prohibited.
- Biometric unlock on Company devices is permitted if a PIN/password fallback exists and the device is encrypted.

### 4.3 Session and workstation

Idle sessions shall lock. Privileged sessions shall be time-bounded. Operations-center and dispatch workstations shall not stay logged in under a generic “desk” account.

## 5. Authorization and roles

Access shall be role-based wherever practicable. Roles shall be defined by job function (for example: dispatcher, maintenance controller, rider-support agent, data analyst, finance operations), not copied from another company and left uncleared.

**Rider-support agents** may access the minimum rider record needed to complete a ticket. They shall not receive bulk export, unrestricted trip-history search across the network, or payment full-PAN access.

**Data, product, and research roles** shall use de-identified or aggregated datasets by default. Identified rider-level access requires a documented business purpose and manager approval.

**Flight-operations and maintenance roles** shall be granted only after the Director of Flight Operations (or delegate) approves, in addition to identity provisioning. Fitness-for-duty and training currency may be used as a condition of access to dispatch systems.

**Finance and payment roles** shall be granted only after Finance leadership approval. Cardholder data environments shall be segregated; general workforce shall have no access.

**Developers** shall not use production Restricted data in non-production. If production-like data is required, it shall be masked or synthetically generated unless the CISO approves a time-bounded exception.

## 6. Joiner, mover, leaver

| Event | Requirement |
|---|---|
| **Join** | Written manager request, role template, MFA enrollment, policy acknowledgment (POL-SEC-001) before access to Confidential or Restricted data |
| **Move** | Prior role access removed or reduced within **3 business days** of the change; new access follows join rules |
| **Leave** (involuntary) | Identity, email, VPN, badge, and privileged access revoked **at notification**, before or simultaneous with the conversation where practicable |
| **Leave** (voluntary) | Revocation at end of last day, or sooner if risk warrants; forwarding rules only under manager + Legal approval |
| **Contractor end** | Same-day revocation on contract end date; sponsor is accountable for notice to Identity |

Managers who fail to notify People/Identity of a departure remain accountable for resulting access.

People shall maintain a single workforce source of truth. The CISO shall reconcile identity against that source at least monthly.

## 7. Privileged access

Privileged access means the ability to change security controls, identity, production data, payment flows, aircraft-software load, or vertiport access systems.

- Privileged accounts shall be separate from the person’s day-to-day mailbox account.
- Standing privileged access shall be avoided. Just-in-time or checked-out access is the standard.
- Break-glass accounts shall exist for identity and flight-ops failure, stored in a dual-control vault, monitored, and tested at least quarterly. Use of break-glass is a reportable event to the CISO within 24 hours.
- Privileged activity on production and flight-ops systems shall be logged and retained at least one year, and three years where feasible.
- The CISO, CIO, and Director of Flight Operations shall review privileged access **at least quarterly**. Reviewers shall not solely recertify their own access; the CEO recertifies CISO privileged access.

## 8. Third-party and integration access

Vendors with access to Flyber systems or data shall:

- be under written contract including security, notice, and data-return/destruction terms;
- use named users or documented service identities — not a shared “vendor@” password in a ticket;
- be limited by network and application controls to the contracted function;
- be reviewed at least quarterly if they hold Restricted access, otherwise at least annually;
- be disconnected on contract end, with keys rotated.

API keys and service principals are identities. They shall be owned, rotated, scoped, and revoked like people.

## 9. Physical access

Vertiports, hangars, the operations center, and rooms housing network or aircraft-ground equipment are **controlled space**.

- Badges are individual and shall not be shared or held open for unknown persons.
- Visitors shall be signed in, escorted in controlled space, and issued visible identification.
- Access to aircraft, keys, and charging/fueling equipment shall follow Flight Operations procedures; those procedures shall meet this policy’s least-privilege and leaver rules.
- Lost badges shall be reported the same day and disabled.
- Physical access lists for hangars and ops shall be reviewed at least quarterly.
- CCTV and badge logs are Confidential and shall be accessed only for security, safety, or legal purposes.

Remote unlocking of pad doors or gates via software is privileged access under Section 7.

## 10. Remote access and network

Remote access to Internal systems shall use approved MFA-backed methods. Direct exposure of administration interfaces to the public internet is prohibited.

Split or personal VPNs, unauthorized remote-support tools, and unknown Wi-Fi bridges in hangars or pads are prohibited (POL-SEC-001).

Wireless networks for guests shall be segregated from operations and corporate networks.

## 11. Periodic reviews and monitoring

In addition to privileged reviews:

- Access to Restricted data stores shall be certified at least **quarterly** by the data owner.
- Access to Confidential stores at least **semi-annually**.
- Anomalous access (bulk export, off-hours location lookups, access to a rider who is a public figure or acquaintance) shall be alertable and investigated.
- The CISO shall report quarterly to the Board or designated committee: review completion rates, overdue revocations, break-glass uses, and material exceptions.

## 12. Exceptions

Documented, time-bounded, compensating-controlled, CISO-approved. Privileged or Restricted-data exceptions require CEO concurrence. Emergency access to preserve safety is permitted, then logged and reviewed within one business day.

## 13. Enforcement

Non-compliance may result in immediate access removal and discipline up to termination. Circumvention of access control (shared passwords, disabled MFA, badge tailgating into controlled space after warning) is a serious violation.

## 14. Review

Annual, and after any SEV-1 incident involving credential abuse. Material amendments require Board approval.

---

## Approval

| | Name | Signature | Date |
|---|---|---|---|
| Owner (CISO) | Marcus Hale | | |
| CIO (concurrence) | | | |
| CEO | Alexandra Chen | | |
| Chair, Board of Directors | | | |

**Board resolution:** Approved as part of the Information Security Policy Suite v1.0 on ______________ 2026.
