"""Turn the visual review into image- and point-level outputs.
Writes to SOM/output_TB only: SVI_feature_points.geojson, SVI_feature_images.csv, feature_check_<label>.jpg."""
import json, os, re, sys
import numpy as np, pandas as pd
from PIL import Image, ImageDraw

S = sys.argv[1]
OUT = "G:/0-NUS/Sem1/AR5958A/Final Project/SOM/output_TB/"
IMG = "G:/0-NUS/Sem1/AR5958A/Final Project/DATA/SVI scrap/svi_output/svi_images/"
GJ = "G:/0-NUS/Sem1/AR5958A/Final Project/DATA/SVI scrap/svi_output/SVI_LeftRight_acquired.geojson"
CODE = {"S": "stairs", "R": "ramp", "B": "overhead_bridge", "C": "covered_walkway", "U": "underpass", "X": "construction_obstruction"}
ORDER = list(CODE.values())

idx = pd.read_csv(os.path.join(S, "review_index.csv")).set_index("idx").image_id
lab = {}
for line in open(os.path.join(S, "review_labels.txt"), encoding="utf-8"):
    m = re.match(r"\s*(\d+):\s*([SRBCUX ]+)\s*$", line)
    if m:
        k = int(m.group(1))
        lab[idx[k]] = lab.get(idx[k], set()) | {CODE[c] for c in m.group(2).split()}
print("reviewed views with labels", len(lab))

# copy each labelled view to the repeated views of the same pano and heading
rep = pd.read_csv(os.path.join(S, "view_rep.csv")).set_index("image_id").rep
occ = pd.read_csv(OUT + "occlusion_scores.csv").set_index("image_id")
gj = json.load(open(GJ, encoding="utf-8"))
feats = {f["properties"]["image_id"]: f for f in gj["features"] if f["properties"]["image_status"] == "acquired"}
rows = []
for iid, f in feats.items():
    labels = lab.get(rep.get(iid, iid), set())
    if not labels:
        continue
    p = f["properties"]
    blocked = occ.visibility.get(iid) == "blocked"
    rows.append(dict(image_id=iid, sample_id=p["sample_id"], side=p["side"], labels=";".join(l for l in ORDER if l in labels),
                     visibility=occ.visibility.get(iid), reviewed_view=rep.get(iid, iid), lon=p["longitude"], lat=p["latitude"]))
img = pd.DataFrame(rows).sort_values("image_id")
img.to_csv(OUT + "SVI_feature_images.csv", index=False)
print("labelled images", len(img), "| blocked among them (kept: feature visible)", int((img.visibility == "blocked").sum()))

# one feature per sampling point, at the sampling point location
out = []
for sid, g in img.groupby("sample_id"):
    labs = set(";".join(g.labels).split(";"))
    sides = sorted(g.side.unique())
    out.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(g.lon.iloc[0], 7), round(g.lat.iloc[0], 7)]},
                "properties": {"sample_id": sid, "labels": ";".join(l for l in ORDER if l in labs), "n_labels": len(labs),
                               "usable_side": ",".join(sides), "image_ids": ",".join(g.image_id),
                               "longitude": round(g.lon.iloc[0], 7), "latitude": round(g.lat.iloc[0], 7),
                               **{l: int(l in labs) for l in ORDER}}})
fc = {"type": "FeatureCollection", "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}}, "features": out}
json.dump(fc, open(OUT + "SVI_feature_points.geojson", "w", encoding="utf-8"), ensure_ascii=False)
pts = pd.DataFrame([f["properties"] for f in out])
print("points", len(pts), "of", len({f["properties"]["sample_id"] for f in feats.values()}))
print("points per label", {l: int(pts[l].sum()) for l in ORDER})
print("images per label", {l: int(img.labels.str.contains(l).sum()) for l in ORDER})
print("usable_side", pts.usable_side.value_counts().to_dict())

# check sheets: random images per label with their ids
for l in ORDER:
    s = img[img.labels.str.contains(l)]
    s = s.sample(min(24, len(s)), random_state=5958)
    size, cols = 220, 6
    can = Image.new("RGB", (cols * size, int(np.ceil(len(s) / cols)) * (size + 14)), "white")
    d = ImageDraw.Draw(can)
    for i, r in enumerate(s.itertuples()):
        x, y = (i % cols) * size, (i // cols) * (size + 14)
        can.paste(Image.open(IMG + r.image_id + ".jpg").convert("RGB").resize((size - 3, size - 3)), (x, y))
        d.text((x + 2, y + size - 3), r.image_id, fill="black")
    can.save(OUT + f"feature_check_{l}.jpg", quality=82)
