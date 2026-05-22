---
title: By field of research
toc: false
---

# Senior gender balance across institutions, within a single field

Pick a field of research; the views below rank UK institutions by the share of women among their senior researchers in that field, and show the distribution and absolute scale across the sector.

```js
import {DuckDBClient} from "npm:@observablehq/duckdb";

const db = await DuckDBClient.of({
  agg: FileAttachment("data/uk_senior_gender_agg.parquet")
});
```

```js
const allFors = await db.query(`
  SELECT DISTINCT field_of_research
  FROM agg
  WHERE field_of_research IS NOT NULL
  ORDER BY field_of_research
`);
```

```js
const cutoff = view(Inputs.range([5, 40], {
  value: 20, step: 1,
  label: "Senior cutoff (years)"
}));
```

```js
const fieldOfResearch = view(Inputs.select(
  allFors.map(d => d.field_of_research),
  {value: "Education", label: "Field of research", sort: true, unique: true}
));
```

```js
const minSenior = view(Inputs.range([1, 30], {
  value: 5, step: 1,
  label: "Min senior researchers per institution to include"
}));
```

```js
const rowsForField = await db.query(`
  SELECT
    institution_name,
    SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'female'  THEN n_researchers ELSE 0 END) AS n_senior_F,
    SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'male'    THEN n_researchers ELSE 0 END) AS n_senior_M,
    SUM(CASE WHEN publication_age >= ${cutoff} AND gender = 'unknown' THEN n_researchers ELSE 0 END) AS n_senior_U,
    SUM(n_researchers) AS n_inst_total
  FROM agg
  WHERE field_of_research = '${fieldOfResearch.replace(/'/g, "''")}'
    AND institution_name IS NOT NULL
  GROUP BY institution_name
`);

const enriched = rowsForField
  .map(r => {
    const total = r.n_senior_F + r.n_senior_M + r.n_senior_U;
    return {
      ...r,
      total,
      pct_F: total ? r.n_senior_F / total : 0,
      pct_U: total ? r.n_senior_U / total : 0,
      pct_M: total ? r.n_senior_M / total : 0,
      pct_women_resolved: (r.n_senior_F + r.n_senior_M)
        ? r.n_senior_F / (r.n_senior_F + r.n_senior_M)
        : null
    };
  })
  .filter(r => r.total >= minSenior);

const ukFieldAvg = (() => {
  const f = enriched.reduce((a, r) => a + r.n_senior_F, 0);
  const m = enriched.reduce((a, r) => a + r.n_senior_M, 0);
  return (f + m) ? f / (f + m) : null;
})();
```

The UK average % women among seniors in **${fieldOfResearch}** (institutions shown) is **${ukFieldAvg == null ? "—" : `${(ukFieldAvg * 100).toFixed(1)}%`}**, across **${enriched.length}** institutions with at least ${minSenior} seniors.

## Ranked: institutions by % women among seniors

```js
const topN = view(Inputs.range([10, 60], {value: 30, step: 5, label: "Top N to display"}));
```

```js
const top = enriched
  .filter(r => r.pct_women_resolved != null)
  .sort((a, b) => b.pct_women_resolved - a.pct_women_resolved)
  .slice(0, topN);

const long = top.flatMap(r => [
  {institution_name: r.institution_name, gender: "female",  share: r.pct_F, n: r.n_senior_F, total: r.total},
  {institution_name: r.institution_name, gender: "unknown", share: r.pct_U, n: r.n_senior_U, total: r.total},
  {institution_name: r.institution_name, gender: "male",    share: r.pct_M, n: r.n_senior_M, total: r.total}
]);

display(Plot.plot({
  width,
  height: Math.max(360, 22 * top.length),
  marginLeft: 240,
  x: {label: "Share of senior researchers", percent: true, domain: [0, 1]},
  y: {label: null, domain: top.map(r => r.institution_name)},
  color: {
    domain: ["female", "unknown", "male"],
    range: ["#F58220", "#7FB539", "#1F77B4"],
    legend: true
  },
  marks: [
    Plot.barX(long, {
      x: "share", y: "institution_name", fill: "gender",
      tip: true,
      channels: {
        Count: d => d.n.toLocaleString(),
        Total: d => d.total.toLocaleString()
      },
      order: ["female", "unknown", "male"]
    }),
    Plot.text(top, {
      x: 0.005, y: "institution_name",
      text: r => `${(r.pct_women_resolved * 100).toFixed(0)}% F (n=${r.total})`,
      fill: "white", textAnchor: "start", fontSize: 11
    })
  ]
}));
```

## Distribution: % women among seniors across UK institutions

```js
display(Plot.plot({
  width,
  height: 320,
  x: {label: "% women among seniors", percent: true, domain: [0, 1]},
  y: {label: "Institutions", grid: true},
  marks: [
    Plot.rectY(enriched.filter(r => r.pct_women_resolved != null), Plot.binX({y: "count"}, {x: "pct_women_resolved", fill: "#5b3789", thresholds: 20})),
    ukFieldAvg != null ? Plot.ruleX([ukFieldAvg], {stroke: "orange", strokeWidth: 2, strokeDasharray: "4 4"}) : null,
    Plot.ruleX([0.5], {stroke: "grey", strokeDasharray: "2 4"})
  ]
}));
```

Orange dashed line = UK average for this field (${ukFieldAvg == null ? "—" : `${(ukFieldAvg * 100).toFixed(1)}%`}). Grey dotted line = 50% parity.

## Scatter: count vs share

The original report's "population percentile" view. Each dot is an institution. X = % women among seniors, Y = absolute number of senior women (log scale). Dots in the top-right are large *and* gender-balanced; large dots far to the left are big institutions where seniors are mostly male.

```js
display(Plot.plot({
  width,
  height: 480,
  marginLeft: 60,
  x: {label: "% women among seniors →", percent: true, grid: true, domain: [0, 1]},
  y: {label: "↑ Number of senior women", type: "log", grid: true},
  marks: [
    Plot.ruleX([0.5], {stroke: "grey", strokeDasharray: "2 4"}),
    ukFieldAvg != null ? Plot.ruleX([ukFieldAvg], {stroke: "orange", strokeDasharray: "4 4"}) : null,
    Plot.dot(enriched.filter(r => r.pct_women_resolved != null && r.n_senior_F > 0), {
      x: "pct_women_resolved",
      y: "n_senior_F",
      r: d => Math.sqrt(d.total) * 1.5,
      fill: "#F58220",
      fillOpacity: 0.5,
      stroke: "black",
      strokeOpacity: 0.4,
      tip: true,
      channels: {
        Institution: "institution_name",
        Seniors: d => d.total.toLocaleString(),
        "Senior women": d => d.n_senior_F.toLocaleString()
      }
    }),
    Plot.text(
      enriched
        .filter(r => r.n_senior_F > 0)
        .sort((a, b) => b.n_senior_F - a.n_senior_F)
        .slice(0, 6),
      {
        x: "pct_women_resolved",
        y: "n_senior_F",
        text: d => d.institution_name.slice(0, 30),
        dy: -8, fontSize: 11
      }
    )
  ]
}));
```

## Table

```js
display(Inputs.table(
  enriched.sort((a, b) => (b.pct_women_resolved ?? -1) - (a.pct_women_resolved ?? -1)),
  {
    columns: ["institution_name", "total", "n_senior_F", "n_senior_M", "n_senior_U", "pct_women_resolved"],
    header: {
      institution_name: "Institution",
      total: "Seniors",
      n_senior_F: "F",
      n_senior_M: "M",
      n_senior_U: "Unknown",
      pct_women_resolved: "% women (resolved)"
    },
    format: {
      pct_women_resolved: x => x == null ? "—" : `${(x * 100).toFixed(1)}%`
    },
    rows: 30,
    width: {institution_name: 320}
  }
));
```
