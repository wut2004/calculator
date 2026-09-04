# calculator

> Institutional knowledge for agents. Keep it short, keep it current.
> Every rule here should be one an agent can act on without asking.

## The loop
The unit of work is **one change** (one Jira ticket). Never edit code outside a change.

| Stage    | Reads                       | Writes / commits                                  | Human gate |
|----------|-----------------------------|---------------------------------------------------|------------|
| Plan     | idea / ticket / incident    | `docs/sdlc/changes/<KEY>-<slug>/intent.md`        | PO approves |
| Design   | intent.md                   | `.../spec.md`                                     | Tech lead approves |
| Build    | spec.md                     | `.../plan.md` **then** the diff                   | Reviewer approves plan before code |
| Test     | plan.md + diff              | tests, eval results                               | automated |
| Deploy   | MR                          | MR + findings per `docs/sdlc/REVIEW.md`           | per tier |
| Maintain | prod signals                | `docs/sdlc/incidents/<ID>.md` → new change        | incident owner |

- Project-level "why" lives once in `docs/sdlc/charter/intent.md`.
- Start a change with `scripts/new-change.sh EP-123 short-slug` (creates folder + branch), or `/intent`.
- The current change is derived from the branch name: `feat/EP-123-xxx` → `docs/sdlc/changes/EP-123-xxx/`.
- Merged changes are **immutable**. To revisit, open a new change with `supersedes: EP-123` in its intent.
- A big spec may have several plans (`plan.md`, `plan-2-frontend.md`); each must reference the same spec.
- `CLAUDE.md`, `REVIEW.md`, skills and ADRs evolve on `main` — update them in the same MR that makes them stale.

## Stack
- Backend: Python 3.12, FastAPI, SQLAlchemy (`backend`). Tests: `pytest`. Lint: `ruff check . && ruff format --check .`. Types: `mypy app`.
- Frontend: React 18 + TypeScript + Vite (`frontend`). Tests: `npm test` (vitest). Lint: `npm run lint`. Types: `npm run typecheck`.
- CI/CD: GitLab. Work tracking: Jira. Test management: Xray.

## Working rules for agents
1. Find the current change folder from the branch, read intent → spec → plan in order.
2. Never edit code without an approved plan.md for the current change (a hook enforces this).
3. Every change ships with tests. Run the full suite before declaring done.
4. Commit message: `EP-123: <conventional commit>`.
5. Ask a human when the spec is ambiguous. Do not invent business rules.
6. Never push to `main`; open an MR and let `REVIEW.md` drive the review.

## Repository layout (from EP-000-scaffold)
- Python: `backend/app/main.py` (entrypoint), `backend/app/{api,services,repositories,models,core}`, `backend/tests`, `backend/migrations`
- React: `frontend/src/{features,components,api}`, tests co-located as `*.test.tsx`
- New feature code goes in these folders only; do not create top-level directories without an ADR.
