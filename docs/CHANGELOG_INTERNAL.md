# Internal Changelog

Use this file to record business-relevant technical/content changes.

## Format

```md
## YYYY-MM-DD

- Changed:
- Why:
- Risk:
- Verification:
- Follow-up:
```

## 2026-05-21

- Changed: Added internal operations documentation framework and raw asset workflow.
- Why: Make the project easier to hand off and safer to scale.
- Risk: Low; documentation and storage organization only.
- Verification: `npm run build`, `npm run check:bundle`, and `npm run check:seo` passed. `dist` has no `.mov`, `.DS_Store`, or `.ssg-server`.
- Follow-up: Decide whether raw assets move to Git LFS or external storage.
