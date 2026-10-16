---
name: threat-modeling
description: Threat modeling guidelines for BillBridge. Use when designing new features, reviewing architecture, or assessing security risks. Applies the STRIDE framework and produces actionable threat matrices.
---

# Threat Modeling Skill

Systematic approach to identifying, categorizing, and mitigating security threats in BillBridge using the STRIDE framework.

## When to Threat Model

- **New features** that handle user data, authentication, payments, or external integrations
- **Architecture changes** that add new entry points, data flows, or trust boundaries
- **Third-party integrations** (n8n, Gemini API, payer APIs, Supabase Edge Functions)
- **Periodic review** of existing attack surfaces

## STRIDE Framework

| Category | Threat | Question to Ask | BillBridge Example |
|---|---|---|---|
| **S**poofing | Identity impersonation | Can an attacker pretend to be another user? | Session hijacking, JWT forgery |
| **T**ampering | Data modification | Can data be altered in transit or at rest? | Modifying claim amounts, altering webhook payloads |
| **R**epudiation | Denying actions | Can a user deny performing an action? | Claim submission without audit trail |
| **I**nformation Disclosure | Data leakage | Can sensitive data be accessed by unauthorized parties? | PHI exposure via API, error messages leaking internals |
| **D**enial of Service | Service disruption | Can the service be made unavailable? | API abuse, large file upload floods |
| **E**levation of Privilege | Unauthorized access | Can a user gain admin/higher privileges? | Bypassing RLS, JWT role manipulation |

## Threat Modeling Process

### Step 1: Define the Scope
Identify what you're modeling:
- Feature name and description
- Data handled (PHI, PII, financial, credentials)
- Components involved (frontend, API, database, external services)

### Step 2: Draw a Data Flow Diagram (DFD)
Identify:
- **External entities** (users, payers, n8n, Gemini API)
- **Processes** (API routes, Edge Functions, webhook handlers)
- **Data stores** (Supabase database, file storage, cache)
- **Data flows** (arrows showing what data moves where)
- **Trust boundaries** (client ↔ server, server ↔ database, server ↔ external API)

### Step 3: Enumerate Threats (STRIDE per Element)

For each element in the DFD, consider applicable STRIDE categories:

| DFD Element | Applicable STRIDE Categories |
|---|---|
| External entities | S (Spoofing) |
| Processes | S, T, R, I, D, E (all) |
| Data stores | T, R, I, D |
| Data flows | T, I, D |

### Step 4: Rate Severity

Use a simplified risk matrix:

| Impact \ Likelihood | Low | Medium | High |
|---|---|---|---|
| **High** | Medium | High | Critical |
| **Medium** | Low | Medium | High |
| **Low** | Informational | Low | Medium |

### Step 5: Define Mitigations

For each threat, specify:
1. **Mitigation strategy** (prevent, detect, or accept)
2. **Implementation** (specific code change, configuration, or monitoring)
3. **Verification** (how to test the mitigation works)

## BillBridge Threat Surfaces

### 1. Authentication & Session Management
| Threat | Category | Severity | Mitigation |
|---|---|---|---|
| JWT token theft | Spoofing | High | httpOnly cookies, short token lifetime, refresh rotation |
| Weak passwords | Spoofing | Medium | Supabase Auth password policies, MFA |
| Session fixation | Spoofing | Medium | Regenerate session on login |

### 2. Claim Data Processing
| Threat | Category | Severity | Mitigation |
|---|---|---|---|
| Amount tampering in transit | Tampering | Critical | Server-side validation, re-extract from source document |
| Unauthorized claim access | Info Disclosure | Critical | RLS policies, application-level ownership checks |
| Claim submission repudiation | Repudiation | Medium | Audit trail with timestamps, user ID, IP |
| Malicious file upload | Tampering / DoS | High | File type validation, size limits, sandboxed processing |

### 3. External Integrations
| Threat | Category | Severity | Mitigation |
|---|---|---|---|
| Webhook payload forgery | Spoofing / Tampering | High | HMAC signature verification |
| Gemini API key exposure | Info Disclosure | Critical | Server-side only, env vars, never in client bundle |
| n8n workflow manipulation | Elevation | High | Restrict n8n admin access, version-control workflows |
| Payer API SSRF | Tampering | Medium | URL allowlisting, private IP blocking |

### 4. Data Storage
| Threat | Category | Severity | Mitigation |
|---|---|---|---|
| PHI exposure via SQL injection | Info Disclosure | Critical | Parameterized queries, RLS |
| Database backup theft | Info Disclosure | High | Encrypted backups, access controls |
| Unencrypted PHI at rest | Info Disclosure | High | Supabase encrypts at rest by default; verify config |

## Output Template

When performing a threat model, produce a markdown document with:

```markdown
# Threat Model: [Feature Name]

## Scope
- Feature: ...
- Data classification: ...
- Components: ...

## Data Flow Diagram
(Mermaid diagram or description)

## Threat Matrix
| ID | Threat | STRIDE | Element | Severity | Mitigation | Status |
|----|--------|--------|---------|----------|------------|--------|
| T-001 | ... | S | ... | High | ... | ☐ Open |

## Residual Risks
(Accepted risks with justification)

## Action Items
- [ ] ...
```

## Key Rules

1. **Threat model before building** — not after
2. **Focus on trust boundaries** — most vulnerabilities exist at crossings
3. **PHI is always high-impact** — any info disclosure involving PHI is Critical
4. **Document residual risks** — explicitly accept risks with justification
5. **Review periodically** — threat models are living documents, update with architecture changes
6. **Involve the team** — threat modeling is collaborative, not a solo exercise
