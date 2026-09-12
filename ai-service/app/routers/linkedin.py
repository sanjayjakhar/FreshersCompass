import os
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.linkedin_service import (
    analyze_linkedin_profile,
    generate_project_launch_post,
    generate_cold_outreach_dms,
)

router = APIRouter()

class LinkedInReviewRequest(BaseModel):
    headline: str
    about: str
    experience: Optional[str] = ""
    target_role: Optional[str] = "Software Engineer"

class LaunchPostRequest(BaseModel):
    repo_name: str
    description: str
    tech_stack: List[str] = []
    highlights: Optional[List[str]] = []

class ColdOutreachRequest(BaseModel):
    candidate_name: str
    target_role: str
    top_skills: List[str] = []
    college: Optional[str] = "BIT Mesra"

def verify_internal_auth(x_internal_key: Optional[str]):
    expected_key = os.getenv("AI_SERVICE_INTERNAL_KEY")
    if expected_key and x_internal_key != expected_key:
        raise HTTPException(status_code=403, detail="Unauthorized inter-service request")

@router.post("/review")
async def review_linkedin(
    payload: LinkedInReviewRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)

    if not payload.headline and not payload.about:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least a LinkedIn headline or About section to review."
        )

    try:
        analysis = analyze_linkedin_profile(
            headline=payload.headline,
            about=payload.about,
            experience=payload.experience or "",
            target_role=payload.target_role or "Software Engineer"
        )
        return {"status": "success", "data": analysis}
    except Exception as e:
        print(f"Error in LinkedIn review endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/launch-post")
async def create_launch_post(
    payload: LaunchPostRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)
    try:
        post_data = generate_project_launch_post(
            repo_name=payload.repo_name,
            description=payload.description,
            tech_stack=payload.tech_stack,
            highlights=payload.highlights
        )
        return {"status": "success", "data": post_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cold-outreach")
async def create_cold_outreach(
    payload: ColdOutreachRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)
    try:
        dms = generate_cold_outreach_dms(
            candidate_name=payload.candidate_name,
            target_role=payload.target_role,
            top_skills=payload.top_skills,
            college=payload.college or "BIT Mesra"
        )
        return {"status": "success", "data": dms}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
