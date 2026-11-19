# AccessPath-SG

AR5958A Artificial Intelligence for Urban Planning — group assignment.

Street-view preparation, image grouping and exploratory accessibility-feature analysis for the Tiong Bahru–Havelock study area in Singapore.

## Workflows and results

- [SVI acquisition, SOM and initial screening](SVI_SOM_Initial_VLM_code/README.md): core Google Street View acquisition scripts, Wolfram SOM code, Mask2Former/CLIP/Grounding DINO screening, review records and CSV/GeoJSON results for TB-Havelock and Block20.
- [Qwen vision-language analysis](vlm/README.md): exploratory Qwen2.5-VL 3B/7B notebook, predictions, geographic outputs and visualisations.
- [Project documents](docs/): supporting project materials.

Each workflow README describes its dependencies, original local paths and reproduction limits. Raw street-view image collections, credentials and model weights are excluded. These exploratory results are not a definitive accessibility assessment; initial screening and Qwen inference use different methods and should be interpreted separately.
