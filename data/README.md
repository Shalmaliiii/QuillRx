# Medicine catalog data

QuillRx stores medicines in MongoDB (`MedicineCatalog`). You can populate it three ways:

## 1. Built-in Indian seed (recommended first step)

```bash
npm run db:seed-medicines
```

Loads `data/medicines-india.json` (~120 common Indian OPD drugs) and enriches generics via the free **RxNorm API** (US NLM — no API key).

## 2. Import a file you download

Place your file in `data/imports/` then run:

```bash
npm run db:import-medicines data/imports/your-file.json
# or
npm run db:import-medicines data/imports/your-file.csv
```

**JSON format** — array of objects:

```json
[
  {
    "genericName": "Paracetamol",
    "brandName": "Crocin",
    "strength": "500 mg",
    "form": "Tablet",
    "isEssential": true
  }
]
```

**CSV format** — header row:

```csv
genericName,brandName,strength,form,isEssential
Paracetamol,Crocin,500 mg,Tablet,true
```

## 3. Official sources to download (manual)

| Source | Link | Notes |
|--------|------|--------|
| **NLEM 2022 (India)** | [PDF on main.mohfw.gov.in](https://main.mohfw.gov.in/newshighlights-104) | National List of Essential Medicines — convert to CSV/JSON and import |
| **WHO Essential Medicines** | [who.int medicines lists](https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines/essential-medicines-lists) | Global generics; good baseline |
| **RxNorm full release** | [NLM RxNorm files](https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html) | Large US drug vocabulary; use `RxNorm_full_*.zip` → parse RRFFILE or use our API enrichment instead |
| **openFDA** | [open.fda.gov drug label API](https://open.fda.gov/apis/drug/label/) | US labels; free REST API |

After downloading, convert to the JSON/CSV format above and run `db:import-medicines`.

## Live search

The prescription form also queries **RxNorm** at search time when local results are thin, and caches new matches into MongoDB automatically.
