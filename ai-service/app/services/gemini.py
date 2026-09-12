import os
import json
import google.generativeai as genai
from pydantic import BaseModel

class ResumeData(BaseModel):
    name: str
    email: str
    skills: list[str]
    experience: list[dict]
    education: list[dict]
    ats_score: int
    improvement_suggestions: list[str]

def init_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    genai.configure(api_key=api_key)

def parse_resume_with_gemini(raw_text: str) -> dict:
    init_gemini()
    
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    model = genai.GenerativeModel(model_name)
    
    prompt = f"""
    You are an expert ATS (Applicant Tracking System) and technical recruiter. 
    Parse the following resume text and extract the required information.
    
    Calculate an ATS Score out of 100 based on standard industry metrics (impact, action verbs, keywords, formatting).
    Also provide 3-5 specific improvement suggestions.
    
    Return the output STRICTLY as a JSON object matching this schema:
    {{
      "name": "Full Name",
      "email": "email@example.com",
      "skills": ["Python", "React", ...],
      "experience": [{{"company": "X", "role": "Y", "duration": "Z", "description": "..."}}],
      "education": [{{"institution": "A", "degree": "B", "year": "C"}}],
      "ats_score": 85,
      "improvement_suggestions": ["Suggestion 1", "Suggestion 2"]
    }}
    
    Here is the resume text:
    -----------------------
    {raw_text}
    """
    
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.2,
        )
    )
    
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        print("Failed to decode JSON from Gemini")
        raise ValueError("AI returned invalid formatting")
