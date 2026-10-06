import os
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.interview_service import evaluate_interview_session
from app.services.question_generator import generate_adaptive_questions

router = APIRouter()

class InterviewEvaluationRequest(BaseModel):
    role: Optional[str] = "Full-Stack Software Engineer"
    responses: List[Dict[str, Any]]

class GenerateQuestionsRequest(BaseModel):
    role: Optional[str] = "Full-Stack Software Engineer"
    skills: Optional[List[str]] = []
    resume_text: Optional[str] = ""
    repositories: Optional[List[Dict[str, Any]]] = []
    project_descriptions: Optional[List[str]] = []

def verify_internal_auth(x_internal_key: Optional[str]):
    expected_key = os.getenv("AI_SERVICE_INTERNAL_KEY")
    if expected_key and x_internal_key != expected_key:
        raise HTTPException(status_code=403, detail="Unauthorized inter-service request")

@router.post("/generate-questions")
async def generate_questions(
    payload: GenerateQuestionsRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)

    # Never 400 on thin profile data: a candidate with no resume or repo still
    # gets a usable screening set from the deterministic fallback.
    try:
        pack = generate_adaptive_questions(
            role=payload.role,
            skills=payload.skills,
            resume_text=payload.resume_text,
            repositories=payload.repositories,
            project_descriptions=payload.project_descriptions,
        )
        return {
            "status": "success",
            "data": pack
        }
    except Exception as e:
        print(f"[Generate Questions Router Error]: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate")
async def evaluate_interview(
    payload: InterviewEvaluationRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)

    if not payload.responses:
        raise HTTPException(status_code=400, detail="No interview questions/answers provided.")

    try:
        report = evaluate_interview_session(
            responses=payload.responses,
            role=payload.role or "Full-Stack Software Engineer"
        )
        return {
            "status": "success",
            "data": report
        }
    except Exception as e:
        print(f"[Interview Router Error]: {e}")
        raise HTTPException(status_code=500, detail=str(e))
