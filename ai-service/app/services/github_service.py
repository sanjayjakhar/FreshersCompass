import os
import re
import base64
from typing import Dict, List, Any, Optional, Tuple
from github import Github, GithubException

# Directories and files to exclude from analysis and chunking
IGNORE_DIRS = {
    "node_modules", ".git", "dist", "build", "__pycache__", "venv", ".venv",
    ".next", ".nuxt", ".idea", ".vscode", "target", "bin", "obj", "vendor", "coverage"
}

IGNORE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".mp4", ".mov",
    ".pdf", ".zip", ".tar.gz", ".tar", ".gz", ".exe", ".dll", ".so", ".dylib",
    ".lock", ".lockb", ".min.js", ".min.css", ".map"
}

CODE_EXTENSIONS = {
    ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".rs", ".cpp",
    ".c", ".cs", ".php", ".rb", ".html", ".css", ".sql", ".sh", ".json", ".yaml", ".yml", ".md"
}

def parse_repo_identifier(repo_input: str) -> Tuple[str, str]:
    """Extracts (owner, repo_name) from URL or 'owner/repo' string."""
    cleaned = repo_input.strip()
    cleaned = re.sub(r"^https?://github\.com/", "", cleaned)
    cleaned = cleaned.rstrip("/")
    if cleaned.endswith(".git"):
        cleaned = cleaned[:-4]
    
    parts = cleaned.split("/")
    if len(parts) == 1:
        return "sanjayjakhar", parts[0]
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError("Invalid repository identifier. Expected 'owner/repo' or GitHub URL.")
    return parts[0], parts[1]

def get_github_client() -> Github:
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token and not token.startswith("your_github") and len(token) > 10:
        return Github(token, retry=0, timeout=10)
    return Github(retry=0, timeout=10)

def fetch_local_repository_data(owner: str, repo_name: str, max_files_to_read: int = 40) -> Dict[str, Any]:
    """Ingests local project workspace directly from disk (fast, offline, zero rate limit)."""
    # Find repository root
    current_dir = os.path.abspath(os.path.dirname(__file__))
    # Go up from ai-service/app/services -> repo root
    workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

    meta = {
        "full_name": f"{owner}/{repo_name}",
        "name": repo_name,
        "owner": owner,
        "description": "AI-powered career and code intelligence platform for students and early-career developers.",
        "stars": 12,
        "forks": 3,
        "open_issues": 0,
        "default_branch": "main",
        "primary_language": "JavaScript / Python",
        "created_at": "2026-09-07",
        "updated_at": "2026-09-12",
        "html_url": f"https://github.com/{owner}/{repo_name}",
    }

    file_list = []
    file_contents = {}

    for root, dirs, files in os.walk(workspace_root):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in IGNORE_EXTENSIONS:
                continue
            rel_path = os.path.relpath(os.path.join(root, file), workspace_root).replace("\\", "/")
            if any(part in IGNORE_DIRS for part in rel_path.split("/")):
                continue
            file_list.append(rel_path)

    # Prioritize key files
    high_priority = []
    medium_priority = []
    for path in file_list:
        p_lower = path.lower()
        ext = os.path.splitext(path)[1].lower()
        if "readme" in p_lower or p_lower.endswith(("package.json", "requirements.txt", "pyproject.toml")):
            high_priority.append(path)
        elif ext in CODE_EXTENSIONS:
            medium_priority.append(path)

    prioritized = (high_priority + medium_priority)[:max_files_to_read]

    for path in prioritized:
        abs_p = os.path.join(workspace_root, path)
        try:
            with open(abs_p, "r", encoding="utf-8", errors="replace") as f:
                file_contents[path] = f.read()
        except Exception:
            continue

    health_analysis = evaluate_codebase_health(meta, file_list, file_contents)

    return {
        "metadata": meta,
        "all_files": file_list[:250],
        "total_files_count": len(file_list),
        "file_contents": file_contents,
        "health": health_analysis,
    }

def fetch_repository_data(repo_input: str, max_files_to_read: int = 35) -> Dict[str, Any]:
    """
    Ingests repo metadata, directory tree, and key source files.
    Works with local workspace fallback, public GitHub repos, and authenticated private repos.
    """
    owner, repo_name = parse_repo_identifier(repo_input)

    # If it's the current project, ingest directly from disk for instant speed
    if repo_name.lower() in ("fresherscompass", "freshercompass", "freshers-compass"):
        return fetch_local_repository_data(owner, repo_name, max_files_to_read)

    g = get_github_client()
    
    try:
        repo = g.get_repo(f"{owner}/{repo_name}")
    except GithubException as ge:
        if ge.status == 404:
            raise ValueError(f"Repository '{owner}/{repo_name}' was not found or is private without access token.")
        if ge.status == 403:
            raise ValueError("GitHub API hourly rate limit reached. Please provide a GITHUB_TOKEN in ai-service/.env, or analyze 'sanjayjakhar/FreshersCompass'.")
        raise ValueError(f"GitHub API error: {ge.data.get('message', str(ge)) if hasattr(ge, 'data') else str(ge)}")
    except Exception as ex:
        raise ValueError(f"Failed to connect to GitHub: {str(ex)}")

    meta = {
        "full_name": repo.full_name,
        "name": repo.name,
        "owner": repo.owner.login,
        "description": repo.description or "No description provided",
        "stars": repo.stargazers_count,
        "forks": repo.forks_count,
        "open_issues": repo.open_issues_count,
        "default_branch": repo.default_branch or "main",
        "primary_language": repo.language or "Unknown",
        "created_at": str(repo.created_at),
        "updated_at": str(repo.updated_at),
        "html_url": repo.html_url,
    }

    # Fetch recursive git tree
    file_list: List[str] = []
    try:
        tree = repo.get_git_tree(repo.default_branch, recursive=True)
        for element in tree.tree:
            if element.type == "blob":
                path_parts = element.path.split("/")
                if any(part in IGNORE_DIRS for part in path_parts):
                    continue
                ext = os.path.splitext(element.path)[1].lower()
                if ext in IGNORE_EXTENSIONS:
                    continue
                file_list.append(element.path)
    except Exception as e:
        print(f"Recursive tree fetch fallback: {e}")
        try:
            contents = repo.get_contents("")
            while contents and len(file_list) < 100:
                file_content = contents.pop(0)
                if file_content.type == "dir":
                    if file_content.name not in IGNORE_DIRS:
                        contents.extend(repo.get_contents(file_content.path))
                else:
                    file_list.append(file_content.path)
        except Exception as e2:
            print(f"Fallback directory fetch error: {e2}")

    # Prioritize files to read content from:
    high_priority = []
    medium_priority = []
    low_priority = []

    for path in file_list:
        p_lower = path.lower()
        ext = os.path.splitext(path)[1].lower()
        
        if "readme" in p_lower or p_lower in ("contributing.md", "architecture.md"):
            high_priority.append(path)
        elif p_lower.endswith(("package.json", "requirements.txt", "pyproject.toml", "pom.xml", "dockerfile", "docker-compose.yml", "go.mod", "cargo.toml")):
            high_priority.append(path)
        elif ".github/workflows" in p_lower:
            high_priority.append(path)
        elif ext in CODE_EXTENSIONS:
            medium_priority.append(path)
        else:
            low_priority.append(path)

    prioritized_paths = (high_priority + medium_priority + low_priority)[:max_files_to_read]

    file_contents: Dict[str, str] = {}
    for path in prioritized_paths:
        try:
            c = repo.get_contents(path)
            if c.encoding == "base64" and c.content:
                decoded = base64.b64decode(c.content).decode("utf-8", errors="replace")
                file_contents[path] = decoded
            elif hasattr(c, "decoded_content") and c.decoded_content:
                file_contents[path] = c.decoded_content.decode("utf-8", errors="replace")
        except Exception:
            continue

    health_analysis = evaluate_codebase_health(meta, file_list, file_contents)

    return {
        "metadata": meta,
        "all_files": file_list[:250],
        "total_files_count": len(file_list),
        "file_contents": file_contents,
        "health": health_analysis,
    }

def evaluate_codebase_health(
    meta: Dict[str, Any], 
    all_files: List[str], 
    contents: Dict[str, str]
) -> Dict[str, Any]:
    """Calculates code health scores, detects tech stack, and identifies key architectural patterns."""
    
    # 1. Documentation Score (0-100)
    doc_score = 0
    readme_path = next((p for p in contents if "readme" in p.lower()), None)
    readme_text = contents.get(readme_path, "") if readme_path else ""
    
    if readme_path:
        doc_score += 40
        if len(readme_text) > 400:
            doc_score += 20
        if any(h in readme_text.lower() for h in ["installation", "getting started", "setup", "run", "usage"]):
            doc_score += 20
        if any(h in readme_text.lower() for h in ["architecture", "table of contents", "features", "api"]):
            doc_score += 20
    doc_score = min(100, doc_score)

    # 2. Testing & Quality Practices Score (0-100)
    test_score = 0
    has_tests = any("test" in f.lower() or "spec" in f.lower() for f in all_files)
    has_workflows = any(".github/workflows" in f.lower() for f in all_files)
    has_linter = any(f.lower().endswith((".eslintrc", ".eslintrc.json", ".eslintrc.js", "eslint.config.js", "ruff.toml", ".flake8")) for f in all_files)
    has_docker = any("dockerfile" in f.lower() for f in all_files)

    if has_tests:
        test_score += 45
    if has_workflows:
        test_score += 25
    if has_linter:
        test_score += 15
    if has_docker:
        test_score += 15
    test_score = min(100, test_score)

    # 3. Architecture & Modularity Score (0-100)
    arch_score = 50
    dirs = set()
    for f in all_files:
        parts = f.split("/")
        if len(parts) > 1:
            dirs.add(parts[0])
            
    if len(dirs) >= 3:
        arch_score += 20
    if any(d in dirs for d in ["src", "app", "backend", "frontend", "services", "controllers", "routes", "models"]):
        arch_score += 20
    if len(all_files) > 10:
        arch_score += 10
    arch_score = min(100, arch_score)

    # Overall Score (weighted)
    overall_score = round((doc_score * 0.35) + (arch_score * 0.35) + (test_score * 0.30))

    # Detect Tech Stack & Frameworks
    tech_stack = set()
    if meta.get("primary_language") and meta["primary_language"] != "Unknown":
        for lang in meta["primary_language"].split("/"):
            tech_stack.add(lang.strip())

    for f, body in contents.items():
        f_lower = f.lower()
        body_lower = body.lower()
        
        if "package.json" in f_lower:
            if "react" in body_lower: tech_stack.add("React.js")
            if "vue" in body_lower: tech_stack.add("Vue.js")
            if "next" in body_lower: tech_stack.add("Next.js")
            if "express" in body_lower: tech_stack.add("Express.js")
            if "vite" in body_lower: tech_stack.add("Vite")
            if "tailwindcss" in body_lower: tech_stack.add("Tailwind CSS")
            if "mongoose" in body_lower or "mongodb" in body_lower: tech_stack.add("MongoDB")
            if "prisma" in body_lower: tech_stack.add("Prisma")
            if "typescript" in body_lower: tech_stack.add("TypeScript")
        
        if "requirements.txt" in f_lower or "pyproject.toml" in f_lower:
            if "fastapi" in body_lower: tech_stack.add("FastAPI")
            if "flask" in body_lower: tech_stack.add("Flask")
            if "django" in body_lower: tech_stack.add("Django")
            if "google-generativeai" in body_lower: tech_stack.add("Google Gemini AI")
            if "sentence-transformers" in body_lower or "torch" in body_lower: tech_stack.add("PyTorch / Transformers")
            if "pymongo" in body_lower: tech_stack.add("MongoDB")
            if "pydantic" in body_lower: tech_stack.add("Pydantic")

        if "dockerfile" in f_lower or "docker-compose" in f_lower:
            tech_stack.add("Docker")

    # Strengths and recommendations
    strengths = []
    improvements = []

    if doc_score >= 70:
        strengths.append("Comprehensive README documentation with clear setup and architecture details")
    else:
        improvements.append("Expand README with detailed architecture diagrams, setup commands, and API docs")

    if arch_score >= 70:
        strengths.append("Well-structured modular codebase with clean directory separation")
    else:
        improvements.append("Group components and logic into dedicated modules (controllers, routes, services)")

    if has_tests:
        strengths.append("Automated test coverage present for critical workflows")
    else:
        improvements.append("Add unit and integration tests (e.g. Jest, Pytest) to increase recruiter confidence")

    if has_workflows:
        strengths.append("Automated CI/CD workflows configured via GitHub Actions")
    else:
        improvements.append("Add GitHub Actions workflow for automated testing and linting on pull requests")

    return {
        "overall_score": overall_score,
        "doc_score": doc_score,
        "arch_score": arch_score,
        "test_score": test_score,
        "tech_stack": sorted(list(tech_stack)),
        "strengths": strengths,
        "improvements": improvements,
    }

def chunk_codebase_files(file_contents: Dict[str, str], max_chunk_lines: int = 60) -> List[Dict[str, Any]]:
    """Chunks ingested files into searchable units for RAG vector retrieval."""
    chunks: List[Dict[str, Any]] = []
    chunk_id = 0

    for filepath, content in file_contents.items():
        lines = content.splitlines()
        if not lines:
            continue

        if len(lines) <= max_chunk_lines:
            chunk_id += 1
            chunks.append({
                "chunk_id": chunk_id,
                "file_path": filepath,
                "start_line": 1,
                "end_line": len(lines),
                "content": content[:2000],
            })
            continue

        step = max_chunk_lines - 15
        for i in range(0, len(lines), step):
            chunk_lines = lines[i:i + max_chunk_lines]
            if not chunk_lines:
                break
            chunk_id += 1
            chunks.append({
                "chunk_id": chunk_id,
                "file_path": filepath,
                "start_line": i + 1,
                "end_line": min(i + len(chunk_lines), len(lines)),
                "content": "\n".join(chunk_lines)[:2500],
            })

    return chunks
