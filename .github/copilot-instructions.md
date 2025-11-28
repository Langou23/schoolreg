# Copilot instructions for SchoolReg (microservices)

Ce fichier aide un agent IA/assistant de codage à être productif rapidement dans ce dépôt.

**High level**
- **Architecture**: microservices organisés sous `microservices/services/` + gateway dans `server/` (API proxy). Frontend React TypeScript dans `microservices/client/frontend-react/`.
- **Runs & env**: la configuration principale est dans la racine `.env`. Les services communiquent via URL exposées par des variables d'environnement (`APPLICATIONS_SERVICE_URL`, `STUDENTS_SERVICE_URL`, etc.).

**When editing services**
- **Preserve service boundaries**: changez uniquement le code d'un service sauf si vous devez adapter le gateway proxy (`server/src/index.js`).
- **DB migrations (Node/Prisma)**: run `npx prisma migrate dev` and `npx prisma generate` inside the service (e.g. `server/` or `microservices/services/applications-node/`) after schema changes. Schemas live under `*/prisma/schema.prisma`.
- **Python services**: install `requirements.txt` and start with `uvicorn app.main:app --port <PORT>` or the provided `run.py` (payments-fastapi).

**Local dev & common commands**
- **Start all services**: use `.
 start-all.ps1` from repo root (Windows PowerShell). Individual services also have `npm run dev` or `uvicorn` commands in their README.
- **Run health tests**: `cd tests && npm install && npm test` or `node api-health-checker.js`.
- **Frontend**: `cd microservices/client/frontend-react && npm install && npm run dev` (Vite + Tailwind + TypeScript).

**Inter-service communication**
- The gateway proxies requests to services using environment vars (check `server/src/index.js` and README). When adding an endpoint, register its public URL via env and update gateway routing if needed.
- Use JSON over HTTP; health endpoints are `/health` and expected to return 200 JSON.

**Conventions & patterns**
- **Roles & auth**: JWT-based auth; role checks live in the auth service. Look for `auth-node` and `create-admin.js` for admin bootstrap patterns.
- **Uploads**: shared upload folder is `server/uploads/` — services reference it for document storage.
- **Tests**: test harness is in `tests/` (health checks, jest). New endpoints should include a health-check and a minimal test added to `tests/api-health-checker.js`.

**What to change in PRs**
- Keep changes small and focused per service. Update `microservices/ARCHITECTURE.md` and top-level `README.md` when you modify architectural decisions.
- Run `cd tests && node api-health-checker.js` and include its report in PR description if you change runtime behaviour.

**Safety rules for the agent**
- Do not update multiple services and the gateway in a single monolithic change without tests and a health report.
- When adding DB migrations, include migration files and a short note: which `schema.prisma` changed and which tables/columns were affected.

**Where to look for examples**
- Gateway proxy example: `server/src/index.js`
- Node service + Prisma: `microservices/services/applications-node/src/index.js` and `*/prisma/schema.prisma`
- Python FastAPI example: `microservices/services/payments-fastapi/run.py` and `microservices/services/resources-fastapi/app/main.py`
- Frontend conventions: `microservices/client/frontend-react/src/` (TypeScript + Vite + Tailwind)

If anything is unclear or you'd like me to expand a section (tests, notifications, or CI steps), dites-moi quoi préciser et je l'ajoute.
