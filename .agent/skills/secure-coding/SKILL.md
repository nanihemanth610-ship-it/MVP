---
name: secure-coding
description: Secure coding practices for BillBridge. Use when writing authentication flows, API endpoints, data handling, input validation, or any code that processes user input or sensitive data. Covers OWASP Top 10 mitigations.
---

# Secure Coding Skill

Security-first coding practices for BillBridge, aligned with OWASP Top 10 (2021) and healthcare data handling requirements.

## OWASP Top 10 — Applied to BillBridge

### A01: Broken Access Control
- **Supabase RLS is mandatory** on every user-data table (see supabase-postgres skill)
- Verify `auth.uid()` on every server-side operation — never trust client-provided user IDs
- Use deny-by-default: users access nothing unless a policy explicitly grants it
- Disable directory listing, source maps, and debug endpoints in production

```ts
// ✅ Server-side: verify the user owns the resource
const { data, error } = await supabase
  .from('claims')
  .select('*')
  .eq('id', claimId)
  .eq('user_id', session.user.id)  // RLS + application-level check
  .single();
```

### A02: Cryptographic Failures
- Use HTTPS everywhere — enforce with HSTS headers
- Never store passwords in custom columns — use Supabase Auth
- Hash any sensitive identifiers before logging
- Use `crypto.randomUUID()` for tokens — never `Math.random()`

### A03: Injection
- **SQL**: Always use parameterized queries / Supabase client (never string concatenation)
- **XSS**: React auto-escapes JSX output; never use `dangerouslySetInnerHTML` unless sanitized with DOMPurify
- **Command injection**: Never pass user input to `child_process` or shell commands

```ts
// ✅ Parameterized via Supabase client
const { data } = await supabase.from('claims').select().eq('id', userInput);

// ❌ NEVER do this
const { data } = await supabase.rpc('search', { query: `%${userInput}%` }); // Potential SQL injection in RPC
```

### A04: Insecure Design
- Validate all inputs on the server — client validation is UX, not security
- Rate-limit authentication endpoints and API routes
- Use Zod schemas shared between client and server for consistent validation
- Design with least privilege — each role/user gets minimum necessary access

### A05: Security Misconfiguration
- Remove default credentials, example configs, and debug routes before deployment
- Set proper CORS: allow only your domain, not `*`
- Configure Content Security Policy (CSP) headers
- Disable `X-Powered-By` header

```ts
// Next.js security headers (next.config.js)
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '0' }, // Rely on CSP instead
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co;",
  },
];
```

### A06: Vulnerable Components
- See **dependency-auditing** skill for `npm audit` and supply-chain practices
- Pin dependency versions; review changelogs before major upgrades

### A07: Authentication Failures
- Use Supabase Auth — don't build custom auth
- Enforce strong passwords via Supabase Auth settings
- Implement MFA for admin/provider accounts
- Session tokens: use Supabase's httpOnly cookie flow, not localStorage
- Lock accounts after repeated failed login attempts

### A08: Data Integrity Failures
- Verify webhook signatures — never trust unverified incoming data
- Validate file uploads: check MIME type, file extension, and file size
- Use SRI (Subresource Integrity) for CDN-loaded scripts

### A09: Logging & Monitoring Failures
- Log security events: failed logins, access denials, permission changes
- **Never log**: passwords, tokens, PHI, full credit card numbers
- Structure logs as JSON for searchability
- Set up alerts for anomalous patterns (brute force, unusual access)

### A10: Server-Side Request Forgery (SSRF)
- Validate and allowlist URLs before making server-side HTTP requests
- Don't allow user-provided URLs to internal services
- Use a URL parser and reject private IP ranges (`10.*`, `172.16–31.*`, `192.168.*`, `127.*`)

## Input Validation

### Zod Schema Pattern
```ts
import { z } from 'zod';

export const createClaimSchema = z.object({
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  dateOfService: z.string().date(),
  lineItems: z.array(z.object({
    cptCode: z.string().regex(/^\d{5}$/),
    description: z.string().min(1).max(500),
    amount: z.number().positive().max(999999.99),
  })).min(1).max(100),
});

// Use on the server
const parsed = createClaimSchema.safeParse(requestBody);
if (!parsed.success) {
  return Response.json({ errors: parsed.error.flatten() }, { status: 400 });
}
```

### File Upload Validation
```ts
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function validateUpload(file: File): void {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }
  // Also validate magic bytes on the server — don't trust Content-Type alone
}
```

## Environment Variables

- **Never commit `.env` files** — add to `.gitignore`
- Use `.env.example` with placeholder values for documentation
- Validate required env vars at application startup — fail fast if missing
- Separate secrets by environment (dev/staging/production)

## Key Rules

1. **Never trust client input** — validate everything server-side
2. **Never log secrets or PHI** — hash/redact before logging
3. **Never use `dangerouslySetInnerHTML`** without DOMPurify sanitization
4. **Never store secrets in source code** — environment variables only
5. **Always use HTTPS** — no exceptions
6. **Always check authentication and authorization** before data access
7. **Always validate file uploads** — type, size, and magic bytes
