# FreshersCompass

AI-powered career and code intelligence platform for students, fresh graduates, and early-career developers — unifying resume analysis, GitHub/codebase intelligence, AI-driven interview practice, job matching, and skill-gap-driven learning roadmaps in one place.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Project Locally](#running-the-project-locally)
- [API Overview](#api-overview)
- [Deployment](#deployment)
- [Branching & Contribution Workflow](#branching--contribution-workflow)
- [Team](#team)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

Students and early-career developers currently rely on separate, disconnected tools for resume evaluation, LinkedIn optimization, GitHub/portfolio analysis, job searching, interview preparation, and skill development. FreshersCompass unifies all of this into a single AI-powered platform that understands a user's resume, GitHub repositories, LinkedIn profile, and target roles together — and uses that combined context to generate personalized, actionable career guidance.

## Features

- **Resume & ATS Analysis** — Upload a resume (PDF/DOCX) and get ATS/keyword scoring with improvement suggestions.
- **GitHub & Codebase Intelligence (RAG)** — Ask natural-language questions about your own repositories and get answers grounded in the actual code, via embeddings + vector search.
- **LinkedIn Profile Review** — AI-generated recommendations to improve recruiter visibility.
- **AI Interview Simulator** — Resume-based, project-based, DSA, system-design, and behavioral mock interviews with AI evaluation.
- **Job Recommendation Engine** — Matches your combined profile against job requirements and suggests suitable roles/companies.
- **Skill-Gap Analyzer & Roadmap** — Identifies missing skills for a target role and generates a personalized learning path.
- **Application Tracker** — Track job applications and their status in one place.
- **Portfolio Generator** — Auto-builds a shareable developer portfolio from your resume and GitHub data.
- **AI Career Twin** — A continuously updated, unified view of your career readiness across all modules.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Vite, Tailwind CSS |
| Core Backend | Node.js, Express.js |
| AI Microservice | Python, FastAPI |
| Database | MongoDB Atlas (+ Atlas Vector Search for embeddings) |
| LLM Providers | Google Gemini (primary), Groq (fallback) |
| Auth | JWT (httpOnly cookies), GitHub OAuth, LinkedIn OAuth |
| Hosting | Vercel (frontend), Render (backend + AI service) |

## Architecture

```
[Browser]
   |
   v
[React Frontend] --(REST, JWT cookie)--> [Node.js/Express Backend] --> [MongoDB Atlas]
                                                |
                                                | (internal API key)
                                                v
                                        [Python/FastAPI AI Service]
                                                |
                                    +-----------+-----------+
                                    |                       |
                              [Gemini / Groq]      [MongoDB Atlas Vector Search]
                                                    (codebase embeddings, RAG)
```

- The **Node/Express backend** owns authentication, core CRUD (users, applications, portfolios), and routes AI-related requests to the AI service.
- The **Python/FastAPI AI service** owns everything LLM-related: resume/ATS scoring, codebase RAG, interview generation/evaluation, job matching, and skill-gap analysis.
- Both services share the same MongoDB Atlas cluster; the AI service additionally uses Atlas Vector Search for embeddings.

## Folder Structure

```
freshercompass/
├── frontend/                 # React app (Vite + Tailwind)
│   ├── src/
│   ├── public/
│   ├── .env.example
│   └── package.json
├── backend/                  # Node.js / Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── config/
│   ├── .env.example
│   └── package.json
├── ai-service/                # Python / FastAPI AI microservice
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   └── core/
│   ├── .env.example
│   └── requirements.txt
├── .gitignore
└── README.md
```

## Prerequisites

Make sure you have the following installed before setting up the project:

- **Node.js** v18+ and npm
- **Python** 3.10+
- **Git**
- A **MongoDB Atlas** account (free tier is enough) with Vector Search enabled on your cluster
- API keys for **Google Gemini** and **Groq**
- **GitHub OAuth App** and **LinkedIn OAuth App** credentials (for profile integrations)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/freshercompass.git
   cd freshercompass
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Install AI service dependencies**
   ```bash
   cd ai-service
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cd ..
   ```

## Environment Variables

Each service has its own `.env.example` file. Copy each one to `.env` in the same folder and fill in the real values:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
```

> **Never commit `.env` files.** They are already excluded in `.gitignore`. Only the `.env.example` templates are tracked in the repo.

See each `.env.example` file for the full list of required variables (database URI, JWT secret, OAuth credentials, LLM API keys, etc.).

## Running the Project Locally

You'll need three terminals open, one per service.

**Terminal 1 — Frontend**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 — Backend**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 3 — AI Service**
```bash
cd ai-service
source venv/bin/activate   # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
# Runs on http://localhost:8000
```

Once all three are running, open `http://localhost:5173` in your browser.

## API Overview

| Service | Base URL (local) | Handles |
|---|---|---|
| Backend | `http://localhost:5000/api` | Auth, users, application tracker, portfolio, routing to AI service |
| AI Service | `http://localhost:8000` | Resume/ATS scoring, GitHub RAG, interviews, job matching, skill-gap analysis |

Detailed endpoint documentation (request/response formats) is maintained separately as the API contracts are finalized between the two services — see `/backend/README.md` and `/ai-service/README.md` once added, or the shared Postman collection.

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Set root directory to `frontend/`; add all `VITE_` env vars in Vercel project settings |
| Backend | Render | Set root directory to `backend/`; add env vars from `backend/.env.example` in Render dashboard |
| AI Service | Render | Set root directory to `ai-service/`; add env vars from `ai-service/.env.example` in Render dashboard |
| Database | MongoDB Atlas | Free tier cluster with Vector Search index enabled |

All three services deploy independently from the same monorepo — each platform is pointed at a different subfolder.

## Branching & Contribution Workflow

- `main` — stable, always deployable
- `dev` — integration branch, merge feature branches here first
- `feat/<short-description>` — one branch per feature (e.g. `feat/resume-ats-scoring`, `feat/github-rag-pipeline`)

**Workflow:**
1. Branch off `dev`
2. Commit with clear messages
3. Open a Pull Request into `dev`
4. The other team member reviews before merging
5. Periodically merge `dev` into `main` once stable

## Team

| Name | Role |
|---|---|
| Sanjay Jakhar | Team Lead — AI/LLM Engineer, Full-Stack Integrator |
| Nilesh Kumar | MERN Full-Stack Developer |

**Faculty Mentor:** Dr. Kuntal Mukharjee, Associate Professor, Department of Computer Science and Engineering, Birla Institute of Technology, Mesra — Jaipur Campus

## Roadmap

- [ ] Mobile app integration
- [ ] Deeper AI-based company-fit recommendations
- [ ] Peer/mentor collaboration features
- [ ] Multi-language support

## License

This project is developed as an academic minor project (CS400M) at Birla Institute of Technology, Mesra, Jaipur Campus. License to be finalized by the team before making the repository public.
