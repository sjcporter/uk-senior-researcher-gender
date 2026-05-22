# UK Senior Researcher Gender Analysis

Interactive view of gender representation among **senior** UK researchers (publication history ≥ N years), by institution and field of research. Recreates and extends the 2019 Digital Science report [*Gender Representation in UK Research Institutions*](https://www.digital-science.com/) with seniority as the primary lens.

Live site: **https://sjcporter.github.io/uk-senior-researcher-gender/**

## What's here

- `src/` — Observable Framework pages (`index.md`, `institution.md`, `field.md`, `methodology.md`)
- `src/data/uk_senior_gender_agg.parquet` — the aggregated dataset (~500 KB) bundled with the site and loaded into DuckDB-WASM in the browser. No server round-trips at view time.
- `.github/workflows/deploy.yml` — builds the site on every push to `main` and deploys to GitHub Pages.

## Data

The parquet is generated from a private BigQuery table that joins Dimensions researcher records (UK-affiliated, last_publication_year ≥ 2025) with a first-name → gender lookup. See [methodology](https://sjcporter.github.io/uk-senior-researcher-gender/methodology) on the site for the full pipeline, caveats, and SQL.

To rebuild the parquet:

```bash
# from the sibling analysis repo
python3 scripts/export_uk_agg.py
cp data/uk_senior_gender_agg.parquet ../uk-senior-researcher-gender/src/data/
```

## Run locally

```bash
npm install
npm run dev        # http://127.0.0.1:3000
npm run build      # static site → ./dist
```

Requires Node ≥ 20.6.

## Caveats

- "Senior" here = `publication_age ≥ N`, where publication_age is `last_publication_year − first_publication_year`. Tunable via a slider on every page. It is a proxy for career length, not academic rank.
- Gender is inferred from first names. Coverage is weakest for non-Western names; high "unknown" share at an institution should be read as lower confidence in the gender estimate.
- Counts are individuals, not FTE; not directly comparable to HESA or Athena SWAN figures.

See the [methodology page](https://sjcporter.github.io/uk-senior-researcher-gender/methodology) on the site for the full set.
