"""Score all SVI images: occlusion (Mask2Former Vistas) and exploratory label scores (CLIP). Offline, cached models only.
Writes occlusion_scores.csv to SOM/output_TB and clip_scores.csv to the scratchpad. Source images are only read."""
import os, sys, time
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
import numpy as np, pandas as pd, torch
from PIL import Image
from transformers import AutoImageProcessor, Mask2FormerForUniversalSegmentation, CLIPModel, CLIPProcessor

S = sys.argv[1]
IMG = "G:/0-NUS/Sem1/AR5958A/Final Project/DATA/SVI scrap/svi_output/svi_images/"
OUT = "G:/0-NUS/Sem1/AR5958A/Final Project/SOM/output_TB/"
os.makedirs(OUT, exist_ok=True)
cells = pd.read_csv(os.path.join(S, "run_cells.csv"))
files = list(cells.file)
cellof = dict(zip(cells.file, cells.cell))
dev = "cuda"

# ---- occlusion ----
NAME = "facebook/mask2former-swin-large-mapillary-vistas-semantic"
proc = AutoImageProcessor.from_pretrained(NAME)
net = Mask2FormerForUniversalSegmentation.from_pretrained(NAME).to(dev).eval()
lab = net.config.id2label


def ids(*names):
    return [k for k, v in lab.items() if v in names]


VEH = ids("Bus", "Car", "Truck", "Caravan", "Trailer", "Other Vehicle", "Motorcycle", "Bicycle", "Wheeled Slow", "On Rails")
BIG = ids("Bus", "Truck", "Caravan", "Trailer", "Other Vehicle")
GROUND = ids("Sidewalk", "Pedestrian Area", "Curb Cut", "Curb", "Crosswalk - Plain", "Lane Marking - Crosswalk", "Road", "Service Lane", "Parking", "Bike Lane", "Lane Marking - General", "Manhole", "Catch Basin", "Terrain")
BRIDGE, TUNNEL, PERSON = ids("Bridge"), ids("Tunnel"), ids("Person")
rows, t0 = [], time.time()
for i, f in enumerate(files):
    im = Image.open(IMG + f).convert("RGB")
    with torch.no_grad():
        o = net(**{k: v.to(dev) for k, v in proc(images=im, return_tensors="pt").items()})
    m = proc.post_process_semantic_segmentation(o, target_sizes=[im.size[::-1]])[0].cpu().numpy()
    low = m[m.shape[0] // 2:]
    fr = lambda a, c: round(float(np.isin(a, c).mean()), 4)
    rows.append(dict(image_id=f[:-4], cell=cellof[f], veh_low=fr(low, VEH), big_all=fr(m, BIG), ground_low=fr(low, GROUND),
                     bridge_all=fr(m, BRIDGE), tunnel_all=fr(m, TUNNEL), person_low=fr(low, PERSON)))
    if (i + 1) % 500 == 0:
        print("seg", i + 1, round(time.time() - t0), flush=True)
occ = pd.DataFrame(rows)
blocked = (occ.veh_low >= .4) | (occ.ground_low < .25)
occ["visibility"] = np.where(blocked, "blocked", np.where((occ.veh_low >= .15) | (occ.ground_low < .4), "partial", "clear"))
occ.to_csv(OUT + "occlusion_scores.csv", index=False)
print(occ.visibility.value_counts().to_string(), flush=True)
del net
torch.cuda.empty_cache()

# ---- exploratory CLIP label scores ----
P = {
    "stairs": "a photo of outdoor concrete stairs with steps on a pedestrian path",
    "ramp": "a photo of a sloped concrete wheelchair ramp with handrails beside a walkway",
    "covered_walkway": "a photo of a covered linkway, a sheltered pedestrian walkway with a roof on posts",
    "overhead_bridge": "a photo of a pedestrian overhead bridge spanning above a road",
    "underpass": "a photo of a pedestrian underpass tunnel",
    "lift": "a photo of a public lift lobby with elevator doors",
    "zebra_crossing": "a photo of a zebra crossing with white stripes painted across a road",
    "signalised_crossing": "a photo of a pedestrian crossing at a junction with traffic lights",
    "construction": "a photo of construction hoarding and red and white barriers beside a road",
    "void_deck": "a photo of the open ground floor void deck under an apartment block",
    "neg_road": "a photo of an empty road with lane markings",
    "neg_parking": "a photo of a parking lot with parked cars",
    "neg_green": "a photo of trees, shrubs and grass",
    "neg_building": "a photo of an apartment building facade",
    "neg_sidewalk": "a photo of a plain sidewalk next to a road",
}
CN = "openai/clip-vit-large-patch14"
cp = CLIPProcessor.from_pretrained(CN)
cm = CLIPModel.from_pretrained(CN).to(dev).eval()
with torch.no_grad():
    t = cm.get_text_features(**{k: v.to(dev) for k, v in cp(text=list(P.values()), return_tensors="pt", padding=True).items()})
    t = getattr(t, "pooler_output", t)
    t = t / t.norm(dim=-1, keepdim=True)
out, t0 = [], time.time()
for b in range(0, len(files), 32):
    batch = files[b:b + 32]
    ims = [Image.open(IMG + f).convert("RGB") for f in batch]
    with torch.no_grad():
        v = cm.get_image_features(**{k: x.to(dev) for k, x in cp(images=ims, return_tensors="pt").items()})
        v = getattr(v, "pooler_output", v)
        v = v / v.norm(dim=-1, keepdim=True)
        pr = (100 * v @ t.T).softmax(-1).cpu().numpy()
    out.append(pr)
pr = np.vstack(out)
clip = pd.DataFrame(pr, columns=list(P)).round(4)
clip.insert(0, "image_id", [f[:-4] for f in files])
clip.insert(1, "cell", [cellof[f] for f in files])
clip.to_csv(os.path.join(S, "clip_scores.csv"), index=False)
print("clip seconds", round(time.time() - t0))
print("DONE")
