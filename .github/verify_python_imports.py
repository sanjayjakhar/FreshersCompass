#!/usr/bin/env python3
"""Verify that every intra-package import in the AI service resolves to a real module.

Byte-compiling (``python -m compileall``) only proves the files parse. This catches
the other common CI-breaking mistake: a module was renamed or moved but an importer
was left behind, so the service still compiles yet explodes at request time.

Resolution is done statically, without importing anything, because the heavy
third-party dependencies (torch via sentence-transformers) are deliberately not
installed in CI.

Exit code 0 on success, 1 with an annotated list of unresolved imports otherwise.
"""

from __future__ import annotations

import argparse
import ast
import sys
from pathlib import Path

APP_ROOT = "app"


def iter_python_files(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*.py") if "__pycache__" not in p.parts)


def module_name(path: Path, root: Path) -> str:
    """``app/services/gemini.py`` -> ``app.services.gemini``."""
    relative = path.relative_to(root.parent)
    parts = list(relative.with_suffix("").parts)
    if parts[-1] == "__init__":
        parts.pop()
    return ".".join(parts)


def resolve(dotted: str, package_files: set[str], package_dirs: set[str]) -> bool:
    """A dotted path resolves if it names a module file or a package directory."""
    return dotted in package_files or dotted in package_dirs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default=APP_ROOT, help="package root to check")
    args = parser.parse_args()

    root = Path(args.root)
    if not root.is_dir():
        print(f"::error::{root} is not a directory")
        return 1

    files = iter_python_files(root)
    if not files:
        print(f"::error::no Python files found under {root}")
        return 1

    package_files = {module_name(p, root) for p in files}
    package_dirs = {str(p.parent.relative_to(root.parent)).replace("\\", ".") for p in files}

    problems: list[str] = []

    for path in files:
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except SyntaxError as exc:
            problems.append(f"{path}: syntax error: {exc}")
            continue

        current_package = module_name(path, root).rpartition(".")[0] or APP_ROOT

        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                if node.level == 0:
                    if node.module and node.module.startswith(f"{APP_ROOT}."):
                        target = node.module
                    else:
                        continue  # third-party or stdlib; not our concern here
                else:
                    # from . import x  /  from ..services import y
                    base = current_package
                    for _ in range(node.level - 1):
                        base = base.rpartition(".")[0]
                    parts = [p for p in base.split(".") if p] + (node.module.split(".") if node.module else [])
                    target = ".".join(parts)

                if not resolve(target, package_files, package_dirs):
                    problems.append(f"{path}:{node.lineno}: unresolved import '{target}'")

            elif isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.startswith(f"{APP_ROOT}."):
                        if not resolve(alias.name, package_files, package_dirs):
                            problems.append(f"{path}:{node.lineno}: unresolved import '{alias.name}'")

    if problems:
        print("::error::unresolved intra-package imports found:")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    print(f"OK - {len(files)} modules checked, all intra-package imports resolve")
    return 0


if __name__ == "__main__":
    sys.exit(main())