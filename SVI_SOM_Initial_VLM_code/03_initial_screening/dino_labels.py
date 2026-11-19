"""Run one text prompt at a time per label over all images. Offline, cached model. Writes to the scratchpad. Resumable per image."""
import json, os, sys, time
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
import pandas as pd, torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection

S = sys.argv[1]
IMG = "G:/0-NUS/Sem1/AR5958A/Final Project/DATA/SVI scrap/svi_output/svi_images/"
NAME = "IDEA-Research/grounding-dino-base"
PROMPTS = {
    "stairs": "outdoor stairs with steps.",
    "ramp": "sloped concrete ramp with metal handrails.",
    "overhead_bridge": "pedestrian footbridge over a road.",
    "covered_walkway": "roofed pedestrian walkway shelter on columns.",
    "underpass": "pedestrian underpass tunnel entrance.",
    "construction": "construction site hoarding wall.",
}
files = list(pd.read_csv(os.path.join(S, "run_cells.csv")).file)
out_path = os.path.join(S, "dino_labels.jsonl")
done = set()
if os.path.exists(out_path):
    done = {json.loads(l)["file"] for l in open(out_path, encoding="utf-8")}
proc = AutoProcessor.from_pretrained(NAME)
net = AutoModelForZeroShotObjectDetection.from_pretrained(NAME).to("cuda").eval()
t0 = time.time()
with open(out_path, "a", encoding="utf-8") as w:
    for i, f in enumerate(files):
        if f in done:
            continue
        im = Image.open(IMG + f).convert("RGB")
        rec = dict(file=f, dets={})
        for lab, text in PROMPTS.items():
            inp = proc(images=im, text=text, return_tensors="pt").to("cuda")
            with torch.no_grad():
                o = net(**inp)
            try:
                r = proc.post_process_grounded_object_detection(o, inp.input_ids, threshold=.2, text_threshold=.2, target_sizes=[im.size[::-1]])[0]
            except TypeError:
                r = proc.post_process_grounded_object_detection(o, inp.input_ids, box_threshold=.2, text_threshold=.2, target_sizes=[im.size[::-1]])[0]
            if len(r["scores"]):
                k = int(r["scores"].argmax())
                rec["dets"][lab] = dict(score=round(float(r["scores"][k]), 3), box=[round(float(x)) for x in r["boxes"][k]])
        w.write(json.dumps(rec) + "\n")
        w.flush()
        if (i + 1) % 200 == 0 or i == 4:
            print(i + 1, round(time.time() - t0), flush=True)
print("DONE")
