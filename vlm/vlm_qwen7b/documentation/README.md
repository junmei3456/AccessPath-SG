# Tiong Bahru–Havelock Mobility Intelligence

Model: Qwen2.5-VL:7B
Classification: Six binary mobility features.

## Data files

- data/mobility_inventory.csv
- data/mobility_inventory.json
- data/mobility_locations.geojson (when coordinates available)
- data/feature_summary.csv

## Images

Photographs are stored in images/.
Use relative_image_path to load each photograph.

## Attention categories

POTENTIAL_BARRIER:
Construction obstruction or stairs detected.

VERIFY_STEP_FREE_ACCESS:
Overhead bridge or underpass detected.

SUPPORTIVE_FEATURE:
Covered walkway or ramp detected.

NO_TARGET_FEATURE_DETECTED:
None of the six target features detected.

## Important limitations

Model predictions are not manually verified.
Feature presence does not prove route obstruction.
Coordinates refer to sampling locations unless
otherwise documented.

Do not interpret these predictions as a
definitive accessibility assessment.
