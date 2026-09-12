import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.services.github_service import (
    parse_repo_identifier,
    fetch_repository_data,
    chunk_codebase_files,
)
from app.services.rag_service import (
    index_repository_chunks,
    answer_codebase_question,
    generate_recruiter_pitch,
    REPO_VECTOR_STORE
)

router = APIRouter()

# Cache parsed repository data in memory so subsequent chat queries don't re-download
REPO_CACHE: Dict[str, Dict[str, Any]] = {}

class AnalyzeRepoRequest(BaseModel):
    repo_url: str

class ChatQuestionRequest(BaseModel):
    repo_url: str
    question: str
    history: Optional[List[Dict[str, str]]] = []

class RecruiterPitchRequest(BaseModel):
    repo_url: str

def verify_internal_auth(x_internal_key: Optional[str]):
    expected_key = os.getenv("AI_SERVICE_INTERNAL_KEY")
    if expected_key and x_internal_key != expected_key:
        raise HTTPException(status_code=403, detail="Unauthorized inter-service request")

@router.post("/analyze")
async def analyze_repository(
    payload: AnalyzeRepoRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)

    if not payload.repo_url:
        raise HTTPException(status_code=400, detail="Repository URL is required")

    try:
        owner, repo_name = parse_repo_identifier(payload.repo_url)
        full_name = f"{owner}/{repo_name}".lower()

        # Ingest repo data from GitHub
        repo_data = fetch_repository_data(payload.repo_url)
        meta = repo_data["metadata"]
        health = repo_data["health"]
        file_contents = repo_data["file_contents"]

        # Chunk files for RAG vector search
        chunks = chunk_codebase_files(file_contents)
        index_repository_chunks(full_name, chunks)

        # Generate recruiter pitch
        pitch_bullets = generate_recruiter_pitch(meta, health)

        # Cache metadata
        REPO_CACHE[full_name] = {
            "metadata": meta,
            "health": health,
            "total_files_count": repo_data["total_files_count"],
            "all_files": repo_data["all_files"][:50],
            "recruiter_pitch": pitch_bullets,
        }

        return {
            "status": "success",
            "repo_id": full_name,
            "metadata": meta,
            "health": health,
            "total_files_count": repo_data["total_files_count"],
            "files_sample": repo_data["all_files"][:30],
            "recruiter_pitch": pitch_bullets,
            "indexed_chunks_count": len(chunks),
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Error analyzing repository: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze repository: {str(e)}")

@router.post("/chat")
async def chat_with_codebase(
    payload: ChatQuestionRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)

    if not payload.repo_url or not payload.question:
        raise HTTPException(status_code=400, detail="Repository URL and question are required")

    try:
        owner, repo_name = parse_repo_identifier(payload.repo_url)
        full_name = f"{owner}/{repo_name}".lower()

        # Ensure repository is ingested and indexed
        if full_name not in REPO_CACHE or full_name not in REPO_VECTOR_STORE:
            repo_data = fetch_repository_data(payload.repo_url)
            chunks = chunk_codebase_files(repo_data["file_contents"])
            index_repository_chunks(full_name, chunks)
            REPO_CACHE[full_name] = {
                "metadata": repo_data["metadata"],
                "health": repo_data["health"],
            }

        cached = REPO_CACHE.get(full_name, {})
        meta = cached.get("metadata", {"full_name": full_name})

        # Answer with RAG + Gemini
        rag_response = answer_codebase_question(
            repo_full_name=full_name,
            question=payload.question,
            meta=meta,
            history=payload.history
        )

        return {
            "status": "success",
            "repo_id": full_name,
            "answer": rag_response["answer"],
            "citations": rag_response["citations"]
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Error querying codebase: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to answer codebase query: {str(e)}")

@router.post("/pitch")
async def get_recruiter_pitch(
    payload: RecruiterPitchRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)

    try:
        owner, repo_name = parse_repo_identifier(payload.repo_url)
        full_name = f"{owner}/{repo_name}".lower()

        if full_name not in REPO_CACHE:
            repo_data = fetch_repository_data(payload.repo_url)
            REPO_CACHE[full_name] = {
                "metadata": repo_data["metadata"],
                "health": repo_data["health"]
            }

        cached = REPO_CACHE[full_name]
        bullets = generate_recruiter_pitch(cached["metadata"], cached["health"])

        return {
            "status": "success",
            "repo_id": full_name,
            "recruiter_pitch": bullets
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ProfileReadmeRequest(BaseModel):
    username: str
    repos: List[Dict[str, Any]] = []
    top_skills: List[str] = []
    bio: Optional[str] = ""

class ProjectReadmeRequest(BaseModel):
    repo_url: str

@router.post("/profile-readme")
async def create_profile_readme(
    payload: ProfileReadmeRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)
    try:
        from app.services.rag_service import generate_profile_readme
        markdown = generate_profile_readme(
            username=payload.username,
            repos=payload.repos,
            top_skills=payload.top_skills,
            bio=payload.bio or ""
        )
        return {"status": "success", "markdown": markdown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/project-readme")
async def create_project_readme(
    payload: ProjectReadmeRequest,
    x_internal_key: Optional[str] = Header(None)
):
    verify_internal_auth(x_internal_key)
    try:
        owner, repo_name = parse_repo_identifier(payload.repo_url)
        full_name = f"{owner}/{repo_name}".lower()

        if full_name not in REPO_CACHE:
            repo_data = fetch_repository_data(payload.repo_url)
            REPO_CACHE[full_name] = {
                "metadata": repo_data["metadata"],
                "health": repo_data["health"]
            }

        cached = REPO_CACHE[full_name]
        from app.services.rag_service import generate_project_readme
        markdown = generate_project_readme(
            repo_name=cached["metadata"].get("name", repo_name),
            description=cached["metadata"].get("description", ""),
            tech_stack=cached["health"].get("tech_stack", []),
            health=cached["health"]
        )
        return {"status": "success", "markdown": markdown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
