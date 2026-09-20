# Project Handover Document

> **How to use this template.** Replace every `{{placeholder}}` and every
> *italic guidance line*. Delete sections that genuinely do not apply and say so
> rather than leaving them blank — an empty section reads as an unfinished one.
> Keep guidance lines out of the final version. Target length is 8–20 pages;
> anything longer belongs in an appendix or a linked document.

---

## Document Control

| Field | Value |
| --- | --- |
| Project name | {{name}} |
| Document version | {{e.g. 1.0}} |
| Status | {{Draft / In review / Approved / Accepted}} |
| Author | {{name, role}} |
| Reviewer(s) | {{name, role}} |
| Approver | {{name, role}} |
| Date issued | {{YYYY-MM-DD}} |
| Handover effective date | {{YYYY-MM-DD}} |
| Next review date | {{YYYY-MM-DD}} |

### Revision History

| Version | Date | Author | Summary of change |
| --- | --- | --- | --- |
| {{0.1}} | {{date}} | {{author}} | {{Initial draft}} |

### Distribution

| Recipient | Role | Purpose |
| --- | --- | --- |
| {{name}} | {{role}} | {{receive / review / approve}} |

---

## 1. Executive Summary

*Half a page, written last. What this project is, what state it is being handed
over in, the two or three things the receiving team must not get wrong, and any
decision that needs making in the first 30 days.*

---

## 2. Project Overview

### 2.1 Purpose and Business Objectives

*Why the project exists. The business problem, in the language of the people who
funded it, not in technical terms.*

### 2.2 Success Criteria

*What "done" meant and how it was measured. Include the original targets and the
actual outcome against each.*

| Objective | Target | Achieved | Notes |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

### 2.3 Key Decisions and Their Rationale

*The choices a newcomer would otherwise reverse by accident. For each: the
decision, the alternatives considered, why this one, and what would make it
worth revisiting.*

### 2.4 Assumptions and Constraints

*Budget, timeline, regulatory, technical, and commercial constraints that shaped
the result and that the receiving team inherits.*

---

## 3. Scope

### 3.1 In Scope

*What was built and is being handed over.*

### 3.2 Out of Scope

*What was deliberately excluded. This section prevents more disputes than any
other.*

### 3.3 Deferred / Explicitly Not Built

*Work that was identified, agreed to be out of this phase, and is now the
receiving team's responsibility.*

---

## 4. Current Status

### 4.1 Status Summary

*One line per workstream: complete, partial, or not started.*

| Workstream | Status | Confidence | Owner |
| --- | --- | --- | --- |
| {{}} | {{Complete / Partial / Not started}} | {{High / Medium / Low}} | {{}} |

### 4.2 What Works Today

*What a user can actually do with the thing, end to end. Be concrete.*

### 4.3 What Does Not Work Yet

*Be blunt. Undisclosed gaps discovered later cost far more trust than gaps
declared now.*

### 4.4 Recent Changes

*The last significant changes, what prompted them, and whether they are fully
settled.*

---

## 5. Deliverables Inventory

| # | Deliverable | Location / Link | Format | Status | Accepted by |
| --- | --- | --- | --- | --- | --- |
| {{1}} | {{}} | {{URL or path}} | {{}} | {{}} | {{}} |

---

## 6. Technical Architecture

*(Delete this section for a non-technical handover.)*

### 6.1 System Overview

*A diagram plus a paragraph. Show components, data flow, and trust boundaries —
where does untrusted input enter, where is it validated.*

### 6.2 Technology Stack

| Layer | Technology | Version | Notes / justification |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

### 6.3 Repository and Branching

*Repository URLs, the branch that deploys, the branch model, and any branch that
must not be deleted.*

### 6.4 Data Model

*Principal entities, their relationships, and where the authoritative schema
lives. Call out anything denormalised or cached, and what keeps it consistent.*

### 6.5 Integrations

| System | Purpose | Direction | Auth method | Owner | Documentation |
| --- | --- | --- | --- | --- | --- |
| {{}} | {{}} | {{in / out / both}} | {{}} | {{}} | {{}} |

---

## 7. Environments and Access

### 7.1 Environments

| Environment | URL | Purpose | Deploy source | Data | Owner |
| --- | --- | --- | --- | --- | --- |
| {{Production}} | {{}} | {{}} | {{branch / commit}} | {{real / synthetic}} | {{}} |

### 7.2 Credentials and Secrets

*Never write a secret into this document. Record where each one lives and who
can retrieve it.*

| Secret | Used by | Stored in | Rotation policy | Holder |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{vault / provider env}} | {{}} | {{}} |

### 7.3 Access Requests

*Exactly what the receiving team must be granted, and to whom they should ask.*

| System | Access needed | Level | Approver | Requested? |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{Yes / No}} |

### 7.4 Local Development Setup

*Steps to go from a fresh machine to a running instance, plus the environment
variables required and any step that fails silently when skipped.*

---

## 8. Operations

### 8.1 Deployment Procedure

*The exact steps, in order, including anything that must happen in the same
window as something else.*

### 8.2 Rollback Procedure

*How to undo a bad deploy, how long it takes, and what cannot be rolled back.*

### 8.3 Scheduled Jobs and Background Processes

| Job | Schedule | Purpose | Failure impact | Where to monitor |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 8.4 Monitoring and Alerting

| Signal | Tool | Threshold | Alert recipient | Runbook |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 8.5 Backup and Recovery

*What is backed up, how often, how retention works, the last time a restore was
actually tested, and the measured recovery time.*

### 8.6 Incident Response

*How a production problem is reported, who is on call, and the escalation path.*

### 8.7 Routine Maintenance Calendar

| Task | Frequency | How | Last done |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

---

## 9. Testing and Quality

### 9.1 Test Strategy and Coverage

*What is automated, what is manual, and — more usefully — what is not tested at
all.*

### 9.2 How to Run the Checks

| Check | Command | Expected result |
| --- | --- | --- |
| {{}} | {{}} | {{}} |

### 9.3 Known Untested Areas

---

## 10. Security, Privacy and Compliance

### 10.1 Security Posture

*Authentication, authorisation, data protection in transit and at rest, and any
control that is documented but not enforced.*

### 10.2 Privacy and Data Handling

*What personal data is held, on what lawful basis, retention, and how deletion
requests are handled. Distinguish clearly between controls that exist and claims
of regulatory compliance.*

### 10.3 Compliance Obligations

| Obligation | Applies? | Status | Evidence | Owner |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 10.4 Outstanding Security Work

*Ranked, with the risk of deferring each.*

---

## 11. Known Issues and Risks

### 11.1 Open Defects

| ID | Description | Severity | Workaround | Impact if unresolved |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{Critical / High / Medium / Low}} | {{}} | {{}} |

### 11.2 Risks Inherited

| Risk | Likelihood | Impact | Mitigation in place | Residual owner |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 11.3 Technical Debt

*What was consciously traded away for speed, what it will cost to repay, and
what breaks first if it is never repaid.*

---

## 12. Outstanding Work and Roadmap

### 12.1 Immediate Priorities (first 30 days)

*Ordered, with the reason each is first.*

### 12.2 Backlog

| Item | Description | Priority | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 12.3 Proposed Direction

*Recommendations that were formed but not acted on, and the reasoning behind
them.*

### 12.4 Deliberately Not Recommended

*Ideas considered and rejected, so they are not re-litigated by someone without
the context.*

---

## 13. Costs and Contracts

| Item | Provider | Cost | Billing cycle | Renewal / expiry | Owner |
| --- | --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} | {{}} |

*Include anything that will fail, expire, or start billing if nobody acts.*

---

## 14. Stakeholders and Contacts

| Name | Role | Responsibility | Contact | Availability |
| --- | --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} | {{}} |

### 14.1 Post-Handover Support

*How long the outgoing team remains reachable, on what terms, and what is
explicitly not covered.*

---

## 15. Knowledge Transfer

### 15.1 Sessions Delivered

| Topic | Date | Attendees | Recording / notes |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

### 15.2 Scheduled Sessions

### 15.3 Recommended Reading Order

*The order in which someone should read the documentation, and why.*

---

## 16. Documentation Index

| Document | Location | Owner | Last updated |
| --- | --- | --- | --- |
| {{}} | {{}} | {{}} | {{}} |

---

## 17. Handover Acceptance

*The receiving party confirms they have received, reviewed, and understood the
above, and accept ownership from the effective date. Outstanding items in
Section 12 remain the responsibility of the receiving party unless stated
otherwise.*

### 17.1 Outstanding Items Accepted

| Item | Accepted by receiving party? | Notes |
| --- | --- | --- |
| {{}} | {{Yes / No / Deferred}} | {{}} |

### 17.2 Sign-off

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| Handing over | {{}} | {{}} | {{}} |
| Receiving | {{}} | {{}} | {{}} |
| Sponsor / approver | {{}} | {{}} | {{}} |

---

## Appendices

### Appendix A — Glossary

*Terms, acronyms, and internal names that would otherwise be opaque.*

| Term | Meaning |
| --- | --- |
| {{}} | {{}} |

### Appendix B — Environment Variables and Configuration

| Variable | Required in | Purpose | Example (non-secret) |
| --- | --- | --- | --- |
| {{}} | {{build / runtime}} | {{}} | {{}} |

### Appendix C — Command Reference

### Appendix D — Architecture Diagrams

### Appendix E — Decision Log

*The full record behind Section 2.3, if it is too long to include there.*
