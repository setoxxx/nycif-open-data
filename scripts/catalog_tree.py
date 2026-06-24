#!/usr/bin/env python3
import json
from pathlib import Path
Path('catalog').mkdir(exist_ok=True)
Path('catalog/nyc_open_data_catalog.json').write_text(json.dumps({'status':'scaffold'}, indent=2) + '\n')
print('catalog scaffold written')
