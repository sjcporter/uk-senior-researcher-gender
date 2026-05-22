---
title: Methodology
toc: true
---

# Methodology

## Source data

All figures derive from the **Dimensions** scholarly database, queried via Google BigQuery in May 2026.

The cohort is **UK-affiliated researchers** in `dimensions-ai.data_analytics.researchers` whose **last publication year is 2025 or later** and whose status is not `obsolete`. The UK filter uses `country_code = 'GB'` on the researcher's current research organisation.

Each researcher contributes a single row, regardless of how many publications they have, where:

- **Institution** = `current_research_org` from Dimensions, joined to GRID for a canonical name.
- **Field of research** = the modal first-level ANZSRC FoR code across that researcher's publications (`APPROX_TOP_COUNT(category_for.first_level.full, 1)`).
- **Publication age** = `last_publication_year − first_publication_year`. Used here as the seniority proxy.
- **Gender** = inferred from first name using the `ds-gov-funder-shared.gender.name_to_gender` lookup. Country-aware match (`gender_withCountry`) is preferred; falls back to country-agnostic (`gender_noCountry`). Names of one character or less (initials) are not matched and surface as **unknown**.

The table powering this site, `ds-consultancy-gbq.sjcporter_consultancy.suw_gender_table`, has 13.5M rows globally; the UK slice used here is 371k researchers, aggregated to 127k `(institution, FoR, publication_age, gender)` cells.

## What counts as 'senior'?

A researcher is **senior** in this analysis if their `publication_age` is at least *N* years (default 20). The cutoff is a slider on every page — drop it to 10 to see mid-career patterns; raise it to 30 to see only professors / emeriti.

There is no implication that publication age is a perfect proxy for academic rank: it ignores career breaks, late-starting careers, non-publishing roles, and researchers whose first publication is misattributed. It does, however, scale well across institutions and disciplines and is reproducible from public data.

## Gender inference: known limitations

Gender is inferred from first names, not self-declared. This carries several biases:

- **Coverage by name origin.** First-name → gender lookups are weakest for names of East Asian, African and South Asian origin, and for transliterations. The "unknown" share rises in fields and institutions with higher representation of those name origins, which can systematically *under-count women* in some places.
- **Initials-only authorship.** Researchers who publish as "A. Smith" cannot be assigned a gender; they fall into the **unknown** bucket regardless.
- **Binary classification.** The lookup encodes only women/men and does not capture non-binary identity.
- **Stability over career.** A name's gender association can shift over time and across cultures; the lookup is treated as static.

When comparing institutions or fields, look at the **unknown** share alongside the women/men split: a high unknown share is a signal that the gender estimate is less reliable for that cell.

## Why this matters for seniority

Representation of women among **senior** researchers is consistently lower than among the workforce as a whole. At a typical 20-year cutoff, UK seniors are ~37% women versus ~46% across all UK researchers.

This gap should not be read as a "leaky pipeline" — i.e. as evidence that women are dropping out. It is a snapshot of a cohort: today's seniors started their careers 20–40 years ago, when the gender mix of new researchers entering the field was very different from today's. The senior cohort reflects the historical intake, not the current one. As more recent cohorts age into seniority, the senior split will track whatever the recruitment split was a generation earlier.

This site exists to make that compositional difference visible at the institution and field level — so that institutions disproportionately concentrated in senior researchers, and whose senior cohort is disproportionately men, can be identified and the underlying drivers (whether historical recruitment, retention, or current hiring practice) investigated.

## Reproducibility

- The SQL that builds the underlying table is at `queries/build_suw_gender_table.sql` in the analysis repo.
- The SQL that produces the aggregation parquet shipped with this site is at `queries/uk_senior_gender_agg.sql`.
- The Python notebook that drives the static-figure version of the analysis is at `notebooks/01_uk_senior_gender.ipynb`.
- This site is built with [Observable Framework](https://observablehq.com/framework/). The parquet (≈500 KB) is bundled with the site and loaded into DuckDB-WASM in your browser; all aggregations happen client-side, with no server round-trip.

## Caveats

- "Active 2025+" excludes researchers who have retired, moved out of research, or who simply haven't published recently. The senior cohort here is therefore the **currently active** senior cohort, not a historical one.
- A researcher's `current_research_org` is the most-recent affiliation Dimensions has seen — institutional mobility is collapsed.
- Field of research is the modal first-level FoR across the researcher's publications. Cross-disciplinary researchers are simplified to their dominant field.
- Counts are individual researchers, not full-time-equivalent staff. They are *not* directly comparable to HESA or Athena SWAN headcount figures.
