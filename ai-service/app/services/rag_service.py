import os
import json
import re
import numpy as np
from typing import List, Dict, Any, Optional
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
    """Performs cosine similarity search over the indexed codebase chunks."""
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

    # Get top_k indices sorted descending
    ranked_indices = np.argsort(similarities)[::-1][:top_k]

    results = []
    for idx in ranked_indices:
        chunk = chunks[idx]
        results.append({
            "file_path": chunk["file_path"],
            "start_line": chunk["start_line"],
            "end_line": chunk["end_line"],
            "content": chunk["content"],
            "score": round(float(similarities[idx]), 3)
        })
    return results

def answer_codebase_question(
    repo_full_name: str, 
    question: str, 
    meta: Dict[str, Any],
    history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """Uses RAG retrieval + Gemini to answer questions grounded in the repository code."""
    init_gemini()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    model = genai.GenerativeModel(model_name)

    relevant_chunks = retrieve_relevant_chunks(repo_full_name, question, top_k=5)

    # Format context snippets
    context_blocks = []
    for idx, c in enumerate(relevant_chunks, 1):
        context_blocks.append(
            f"--- Snippet {idx} (File: {c['file_path']} Lines: {c['start_line']}-{c['end_line']}) ---\n"
            f"{c['content']}\n"
        )
    context_text = "\n".join(context_blocks) if context_blocks else "No relevant files found."

    history_str = ""
    if history:
        for turn in history[-4:]:
            role = "User" if turn.get("role") == "user" else "Assistant"
            history_str += f"{role}: {turn.get('content', '')}\n"

    system_prompt = f"""
You are the AI Codebase Intelligence Assistant for FreshersCompass, helping developers and recruiters understand GitHub repositories.
Repository: {meta.get('full_name', repo_full_name)}
Description: {meta.get('description', '')}
Primary Language: {meta.get('primary_language', 'Unknown')}

You have access to the actual code extracted from this repository through vector search:

{context_text}

Previous conversation:
{history_str}

User Question:
"{question}"

Instructions:
1. Answer the user's question accurately and thoroughly, referencing specific files, modules, and line numbers from the context snippets when appropriate.
2. If the user asks about architecture, design patterns, API endpoints, or auth mechanisms, explain how they are implemented based on the provided code.
3. If the code snippets don't contain enough detail to fully answer, state what is known from the available context and give an educated technical assessment.
4. Format your response cleanly using Markdown, with code snippets in proper fenced code blocks (` ```language `).
5. Always maintain an encouraging, highly professional technical tone.
"""

    response = model.generate_content(
        system_prompt,
        generation_config=genai.GenerationConfig(temperature=0.3)
    )

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
        "answer": response.text,
        "citations": citations
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
