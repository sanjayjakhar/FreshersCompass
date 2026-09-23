import os
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.interview_service import evaluate_interview_session

router = APIRouter()

class InterviewEvaluationRequest(BaseModel):
    role: Optional[str] = "Full-Stack Software Engineer"
    responses: List[Dict[str, Any]]

def verify_internal_auth(x_internal_key: Optional[str]):
    expected_key = os.getenv("AI_SERVICE_INTERNAL_KEY")
    if expected_key and x_internal_key != expected_key:
        raise HTTPException(status_code=403, detail="Unauthorized inter-service request")

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
