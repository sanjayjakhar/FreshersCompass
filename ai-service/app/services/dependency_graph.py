import os
import re
import ast
from typing import Dict, List, Any, Optional, Set, Tuple

def normalize_path(path: str) -> str:
    return path.replace("\\", "/").strip("/")

def infer_file_layer(file_path: str) -> str:
    """Categorizes a file into an architectural tier."""
    p_lower = file_path.lower()
    if any(k in p_lower for k in ["route", "router", "endpoint"]):
        return "ROUTE"
    elif any(k in p_lower for k in ["controller", "handler"]):
        return "CONTROLLER"
    elif any(k in p_lower for k in ["middleware", "guard", "interceptor"]):
        return "MIDDLEWARE"
    elif any(k in p_lower for k in ["model", "schema", "entity"]):
        return "MODEL"
    elif any(k in p_lower for k in ["service", "util", "helper", "client", "adapter"]):
        return "SERVICE"
    elif any(k in p_lower for k in ["component", "page", "view"]):
        return "VIEW"
    return "MODULE"

def extract_js_ts_dependencies(file_path: str, content: str) -> Tuple[List[str], List[str]]:
    """
    Parses ES6 imports, CommonJS requires, and exported symbols from JavaScript/TypeScript.
    Returns (imported_paths, exported_symbols).
    """
    imports = []
    exports = []

    # 1. ES6 Imports: import ... from '...'
    es6_matches = re.findall(r'''(?:import\s+[^;]*?from\s+['"]([^'"]+)['"])|(?:import\s*['"]([^'"]+)['"])''', content)
    for m in es6_matches:
        target = m[0] or m[1]
        if target:
            imports.append(target)

    # 2. CommonJS: require('...')
    cjs_matches = re.findall(r'''require\s*\(\s*['"]([^'"]+)['"]\s*\)''', content)
    for m in cjs_matches:
        imports.append(m)

    # 3. Exported functions / classes / objects
    export_named = re.findall(r'''export\s+(?:const|let|var|function|class|async\s+function)\s+([a-zA-Z0-9_$]+)''', content)
    exports.extend(export_named)

    if "export default" in content:
        exports.append("default")

    # 4. Route handlers (router.get, router.post, app.use)
    route_matches = re.findall(r'''(?:router|app)\.(get|post|put|patch|delete|use)\s*\(\s*['"]([^'"]+)['"]''', content)
    for method, endpoint in route_matches:
        exports.append(f"{method.upper()} {endpoint}")

    return imports, exports

def extract_python_dependencies(file_path: str, content: str) -> Tuple[List[str], List[str]]:
    """
    Parses Python AST for imports, function definitions, and class declarations.
    Returns (imported_paths, exported_symbols).
    """
    imports = []
    exports = []

    try:
        tree = ast.parse(content, filename=file_path)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if not node.name.startswith("_"):
                    exports.append(node.name)
            elif isinstance(node, ast.ClassDef):
                exports.append(node.name)
    except SyntaxError:
        # Fallback to regex if file has Python syntax quirks
        py_imports = re.findall(r'''^(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))''', content, re.MULTILINE)
        for m in py_imports:
            target = m[0] or m[1]
            if target:
                imports.append(target)
        py_defs = re.findall(r'''(?:def|class)\s+([a-zA-Z0-9_]+)''', content)
        exports.extend(py_defs)

    return imports, exports

def resolve_target_file(source_file: str, import_target: str, all_files: Set[str]) -> Optional[str]:
    """Resolves relative import paths (e.g., '../models/Profile.model') to repository files."""
    source_dir = os.path.dirname(source_file)

    # 1. Direct match
    if import_target in all_files:
        return import_target

    # 2. Relative file resolution for JS/TS
    if import_target.startswith("."):
        norm_combined = normalize_path(os.path.normpath(os.path.join(source_dir, import_target)))
        candidates = [
            norm_combined,
            norm_combined + ".js",
            norm_combined + ".jsx",
            norm_combined + ".ts",
            norm_combined + ".tsx",
            norm_combined + "/index.js",
            norm_combined + "/index.ts",
        ]
        for c in candidates:
            if c in all_files:
                return c

    # 3. Python module path resolution (e.g., app.services.github_service)
    py_relative = import_target.replace(".", "/")
    py_candidates = [
        py_relative + ".py",
        f"ai-service/{py_relative}.py",
        f"backend/src/{py_relative}.js",
    ]
    for c in py_candidates:
        if c in all_files:
            return c

    # 4. Basename search across repository files
    target_base = os.path.basename(import_target).split(".")[0].lower()
    for f in all_files:
        f_base = os.path.basename(f).split(".")[0].lower()
        if target_base and f_base == target_base and f != source_file:
            return f

    return None

def build_dependency_graph(file_contents: Dict[str, str]) -> Dict[str, Any]:
    """
    Constructs a lightweight directed dependency graph (Adjacency Matrix / Inverted Index)
    linking routes -> controllers -> models / services across the indexed repository.
    """
    all_files = set(normalize_path(p) for p in file_contents.keys())

    nodes: Dict[str, Dict[str, Any]] = {}
    edges: List[Dict[str, Any]] = []
    forward_adj: Dict[str, List[str]] = {}
    reverse_adj: Dict[str, List[str]] = {}

    for file_path in all_files:
        nodes[file_path] = {
            "path": file_path,
            "layer": infer_file_layer(file_path),
            "exports": [],
            "dependencies": [],
        }
        forward_adj[file_path] = []
        reverse_adj[file_path] = []

    for file_path, content in file_contents.items():
        norm_path = normalize_path(file_path)
        ext = os.path.splitext(norm_path)[1].lower()

        if ext in [".js", ".jsx", ".ts", ".tsx", ".mjs"]:
            raw_imports, exports = extract_js_ts_dependencies(norm_path, content)
        elif ext in [".py"]:
            raw_imports, exports = extract_python_dependencies(norm_path, content)
        else:
            raw_imports, exports = [], []

        nodes[norm_path]["exports"] = exports[:20]

        resolved_deps = set()
        for raw_imp in raw_imports:
            resolved = resolve_target_file(norm_path, raw_imp, all_files)
            if resolved and resolved != norm_path:
                resolved_deps.add(resolved)

        nodes[norm_path]["dependencies"] = sorted(list(resolved_deps))

        for target in resolved_deps:
            edges.append({
                "source": norm_path,
                "target": target,
                "type": f"{nodes[norm_path]['layer']} -> {nodes[target]['layer']}",
            })
            forward_adj[norm_path].append(target)
            reverse_adj[target].append(norm_path)

    # Detect multi-file architectural flow chains spanning 3+ files (routes -> controllers -> models/services)
    chains: List[List[str]] = []
    for file_path, node in nodes.items():
        if node["layer"] in ["ROUTE", "MIDDLEWARE", "VIEW"]:
            # Traverse forward to find chains of length >= 3
            for next_file in forward_adj.get(file_path, []):
                for third_file in forward_adj.get(next_file, []):
                    chain = [file_path, next_file, third_file]
                    if len(set(chain)) == 3:
                        chains.append(chain)

    return {
        "nodes": nodes,
        "edges": edges,
        "forward_adjacency": forward_adj,
        "reverse_adjacency": reverse_adj,
        "flow_chains": chains[:30],
        "total_nodes": len(nodes),
        "total_edges": len(edges),
    }

def get_architecture_context(
    dependency_graph: Dict[str, Any],
    query: str,
    matched_files: List[str]
) -> Dict[str, Any]:
    """
    Extracts connected architectural flows, caller/callee signatures, and diagrammatic
    Mermaid / ASCII representations matching the query context.
    """
    if not dependency_graph or not dependency_graph.get("nodes"):
        return {"summary": "", "mermaid": "", "ascii": "", "connected_files": []}

    nodes = dependency_graph["nodes"]
    forward_adj = dependency_graph.get("forward_adjacency", {})
    flow_chains = dependency_graph.get("flow_chains", [])

    q_lower = query.lower()
    is_flow_query = any(k in q_lower for k in [
        "flow", "architecture", "connect", "how does", "pipeline", "routes",
        "controller", "middleware", "model", "data flow", "request", "lifecycle", "mongo"
    ])

    # Find the most relevant chain
    selected_chain: Optional[List[str]] = None

    # Priority 1: Check if any flow chain contains files matched by vector retrieval
    for chain in flow_chains:
        if any(f in chain for f in matched_files):
            selected_chain = chain
            break

    # Priority 2: Keyword match in chains (e.g. auth, profile, job, github)
    if not selected_chain and flow_chains:
        for chain in flow_chains:
            combined = " ".join(chain).lower()
            if any(term in combined for term in ["auth", "profile", "job", "github", "resume"]):
                selected_chain = chain
                break

    # Priority 3: Fallback to the first multi-file chain if available
    if not selected_chain and flow_chains:
        selected_chain = flow_chains[0]

    if not selected_chain:
        # Build synthetic chain from matched files if adjacent
        for f in matched_files:
            children = forward_adj.get(f, [])
            for c in children:
                grand_children = forward_adj.get(c, [])
                for gc in grand_children:
                    if len({f, c, gc}) == 3:
                        selected_chain = [f, c, gc]
                        break
                if selected_chain:
                    break
            if selected_chain:
                break

    if not selected_chain:
        return {"summary": "", "mermaid": "", "ascii": "", "connected_files": []}

    # Format Diagrammatic Representations
    labels = ["A", "B", "C", "D", "E"]
    mermaid_lines = ["graph TD"]
    ascii_parts = []

    for i in range(len(selected_chain)):
        curr_file = selected_chain[i]
        curr_layer = nodes.get(curr_file, {}).get("layer", "MODULE")
        node_id = labels[i]
        mermaid_lines.append(f'  {node_id}["{curr_file}<br/><i>({curr_layer})</i>"]')
        ascii_parts.append(f"[{curr_file} ({curr_layer})]")

        if i < len(selected_chain) - 1:
            next_file = selected_chain[i + 1]
            next_layer = nodes.get(next_file, {}).get("layer", "MODULE")
            next_id = labels[i + 1]
            relation = "calls/routes" if curr_layer in ["ROUTE", "MIDDLEWARE"] else "queries/invokes"
            mermaid_lines.append(f"  {node_id} -->|{relation}| {next_id}")

    mermaid_code = "\n".join(mermaid_lines)
    ascii_flow = " --> ".join(ascii_parts)

    # Detailed caller/callee context summary
    summary_lines = [
        f"End-to-End Architectural Flow Spanning {len(selected_chain)} Interconnected Files:",
        f"Flow Sequence: {ascii_flow}",
        "",
        "Component Signatures & Layer Linkages:",
    ]

    for f in selected_chain:
        node_info = nodes.get(f, {})
        exports = ", ".join(node_info.get("exports", [])[:5]) or "default module exports"
        deps = ", ".join(node_info.get("dependencies", [])[:3]) or "None"
        summary_lines.append(f"- **{f}** [{node_info.get('layer', 'MODULE')}]:")
        summary_lines.append(f"  • Exported Symbols: {exports}")
        summary_lines.append(f"  • Downstream Calls: {deps}")

    return {
        "summary": "\n".join(summary_lines),
        "mermaid": mermaid_code,
        "ascii": ascii_flow,
        "connected_files": selected_chain,
        "is_flow_query": is_flow_query,
    }
