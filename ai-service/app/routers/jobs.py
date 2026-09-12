import os
import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

router = APIRouter()

class JobMatchRequest(BaseModel):
    user_skills: List[str]
    jobs: List[Dict[str, Any]]

def verify_internal_auth(x_internal_key: Optional[str]):
    expected_key = os.getenv("AI_SERVICE_INTERNAL_KEY")
    if expected_key and x_internal_key != expected_key:
        raise HTTPException(status_code=403, detail="Unauthorized inter-service request")

@router.post("/match")
async def match_jobs(
    payload: JobMatchRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)

    user_skills_clean = [s.lower().strip() for s in payload.user_skills if s]
    user_skills_set = set(user_skills_clean)

    scored_jobs = []

    for job in payload.jobs:
        # Extract keywords from job tags, title, description
        job_text = (
            job.get("title", "") + " " +
            job.get("description", "") + " " +
            " ".join(job.get("tags", []))
        ).lower()

        matched = []
        missing_candidates = set(job.get("tags", []))

        # Check matched skills
        for skill in user_skills_clean:
            if re.search(r'\b' + re.escape(skill) + r'\b', job_text):
                matched.append(skill.title())

        # Determine missing skills from job tags that candidate doesn't have
        missing = []
        for tag in job.get("tags", []):
            if tag.lower() not in user_skills_set:
                missing.append(tag.title())

        # Match score calculation
        total_relevant = len(matched) + len(missing[:4])
        if total_relevant > 0:
            score = int((len(matched) / total_relevant) * 100)
        else:
            score = 65  # baseline generic match

        # Ensure realistic match ranges
        score = max(40, min(98, score))

        scored_jobs.append({
            **job,
            "match_score": score,
            "matched_skills": matched[:6],
            "missing_skills": missing[:4],
        })

    # Sort descending by match score
    scored_jobs.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "status": "success",
        "total_matched": len(scored_jobs),
        "jobs": scored_jobs
    }
