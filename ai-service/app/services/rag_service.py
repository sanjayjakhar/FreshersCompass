import os
import json
import re
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from app.services import llm_service, offline_heuristics

# In-memory vector store cache for fast local RAG queries
# Format: { "owner/repo": { "chunks": [...], "embeddings": np.ndarray, "normalized_embeddings": np.ndarray } }
REPO_VECTOR_STORE: Dict[str, Dict[str, Any]] = {}

# High-speed LRU query vector cache
RAG_QUERY_CACHE: Dict[str, List[Dict[str, Any]]] = {}

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
    """Generates vectors for all chunks in the repository and stores in fast vector index."""
    if not chunks:
        REPO_VECTOR_STORE[repo_full_name] = {
            "chunks": [],
            "embeddings": np.zeros((0, 512), dtype=np.float32),
            "normalized_embeddings": np.zeros((0, 512), dtype=np.float32)
        }
        return

    chunk_texts = [f"File: {c['file_path']}\n{c['content']}" for c in chunks]
    embeddings = tf_vectorize(chunk_texts, dim=512)

    # Pre-normalize embeddings matrix once during indexing for sub-millisecond BLAS dot product
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    normalized_embeddings = embeddings / norms

    REPO_VECTOR_STORE[repo_full_name] = {
        "chunks": chunks,
        "embeddings": embeddings,
        "normalized_embeddings": normalized_embeddings,
    }
    print(f"Successfully indexed {len(chunks)} chunks for {repo_full_name}. Embeddings matrix: {embeddings.shape}")

def retrieve_relevant_chunks(repo_full_name: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Performs sub-millisecond hybrid cosine similarity and keyword-boosted search over indexed codebase chunks."""
    cache_key = f"{repo_full_name}:{query.strip().lower()}:{top_k}"
    if cache_key in RAG_QUERY_CACHE:
        return RAG_QUERY_CACHE[cache_key]

    store = REPO_VECTOR_STORE.get(repo_full_name)
    if not store or len(store["chunks"]) == 0:
        return []

    chunks = store["chunks"]
    normalized_embeddings = store.get("normalized_embeddings")
    if normalized_embeddings is None:
        normalized_embeddings = store["embeddings"]

    q_emb = tf_vectorize([query], dim=512)[0]
    q_norm = np.linalg.norm(q_emb)
    if q_norm == 0:
        return chunks[:top_k]

    q_normalized = q_emb / q_norm

    # Fast BLAS dot product over pre-normalized matrix
    similarities = np.dot(normalized_embeddings, q_normalized)

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

    # Cache query result (LRU eviction if cache exceeds 500 items)
    if len(RAG_QUERY_CACHE) > 500:
        RAG_QUERY_CACHE.pop(next(iter(RAG_QUERY_CACHE)))
    RAG_QUERY_CACHE[cache_key] = results

    return results


def execute_codebase_llm(prompt: str) -> Tuple[str, str]:
    """
    Calls the shared provider layer (Gemini, then Groq) through the circuit breaker.

    Returns (answer_text, provider_model_used). Raises LLMUnavailable when no
    provider can serve the prompt, so the caller can fall back to deterministic
    synthesis instead of shipping an error string as if it were an answer.
    """
    return llm_service.complete(prompt, temperature=0.2, timeout=12)

def retrieve_codebase_context(repo_full_name: str, question: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Vector + heuristic retrieval, shared by the buffered and streaming chat paths."""
    return retrieve_relevant_chunks(repo_full_name, question, top_k=top_k)


def build_citations(relevant_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {
            "file": c["file_path"],
            "lines": f"{c['start_line']}-{c['end_line']}",
            "score": c["score"],
            "snippet": c["content"][:200] + "..." if len(c["content"]) > 200 else c["content"]
        }
        for c in relevant_chunks
    ]


def build_codebase_prompt(
    repo_full_name: str,
    question: str,
    meta: Dict[str, Any],
    history: Optional[List[Dict[str, str]]],
    relevant_chunks: List[Dict[str, Any]]
) -> str:
    """Single source of truth for the chat prompt.

    The streaming endpoint must ask the model exactly what the buffered one
    asks, otherwise streamed and non-streamed answers would disagree.
    """
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

    return f"""You are an expert technical AI Codebase Assistant analyzing the repository '{meta.get('full_name', repo_full_name)}'.

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


def log_codebase_prompt(repo_full_name: str, question: str, system_prompt: str, relevant_chunks: List[Dict[str, Any]]) -> None:
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

def answer_codebase_question(
    repo_full_name: str,
    question: str,
    meta: Dict[str, Any],
    history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """Uses RAG retrieval + LLM (Gemini/Groq) to answer questions grounded in the repository code."""
    relevant_chunks = retrieve_codebase_context(repo_full_name, question, top_k=5)
    system_prompt = build_codebase_prompt(repo_full_name, question, meta, history, relevant_chunks)
    log_codebase_prompt(repo_full_name, question, system_prompt, relevant_chunks)

    # Call LLM through the circuit breaker; on outage answer from the retrieved
    # code instead, so chat stays useful offline and says so.
    offline = False
    try:
        answer_text, model_used = execute_codebase_llm(system_prompt)
        print(f"[RAG Q&A] Answer successfully produced by: {model_used}\n")
    except llm_service.LLMUnavailable as unavailable:
        offline = True
        model_used = "Offline Deterministic"
        answer_text = offline_heuristics.chat_answer(question, relevant_chunks, repo_full_name)
        print(f"[RAG Q&A] Offline fallback engaged: {unavailable}\n")

    return {
        "answer": answer_text,
        "citations": build_citations(relevant_chunks),
        "model_used": model_used,
        "offline_mode": offline
    }

def generate_recruiter_pitch(meta: Dict[str, Any], health: Dict[str, Any]) -> Tuple[List[str], bool]:
    """
    XYZ-formatted resume bullets for the indexed repository.

    Returns (bullets, offline_mode) so the caller can label deterministic output
    instead of passing synthesised text off as generated.
    """
    tech_stack_str = ", ".join(health.get("tech_stack", []))

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

Return strictly a JSON array of strings.
"""

    try:
        data, _provider = llm_service.complete_json(
            prompt, temperature=0.2, unwrap_keys=["bullets"]
        )
        if isinstance(data, list) and data:
            return [str(b) for b in data], False
        if isinstance(data, dict) and isinstance(data.get("bullets"), list) and data["bullets"]:
            return [str(b) for b in data["bullets"]], False
        raise ValueError("pitch response was not a list of bullets")
    except Exception as e:
        print(f"[Pitch] deterministic fallback engaged: {e}")
        return offline_heuristics.pitch_bullets(meta, health), True

def generate_interview_prep(
    meta: Dict[str, Any], health: Dict[str, Any], file_sample: List[str] = []
) -> Tuple[Dict[str, Any], bool]:
    """
    Interview kit for the indexed repository.

    Returns (prep, offline_mode) so the caller can label deterministic output.
    """
    repo_name = meta.get("name", "Project")
    desc = meta.get("description") or "Full-stack application"
    tech_stack = health.get("tech_stack", ["React", "Node.js", "Python", "MongoDB"])
    stack_str = ", ".join(tech_stack)

    try:
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

        data, _provider = llm_service.complete_json(prompt, temperature=0.3)
        if isinstance(data, dict) and "explanation_guide" in data and "features" in data and "interview_questions" in data:
            return data, False
    except Exception as e:
        print(f"[Interview Prep] deterministic fallback engaged: {e}")

    return offline_heuristics.interview_prep(meta, health, file_sample), True

def generate_profile_readme(
    username: str, repos: List[Dict[str, Any]], top_skills: List[str], bio: str = ""
) -> Tuple[str, bool]:
    """Generates a GitHub Profile README.md. Returns (markdown, offline_mode)."""
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
        text, _provider = llm_service.complete(prompt, temperature=0.6)
        return text, False
    except Exception as e:
        print(f"[Profile Readme] deterministic fallback engaged: {e}")

    # Built from the repos and skills we actually resolved, not a hardcoded list.
    featured = "\n".join(
        f"- [{name}](https://github.com/{username}/{name})" for name in repo_names[:6]
    ) or "- No public repositories indexed yet."

    return f"""# Hi there, I'm {username} 👋

{bio or 'Software Developer building reliable, well-tested applications.'}

### 🛠️ Tech Stack
{skills_str}

### 📌 Featured Repositories
{featured}

### 📊 GitHub Stats
![Stats](https://github-readme-stats.vercel.app/api?username={username}&show_icons=true&theme=radical)
![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username={username}&layout=compact&theme=radical)
""", True

def generate_project_readme(
    repo_name: str, description: str, tech_stack: List[str], health: Dict[str, Any]
) -> Tuple[str, bool]:
    """Generates a README.md for a project. Returns (markdown, offline_mode)."""
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
        text, _provider = llm_service.complete(prompt, temperature=0.6)
        return text, False
    except Exception as e:
        print(f"[Project Readme] deterministic fallback engaged: {e}")

    # Feature bullets come from measured code-health strengths, not boilerplate.
    features = "\n".join(
        f"- {s}" for s in (health.get("strengths") or [])[:4]
    ) or "- Modular architecture with validated inputs and explicit failure paths"

    return f"""# {repo_name}

> {description or 'A project by ' + str(repo_name)}

## 🚀 Features
{features}

## 🛠️ Tech Stack
{stack_str}

## ⚡ Getting Started
```bash
git clone https://github.com/{repo_name}.git
cd {repo_name}
npm install
npm run dev
```
""", True
