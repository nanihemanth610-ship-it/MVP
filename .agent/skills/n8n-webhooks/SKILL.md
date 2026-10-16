---
name: n8n-webhooks
description: n8n workflow automation and webhook conventions for BillBridge. Use when designing automation workflows, configuring webhook triggers, or integrating n8n with Supabase, Gemini, or external services.
---

# n8n & Webhooks Skill

> **Official References**
> - n8n docs: https://docs.n8n.io/
> - Workflow templates: https://n8n.io/workflows/

Guidelines for designing, building, and securing n8n workflows and webhook integrations in BillBridge.

## Workflow Design Principles

1. **Single responsibility** — each workflow handles one business process (e.g., "Process incoming EOB document", "Send claim status notification")
2. **Idempotent** — workflows should be safe to re-run; use database upserts and deduplication keys
3. **Observable** — include logging/status nodes so failed executions are diagnosable
4. **Fail-safe** — every workflow must have an error handler that notifies and logs

## Webhook Triggers

### Receiving Webhooks in n8n
```
Webhook Node Configuration:
  HTTP Method: POST
  Path: /webhook/claim-status-update
  Authentication: Header Auth
  Response Code: 200
  Response Data: First Entry
```

### Sending Webhooks from BillBridge
```ts
// Trigger an n8n workflow from the application
async function triggerWorkflow(webhookUrl: string, payload: object) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET!,
    },
    body: JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
      idempotencyKey: crypto.randomUUID(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }
}
```

### Webhook Security
- **Always authenticate** — use header-based auth (`X-Webhook-Secret`) or HMAC signatures
- **Validate payloads** — parse and validate with Zod before processing
- **Use HTTPS** — never send webhooks over plain HTTP
- **Verify source IP** if the provider publishes IP ranges
- **Idempotency keys** — include a unique key to prevent duplicate processing
- Store webhook secrets in n8n credentials, not in workflow JSON

## Common Workflow Patterns

### 1. Document Processing Pipeline
```
Webhook Trigger (receive uploaded document)
  → Validate payload (Function node)
  → Download file from Supabase Storage
  → Call Gemini API for extraction (HTTP Request node)
  → Parse structured response (Function node)
  → Upsert extracted data to Supabase (Postgres/HTTP node)
  → Send notification (Email/Slack node)
  → Error Handler (on failure → log + notify)
```

### 2. Claim Status Sync
```
Schedule Trigger (every 15 min) OR Webhook Trigger
  → Query claims with pending status (Supabase)
  → Loop: Check status with payer API
  → If changed → Update Supabase
  → If changed → Send notification to user
  → Error Handler
```

### 3. Notification Dispatcher
```
Webhook Trigger (from application)
  → Route by notification type (Switch node)
  → Format message (Function node)
  → Send via channel (Email / SMS / Push)
  → Log delivery status to Supabase
```

## Node Best Practices

### Function Nodes (JavaScript)
```javascript
// ✅ Validate input
const items = $input.all();
if (!items.length) {
  throw new Error('No input items received');
}

// ✅ Transform with explicit error handling
const results = items.map(item => {
  const { claimId, amount } = item.json;
  if (!claimId || typeof amount !== 'number') {
    throw new Error(`Invalid item: ${JSON.stringify(item.json)}`);
  }
  return { json: { claimId, amount, processedAt: new Date().toISOString() } };
});

return results;
```

### HTTP Request Nodes
- Set timeout values appropriate to the endpoint (30s for APIs, 120s for document processing)
- Enable retry on failure with exponential backoff
- Parse response with a Function node — don't assume response shape

### Database Nodes (Supabase / Postgres)
- Use parameterized queries — never concatenate user input into SQL
- Use upserts (`ON CONFLICT`) to handle reruns gracefully
- Limit result sets — always include `LIMIT` clauses

## Error Handling

Every production workflow must include:

1. **Error Trigger node** — catches execution failures
2. **Log the error** — write to a `workflow_errors` table or monitoring service
3. **Notify** — alert the team via email/Slack with workflow name, error, and execution ID
4. **Retry logic** — for transient failures (HTTP 5xx, timeouts), retry up to 3 times with backoff

```
Error Trigger
  → Function (format error details)
  → Supabase (insert into workflow_errors)
  → Email/Slack (notify team)
```

## Credentials Management

- **Never hardcode** credentials in workflow JSON — use n8n's built-in credential store
- Reference credentials by name in nodes — they're encrypted at rest
- Use separate credentials for dev/staging/production
- Rotate webhook secrets periodically

## Environment Separation

| Environment | n8n Instance | Webhook Base URL | Database |
|---|---|---|---|
| Development | Local (Docker) | `http://localhost:5678/webhook/` | Local Supabase |
| Staging | Self-hosted | `https://n8n-staging.example.com/webhook/` | Staging project |
| Production | Self-hosted / Cloud | `https://n8n.example.com/webhook/` | Production project |

- Export workflows as JSON and version-control them
- Use environment variables in n8n for URLs and non-secret config
- Test workflows with sample data before activating in production

## Key Rules

1. **Never expose webhook URLs publicly without authentication**
2. **Always include error handlers** in production workflows
3. **Never log sensitive data** (PHI, credentials, full documents) in workflow executions
4. **Webhook secrets in env vars / credential store** — never in source code
5. **Idempotent operations** — assume any webhook may be delivered more than once
6. **Validate all incoming data** before processing
