"""Build one review pool from all signals, one image per repeated view, and number it into sheets."""
import json, os, sys
import numpy as np, pandas as pd
from PIL import Image, ImageDraw

S = sys.argv[1]
IMG = "G:/0-NUS/Sem1/AR5958A/Final Project/DATA/SVI scrap/svi_output/svi_images/"
GJ = "G:/0-NUS/Sem1/AR5958A/Final Project/DATA/SVI scrap/svi_output/SVI_LeftRight_acquired.geojson"
cells = pd.read_csv(os.path.join(S, "run_cells.csv"))
cells["image_id"] = cells.file.str[:-4]
occ = pd.read_csv("G:/0-NUS/Sem1/AR5958A/Final Project/SOM/output_TB/occlusion_scores.csv")
d1 = pd.read_csv(os.path.join(S, "dino_dets.csv"))      # several phrases in one prompt
d2 = pd.read_csv(os.path.join(S, "dino_labels.csv"))    # one phrase per run
d1["image_id"] = d1.file.str[:-4]
d2["image_id"] = d2.file.str[:-4]
best1 = d1.groupby(["image_id", "label"]).score.max().unstack(fill_value=0)
best2 = d2.pivot_table(index="image_id", columns="label", values="score", aggfunc="max").fillna(0)
c1 = lambda *labs: best1[[l for l in labs if l in best1]].max(axis=1)
sig = pd.DataFrame(index=cells.image_id)
sig["stairs"] = (c1("stairs", "stairs ramp") >= .35).reindex(sig.index, fill_value=False) | (best2.stairs >= .6).reindex(sig.index, fill_value=False)
sig["ramp"] = (c1("ramp", "ramp with handrail", "stairs ramp", "handrail") >= .35).reindex(sig.index, fill_value=False) | (best2.ramp >= .62).reindex(sig.index, fill_value=False)
sig["bridge"] = (c1("pedestrian overhead bridge", "overhead bridge", "bridge") >= .45).reindex(sig.index, fill_value=False) | (occ.set_index("image_id").bridge_all >= .03).reindex(sig.index, fill_value=False)
sig["covered"] = (c1("covered walkway") >= .45).reindex(sig.index, fill_value=False) | cells.set_index("image_id").cell.isin([125, 126, 127, 139, 140, 141, 142, 143, 154, 155, 156, 157]).reindex(sig.index)
sig["underpass"] = (c1("underpass tunnel", "tunnel", "##pass tunnel") >= .4).reindex(sig.index, fill_value=False) | (occ.set_index("image_id").tunnel_all >= .05).reindex(sig.index, fill_value=False) | cells.set_index("image_id").cell.isin([124]).reindex(sig.index)
sig["construction"] = (c1("construction hoarding", "construction ho", "construction barrier") >= .5).reindex(sig.index, fill_value=False) | (best2.construction >= .5).reindex(sig.index, fill_value=False) | cells.set_index("image_id").cell.isin([94, 95, 96]).reindex(sig.index)
print(sig.sum().to_dict())
pool = sig[sig.any(axis=1)].index

# one image per repeated view: same pano and heading within 15 degrees
gj = json.load(open(GJ, encoding="utf-8"))
meta = pd.DataFrame([f["properties"] for f in gj["features"]]).set_index("image_id")
meta = meta[meta.image_status == "acquired"]
rep = {}
for pano, g in meta.groupby("pano_id"):
    kept = []
    for iid, h in g.camera_heading_deg.items():
        for k, kh in kept:
            if min(abs(h - kh) % 360, 360 - abs(h - kh) % 360) <= 15:
                rep[iid] = k
                break
        else:
            kept.append((iid, h))
            rep[iid] = iid
pd.Series(rep, name="rep").rename_axis("image_id").to_csv(os.path.join(S, "view_rep.csv"))
reps = sorted({rep[i] for i in pool})
print("pool images", len(pool), "| distinct views to review", len(reps))
blocked = set(occ[occ.visibility == "blocked"].image_id)
print("of which blocked", sum(r in blocked for r in reps))
pd.DataFrame({"idx": range(len(reps)), "image_id": reps}).to_csv(os.path.join(S, "review_index.csv"), index=False)
os.makedirs(os.path.join(S, "review"), exist_ok=True)
size, cols, per = 250, 6, 36
for p in range(int(np.ceil(len(reps) / per))):
    chunk = reps[p * per:(p + 1) * per]
    can = Image.new("RGB", (cols * size, int(np.ceil(len(chunk) / cols)) * size), "white")
    d = ImageDraw.Draw(can)
    for i, iid in enumerate(chunk):
        x, y = (i % cols) * size, (i // cols) * size
        can.paste(Image.open(IMG + iid + ".jpg").convert("RGB").resize((size - 4, size - 4)), (x, y))
        n = p * per + i
        d.rectangle([x, y, x + 46, y + 18], fill="yellow")
        d.text((x + 3, y + 3), str(n), fill="black")
    can.save(os.path.join(S, "review", f"r{p:02d}.jpg"), quality=85)
print("sheets", int(np.ceil(len(reps) / per)))
