# SOP: Roll Back Vercel

1. Open Vercel project deployments.
2. Redeploy the last known good deployment.
3. Verify homepage, services, guides, and WhatsApp links.
4. Log the incident in `docs/INCIDENTS.md`.
5. Reproduce the issue locally.
6. Fix in a small patch.
7. Run the full deploy checklist before shipping again.
