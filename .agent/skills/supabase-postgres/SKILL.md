---
name: supabase-postgres
description: Supabase and PostgreSQL conventions for BillBridge. Use when writing database queries, creating migrations, configuring Row Level Security, or working with Supabase client SDK and Edge Functions. Never output or store API keys or secrets.
---

# Supabase & PostgreSQL Skill

> **Official Reference**: https://supabase.com/docs

Guidelines for database design, Supabase client usage, and PostgreSQL best practices in BillBridge.

> **CRITICAL**: Never output, log, or hardcode Supabase API keys, service role keys, database passwords, or JWT secrets. Reference them via environment variables only (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## Client Setup

### Browser / React Client
```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client (Next.js App Router)
```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

### Type Generation
- Run `npx supabase gen types typescript --project-id <ref> > src/types/database.ts`
- Import generated types in client code: `Database['public']['Tables']['claims']['Row']`
- Regenerate after every migration

## Database Design

### Naming Conventions
- Tables: `snake_case`, plural (`claims`, `billing_records`, `line_items`)
- Columns: `snake_case` (`created_at`, `patient_id`, `total_amount`)
- Primary keys: `id` (UUID, `gen_random_uuid()` default)
- Foreign keys: `<referenced_table_singular>_id` (e.g., `claim_id`)
- Indexes: `idx_<table>_<columns>` (e.g., `idx_claims_patient_id`)

### Standard Columns
Every table should include:
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
```

Add an `updated_at` trigger:
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Data Types
- Use `uuid` for primary keys — never auto-incrementing integers (security)
- Use `timestamptz` (not `timestamp`) — always store timezone-aware timestamps
- Use `numeric(precision, scale)` for money — never `float` or `real`
- Use `text` over `varchar` — PostgreSQL optimizes them the same; add `CHECK` constraints for length
- Use `jsonb` sparingly — only for truly schemaless data; prefer normalized columns

## Row Level Security (RLS)

**RLS must be enabled on every table that holds user-specific data.**

```sql
-- Enable RLS
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own claims
CREATE POLICY "Users read own claims"
  ON claims FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can insert their own claims
CREATE POLICY "Users insert own claims"
  ON claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can update their own claims (non-finalized only)
CREATE POLICY "Users update own claims"
  ON claims FOR UPDATE
  USING (auth.uid() = user_id AND status != 'finalized')
  WITH CHECK (auth.uid() = user_id);
```

### RLS Rules
1. **Default deny** — if no policy matches, access is denied
2. Test policies with the anon key, not the service role key
3. Never use `USING (true)` in production — that disables RLS for the operation
4. For admin access, use a separate policy checking a role claim in the JWT
5. Service role key bypasses RLS — never expose it to the client

## Migrations

- Use `npx supabase migration new <descriptive_name>` to create migration files
- Migrations are SQL files in `supabase/migrations/` — keep them idempotent where possible
- **Never** modify a migration that has been applied — create a new one
- Test migrations locally with `npx supabase db reset`
- Include both the `up` logic and a comment describing how to manually reverse it

## Queries

### Best Practices
```ts
// ✅ Select only needed columns
const { data, error } = await supabase
  .from('claims')
  .select('id, status, total_amount, patient:patients(name)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(0, 24);

// ✅ Always handle errors
if (error) throw new Error(`Failed to fetch claims: ${error.message}`);
```

- Always check `error` — Supabase client does not throw on query failure
- Use `.select()` with explicit columns — never `select('*')` in production code
- Use `.range()` for pagination; avoid `.limit()` without an offset
- Use database functions/RPC for complex logic instead of multiple client calls
- Use `.single()` only when exactly one row is expected

### Realtime
```ts
const channel = supabase
  .channel('claim-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'claims',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Handle update
  })
  .subscribe();
```

## Edge Functions

- Written in TypeScript/Deno; deployed with `npx supabase functions deploy`
- Use for server-side logic: webhook handlers, integrations, PDF generation
- Access env vars via `Deno.env.get('SECRET_NAME')` — never hardcode
- Validate request body with Zod before processing
- Return proper HTTP status codes and JSON error bodies

## Security Checklist

1. ✅ RLS enabled on all user-data tables
2. ✅ Service role key never in client-side code
3. ✅ API keys in environment variables only
4. ✅ Input validated before database writes
5. ✅ UUIDs for all primary keys (prevent enumeration)
6. ✅ `timestamptz` for all timestamps
7. ✅ Auth state checked before mutations
