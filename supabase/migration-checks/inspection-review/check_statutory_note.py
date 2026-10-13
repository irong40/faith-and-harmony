"""Cross-repo check: the Va. Code 54.1-402(C) note in the inspection-review
email must equal Sortie's STATUTORY_PHOTOGRAMMETRY_NOTE byte for byte.

handler.spec.ts can only compare the two copies inside this repo; this script
reads the Python constant itself. Run it whenever either side changes:

    python check_statutory_note.py [path/to/sortie/services/reports/generator.py]

Default Sortie path: C:/Projects/Sortie/sortie/services/reports/generator.py
(or the SORTIE_GENERATOR_PY environment variable). Exit 0 = all equal.
"""
import ast
import json
import os
import re
import sys
from pathlib import Path

FN = Path(__file__).resolve().parents[2] / "functions" / "inspection-review"
DEFAULT = "C:/Projects/Sortie/sortie/services/reports/generator.py"


def python_note(path):
    tree = ast.parse(Path(path).read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and any(
                isinstance(t, ast.Name) and t.id == "STATUTORY_PHOTOGRAMMETRY_NOTE"
                for t in node.targets):
            return ast.literal_eval(node.value)
    raise SystemExit(f"STATUTORY_PHOTOGRAMMETRY_NOTE not found in {path}")


def ts_note(path, name):
    m = re.search(name + r' =\s*\n\s*(".*?");', Path(path).read_text(encoding="utf-8"))
    if not m:
        raise SystemExit(f"{name} not found in {path}")
    return json.loads(m.group(1))


def main():
    generator = (sys.argv[1] if len(sys.argv) > 1
                 else os.environ.get("SORTIE_GENERATOR_PY", DEFAULT))
    py = python_note(generator)
    email = ts_note(FN / "email.ts", "STATUTORY_PHOTOGRAMMETRY_NOTE")
    spec = ts_note(FN / "handler.spec.ts", "PYTHON_STATUTORY_NOTE")
    ok = py.encode("utf-8") == email.encode("utf-8") == spec.encode("utf-8")
    print(f"generator.py: {generator} ({len(py.encode('utf-8'))} bytes)")
    print(f"email.ts equal: {py == email}  handler.spec.ts equal: {py == spec}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
