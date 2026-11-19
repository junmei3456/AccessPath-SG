#!/usr/bin/env python3
"""SVI for the block20 sampling points (839 points, EPSG:3414), reusing images already downloaded.

python block20_svi.py              dry run: free metadata only, prints how many images need billing
python block20_svi.py --download   download only the views that cannot be reused

Each point gets L and R views (road angle -90 / +90). A view is reused, not billed, when an image of the same
Google panorama with a heading within HEADING_TOL_DEG already exists (earlier run, or earlier in this run).
Outputs in svi_output_block20/: svi_images/{image_id}.jpg and SVI_block20_LeftRight.geojson."""
import argparse, json, math, os, shutil, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np, pandas as pd, requests
from pyproj import Transformer

BASE = Path(r"G:\0-NUS\Sem1\AR5958A\Final Project\DATA\SVI scrap")
POINTS = Path(r"G:\0-NUS\Sem1\AR5958A\Final Project\DATA\open_data\00_study_area\20261108_SVI_samplingpoints_block20_area500m.geojson")
OLD_GEOJSON = BASE / "svi_output" / "SVI_LeftRight_acquired.geojson"
OUT = BASE / "svi_output_block20"
IMG = OUT / "svi_images"
OUT_GEOJSON = OUT / "SVI_block20_LeftRight.geojson"
META = OUT / "block20_metadata.csv"
KEY_FILE = Path(r"G:\0-NUS\Sem1\AR5801\0-Week review\week9\scrap\scrapgoogle.api_key")
HEADING_TOL_DEG = 5.0
MAX_DIST_M = 15.0
MAX_IMAGE_REQUESTS = 2000
PITCH, FOV, SIZE = 0, 90, 640
PROVIDER = "Google Street View Static API"


def angdiff(a, b):
    return abs((a - b + 180) % 360 - 180)


def get(url, params, key):
    last = "no attempt"
    for k in range(3):
        try:
            r = requests.get(url, params={**params, "key": key}, timeout=30)
            if r.status_code in (429, 500, 502, 503):
                last = f"HTTP {r.status_code}"; time.sleep(2 * (k + 1)); continue
            return r
        except requests.RequestException as exc:  # exception text can contain the key: keep the type only
            last = type(exc).__name__; time.sleep(2 * (k + 1))
    raise RuntimeError(f"request failed: {last}")


def load_views():
    d = json.load(open(POINTS, encoding="utf-8-sig"))
    tr = Transformer.from_crs("EPSG:3414", "EPSG:4326", always_xy=True)
    rows = []
    for i, f in enumerate(d["features"], 1):
        x, y = f["geometry"]["coordinates"][:2]
        lon, lat = tr.transform(x, y)
        p = f["properties"]
        sid = f"B20_{i:05d}"
        for side, off in (("L", -90), ("R", 90)):
            rows.append(dict(image_id=f"{sid}_{side}", sample_id=sid, side=side, osm_id=p.get("osm_id"), fclass=p.get("fclass"),
                             road_name=p.get("name"), distance_along_m=p.get("distance"), route_heading_deg=round(p["angle"], 2),
                             camera_heading_deg=round((p["angle"] + off) % 360, 2), camera_pitch_deg=PITCH, camera_fov_deg=FOV,
                             x_svy21=x, y_svy21=y, latitude=lat, longitude=lon))
    return pd.DataFrame(rows)


def metadata(views, key):
    OUT.mkdir(exist_ok=True)
    cache = pd.read_csv(META, encoding="utf-8-sig") if META.exists() else pd.DataFrame(columns=["sample_id"])
    pts = views.drop_duplicates("sample_id")
    todo = pts[~pts.sample_id.isin(cache.sample_id)]

    def q(r):
        j = get("https://maps.googleapis.com/maps/api/streetview/metadata", {"location": f"{r.latitude},{r.longitude}", "radius": 25, "source": "outdoor"}, key).json()
        rec = dict(sample_id=r.sample_id, status=j.get("status", "UNKNOWN"), pano_id="", pano_lat=np.nan, pano_lon=np.nan, date="", copyright="")
        if rec["status"] == "OK":
            rec.update(pano_id=j["pano_id"], pano_lat=j["location"]["lat"], pano_lon=j["location"]["lng"], date=j.get("date", ""), copyright=j.get("copyright", ""))
        return rec

    if len(todo):
        with ThreadPoolExecutor(6) as ex:
            new = list(ex.map(q, todo.itertuples()))
        if any(r["status"] in ("REQUEST_DENIED", "OVER_QUERY_LIMIT") for r in new):
            sys.exit("Metadata refused: check the key")
        cache = pd.concat([cache, pd.DataFrame(new)], ignore_index=True)
        cache.to_csv(META, index=False, encoding="utf-8-sig")
    print(f"metadata: queried {len(todo)} points now, {len(pts) - len(todo)} from cache (no charge)")
    return views.merge(cache, on="sample_id", how="left")


def plan(v, tol):
    """Assign each eligible view: reuse_old, reuse_new or download."""
    old = json.loads(OLD_GEOJSON.read_text(encoding="utf-8"))["features"]
    old_idx = {}
    for f in old:
        p = f["properties"]
        if p["image_status"] == "acquired":
            old_idx.setdefault(p["pano_id"], []).append((p["camera_heading_deg"], BASE / "svi_output" / p["image_path"], p["image_id"]))
    lat0 = math.radians(v.latitude.mean())
    v["match_distance_m"] = np.hypot((v.pano_lon - v.longitude) * 111320 * math.cos(lat0), (v.pano_lat - v.latitude) * 110574).round(1)
    v["eligible"] = v.status.eq("OK") & v.copyright.fillna("").str.contains("Google") & (v.match_distance_m <= MAX_DIST_M)
    new_idx, action, src = {}, [], []
    for r in v.itertuples():
        if not r.eligible:
            action.append("no_google_pano"); src.append(""); continue
        h = r.camera_heading_deg
        hit = min(((angdiff(h, oh), op, oid) for oh, op, oid in old_idx.get(r.pano_id, [])), default=None)
        if hit and hit[0] <= tol:
            action.append("reuse_old"); src.append(hit[2]); continue
        hit = min(((angdiff(h, nh), nid) for nh, nid in new_idx.get(r.pano_id, [])), default=None)
        if hit and hit[0] <= tol:
            action.append("reuse_new"); src.append(hit[1]); continue
        action.append("download"); src.append("")
        new_idx.setdefault(r.pano_id, []).append((h, r.image_id))
    v["action"], v["reused_from"] = action, src
    return v, old_idx


def write_geojson(v):
    cols = [c for c in v.columns if c not in ("eligible", "status", "date", "copyright", "action")]
    feats = []
    for r in v[cols].to_dict("records"):
        props = {k: (None if isinstance(val, float) and math.isnan(val) else val) for k, val in r.items()}
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [r["longitude"], r["latitude"]]}, "properties": props})
    tmp = OUT_GEOJSON.with_suffix(".tmp")
    tmp.write_text(json.dumps({"type": "FeatureCollection", "features": feats}, default=str), encoding="utf-8")
    tmp.replace(OUT_GEOJSON)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--download", action="store_true"); a = ap.parse_args()
    key = os.environ.get("GOOGLE_SV_KEY") or KEY_FILE.read_text(encoding="utf-8-sig").strip()
    v = metadata(load_views(), key)
    print(f"points {v.sample_id.nunique()}, views {len(v)}; metadata status {v.drop_duplicates('sample_id').status.value_counts().to_dict()}")
    for tol in (0.0, 5.0, 10.0):
        c = plan(v.copy(), tol)[0].action.value_counts()
        print(f"  tolerance {tol:>4}deg: download {c.get('download', 0)}, reuse old {c.get('reuse_old', 0)}, reuse within new {c.get('reuse_new', 0)}, no pano {c.get('no_google_pano', 0)}")
    v, old_idx = plan(v, HEADING_TOL_DEG)
    e = v[v.eligible]
    print(f"chosen tolerance {HEADING_TOL_DEG}deg -> billed images needed: {int((v.action == 'download').sum())}")
    print(f"points with both L and R: {int((e.groupby('sample_id').size() == 2).sum())}; points without Google-owned pano within 15 m: {v[~v.eligible].sample_id.nunique()}")
    print(f"distinct panoramas used: {e.pano_id.nunique()}, of which already in earlier download: {int(e.pano_id.isin(list(old_idx)).sum() and e[e.pano_id.isin(list(old_idx))].pano_id.nunique())}")
    print("capture year of eligible views:", e.date.str[:4].value_counts().sort_index().to_dict())
    if not a.download:
        return
    IMG.mkdir(parents=True, exist_ok=True)
    old_path = {oid: op for lst in old_idx.values() for _, op, oid in lst}
    v["image_status"], v["image_path"], v["image_provider"], v["capture_date"] = "no_google_pano", "", "", ""
    billed = failed = 0
    order = list(v[v.action == "download"].index) + list(v[v.action.isin(["reuse_old", "reuse_new"])].index)
    for n, i in enumerate(order, 1):
        r = v.loc[i]; path = IMG / f"{r.image_id}.jpg"
        try:
            if not (path.exists() and path.stat().st_size > 0):
                if r.action == "download":
                    if billed >= MAX_IMAGE_REQUESTS:
                        print("request cap reached"); break
                    billed += 1
                    b = get("https://maps.googleapis.com/maps/api/streetview", {"pano": r.pano_id, "size": f"{SIZE}x{SIZE}", "heading": r.camera_heading_deg,
                                                                               "pitch": PITCH, "fov": FOV, "return_error_code": "true"}, key)
                    if b.status_code != 200 or not b.headers.get("content-type", "").startswith("image"):
                        raise RuntimeError(f"image HTTP {b.status_code}")
                    path.write_bytes(b.content); time.sleep(0.05)
                else:
                    shutil.copyfile(old_path[r.reused_from] if r.action == "reuse_old" else IMG / f"{r.reused_from}.jpg", path)
            v.loc[i, ["image_status", "image_path", "image_provider", "capture_date"]] = ["acquired", f"svi_images/{path.name}", PROVIDER, r.date]
        except Exception as exc:
            failed += 1; v.loc[i, "image_status"] = "failed"; print(r.image_id, exc)
            if failed >= 20:
                print("stopping: 20 failures"); break
        if n % 200 == 0:
            write_geojson(v); print(f"  {n}/{len(order)} billed {billed}", flush=True)
    write_geojson(v)
    print(f"billed {billed}; failed {failed}; status {v.image_status.value_counts().to_dict()}")


if __name__ == "__main__":
    main()
