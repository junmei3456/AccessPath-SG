# Street-view mobility analysis with Qwen2.5-VL

AR5958A Artificial Intelligence for Urban Planning — group assignment.

This project explores street-view accessibility and mobility features using two vision-language models served locally through Ollama: **Qwen2.5-VL:3B** and **Qwen2.5-VL:7B**. Both experiments are recorded in the same exploratory notebook. The workflows use different feature definitions and sampling, so their results should not be treated as a controlled benchmark.

## Repository contents

- `coding/vlm analysis.ipynb`: original analysis code for both models; saved cell outputs and execution counts have been cleared to keep the upload small. Code is unchanged.
- `vlm_qwen3b/`: 3B predictions, pilot records, CSV results and geographic exports.
- `vlm_qwen7b/data/`: derived 7B mobility inventory, geographic results and feature summary. These are model outputs, not the source image dataset.
- `vlm_qwen7b/Visualisations/FeatureAtlas/`: rendered feature atlases and their inventories.
- `vlm_qwen7b/Journey_Demo/`: route exports, an HTML map and a rendered image sequence.
- `vlm_qwen7b/validation/`: geographic join and handover validation records.
- `vlm_qwen7b/documentation/`: original handover documentation.

## Viewing results

Browse the CSV, JSON and GeoJSON files directly, and open the atlas JPGs or journey PNG. Download the HTML map and open it in a browser; its external scripts and map tiles need internet access. Links to individual street-view photographs will not work without the excluded image collection. The original handover README describes the full local package, including that omitted collection.

## Running the notebook

This is an archive of an exploratory notebook, not a turnkey application. It retains the original Windows paths and intermediate workflow directories. Before running cells, update the path assignments (`BASE_DIR`, `IMAGE_DIR`, `OUTPUT_DIR`, `PROJECT_DIR`, `BASE`, `SEARCH_ROOTS` and related paths) for your machine. Later sections redefine variables and may rely on intermediate files from earlier runs.

1. Install Python and Jupyter, then install the packages in `requirements.txt`.
2. Install and start Ollama locally, and obtain `qwen2.5vl:3b` and `qwen2.5vl:7b` using `ollama pull`.
3. Supply the original street-view images and geographic metadata separately. The notebook references inputs such as `svi_images` and `SVI_LeftRight_acquired.geojson`, plus other local metadata paths.
4. Review and run the relevant notebook sections in order. Inference requires adequate local hardware; journey routing also uses online geographic services.

Package versions were not recorded in the supplied project; the requirements list is inferred from notebook imports and is not a tested environment lockfile. The packaged notebook has not been rerun.

## Excluded from this upload

- `vlm_qwen7b/images/`: individual source photographs.
- `coding/cache/`: cached geographic service responses.
- `coding/.ipynb_checkpoints/`: duplicate notebook checkpoints.
- Embedded notebook cell outputs, including image previews and execution logs.

Standalone analysis results and rendered visualisations are retained. Image filenames and paths in result tables are preserved as provenance; they do not include the underlying photograph files. No model weights are included.

## Interpretation

Predictions are not manually verified. Detected feature presence does not establish route obstruction or prove step-free access. Coordinates refer to sampling locations unless otherwise documented. These results are exploratory and are not a definitive accessibility assessment.
