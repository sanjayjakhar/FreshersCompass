import os
import json
from typing import Optional
import google.generativeai as genai
from pydantic import BaseModel
from app.services.parser import extract_social_links

class ResumeData(BaseModel):
    name: str
    email: str
    github_username: Optional[str] = ""
    github_url: Optional[str] = ""
    linkedin_url: Optional[str] = ""
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
    deterministic_social = extract_social_links(raw_text)

    prompt = f"""
    You are an expert ATS (Applicant Tracking System) and technical recruiter. 
    Parse the following resume text and extract the required information.
    
    Extract the candidate's name, email, GitHub username (without '@'), GitHub profile URL, and LinkedIn URL.
    Check both regular text and the detected hyperlinks section.
    Calculate an ATS Score out of 100 based on standard industry metrics (impact, action verbs, keywords, formatting).
    Also provide 3-5 specific improvement suggestions.
    
    Return the output STRICTLY as a JSON object matching this schema:
    {{
      "name": "Full Name",
      "email": "email@example.com",
      "github_username": "username or empty string if not found",
      "github_url": "https://github.com/username or empty string",
      "linkedin_url": "https://www.linkedin.com/in/... or empty string",
      "skills": ["Python", "React"],
      "experience": [{{"company": "X", "role": "Y", "duration": "Z", "description": "..."}}],
      "education": [{{"institution": "A", "degree": "B", "year": "C"}}],
      "ats_score": 85,
      "improvement_suggestions": ["Suggestion 1", "Suggestion 2"]
    }}
    
    Here is the resume text:
    -----------------------
    {raw_text}
    """

    parsed_json_str = None
    provider_used = None

    # 1. Primary: Google Gemini (gemini-2.5-flash)
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            init_gemini()
            for model_name in ["gemini-2.5-flash", "gemini-3.5-flash"]:
                try:
                    m = genai.GenerativeModel(model_name)
                    resp = m.generate_content(
                        prompt,
                        generation_config=genai.GenerationConfig(
                            response_mime_type="application/json",
                            temperature=0.2
                        ),
                        request_options={"timeout": 8}
                    )
                    if resp and resp.text and resp.text.strip():
                        parsed_json_str = resp.text.strip()
                        provider_used = f"Google Gemini ({model_name})"
                        break
                except Exception as m_err:
                    print(f"[Resume Parser] Gemini {model_name} notice: {m_err}")
                    continue
        except Exception as g_err:
            print(f"[Resume Parser] Gemini initialization notice: {g_err}")

    # 2. Secondary Fallback: Groq (Qwen / GPT-OSS)
    if not parsed_json_str:
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_key, timeout=15.0)
                for model_name in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]:
                    try:
                        chat = client.chat.completions.create(
                            messages=[
                                {
                                    "role": "system",
                                    "content": "You are an expert ATS (Applicant Tracking System) parser. Return STRICTLY a valid JSON object matching the requested schema with name, email, github_username, github_url, linkedin_url, skills, experience, education, ats_score, improvement_suggestions."
                                },
                                {"role": "user", "content": prompt}
                            ],
                            model=model_name,
                            response_format={"type": "json_object"},
                            temperature=0.2,
                        )
                        text = chat.choices[0].message.content
                        if text and text.strip():
                            parsed_json_str = text.strip()
                            provider_used = f"Groq ({model_name})"
                            break
                    except Exception as q_err:
                        print(f"[Resume Parser] Groq {model_name} notice: {q_err}")
                        continue
            except Exception as grq_err:
                print(f"[Resume Parser] Groq client error: {grq_err}")

    # 3. If LLMs both failed/timed out, use resilient heuristic parsing fallback
    if not parsed_json_str:
        print("[Resume Parser] LLMs unavailable, falling back to heuristic parsing pipeline")
        return fallback_heuristic_parse(raw_text, deterministic_social)

    try:
        data = json.loads(parsed_json_str)
        print(f"[Resume Parser] Successfully parsed resume using {provider_used}")

        # Merge deterministic social links if AI missed them
        if not data.get("github_username") and deterministic_social.get("github_username"):
            data["github_username"] = deterministic_social["github_username"]
        if not data.get("github_url") and deterministic_social.get("github_url"):
            data["github_url"] = deterministic_social["github_url"]
        if not data.get("linkedin_url") and deterministic_social.get("linkedin_url"):
            data["linkedin_url"] = deterministic_social["linkedin_url"]

        # Clean username (strip leading @ or trailing slashes)
        if data.get("github_username"):
            data["github_username"] = data["github_username"].strip().lstrip("@").strip("/ ")
            if not data.get("github_url"):
                data["github_url"] = f"https://github.com/{data['github_username']}"

        return data
    except json.JSONDecodeError:
        print("[Resume Parser] Failed to decode JSON from AI response, using heuristic fallback")
        return fallback_heuristic_parse(raw_text, deterministic_social)


def fallback_heuristic_parse(raw_text: str, deterministic_social: dict) -> dict:
    """Deterministic heuristic extraction when remote LLMs are offline or rate-limited."""
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    
    # Extract candidate name from top lines
    name = "Candidate"
    for line in lines[:5]:
        if not re.search(r'[@\+0-9\/]', line) and len(line.split()) in [2, 3, 4] and len(line) < 40:
            name = line
            break

    # Extract email
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
    email = email_match.group(0) if email_match else ""

    # Extract phone
    phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', raw_text)
    phone = phone_match.group(0) if phone_match else ""

    # Common tech skills catalog
    TECH_CATALOG = [
        "React", "Node.js", "Express", "Python", "JavaScript", "TypeScript", "HTML", "CSS",
        "Tailwind CSS", "MongoDB", "PostgreSQL", "MySQL", "Docker", "Git", "GitHub", "AWS",
        "FastAPI", "Flask", "Java", "C++", "C#", "Linux", "Redux", "REST API", "GraphQL",
        "Next.js", "Kubernetes", "CI/CD", "Redis", "Figma"
    ]
    detected_skills = []
    lower_text = raw_text.lower()
    for skill in TECH_CATALOG:
        if re.search(r'\b' + re.escape(skill.lower()) + r'\b', lower_text):
            detected_skills.append(skill)

    # Heuristic ATS score
    score = 72
    if len(detected_skills) >= 6:
        score += 10
    if deterministic_social.get("github_username"):
        score += 6
    if deterministic_social.get("linkedin_url"):
        score += 5
    if email and phone:
        score += 4
    ats_score = min(score, 94)

    suggestions = [
        "Quantify project outcomes using the XYZ formula (Accomplished [X] as measured by [Y], by doing [Z]).",
        "Include active live demo and GitHub repository hyperlinks for each listed software project.",
        "Add a targeted summary section highlighting core proficiencies for junior engineer roles."
    ]

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "github_username": deterministic_social.get("github_username", ""),
        "github_url": deterministic_social.get("github_url", ""),
        "linkedin_url": deterministic_social.get("linkedin_url", ""),
        "skills": detected_skills if detected_skills else ["Fullstack Development", "Problem Solving", "Git"],
        "experience": [],
        "education": [],
        "ats_score": ats_score,
        "improvement_suggestions": suggestions
    }


