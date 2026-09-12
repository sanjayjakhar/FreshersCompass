import os
import json
import google.generativeai as genai
from typing import Dict, Any, List, Optional
from app.services.gemini import init_gemini

def analyze_linkedin_profile(
    headline: str,
    about: str,
    experience: str = "",
    target_role: str = "Software Engineer"
) -> Dict[str, Any]:
    """
    Analyzes LinkedIn profile content, calculates recruiter visibility score,
    identifies missing keywords, and generates AI-optimized headlines and summaries.
    """
    init_gemini()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    model = genai.GenerativeModel(model_name)

    prompt = f"""
You are an executive LinkedIn optimization specialist and senior technical recruiter.
Analyze the following candidate's LinkedIn profile components for the target role: "{target_role}".

Candidate Headline:
"{headline}"

Candidate About/Summary Section:
"{about}"

Candidate Experience Summary:
"{experience or 'Not provided'}"

Tasks:
1. Calculate a "Recruiter Visibility Score" out of 100 based on keyword discoverability, clear value proposition, action verbs, and readability.
2. Provide 3 high-converting Headline variations:
   - "high_impact": Quantifiable outcome + target role
   - "technical": Specific skills/stack + domain
   - "creative": Value-driven tagline + specialty
3. Rewrite the "About" section to follow top recruiter best-practices:
   - Compelling 2-line hook
   - Core technical focus and primary stack
   - Notable achievements / projects
   - Clear call to action for recruiters (with contact invitation)
4. List 5-8 essential industry keywords that recruiters search for {target_role} that the candidate should add.
5. Provide 3-4 specific, actionable tips to increase recruiter reach and profile views.

Return strictly a JSON object conforming to this schema:
{{
  "visibility_score": 78,
  "score_breakdown": {{
    "keyword_density": 75,
    "clarity": 85,
    "call_to_action": 70,
    "recruiter_appeal": 80
  }},
  "headlines": {{
    "high_impact": "Full-Stack Engineer | Building scalable cloud applications...",
    "technical": "React & Node.js Developer | Specializing in distributed APIs...",
    "creative": "Turning complex software challenges into clean code..."
  }},
  "optimized_about": "...",
  "recommended_keywords": ["TypeScript", "Microservices", "CI/CD", ...],
  "actionable_tips": [
    "Tip 1...",
    "Tip 2..."
  ]
}}
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini LinkedIn analysis notice: {e}")
        return {
            "visibility_score": 72,
            "score_breakdown": {
                "keyword_density": 68,
                "clarity": 80,
                "call_to_action": 65,
                "recruiter_appeal": 75
            },
            "headlines": {
                "high_impact": f"{target_role} | Transforming Ideas into High-Performance Production Software",
                "technical": f"{target_role} | Modern Full-Stack & Cloud Architecture Specialist",
                "creative": f"Passionate {target_role} crafting seamless developer & user experiences"
            },
            "optimized_about": f"I am a results-driven {target_role} passionate about architecting scalable, resilient web applications.\n\nKey Competencies:\n• Core Stack: Modern JavaScript, React, Node.js, Python\n• Engineering Practices: REST APIs, Clean Architecture, CI/CD\n\nOpen to exciting engineering opportunities — feel free to connect!",
            "recommended_keywords": [target_role, "API Design", "Cloud Infrastructure", "Full-Stack", "System Design", "Agile"],
            "actionable_tips": [
                "Include quantifiable outcomes in your experience section (e.g. improved performance by 30%).",
                "Add your top 5 technical skills to your LinkedIn featured skills for algorithmic matching.",
                "Ensure your headline mentions both your primary role and core technology stack."
            ]
        }

def generate_project_launch_post(
    repo_name: str,
    description: str,
    tech_stack: List[str],
    highlights: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Generates a viral, high-engagement LinkedIn project launch post."""
    init_gemini()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    model = genai.GenerativeModel(model_name)

    stack_str = ", ".join(tech_stack) if tech_stack else "React, Node.js, Python"
    highlights_str = "\n".join(f"- {h}" for h in (highlights or []))

    prompt = f"""
You are a viral LinkedIn tech creator and developer advocate. Write a high-converting "I built this" project launch post for:
Project Name: {repo_name}
Description: {description}
Tech Stack: {stack_str}
Key Engineering Highlights:
{highlights_str or 'Architected full-stack workflow with clean modular structure'}

Post Requirements:
1. Start with an irresistible 1-line hook (relatable developer problem or milestone).
2. Explain the "Why" and the architecture in concise, skimmable bullet points with modern emojis.
3. Share 2 key engineering learnings or technical challenges overcome.
4. Include call-to-action for feedback, GitHub repo starring, and recruiter/peer networking.
5. End with 5-7 trending, relevant hashtags.

Return strictly a JSON object:
{{
  "hook": "...",
  "full_post": "...",
  "hashtags": ["#buildinpublic", "#webdev", ...]
}}
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.4
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Launch post notice: {e}")
        return {
            "hook": f"🚀 Excited to open-source my latest project: {repo_name}!",
            "full_post": f"🚀 Excited to share what I've been building: {repo_name}!\n\n💡 The Problem:\nMany developers and students face friction when managing workflows. I wanted to build a seamless solution.\n\n⚡ Architecture & Stack:\n• Built with: {stack_str}\n• Designed for modularity, clean APIs, and rapid responsiveness.\n\n🧠 Key Takeaways:\n1. Designing clean separation of concerns saves hours of refactoring.\n2. User experience is just as vital as backend performance.\n\n🔗 GitHub repository link in the comments! Would love feedback from fellow engineers and mentors.\n\n#buildinpublic #webdev #softwareengineering #fullstack #react",
            "hashtags": ["#buildinpublic", "#webdev", "#softwareengineering", "#fullstack", "#react"]
        }

def generate_cold_outreach_dms(
    candidate_name: str,
    target_role: str,
    top_skills: List[str],
    college: str = "BIT Mesra"
) -> Dict[str, Any]:
    """Generates 3 customized cold outreach templates for LinkedIn DMs & InMails."""
    init_gemini()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    model = genai.GenerativeModel(model_name)

    skills_str = ", ".join(top_skills) if top_skills else "React, Node.js, Python, MongoDB"

    prompt = f"""
You are a technical career coach. Generate 3 distinct, high-response LinkedIn direct message (DM) templates for a candidate reaching out for {target_role} roles:
Candidate Name: {candidate_name}
Target Role: {target_role}
Top Skills: {skills_str}
College / University: {college}

Templates needed:
1. "recruiter_pitch": Professional, polite message to a Tech Recruiter / HR at a target tech company highlighting relevant skills and willingness to discuss open roles.
2. "alumni_referral": Warm, respectful note to an alumnus from {college} working in tech, asking for career guidance or an internal referral for entry-level / intern roles.
3. "founder_outreach": High-energy, value-first message to a Startup Founder or VP of Engineering offering immediate hands-on engineering contributions.

Return strictly a JSON object:
{{
  "recruiter_pitch": "...",
  "alumni_referral": "...",
  "founder_outreach": "..."
}}
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Cold outreach notice: {e}")
        return {
            "recruiter_pitch": f"Hi [Recruiter Name],\n\nI came across your work hiring for engineering talent at [Company] and wanted to connect! I am a {target_role} specializing in {skills_str}.\n\nI've recently engineered projects focusing on scalable architectures, and would love to be considered for open early-career/fresher positions.\n\nBest regards,\n{candidate_name}",
            "alumni_referral": f"Hi [Alum Name],\n\nHope you're doing great! As a fellow {college} student passionate about software engineering, I've been admiring your journey at [Company].\n\nI am currently looking for {target_role} opportunities ({skills_str}) and wanted to ask if you might be open to sharing advice or providing an internal referral for any matching entry-level roles.\n\nThanks so much for your time!\n{candidate_name}",
            "founder_outreach": f"Hi [Founder Name],\n\nReally inspired by what you're building with [Company/Product]!\n\nAs a hands-on {target_role} proficient in {skills_str}, I love building fast, reliable products from scratch. If your engineering team has room for an eager, high-velocity contributor, I'd love to chat!\n\nBest,\n{candidate_name}"
        }
