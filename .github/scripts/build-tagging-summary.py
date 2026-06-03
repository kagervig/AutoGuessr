# Formats tagging-report.json into a human-readable summary appended to summary.txt.
import json
import os
import sys

report_path = "tagging-report.json"
summary_path = "summary.txt"

if not os.path.exists(report_path):
    sys.exit(0)

with open(report_path) as f:
    rows = json.load(f)

if not rows:
    sys.exit(0)

COL = {"make": 20, "model": 20, "year": 4, "conf": 5}


def cell(val, width):
    return str(val)[:width].ljust(width)


lines = [
    "",
    f"{cell('Make', COL['make'])}  {cell('Model', COL['model'])}  {cell('Year', COL['year'])}  {cell('Conf', COL['conf'])}  Auto",
    f"{'─' * COL['make']}  {'─' * COL['model']}  {'─' * COL['year']}  {'─' * COL['conf']}  ────",
]

for r in rows:
    year = str(r["year"]) if r["year"] else "?"
    conf = f"{round(r['confidence'] * 100)}%"
    auto = "Y" if r["autopublished"] else "N"
    lines.append(
        f"{cell(r['make'], COL['make'])}  {cell(r['model'], COL['model'])}  {cell(year, COL['year'])}  {cell(conf, COL['conf'])}  {auto}"
    )

with open(summary_path, "a") as f:
    f.write("\n".join(lines) + "\n")
