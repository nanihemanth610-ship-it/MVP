---
name: accessibility
description: Accessibility (a11y) guidelines for BillBridge. Use when building UI components, forms, navigation, modals, or any interactive elements to ensure WCAG 2.2 AA compliance.
---

# Accessibility Skill

> **Official Reference**: https://www.w3.org/WAI/WCAG22/quickref/

Ensure BillBridge interfaces are usable by everyone, including users of screen readers, keyboards, switch devices, and magnification software. Target: **WCAG 2.2 Level AA**.

## Core Principles

1. **Perceivable** — Information must be presentable in ways all users can perceive
2. **Operable** — UI must be operable through keyboard, pointer, and assistive tech
3. **Understandable** — Content and operation must be understandable
4. **Robust** — Content must be interpretable by a wide variety of user agents

## Semantic HTML First

- Use native HTML elements before reaching for ARIA: `<button>`, `<a>`, `<nav>`, `<main>`, `<dialog>`, `<details>`, `<table>`
- Every page must have exactly one `<main>`, proper heading hierarchy (`h1` → `h2` → `h3`), and landmark regions
- Use `<ul>` / `<ol>` for lists; use `<table>` with `<thead>`, `<th scope>` for tabular data
- Never use `<div>` or `<span>` for interactive elements — they lack built-in keyboard and screen reader support

```tsx
// ✅ Correct
<button onClick={handleSubmit}>Submit Claim</button>

// ❌ Inaccessible
<div onClick={handleSubmit} className="button">Submit Claim</div>
```

## ARIA Usage

### First Rule of ARIA
> Don't use ARIA if a native HTML element provides the semantics you need.

### When ARIA Is Needed
- **Custom widgets**: tabs, comboboxes, tree views, drag-and-drop
- **Dynamic content**: `aria-live` regions for status updates, toast notifications
- **Relationships**: `aria-labelledby`, `aria-describedby`, `aria-controls`
- **State**: `aria-expanded`, `aria-selected`, `aria-pressed`, `aria-checked`

### Common Patterns

| Pattern | Key ARIA | Notes |
|---|---|---|
| Modal dialog | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` | Trap focus inside; return focus on close |
| Tabs | `role="tablist/tab/tabpanel"`, `aria-selected` | Arrow keys navigate tabs; Tab key enters panel |
| Combobox | `role="combobox"`, `aria-expanded`, `aria-activedescendant` | Announce filtered results with live region |
| Alert/Toast | `role="alert"` or `aria-live="assertive"` | Keep message concise; auto-dismiss optional |
| Status | `aria-live="polite"` | For non-urgent updates (loading states, counts) |
| Data table | `aria-sort`, `aria-rowcount`, `aria-colcount` | For sortable/paginated tables |

## Keyboard Navigation

- **All interactive elements must be keyboard-accessible** — focusable and activatable
- Logical tab order that follows visual order; use `tabindex="0"` only to make non-interactive elements focusable when semantically needed
- Never use `tabindex` values > 0
- Implement standard keyboard patterns:
  - `Enter` / `Space` → activate buttons
  - `Escape` → close modals, dropdowns, popovers
  - `Arrow keys` → navigate within composite widgets (tabs, menus, listboxes)
- **Focus management**: move focus to newly opened content (modals, drawers); restore focus when content closes

```tsx
// Focus trap example for modals
useEffect(() => {
  if (isOpen) {
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }
}, [isOpen]);
```

## Forms

- Every `<input>`, `<select>`, `<textarea>` must have a visible `<label>` with `htmlFor`
- Use `aria-required="true"` or the native `required` attribute
- Error messages: associate with `aria-describedby` pointing to the error element
- Use `aria-invalid="true"` on fields that fail validation
- Group related fields with `<fieldset>` + `<legend>`
- Don't rely on placeholder text as the label — it disappears on input

```tsx
<div>
  <label htmlFor="claim-amount">Claim Amount</label>
  <input
    id="claim-amount"
    type="number"
    aria-required="true"
    aria-invalid={!!errors.amount}
    aria-describedby={errors.amount ? "amount-error" : undefined}
  />
  {errors.amount && (
    <p id="amount-error" role="alert">{errors.amount.message}</p>
  )}
</div>
```

## Color & Contrast

- **Text contrast**: minimum 4.5:1 for normal text, 3:1 for large text (≥18pt / 14pt bold)
- **UI component contrast**: minimum 3:1 against adjacent colors (borders, icons, focus indicators)
- **Never use color alone** to convey information — add icons, patterns, or text labels
- Ensure focus indicators have 3:1 contrast and are clearly visible (minimum 2px outline)

## Images & Media

- Informative images: `alt` text describing the content
- Decorative images: `alt=""` (empty alt) or `aria-hidden="true"`
- Complex images (charts, diagrams): provide a text summary via `aria-describedby` or adjacent text
- Video: captions required; audio descriptions when visual content is essential

## Dynamic Content

- Use `aria-live` regions for content that updates without page reload
- Loading states: announce with `aria-busy="true"` on the container + live region status message
- Skeleton screens: mark with `aria-hidden="true"` and provide a live region "Loading..." message
- Route changes (SPA): announce new page title via a live region or focus management

## Testing Checklist

1. **Keyboard-only navigation** — can you reach and operate every interactive element?
2. **Screen reader testing** — VoiceOver (macOS), NVDA (Windows), or similar
3. **Zoom to 200%** — does content reflow without horizontal scrolling?
4. **Color contrast checker** — verify all text and UI components
5. **axe DevTools** or **Lighthouse Accessibility audit** — automated scanning
6. **Reduced motion** — does `prefers-reduced-motion` disable non-essential animations?

## Key Rules

1. **No `outline: none` without a replacement** — always provide a visible focus indicator
2. **No images of text** — use real text with CSS styling
3. **No auto-playing media** — if unavoidable, provide pause/stop controls
4. **No CAPTCHA without an accessible alternative**
5. **No time limits without extension options** for critical flows (claim submission)
