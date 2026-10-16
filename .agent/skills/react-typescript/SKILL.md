---
name: react-typescript
description: React and TypeScript conventions for BillBridge. Use when writing React components, hooks, context providers, or any TSX/TS code in the project. Includes Tailwind CSS v4, shadcn/ui, and Lucide React conventions.
---

# React & TypeScript Skill

Best practices and conventions for writing React + TypeScript code in BillBridge.

> **Official References**
> - React: https://react.dev/learn
> - TypeScript: https://www.typescriptlang.org/docs/
> - Tailwind CSS v4: https://tailwindcss.com/docs
> - shadcn/ui: https://ui.shadcn.com/docs
> - Lucide React: https://lucide.dev/guide/packages/lucide-react

## TypeScript Configuration

- Use `strict: true` in `tsconfig.json` — no exceptions
- Enable `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` when practical
- Prefer `interface` for object shapes that may be extended; use `type` for unions, intersections, and utility types
- Never use `any` — use `unknown` and narrow with type guards
- Export types alongside their components from the same module

## Component Patterns

### Function Components
```tsx
// ✅ Prefer named function declarations with explicit return types
interface PatientCardProps {
  patient: Patient;
  onSelect: (id: string) => void;
}

export function PatientCard({ patient, onSelect }: PatientCardProps) {
  return (/* ... */);
}

// ❌ Avoid React.FC — it adds implicit children and complicates generics
```

### File Organization
- One component per file; filename matches component name (`PatientCard.tsx`)
- Co-locate tests: `PatientCard.test.tsx`
- Barrel exports (`index.ts`) only at feature-folder boundaries, not per-component

### Component Hierarchy
```
src/
  components/       # Shared UI primitives (shadcn/ui components live here)
    ui/             # shadcn/ui generated components (Button, Dialog, Table, etc.)
  features/         # Feature-specific components grouped by domain
    billing/
    claims/
    patients/
  hooks/            # Shared custom hooks
  lib/              # Utilities, API clients, helpers (includes cn() util)
  types/            # Shared type definitions
  app/              # Routing, layouts, pages (Next.js App Router or equivalent)
```

## Tailwind CSS v4

BillBridge uses **Tailwind CSS v4** with the Vite plugin.

### Setup
```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
```

```css
/* src/index.css — single import, no config file needed in v4 */
@import "tailwindcss";
```

### Key v4 Differences from v3
- **No `tailwind.config.js`** — theme customization is done via CSS `@theme` directive
- **CSS-first configuration** — use `@theme` in CSS to define design tokens
- **`@import "tailwindcss"`** replaces the old `@tailwind` directives
- **Native CSS variables** — all theme values are available as `--color-*`, `--spacing-*`, etc.
- **Automatic content detection** — no `content` array needed

### Theme Customization (v4)
```css
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.6 0.2 250);
  --color-brand-light: oklch(0.8 0.15 250);
  --font-display: "Plus Jakarta Sans", sans-serif;
  --font-body: "Inter", sans-serif;
  --radius-lg: 0.75rem;
}
```

### Conventions
- Use Tailwind utility classes for all styling — no inline styles, no separate CSS modules
- Use `cn()` helper (from `lib/utils.ts`) to merge conditional classes:
  ```ts
  import { clsx, type ClassValue } from "clsx"
  import { twMerge } from "tailwind-merge"

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }
  ```
- Responsive: mobile-first with `sm:`, `md:`, `lg:`, `xl:`, `2xl:` breakpoints
- Dark mode: use `dark:` variant; follows `class` strategy
- State variants: `hover:`, `focus:`, `active:`, `disabled:`, `aria-*:` (e.g., `aria-selected:bg-accent`)
- Animations: use Tailwind's `animate-*` utilities or define custom animations in `@theme`

## shadcn/ui

BillBridge uses **shadcn/ui** as its component library. Components are copied into `src/components/ui/` — they are not imported from a package.

### Adding Components
```bash
# Add a component (copies source code into your project)
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add form
```

### Key Conventions
- **Components are owned by you** — modify them freely after adding
- Built on **Radix UI** primitives — accessible by default (keyboard, screen reader, focus management)
- Styled with Tailwind CSS — uses CSS variables for theming via `--radius`, `--primary`, `--background`, etc.
- Use the `data-slot` attribute pattern for styling sub-elements
- Compose shadcn/ui primitives into domain components:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ClaimSummaryCard({ claim }: { claim: Claim }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim #{claim.id}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">${claim.totalAmount}</p>
        <Button variant="outline" size="sm">View Details</Button>
      </CardContent>
    </Card>
  )
}
```

### Theming with shadcn/ui
Theme tokens are defined in CSS variables. The `components.json` file configures paths and style options:
```jsonc
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Component Variants
shadcn/ui components use `class-variance-authority` (cva) for variants:
```tsx
// Already built into shadcn/ui Button — use via props
<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="link">Link</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

## Lucide React (Icons)

BillBridge uses **Lucide React** for icons. It is tree-shakable — only imported icons are bundled.

### Usage
```tsx
import { FileText, DollarSign, AlertCircle, Check } from "lucide-react"

// Default usage
<FileText />

// With props
<DollarSign className="size-5 text-emerald-600" strokeWidth={1.5} />

// With Tailwind sizing
<AlertCircle className="size-4" />

// Accessible icon with label
<Check className="size-4" aria-label="Approved" />

// Decorative icon (hidden from screen readers)
<FileText className="size-4" aria-hidden="true" />
```

### Conventions
- Import icons individually — never use a barrel/wildcard import
- Use `className="size-*"` for sizing (Tailwind shorthand for width + height)
- Use `strokeWidth` prop to adjust weight (default 2, use 1.5 for lighter feel)
- For button icons: place before text with `gap-2` on the parent
- Always decide: decorative (`aria-hidden="true"`) or meaningful (`aria-label="..."`)

## Hooks

- Custom hooks must start with `use` and have a clear single responsibility
- Prefer composition of small hooks over monolithic ones
- Always specify dependency arrays explicitly — never suppress the exhaustive-deps rule
- Use `useCallback` / `useMemo` only when passing to memoized children or expensive computations — not by default
- Avoid `useEffect` for derived state — compute during render instead

```tsx
// ✅ Derived state — compute during render
const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

// ❌ Unnecessary effect
useEffect(() => {
  setTotalAmount(lineItems.reduce((sum, item) => sum + item.amount, 0));
}, [lineItems]);
```

## State Management

- **Local state**: `useState` / `useReducer` for component-scoped state
- **Server state**: Use TanStack Query for async data fetching, caching, and mutations
- **Global UI state**: React Context for theme, auth, toast notifications — keep contexts small and focused
- **URL state**: Use search params for filter/sort/pagination state so it's shareable and bookmarkable
- Never store server data in global state — let the query cache be the source of truth

## Error Handling

- Use Error Boundaries for component-tree errors — provide meaningful fallback UI
- Handle async errors at the query/mutation level with `onError` callbacks
- Type error responses from the API; don't assume error shapes

## Forms

- Use controlled components with React Hook Form
- Validate with Zod schemas — share validation schemas between client and server
- Use shadcn/ui `<Form>` components which integrate React Hook Form + Zod:
  ```tsx
  import { useForm } from "react-hook-form"
  import { zodResolver } from "@hookform/resolvers/zod"
  import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
  ```
- Show inline validation errors; don't rely on alert dialogs

## Performance

- Use `React.lazy()` + `Suspense` for route-level code splitting
- Avoid prop drilling beyond 2 levels — use composition or context
- Profile before optimizing — use React DevTools Profiler
- Images: use `next/image` (Next.js) or explicit `width`/`height` + `loading="lazy"`

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Components | PascalCase | `ClaimDetail` |
| Hooks | camelCase with `use` prefix | `useClaimStatus` |
| Utilities | camelCase | `formatCurrency` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `BillingRecord` |
| Enum members | PascalCase | `ClaimStatus.Approved` |
| Files (components) | PascalCase.tsx | `ClaimDetail.tsx` |
| Files (utils/hooks) | camelCase.ts | `useClaimStatus.ts` |
| shadcn/ui components | kebab-case.tsx (in `ui/`) | `data-table.tsx` |

## Key Rules

1. **No default exports** — use named exports for better refactoring and auto-imports
2. **No `index.tsx` components** — name the file after the component
3. **No string literals for repeated values** — use constants or enums
4. **No inline styles** — use Tailwind classes via `className`
5. **No console.log in committed code** — use a logger utility or remove before commit
6. **Use shadcn/ui components** before building custom UI primitives
7. **Use Lucide icons** — don't add other icon packages
