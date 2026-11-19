"""Exploratory: text-prompted detection of candidate features on all images. Offline, cached model. Writes to the scratchpad only. Resumable."""
import json, os, sys, time
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
import pandas as pd, torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection

S = sys.argv[1]
IMG = "G:/0-NUS/Sem1/AR5958A/Final Project/DATA/SVI scrap/svi_output/svi_images/"
NAME = "IDEA-Research/grounding-dino-base"
TEXT = "stairs. ramp with handrail. covered walkway. pedestrian overhead bridge. underpass tunnel. elevator door. zebra crossing. pedestrian traffic light. construction barrier. construction hoarding."
files = list(pd.read_csv(os.path.join(S, "run_cells.csv")).file)
out_path = os.path.join(S, "dino.jsonl")
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
        inp = proc(images=im, text=TEXT, return_tensors="pt").to("cuda")
        with torch.no_grad():
            o = net(**inp)
        try:
            r = proc.post_process_grounded_object_detection(o, inp.input_ids, threshold=.25, text_threshold=.25, target_sizes=[im.size[::-1]])[0]
        except TypeError:
            r = proc.post_process_grounded_object_detection(o, inp.input_ids, box_threshold=.25, text_threshold=.25, target_sizes=[im.size[::-1]])[0]
        names = r.get("text_labels", r["labels"])
        dets = [dict(label=str(n), score=round(float(s), 3), box=[round(float(x)) for x in b]) for n, s, b in zip(names, r["scores"], r["boxes"])]
        w.write(json.dumps(dict(file=f, dets=dets)) + "\n")
        w.flush()
        if (i + 1) % 200 == 0 or i == 4:
            print(i + 1, round(time.time() - t0), flush=True)
print("DONE")
