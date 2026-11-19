"""Convert Grounding DINO JSONL results to review-pool CSVs; no plotting."""
import csv
import json
import sys
from pathlib import Path

folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
with (folder / "run_cells.csv").open(encoding="utf-8-sig", newline="") as handle:
    cell_of = {row["file"]: row["cell"] for row in csv.DictReader(handle)}

def write_table(name, columns, records):
    with (folder / name).open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(records)

records = []
with (folder / "dino.jsonl").open(encoding="utf-8") as handle:
    for line in handle:
        if not line.strip():
            continue
        record = json.loads(line)
        for detection in record["dets"]:
            x0, y0, x1, y1 = detection["box"]
            records.append(dict(file=record["file"], cell=cell_of[record["file"]],
                label=detection["label"], score=detection["score"],
                area=(x1-x0)*(y1-y0)/640/640, x0=x0, y0=y0, x1=x1, y1=y1))
write_table("dino_dets.csv", ["file", "cell", "label", "score", "area", "x0", "y0", "x1", "y1"], records)
records = []
with (folder / "dino_labels.jsonl").open(encoding="utf-8") as handle:
    for line in handle:
        if not line.strip():
            continue
        record = json.loads(line)
        for label, detection in record["dets"].items():
            records.append(dict(file=record["file"], label=label, score=detection["score"],
                box=json.dumps(detection["box"]), cell=cell_of[record["file"]]))
write_table("dino_labels.csv", ["file", "label", "score", "box", "cell"], records)
print("Detection tables saved.")
