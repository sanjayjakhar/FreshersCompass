# Contributing to FreshersCompass

This is a 2-person academic project. These guidelines keep our workflow consistent.

## Branching

- `main` — always stable and deployable
- `dev` — integration branch; all feature branches merge here first
- `feat/<short-description>` — one branch per feature

Examples: `feat/resume-ats-scoring`, `feat/github-rag-pipeline`, `feat/auth-oauth`

## Workflow

1. Pull the latest `dev`: `git checkout dev && git pull`
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Commit with clear, present-tense messages: `git commit -m "Add resume upload endpoint"`
4. Push your branch: `git push origin feat/your-feature-name`
5. Open a Pull Request into `dev`
6. The other team member reviews before merging
7. Periodically merge stable `dev` into `main`

## Commit Message Style

- `feat: add codebase RAG endpoint`
- `fix: correct JWT expiry check`
- `docs: update README setup steps`
- `refactor: simplify resume parser`

## Code Ownership (per the work-division plan)

- **AI/LLM modules** (GitHub RAG, Interview Simulator, Job Recommendation, Skill-Gap Analyzer, AI Career Twin, `ai-service/`) — Team Lead
- **MERN modules** (Authentication, Application Tracker, Portfolio Generator, `frontend/`, core `backend/` APIs) — Team Member

Cross-cutting changes (shared schemas, API contracts) should be discussed before merging.

## Before Opening a PR

- [ ] Code runs locally without errors
- [ ] No `.env` files or secrets committed
- [ ] Relevant `.env.example` updated if new variables were added
- [ ] Brief description of what changed and why in the PR
