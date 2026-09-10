from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from app.services.parser import extract_text_from_file
from app.services.gemini import parse_resume_with_gemini
import os

router = APIRouter()

@router.post("/parse")
async def parse_resume(
    file: UploadFile = File(...), 
    x_internal_key: str = Header(None)
):
    # Verify the request is coming from our own backend
    expected_key = os.getenv("AI_SERVICE_INTERNAL_KEY")
    if x_internal_key != expected_key:
        raise HTTPException(status_code=403, detail="Unauthorized inter-service request")

    if not file.filename.endswith(('.pdf', '.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX are supported")

    try:
        # Read file bytes
        contents = await file.read()
        
        # Extract text
        raw_text = extract_text_from_file(contents, file.filename)
        if not raw_text:
            raise HTTPException(status_code=400, detail="Could not extract text from the document")
            
        # Send to Gemini for structured JSON and ATS scoring
        structured_data = parse_resume_with_gemini(raw_text)
        
        return structured_data
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Server Error during parse: {e}")
        raise HTTPException(status_code=500, detail="Internal AI service error")
