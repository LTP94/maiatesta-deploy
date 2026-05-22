# Incident Log

Use this file for production or workflow problems that could happen again.

## Format

```md
## YYYY-MM-DD - Short Title

- Impact:
- Cause:
- Fix:
- Verification:
- Prevention:
```

## 2026-05-21 - Hydration Errors In Local Dev

- Impact: Dev console showed hydration mismatch warnings and React replaced the root.
- Cause: Vite dev served `#root` with only `<!--app-html-->`, while `entry-client.tsx` always used `hydrateRoot`.
- Fix: Dev/empty placeholder roots now use `createRoot`; prerendered production HTML uses `hydrateRoot`.
- Verification: Build passed and Playwright confirmed no hydration console errors on localhost.
- Prevention: Keep dev and SSG hydration paths explicit.
