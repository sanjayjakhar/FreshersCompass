import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FreshersCompass AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("BACKEND_URL", "http://localhost:5000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "freshercompass-ai-service"}


# ---------- Routers (to be added) ----------
# from app.routers import resume, interview, github_rag, jobs, skill_gap
# app.include_router(resume.router, prefix="/resume", tags=["Resume & ATS"])
# app.include_router(interview.router, prefix="/interview", tags=["AI Interview Simulator"])
# app.include_router(github_rag.router, prefix="/github", tags=["GitHub & Codebase RAG"])
# app.include_router(jobs.router, prefix="/jobs", tags=["Job Recommendation"])
# app.include_router(skill_gap.router, prefix="/skill-gap", tags=["Skill-Gap Analyzer"])
