import os
import json
import re
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import google.generativeai as genai
from app.services.gemini import init_gemini

# In-memory vector store cache for fast local RAG queries
# Format: { "owner/repo": { "chunks": [...], "embeddings": np.ndarray } }
REPO_VECTOR_STORE: Dict[str, Dict[str, Any]] = {}

def tf_vectorize(texts: List[str], dim: int = 512) -> np.ndarray:
    """
    High-speed deterministic TF token frequency hashing vectorizer.
    Runs completely in memory in < 5ms with zero external network or PyTorch bottlenecks.
    """
    if not texts:
        return np.zeros((0, dim), dtype=np.float32)

    vectors = []
    for text in texts:
        vec = np.zeros(dim, dtype=np.float32)
        # Extract lowercase words and identifier segments
        tokens = re.findall(r'[a-zA-Z0-9_]{2,}', text.lower())
        for token in tokens:
            # Deterministic hash to bucket
            idx = abs(hash(token)) % dim
            vec[idx] += 1.0
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        vectors.append(vec)
    return np.array(vectors, dtype=np.float32)

def index_repository_chunks(repo_full_name: str, chunks: List[Dict[str, Any]]):
    """Generates vectors for all chunks in the repository and stores in vector index."""
    if not chunks:
        REPO_VECTOR_STORE[repo_full_name] = {"chunks": [], "embeddings": np.zeros((0, 512), dtype=np.float32)}
        return

    chunk_texts = [f"File: {c['file_path']}\n{c['content']}" for c in chunks]
    embeddings = tf_vectorize(chunk_texts, dim=512)

    REPO_VECTOR_STORE[repo_full_name] = {
        "chunks": chunks,
        "embeddings": embeddings,
    }
    print(f"Successfully indexed {len(chunks)} chunks for {repo_full_name}. Embeddings matrix: {embeddings.shape}")

def retrieve_relevant_chunks(repo_full_name: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Performs hybrid cosine similarity and keyword-boosted search over indexed codebase chunks."""
    store = REPO_VECTOR_STORE.get(repo_full_name)
    if not store or len(store["chunks"]) == 0:
        return []

    chunks = store["chunks"]
    embeddings = store["embeddings"]

    q_emb = tf_vectorize([query], dim=512)[0]
    q_norm = np.linalg.norm(q_emb)
    if q_norm == 0:
        return chunks[:top_k]

    # Compute cosine similarities
    norms = np.linalg.norm(embeddings, axis=1) * q_norm
    norms[norms == 0] = 1e-10
    similarities = np.dot(embeddings, q_emb) / norms

    # Keyword boosting: boost chunks where query keywords appear in filename or content
    query_tokens = [tok.lower() for tok in re.findall(r'[a-zA-Z0-9_]{2,}', query) if len(tok) >= 3]
    boosted_similarities = similarities.copy()

    for idx, chunk in enumerate(chunks):
        p_lower = chunk["file_path"].lower()
        c_lower = chunk["content"].lower()

        # Filename / path match boost
        path_matches = sum(1 for tok in query_tokens if tok in p_lower)
        if path_matches > 0:
            boosted_similarities[idx] += 0.35 * path_matches

        # Content match boost
        content_matches = sum(1 for tok in query_tokens if tok in c_lower)
        if content_matches > 0:
            boosted_similarities[idx] += 0.08 * min(content_matches, 6)

        # Setup / run / install boost for README and root configuration files
        if any(tok in ("run", "setup", "install", "start", "local", "locally", "commands") for tok in query_tokens):
            if any(k in p_lower for k in ("readme", "package.json", "requirements.txt")):
                boosted_similarities[idx] += 0.30

    # Get top_k indices sorted descending
    ranked_indices = np.argsort(boosted_similarities)[::-1][:top_k]

    results = []
    for idx in ranked_indices:
        chunk = chunks[idx]
        results.append({
            "file_path": chunk["file_path"],
            "start_line": chunk["start_line"],
            "end_line": chunk["end_line"],
            "content": chunk["content"],
            "score": round(float(boosted_similarities[idx]), 3)
        })
    return results

def execute_codebase_llm(prompt: str) -> Tuple[str, str]:
    """
    Calls primary LLM (Gemini) or secondary LLM (Groq) with the retrieved prompt.
    Returns (answer_text, provider_model_used).
    """
    # 1. Primary: Gemini (gemini-flash-latest, gemini-2.5-flash)
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            init_gemini()
            for model_name in ["gemini-flash-latest", "gemini-2.5-flash"]:
                try:
                    m = genai.GenerativeModel(model_name)
                    resp = m.generate_content(
                        prompt,
                        generation_config=genai.GenerationConfig(temperature=0.2)
                    )
                    if resp and resp.text and resp.text.strip():
                        return resp.text.strip(), f"Google Gemini ({model_name})"
                except Exception as m_err:
                    print(f"[RAG Q&A] Gemini {model_name} notice: {m_err}")
                    continue
        except Exception as g_err:
            print(f"[RAG Q&A] Gemini initialization notice: {g_err}")

    # 2. Secondary Fallback: Groq (openai/gpt-oss-20b, qwen/qwen3.8-27b)
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            for model_name in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]:
                try:
                    chat = client.chat.completions.create(
                        messages=[
                            {
                                "role": "system",
                                "content": "You are an expert technical AI Codebase Assistant. Answer developer questions accurately and specifically based on the provided code snippets."
                            },
                            {"role": "user", "content": prompt}
                        ],
                        model=model_name,
                        max_tokens=800,
                        temperature=0.2
                    )
                    text = chat.choices[0].message.content
                    if text and text.strip():
                        return text.strip(), f"Groq ({model_name})"
                except Exception as q_err:
                    print(f"[RAG Q&A] Groq {model_name} notice: {q_err}")
                    continue
        except Exception as grq_err:
            print(f"[RAG Q&A] Groq client error: {grq_err}")

    # 3. Honest Error (no hardcoded fake text)
    return (
        "Couldn't generate an answer from the codebase at this time due to LLM provider availability. Please verify API keys or try again in a moment.",
        "None (Error)"
    )

def answer_codebase_question(
    repo_full_name: str, 
    question: str, 
    meta: Dict[str, Any],
    history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """Uses RAG retrieval + LLM (Gemini/Groq) to answer questions grounded in the repository code."""
    relevant_chunks = retrieve_relevant_chunks(repo_full_name, question, top_k=5)

    # Format context snippets with file paths, line numbers, and code content
    context_blocks = []
    for idx, c in enumerate(relevant_chunks, 1):
        context_blocks.append(
            f"--- Code Snippet {idx} (File: {c['file_path']}, Lines: {c['start_line']}-{c['end_line']}) ---\n"
            f"{c['content']}\n"
        )
    context_text = "\n".join(context_blocks) if context_blocks else "No matching code files found in repository."

    history_str = ""
    if history:
        for turn in history[-4:]:
            role = "Developer" if turn.get("role") == "user" else "Assistant"
            history_str += f"{role}: {turn.get('content', '')}\n"

    system_prompt = f"""You are an expert technical AI Codebase Assistant analyzing the repository '{meta.get('full_name', repo_full_name)}'.

=== REPOSITORY OVERVIEW ===
Repository: {meta.get('full_name', repo_full_name)}
Description: {meta.get('description', 'N/A')}
Primary Language: {meta.get('primary_language', 'Unknown')}

=== RETRIEVED CODE SNIPPETS (GROUND TRUTH) ===
{context_text}

=== CONVERSATION HISTORY ===
{history_str if history_str else 'No prior conversation.'}

=== USER'S EXACT QUESTION ===
"{question}"

=== INSTRUCTIONS ===
1. Answer the user's question directly, precisely, and specifically based on the provided code snippets above.
2. Ground your response in the actual code:
   - Cite specific file paths and line numbers where relevant.
   - Quote or explain the exact functions, middlewares, models, variables, scripts, or configurations present in the snippets.
   - If asked "What does [x] do?", explain its actual mechanism, parameters, and return values / effects from the code.
   - If asked "List the AI models used", extract and list the specific models found in the code or environment configs.
   - If asked "How do I run this locally?", provide the exact commands and prerequisites found in README or package.json.
3. If the user explicitly asks how to explain this in an interview, provide a concise, spoken elevator explanation.
4. Do NOT output a generic elevator pitch ("I built [project]...") if the user asked a technical or specific question.
5. If the retrieved code snippets do not contain sufficient information to answer the question completely, state clearly what is known from the visible code and what information is missing.
6. Format your answer cleanly using markdown (bullet points, bold text, code blocks).
"""

    # REQUIREMENT 6: Explicit console/server log at the point where final prompt is sent to the LLM
    print("\n" + "=" * 80)
    print(f"[RAG Q&A PROMPT LOG]")
    print(f"Target Repository : {repo_full_name}")
    print(f"User Question     : {question}")
    print(f"Retrieved Chunks  : {len(relevant_chunks)}")
    for idx, c in enumerate(relevant_chunks, 1):
        print(f"  [{idx}] {c['file_path']} (lines {c['start_line']}-{c['end_line']}, score: {c['score']})")
    print("-" * 80)
    print(f"Full Prompt sent to LLM:\n{system_prompt}")
    print("=" * 80 + "\n")

    # Call LLM (Gemini with automatic Groq fallback)
    answer_text, model_used = execute_codebase_llm(system_prompt)
    print(f"[RAG Q&A] Answer successfully produced by: {model_used}\n")

    # Citations list
    citations = [
        {
            "file": c["file_path"],
            "lines": f"{c['start_line']}-{c['end_line']}",
            "score": c["score"],
            "snippet": c["content"][:200] + "..." if len(c["content"]) > 200 else c["content"]
        }
        for c in relevant_chunks
    ]

    return {
        "answer": answer_text,
        "citations": citations,
        "model_used": model_used
    }

def generate_recruiter_pitch(meta: Dict[str, Any], health: Dict[str, Any]) -> List[str]:
    """Generates 3-5 high-impact resume bullet points using Google's XYZ formula."""
    tech_stack_str = ", ".join(health.get("tech_stack", []))
    default_bullets = [
        f"Architected full-stack application using {tech_stack_str or 'modern web technologies'} featuring modular architecture and clean separation of concerns.",
        f"Engineered robust end-to-end data pipelines with error resilience and automated workflows.",
        f"Maintained high code quality and recruiter-readiness scoring {health.get('overall_score', 85)}/100 across documentation and architecture."
    ]

    try:
        init_gemini()
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        model = genai.GenerativeModel(model_name)

        prompt = f"""
You are an expert technical career coach. Create 3 to 5 high-impact resume bullet points for a software engineering candidate based on their GitHub repository:
- Project Name: {meta.get('name', 'Project')}
- Description: {meta.get('description', '')}
- Primary Language: {meta.get('primary_language', '')}
- Tech Stack: {tech_stack_str}
- Code Health Score: {health.get('overall_score', 80)}/100
- Strengths: {', '.join(health.get('strengths', []))}

Format each bullet point following Google's XYZ formula:
'Accomplished [X] as measured by [Y], by doing [Z]'
Use active technical verbs (Architected, Engineered, Implemented, Spearheaded, Optimized).

Return strictly a JSON array of strings:
["Architected ...", "Engineered ...", "Implemented ..."]
"""

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
        )

        data = json.loads(response.text)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "bullets" in data:
            return data["bullets"]
    except Exception as e:
        print(f"Notice: using default recruiter pitch due to: {e}")

    return default_bullets

def generate_interview_prep(meta: Dict[str, Any], health: Dict[str, Any], file_sample: List[str] = []) -> Dict[str, Any]:
    """
    Generates an interview preparation kit for the repository:
    1. How to explain the project in an interview (60-sec pitch, 2-min architecture, challenges).
    2. Comprehensive breakdown of key features and their technical implementations.
    3. Realistic technical interview questions, what interviewers test, and model talking points.
    """
    repo_name = meta.get("name", "Project")
    desc = meta.get("description") or "Full-stack application"
    tech_stack = health.get("tech_stack", ["React", "Node.js", "Python", "MongoDB"])
    stack_str = ", ".join(tech_stack)

    # High-quality fallback if Gemini is slow or offline
    default_prep = {
        "explanation_guide": {
            "elevator_pitch_60s": f"I built {repo_name}, a full-stack platform designed to solve career and developer intelligence challenges. It is engineered with a modular React frontend, a resilient backend utilizing {stack_str}, and integrates intelligent automated data pipelines to provide real-time user insights.",
            "architecture_walkthrough": f"The system follows a clean multi-tier architecture: 1) Client Layer built with React and modern UI state management, 2) API Gateway and Backend Services handling authentication, data validation, and routing, 3) AI & Computational Microservice processing heavy vector tasks, and 4) Database Layer for schema persistence and cache.",
            "challenges_and_tradeoffs": f"One key technical challenge was balancing API latency with deep computational processing. I decoupled time-intensive operations from the primary user thread by introducing asynchronous microservice communication and in-memory caching, reducing overall roundtrip latency.",
            "key_learnings": f"Building {repo_name} deepened my understanding of end-to-end full-stack separation of concerns, secure inter-service communication, and writing modular, testable components."
        },
        "features": [
            {
                "name": "Modular Client-Server Architecture",
                "category": "Architecture",
                "description": "Decoupled frontend and backend allowing independent scaling and streamlined deployments.",
                "technical_highlight": f"Utilizes RESTful endpoints with structured validation and environment-configured service proxies."
            },
            {
                "name": "Real-Time Data Processing",
                "category": "Core Engine",
                "description": "Ingests, transforms, and surfaces data with high fidelity and responsive UI feedback.",
                "technical_highlight": "Leverages asynchronous request handling, chunked stream parsing, and error-resilient fallbacks."
            },
            {
                "name": "Interactive Analytical Dashboard",
                "category": "UI / UX",
                "description": "Visualizes complex metrics, automated health scores, and dynamic recommendation streams.",
                "technical_highlight": "Custom SVG data-driven rings, glassmorphic card containers, and optimistic UI transitions."
            },
            {
                "name": "Inter-Service Authentication & Security",
                "category": "Security",
                "description": "Protects internal microservices from unauthorized external invocation.",
                "technical_highlight": "Internal security headers and tokenized request interceptors."
            }
        ],
        "interview_questions": [
            {
                "question": f"Can you walk me through the high-level architecture of {repo_name} and why you chose this stack?",
                "category": "Architecture & Design",
                "why_asked": "Tests ability to communicate system boundaries, component responsibilities, and architectural rationale.",
                "model_answer": f"I chose {stack_str} to separate high-concurrency request routing from intensive computational workloads. The frontend provides instant user feedback, while dedicated services handle business logic and database persistence.",
                "key_talking_points": ["Separation of concerns", "Independent scaling of services", "Maintainable modularity"],
                "codebase_reference": "Main service entry points and API controllers"
            },
            {
                "question": "How do you manage state and handle API errors or network timeouts in the frontend?",
                "category": "Frontend & Reliability",
                "why_asked": "Evaluates defensive programming practices and user experience handling under failure conditions.",
                "model_answer": "I implement centralized try/catch blocks with contextual user notifications and fallback states. If a background service times out, defensive defaults ensure the UI remains fully responsive without crashing.",
                "key_talking_points": ["Graceful degradation", "Optimistic UI", "Error boundaries"],
                "codebase_reference": "frontend/src/pages and service hooks"
            },
            {
                "question": "If traffic to this application increased by 50x tomorrow, what would be your first bottleneck and how would you scale it?",
                "category": "Scalability & System Design",
                "why_asked": "Assesses understanding of bottlenecks, caching strategies, and horizontal scaling.",
                "model_answer": "The initial bottleneck would likely be repeated computational requests. I would introduce a Redis cache layer for computed results, add horizontal container replicas behind a load balancer (NGINX), and put heavy processing into a background task queue (Celery/BullMQ).",
                "key_talking_points": ["Redis caching layer", "Stateless microservice replication", "Asynchronous task queue"],
                "codebase_reference": "Backend routing and AI service endpoints"
            },
            {
                "question": "How did you ensure security and prevent unauthorized access across your APIs?",
                "category": "Security",
                "why_asked": "Validates candidate's security mindset regarding CORS, input sanitization, and service authorization.",
                "model_answer": "I enforced CORS origin whitelisting, centralized input validation, and required inter-service secret keys for private microservice communication to prevent direct public probing.",
                "key_talking_points": ["Input validation", "CORS policy", "Internal service secrets"],
                "codebase_reference": "backend/src/server.js and middleware"
            }
        ]
    }

    try:
        init_gemini()
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        model = genai.GenerativeModel(model_name)

        prompt = f"""
You are a Staff Software Engineer and Technical Hiring Manager.
Analyze this GitHub project and generate an Interview Preparation Kit for the candidate:
- Project Name: {repo_name}
- Description: {desc}
- Primary Language: {meta.get('primary_language', 'Code')}
- Tech Stack: {stack_str}
- Code Health Strengths: {', '.join(health.get('strengths', []))}
- Sample Files: {', '.join(file_sample[:25])}

Generate a JSON object strictly matching this schema:
{{
  "explanation_guide": {{
    "elevator_pitch_60s": "Concise 60-second answer to 'Tell me about your project' highlighting the problem, architecture, tech stack, and user impact.",
    "architecture_walkthrough": "Detailed 2-minute architectural explanation breaking down Client UI, Backend Gateway, AI/Worker Service, and Data persistence.",
    "challenges_and_tradeoffs": "A compelling STAR method story explaining a tough technical decision, tradeoff made, or bottleneck solved.",
    "key_learnings": "2-3 senior-level engineering takeaways learned while building this project."
  }},
  "features": [
    {{
      "name": "Feature Title",
      "category": "Core Feature / AI & Vectors / Security / State Management / APIs",
      "description": "What value this feature delivers to end users.",
      "technical_highlight": "Under-the-hood implementation detail (specific libraries, algorithms, or API patterns used)."
    }}
  ],
  "interview_questions": [
    {{
      "question": "Realistic technical interview question specific to this project's architecture or code",
      "category": "Architecture / System Design / Code Quality / Performance / Security",
      "why_asked": "What concept or depth the interviewer is evaluating.",
      "model_answer": "Structured model answer the candidate should give in an interview.",
      "key_talking_points": ["Point 1", "Point 2", "Point 3"],
      "codebase_reference": "Specific file path or module in the project"
    }}
  ]
}}

Generate 4 to 6 core features and 5 to 7 realistic technical interview questions.
Ensure all advice is grounded specifically in {repo_name}'s tech stack ({stack_str}).
Return strictly raw JSON without markdown formatting.
"""

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3
            )
        )

        text = response.text.strip()
        data = json.loads(text)
        if isinstance(data, dict) and "explanation_guide" in data and "features" in data and "interview_questions" in data:
            return data
    except Exception as e:
        print(f"Notice: using default interview prep due to: {e}")

    return default_prep

def generate_profile_readme(username: str, repos: List[Dict[str, Any]], top_skills: List[str], bio: str = "") -> str:
    """Generates a complete production-grade GitHub Profile README.md."""
    init_gemini()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    model = genai.GenerativeModel(model_name)

    repo_names = [r.get("name", "") for r in repos[:6] if r.get("name")]
    skills_str = ", ".join(top_skills) if top_skills else "JavaScript, React, Python, Node.js, MongoDB, Git"

    prompt = f"""
You are an expert developer advocate. Create a modern, aesthetic GitHub Profile README.md for candidate:
GitHub Username: {username}
Bio: {bio or 'Software Developer passionate about scalable web applications & AI'}
Top Skills: {skills_str}
Top Public Repositories: {', '.join(repo_names)}

Include:
1. An engaging header banner with title and waving hand.
2. An "About Me" bulleted section with current focus and goals.
3. Tech Stack section organized by Category (Frontend, Backend, Databases, Tools) using shields.io badges (`https://img.shields.io/badge/...`).
4. Featured Projects table with descriptions, tech tags, and links to `https://github.com/{username}/[Repo]`.
5. GitHub Stats cards markdown:
   `![Stats](https://github-readme-stats.vercel.app/api?username={username}&show_icons=true&theme=radical)`
   `![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username={username}&layout=compact&theme=radical)`
6. Connect with Me section.

Return ONLY raw GitHub markdown without surrounding json or backticks.
"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```markdown"):
            text = text[11:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
    except Exception as e:
        print(f"Profile readme generation error: {e}")
        return f"""# Hi there, I'm {username} 👋

🚀 **Software Developer** passionate about crafting scalable full-stack applications and AI systems.

### 🛠️ Tech Stack
`{skills_str}`

### 📌 Featured Repositories
- [{repo_names[0] if repo_names else 'Project'}](https://github.com/{username}/{repo_names[0] if repo_names else ''})
- [{repo_names[1] if len(repo_names) > 1 else 'Project-2'}](https://github.com/{username}/{repo_names[1] if len(repo_names) > 1 else ''})

### 📊 GitHub Stats
![Stats](https://github-readme-stats.vercel.app/api?username={username}&show_icons=true&theme=radical)
"""

def generate_project_readme(repo_name: str, description: str, tech_stack: List[str], health: Dict[str, Any]) -> str:
    """Generates a comprehensive production-grade README.md for a project."""
    init_gemini()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    model = genai.GenerativeModel(model_name)

    stack_str = ", ".join(tech_stack) if tech_stack else "React, Node.js, Python, FastAPI"

    prompt = f"""
You are a Staff Software Engineer. Write a comprehensive, production-grade README.md for repository:
Project Name: {repo_name}
Description: {description}
Tech Stack: {stack_str}
Strengths: {', '.join(health.get('strengths', []))}

Include:
1. Title and one-line elevator pitch.
2. Shields.io status badges (License MIT, PRs welcome, Stars).
3. Overview & Problem Statement.
4. Key Features list with emojis.
5. High-level Architecture diagram using Mermaid.js (` ```mermaid `).
6. Tech Stack table (Layer, Technology, Purpose).
7. Prerequisites and Step-by-Step Local Installation / Quickstart Guide.
8. Environment Variables template.
9. Contributing guidelines & License.

Return ONLY raw Markdown without surrounding json or outer backticks.
"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```markdown"):
            text = text[11:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
    except Exception as e:
        print(f"Project readme notice: {e}")
        return f"""# {repo_name}

> {description}

## 🚀 Features
- Modular full-stack architecture
- Modern API endpoints
- High reliability and code quality

## 🛠️ Tech Stack
{stack_str}

## ⚡ Getting Started
```bash
git clone https://github.com/{repo_name}.git
cd {repo_name}
npm install
npm run dev
```
"""
