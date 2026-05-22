---
title: By institution
toc: false
---

# Seniors by field of research, at a single institution

For the selected institution, the chart below shows the gender split of the **senior cohort** (publication history ≥ ${cutoff} years) in each field of research. The orange portion of each bar is women, green is unknown (initials-only or unmatched names), blue is men.

```js
import {DuckDBClient} from "npm:@observablehq/duckdb";
import {rows, GENDER_LABEL, GENDER_ORDER, GENDER_COLORS} from "./components/duck.js";

const db = await DuckDBClient.of({
  agg: FileAttachment("data/uk_senior_gender_agg.parquet")
});
```

```js
const allInstitutions = rows(await db.query(`
  SELECT institution_name,
         CAST(SUM(n_researchers) AS DOUBLE) AS n
  FROM agg
  WHERE institution_name IS NOT NULL
  GROUP BY institution_name
  HAVING n >= 100
  ORDER BY n DESC
`));
```

```js
const cutoff = view(Inputs.range([5, 40], {
  value: 20, step: 1,
  label: "Senior cutoff (years of publication history)"
}));
```

```js
const institution = view(Inputs.select(
  allInstitutions.map(d => d.institution_name),
  {value: "University College London", label: "Institution", sort: true, unique: true}
));
```

```js
const minSeniorCell = view(Inputs.range([1, 30], {
  value: 5, step: 1,
  label: "Min seniors per (institution × FoR) cell to display"
}));
```

```js
const raw = rows(await db.query(`
  SELECT
    field_of_research,
    CAST(SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'female'  THEN n_researchers ELSE 0 END) AS DOUBLE) AS n_senior_F,
    CAST(SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'male'    THEN n_researchers ELSE 0 END) AS DOUBLE) AS n_senior_M,
    CAST(SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'unknown' THEN n_researchers ELSE 0 END) AS DOUBLE) AS n_senior_U
  FROM agg
  WHERE institution_name = '${institution.replace(/'/g, "''")}'
  GROUP BY field_of_research
`));

const enriched = raw
  .map(r => {
    const total = r.n_senior_F + r.n_senior_M + r.n_senior_U;
    return {
      ...r,
      total,
      pct_F: total ? r.n_senior_F / total : 0,
      pct_U: total ? r.n_senior_U / total : 0,
      pct_M: total ? r.n_senior_M / total : 0,
      pct_women_resolved: (r.n_senior_F + r.n_senior_M) ? r.n_senior_F / (r.n_senior_F + r.n_senior_M) : null
    };
  })
  .filter(r => r.total >= minSeniorCell)
  .sort((a, b) => (b.pct_women_resolved ?? -1) - (a.pct_women_resolved ?? -1));
```

```js
// reshape to long format for stacked bars; use human-facing gender labels
const long = enriched.flatMap(r => [
  {field_of_research: r.field_of_research, gender: GENDER_LABEL.female,  share: r.pct_F, n: r.n_senior_F, total: r.total},
  {field_of_research: r.field_of_research, gender: GENDER_LABEL.unknown, share: r.pct_U, n: r.n_senior_U, total: r.total},
  {field_of_research: r.field_of_research, gender: GENDER_LABEL.male,    share: r.pct_M, n: r.n_senior_M, total: r.total}
]);
```

```js
display(Plot.plot({
  width,
  height: Math.max(360, 28 * enriched.length),
  marginLeft: 220,
  x: {label: "Share of senior researchers", percent: true, domain: [0, 1]},
  y: {label: null, domain: enriched.map(r => r.field_of_research)},
  color: {
    domain: GENDER_ORDER,
    range: GENDER_ORDER.map(g => GENDER_COLORS[g]),
    legend: true
  },
  marks: [
    Plot.barX(long, {
      x: "share",
      y: "field_of_research",
      fill: "gender",
      tip: true,
      channels: {
        Count: d => d.n.toLocaleString(),
        Total: d => d.total.toLocaleString()
      }
    }),
    Plot.text(enriched, {
      x: 0.005, y: "field_of_research",
      text: r => `${(r.pct_women_resolved * 100).toFixed(0)}% women (n=${r.total})`,
      fill: "white", textAnchor: "start", fontSize: 11
    })
  ]
}));
```

## Summary table

```js
display(Inputs.table(enriched, {
  columns: ["field_of_research", "total", "n_senior_F", "n_senior_M", "n_senior_U", "pct_women_resolved"],
  header: {
    field_of_research: "Field of research",
    total: "Seniors total",
    n_senior_F: "Women",
    n_senior_M: "Men",
    n_senior_U: "Unknown",
    pct_women_resolved: "% women (of resolved)"
  },
  format: {
    pct_women_resolved: x => x == null ? "—" : `${(x * 100).toFixed(1)}%`
  },
  width: {field_of_research: 360}
}));
```
