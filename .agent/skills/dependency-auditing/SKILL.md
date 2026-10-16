---
name: dependency-auditing
description: Dependency auditing and supply-chain security for BillBridge. Use when adding packages, reviewing lock files, running security audits, or assessing third-party dependencies.
---

# Dependency Auditing Skill

Practices for managing npm dependencies securely and auditing the BillBridge supply chain.

## Before Adding a Dependency

Ask these questions before running `npm install`:

1. **Is it necessary?** Can this be implemented in <50 lines without a library?
2. **Is it maintained?** Check: last commit <6 months ago, open issues triaged, active contributors
3. **Is it popular enough?** Prefer packages with >1k weekly downloads and established community
4. **Is it secure?** Run `npm audit` after adding; check Snyk/GitHub advisories
5. **What's the bundle impact?** Check with `npx bundlephobia <package>` or [bundlephobia.com](https://bundlephobia.com)
6. **What permissions does it need?** Review `postinstall` scripts — disable with `--ignore-scripts` if suspicious
7. **License compatible?** Verify license is compatible (MIT, Apache-2.0, BSD are safe; GPL requires review)

## npm audit

### Regular Auditing
```bash
# Run audit
npm audit

# Fix automatically (safe patches only)
npm audit fix

# See what fix would do without applying
npm audit fix --dry-run

# Force fix (may include breaking changes — review carefully)
npm audit fix --force
```

### Interpreting Results
| Severity | Action |
|---|---|
| **Critical** | Fix immediately — block deployments until resolved |
| **High** | Fix within 24 hours |
| **Moderate** | Fix within 1 week; evaluate if exploitable in your context |
| **Low** | Fix in next scheduled maintenance |

### When a Fix Isn't Available
1. Check if the vulnerability is exploitable in your usage context
2. Consider replacing the dependency with an alternative
3. Pin to a known-safe version and monitor for updates
4. Document the accepted risk in `audit-exceptions.md` with justification and review date

## Lock File Hygiene

- **Always commit** `package-lock.json` — it ensures reproducible builds
- **Never manually edit** the lock file — use `npm install` to regenerate
- **Review lock file diffs** in PRs — large unexplained changes may indicate tampering
- Use `npm ci` in CI/CD — installs from lock file exactly, fails on mismatches

## Dependency Pinning Strategy

```jsonc
// package.json — use exact versions for direct dependencies
{
  "dependencies": {
    "@supabase/supabase-js": "2.45.0",     // Exact
    "react": "19.0.0",                       // Exact
    "zod": "3.23.0"                          // Exact
  },
  "devDependencies": {
    "typescript": "~5.6.0",                  // Patch range OK for dev tools
    "vitest": "~2.1.0"                       // Patch range OK for dev tools
  }
}
```

- **Production deps**: pin to exact versions (`2.45.0` not `^2.45.0`)
- **Dev deps**: tilde range (`~5.6.0`) is acceptable
- Update deliberately via `npm update <package>` with testing, not automatically

## Supply Chain Security

### npm Configuration (`.npmrc`)
```ini
# Prevent arbitrary script execution on install
ignore-scripts=true

# Use exact versions by default
save-exact=true

# Audit on every install
audit=true
```

After setting `ignore-scripts=true`, explicitly run build scripts for packages that need them:
```bash
npm rebuild <package-that-needs-postinstall>
```

### Review Checklist for New Packages
- [ ] Check npm page for download count, last publish date, and maintainer count
- [ ] Review GitHub repo: stars, issues, recent activity
- [ ] Read the source code (especially `postinstall` scripts)
- [ ] Check for known vulnerabilities on [Snyk Advisor](https://snyk.io/advisor/)
- [ ] Verify package name carefully (typosquatting: `@supabase/supabase-js` ≠ `supabase-js`)
- [ ] Check bundle size on [bundlephobia.com](https://bundlephobia.com)

## CI/CD Integration

```yaml
# Example: audit step in CI pipeline
audit:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm audit --audit-level=high
    # Fails the build if high or critical vulnerabilities exist
```

## Monitoring

- Enable **GitHub Dependabot alerts** on the repository
- Review Dependabot PRs promptly — don't let them accumulate
- Schedule a monthly dependency review:
  1. Run `npm audit`
  2. Run `npm outdated` — assess if updates are needed
  3. Review any new advisories for your dependencies
  4. Update `audit-exceptions.md` if accepting risks

## Key Rules

1. **Never add a dependency without checking its security posture first**
2. **Always run `npm audit` before merging PRs that change `package.json`**
3. **Always commit `package-lock.json`** — never `.gitignore` it
4. **Use `npm ci` in CI/CD** — not `npm install`
5. **Pin production dependencies to exact versions**
6. **Review `postinstall` scripts** of new packages before running
7. **Document accepted vulnerabilities** with justification and review dates
